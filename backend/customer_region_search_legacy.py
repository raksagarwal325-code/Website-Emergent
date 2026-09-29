"""Bounded regional rescue for weak room-photo matches, using the saved index."""
import time

import numpy as np

from customer_visual_features import EMBEDDING_DIM

# Generic overlapping windows; independent of product identity and image content.
REGIONS = tuple((x, y, x + .25, y + .5)
                for y in (0, .25, .5) for x in (0, .15, .3, .45, .6, .75))
REGION_SECONDS = 8.0


def needs_region_check(matches):
    return bool(matches and matches[0]['match_type'] in ('similar', 'possible')
                and .55 <= matches[0]['score'] < .80
                and not any(m['match_type'] == 'exact' for m in matches))


def collect_region_scores(encoder, image, rows, mapping, deadline, cancelled):
    """Return complete region scores only; never download or write index data."""
    products = {}
    embeddings = []
    offsets = {}
    for row in rows:
        linked = mapping.get(row['url'], [])
        if not linked:
            continue
        vectors = np.asarray(row.get('vectors') or [], dtype=np.float32)
        if vectors.shape != (2, EMBEDDING_DIM) or not np.isfinite(vectors).all():
            return None  # Do not compare a partially available catalogue.
        offset = len(embeddings)
        embeddings.extend(vectors)
        for product in linked:
            products[product['id']] = product
            offsets.setdefault(product['id'], []).extend((offset, offset + 1))
    if not embeddings:
        return None
    ordered = sorted(products)
    catalogue = np.asarray(embeddings, dtype=np.float32).T
    scores = []
    for box in REGIONS:
        if cancelled.is_set() or time.monotonic() >= deadline:
            return None
        bounds = tuple(round(v * (image.width if i % 2 == 0 else image.height))
                       for i, v in enumerate(box))
        if bounds[2] <= bounds[0] or bounds[3] <= bounds[1]:
            return None
        query = np.asarray(encoder.encode(image.crop(bounds)), dtype=np.float32)
        if query.shape != (2, EMBEDDING_DIM) or not np.isfinite(query).all():
            return None
        similarity = (query @ catalogue).max(axis=0)
        scores.append([float(similarity[offsets[key]].max()) for key in ordered])
    if cancelled.is_set() or time.monotonic() >= deadline:
        return None
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
        return None
    refined = []
    for index in selected:
        if cancelled.is_set() or time.monotonic() >= deadline:
            return None
        bounds = tuple(round(v * (image.width if i % 2 == 0 else image.height))
                       for i, v in enumerate(REGIONS[index]))
        query = np.asarray(encoder.encode_query(image.crop(bounds)), dtype=np.float32)
        if query.shape != (12, EMBEDDING_DIM) or not np.isfinite(query).all():
            return None
        similarity = (query @ catalogue).max(axis=0)
        refined.append([float(similarity[offsets[key]].max()) for key in ordered])
    if cancelled.is_set() or time.monotonic() >= deadline:
        return None
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


def rescue_region_matches(encoder, image, rows, mapping, matches, cancelled):
    if not needs_region_check(matches):
        return matches
    result = collect_region_scores(encoder, image, rows, mapping,
                                   time.monotonic() + REGION_SECONDS, cancelled)
    if result is None:
        return matches
    scores, products = result
    return select_region_matches(matches, scores, products)
