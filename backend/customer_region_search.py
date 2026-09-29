"""Bounded regional rescue for weak room-photo matches, using the saved index."""
import time

import numpy as np

from customer_visual_features import EMBEDDING_DIM
from customer_region_encoder import RegionEncoder, RegionDeadline

# Generic overlapping windows; independent of product identity and image content.
REGIONS = tuple((x, y, x + .25, y + .5)
                for y in (0, .25, .5) for x in (0, .15, .3, .45, .6, .75))
REGION_SECONDS = 8.0
REGION_VERSION = 'efficient-regions-v2'


def needs_region_check(matches):
    return bool(matches and matches[0]['match_type'] in ('similar', 'possible')
                and .55 <= matches[0]['score'] < .80
                and not any(m['match_type'] == 'exact' for m in matches))


def collect_region_scores(encoder, image, rows, mapping, deadline, cancelled, diagnostic=None):
    """Return complete region scores only; never download or write index data."""
    diagnostic = diagnostic if diagnostic is not None else {}
    diagnostic.update(coarse_regions=0, refined_regions=0)
    def stop(reason):
        diagnostic['outcome'] = reason
        return None
    products = {}
    embeddings = []
    offsets = {}
    for row in rows:
        linked = mapping.get(row['url'], [])
        if not linked:
            continue
        vectors = np.asarray(row.get('vectors') or [], dtype=np.float32)
        if vectors.shape != (2, EMBEDDING_DIM) or not np.isfinite(vectors).all():
            return stop('invalid_catalogue_vectors')
        offset = len(embeddings)
        embeddings.extend(vectors)
        for product in linked:
            products[product['id']] = product
            offsets.setdefault(product['id'], []).extend((offset, offset + 1))
    if not embeddings:
        return stop('no_catalogue_vectors')
    ordered = sorted(products)
    catalogue = np.asarray(embeddings, dtype=np.float32).T
    scores = []
    coarse_vectors = []
    for box in REGIONS:
        if cancelled.is_set() or time.monotonic() >= deadline:
            return stop('cancelled' if cancelled.is_set() else 'budget_exceeded')
        bounds = tuple(round(v * (image.width if i % 2 == 0 else image.height))
                       for i, v in enumerate(box))
        if bounds[2] <= bounds[0] or bounds[3] <= bounds[1]:
            return stop('invalid_crop')
        query = np.asarray(encoder.encode(image.crop(bounds)), dtype=np.float32)
        if query.shape != (1, EMBEDDING_DIM) or not np.isfinite(query).all():
            return stop('invalid_query_vectors')
        coarse_vectors.append(query.tolist())
        similarity = (query @ catalogue).max(axis=0)
        scores.append([float(similarity[offsets[key]].max()) for key in ordered])
        diagnostic['coarse_regions'] += 1
    if cancelled.is_set() or time.monotonic() >= deadline:
        return stop('cancelled' if cancelled.is_set() else 'budget_exceeded')
    coarse = np.asarray(scores)
    selected = []
    for index in np.argsort(-coarse.max(axis=1), kind='stable'):
        if coarse[index].max() < .70:
            break
        if all(region_iou(REGIONS[index], REGIONS[old]) < .3 for old in selected):
            selected.append(int(index))
        if len(selected) == 3:
            break
    if not selected:
        return stop('no_promising_regions')
    refined = []
    for index in selected:
        if cancelled.is_set() or time.monotonic() >= deadline:
            return stop('cancelled' if cancelled.is_set() else 'budget_exceeded')
        bounds = tuple(round(v * (image.width if i % 2 == 0 else image.height))
                       for i, v in enumerate(REGIONS[index]))
        query = np.asarray(encoder.encode_query(image.crop(bounds), initial=coarse_vectors[index]), dtype=np.float32)
        if query.shape != (6, EMBEDDING_DIM) or not np.isfinite(query).all():
            return stop('invalid_query_vectors')
        similarity = (query @ catalogue).max(axis=0)
        refined.append([float(similarity[offsets[key]].max()) for key in ordered])
        diagnostic['refined_regions'] += 1
    if cancelled.is_set() or time.monotonic() >= deadline:
        return stop('cancelled' if cancelled.is_set() else 'budget_exceeded')
    return np.asarray(refined), [products[key] for key in ordered]


def region_iou(a, b):
    intersection = max(0, min(a[2], b[2]) - max(a[0], b[0])) * max(0, min(a[3], b[3]) - max(a[1], b[1]))
    return intersection / ((a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - intersection)


def select_region_matches(matches, scores, products, limit=12):
    """Require a clear improvement and corroboration for separate region winners."""
    if not needs_region_check(matches):
        return matches
    scores = np.asarray(scores, dtype=np.float32)
    if (scores.ndim != 2 or not 1 <= scores.shape[0] <= 3
            or scores.shape[1] != len(products) or not products
            or not np.isfinite(scores).all()):
        return matches
    best = scores.max(axis=0)
    order = sorted(range(len(products)), key=lambda i: (-float(best[i]), products[i]['id']))
    anchor = order[0]
    if (best[anchor] < max(.80, matches[0]['score'] + .03)
            or products[anchor]['id'] == matches[0]['product']['id']):
        return matches
    primary = int(scores[:, anchor].argmax())
    # Keep near-identical catalogue variants alongside the strongest design.
    closest = {i for i in order if scores[primary, i] >= best[anchor] - .015}
    for region in range(len(scores)):
        winner = min(range(len(products)), key=lambda i: (-float(scores[region, i]), products[i]['id']))
        support = np.delete(scores[:, winner], region)
        if scores[region, winner] >= .75 and support.size and support.max() >= .72:
            closest.add(winner)
    leading = [i for i in order if i in closest][:6]
    alternatives = [i for i in order if i not in leading and best[i] >= .72]
    return [{'product': products[i], 'score': float(best[i]),
             'match_type': 'closest' if i in leading else 'similar'}
            for i in (leading + alternatives)[:limit]]


def rescue_region_matches(encoder, image, rows, mapping, matches, cancelled, diagnostic=None):
    diagnostic = diagnostic if diagnostic is not None else {}
    if not needs_region_check(matches):
        diagnostic['outcome'] = 'not_needed'
        return matches
    started = time.monotonic()
    deadline = started + REGION_SECONDS
    worker = RegionEncoder(encoder, deadline, cancelled)
    try:
        result = collect_region_scores(worker, image, rows, mapping,
                                       deadline, cancelled, diagnostic)
        if result is None:
            return matches
        scores, products = result
        selected = select_region_matches(matches, scores, products)
        diagnostic['outcome'] = 'matched' if selected is not matches else 'no_improvement'
        return selected
    except RegionDeadline:
        diagnostic['outcome'] = 'cancelled' if cancelled.is_set() else 'budget_exceeded'
        return matches
    finally:
        elapsed = time.monotonic() - started
        diagnostic['elapsed_seconds'] = round(elapsed, 3)
        diagnostic.update({key: round(value, 6) if isinstance(value, float) else value
                           for key, value in worker.timings.items()})
        measured = sum(worker.timings[key] for key in
                       ('preprocess_seconds', 'lock_wait_seconds', 'inference_seconds'))
        diagnostic['other_seconds'] = round(max(0.0, elapsed - measured), 6)
        diagnostic['timing_version'] = 'region-stage-timing-v1'
