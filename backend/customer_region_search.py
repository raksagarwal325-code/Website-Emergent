"""Bounded regional rescue for weak room-photo matches, using the saved index."""
import time

import numpy as np

from customer_visual_features import EMBEDDING_DIM
from customer_region_encoder import RegionEncoder, RegionDeadline

# Generic overlapping windows; independent of product identity and image content.
REGIONS = tuple((x, y, x + .25, y + .5)
                for y in (0, .25, .5) for x in (0, .15, .3, .45, .6, .75))
TALL_REGIONS = tuple((x, 0, x + .33, 1) for x in (0, .13, .27, .4, .53, .67))
# Smaller windows isolate table lamps, sconces and individual fixtures from
# furniture and other lights in wide installation photographs.  They are used
# only by the asynchronous background pass, never by the fast interactive path.
FOCUSED_REGIONS = tuple((x, y, x + .3, y + .3)
                        for y in (0, .233, .466, .7)
                        for x in (0, .175, .35, .525, .7))
BACKGROUND_REGIONS = REGIONS + TALL_REGIONS + FOCUSED_REGIONS
REGION_SECONDS = 8.0
REGION_VERSION = 'multi-product-regions-v7-category-detail-probes'


def needs_region_check(matches):
    return bool(matches and matches[0]['match_type'] in ('similar', 'possible')
                and .55 <= matches[0]['score'] < .80
                and not any(m['match_type'] == 'exact' for m in matches))


def needs_background_region_check(matches):
    """Background work may inspect photos whose whole-image rank found nothing."""
    if not matches:
        return True
    if any(match.get('match_type') == 'exact' for match in matches):
        return False
    if needs_region_check(matches):
        return True
    # A room containing repeated pendants can look confidently like one broad
    # chandelier to a whole-image embedding.  Close high-scoring alternatives
    # are therefore still ambiguous and deserve the asynchronous object/detail
    # pass.  Clear single-product leaders continue to bypass background work.
    leader = matches[0]
    return bool(
        leader.get('match_type') == 'similar'
        and float(leader.get('score') or 0) < .90
        and any(
            candidate.get('match_type') == 'similar'
            and float(candidate.get('score') or 0) >= float(leader.get('score') or 0) - .035
            for candidate in matches[1:5]
        )
    )


def collect_region_scores(encoder, image, rows, mapping, deadline, cancelled,
                          diagnostic=None, regions=REGIONS, coarse_threshold=.70,
                          max_refined=3):
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
    for box in regions:
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
    ranked = [int(index) for index in np.argsort(-coarse.max(axis=1), kind='stable')
              if coarse[index].max() >= coarse_threshold]
    selected = []
    covered_products = set()
    # First preserve spatially separate crops whose strongest catalogue product
    # differs. This prevents several chandelier crops from consuming the whole
    # refinement budget when a room also contains a table or wall light.
    for index in ranked:
        winner = int(coarse[index].argmax())
        if winner in covered_products:
            continue
        if all(region_iou(regions[index], regions[old]) < .3 for old in selected):
            selected.append(index)
            covered_products.add(winner)
        if len(selected) == max_refined:
            break
    # Repeated instances of one product are useful corroboration, so use any
    # remaining capacity for the strongest non-overlapping crops.
    for index in ranked:
        if index in selected:
            continue
        if all(region_iou(regions[index], regions[old]) < .3 for old in selected):
            selected.append(index)
        if len(selected) == max_refined:
            break
    if not selected:
        return stop('no_promising_regions')
    diagnostic['selected_regions'] = [list(regions[index]) for index in selected]
    refined = []
    for index in selected:
        if cancelled.is_set() or time.monotonic() >= deadline:
            return stop('cancelled' if cancelled.is_set() else 'budget_exceeded')
        bounds = tuple(round(v * (image.width if i % 2 == 0 else image.height))
                       for i, v in enumerate(regions[index]))
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


def _category(product):
    return str(product.get('category') or '').strip().casefold()


def select_region_matches(matches, scores, products, limit=12, force=False,
                          diagnostic=None, include_detail_probes=False):
    """Lead with corroborated object winners, then variants and alternatives."""
    if not force and not needs_region_check(matches):
        return matches
    scores = np.asarray(scores, dtype=np.float32)
    if (scores.ndim != 2 or not 1 <= scores.shape[0] <= 5
            or scores.shape[1] != len(products) or not products
            or not np.isfinite(scores).all()):
        return matches
    best = scores.max(axis=0)
    support = np.sum(scores >= np.maximum(.72, best - .08), axis=0)
    consensus = best + .015 * np.maximum(0, support - 1)
    # A room crop can produce a single high false positive.  During the
    # background pass, favour a product seen in more than one independent crop
    # before comparing peak similarity.  Interactive/single-product behaviour
    # deliberately keeps the established ordering.
    order = sorted(
        range(len(products)),
        key=(lambda i: (-int(support[i]), -float(consensus[i]),
                        -float(best[i]), products[i]['id'])) if force else
            (lambda i: (-float(consensus[i]), -float(best[i]), products[i]['id'])),
    )
    if diagnostic is not None:
        diagnostic['regional_candidates'] = [
            {'sku': products[i].get('sku') or products[i].get('id'),
             'category': products[i].get('category'),
             'best': round(float(best[i]), 4),
             'support': int(support[i])}
            for i in order[:6]
        ]
    anchor = order[0]
    baseline_score = matches[0]['score'] if matches else 0
    minimum = .80 if force else max(.80, baseline_score + .03)
    if (best[anchor] < minimum
            or (not force and matches
                and products[anchor]['id'] == matches[0]['product']['id'])):
        return matches
    primary = int(scores[:, anchor].argmax())
    # Independent, corroborated region winners represent different objects in
    # the room. Put them before alternate catalogue variants of one object.
    regional = [anchor]
    for region in sorted(range(len(scores)), key=lambda row: -float(scores[row].max())):
        winner = min(range(len(products)), key=lambda i: (-float(scores[region, i]), products[i]['id']))
        corroboration = np.delete(scores[:, winner], region)
        if (scores[region, winner] >= .75 and corroboration.size
                and corroboration.max() >= .72):
            if winner not in regional:
                regional.append(winner)
    # A second object in a wide room may be visible in only one refined crop.
    # Preserve the best credible local winner from another catalogue category
    # instead of requiring it to beat every chandelier globally.  This is
    # intentionally limited to forced background searches and to one candidate
    # per category, with both an absolute and a crop-relative confidence gate.
    if force:
        anchor_category = _category(products[anchor])
        represented = {anchor_category} if anchor_category else set()
        category_candidates = []
        for region in range(len(scores)):
            region_peak = float(scores[region].max())
            categories = {_category(product) for product in products}
            for category in categories - {''} - represented:
                members = [i for i, product in enumerate(products)
                           if _category(product) == category]
                winner = min(members,
                             key=lambda i: (-float(scores[region, i]),
                                            products[i]['id']))
                value = float(scores[region, winner])
                if value >= .68 and value >= region_peak - .12:
                    category_candidates.append((value, category, winner))
        for _value, category, winner in sorted(
                category_candidates,
                key=lambda item: (-item[0], item[1], products[item[2]]['id'])):
            if category in represented:
                continue
            represented.add(category)
            if winner not in regional:
                regional.append(winner)
    variants = sorted(
        (i for i in range(len(products))
         if i not in regional and scores[primary, i] >= best[anchor] - .015),
        key=lambda i: (-float(scores[primary, i]), products[i]['id']),
    )
    leading = (regional + variants)[:6]
    alternatives = [i for i in order if i not in leading and best[i] >= .72]
    selected = (leading + alternatives)[:limit]
    result = [{'product': products[i], 'score': float(best[i]),
               'match_type': 'closest' if i in leading else 'similar'}
              for i in selected]
    if not (force and include_detail_probes):
        return result

    # Keep a small, internal-only shortlist from categories that the broad
    # visual rank would otherwise discard.  Patch/detail comparison can then
    # recover an individual hanging light from a repeated cluster that broadly
    # resembles a chandelier.  Probes are never returned to the customer unless
    # detail evidence promotes one of them.
    probe_limit = 24
    anchor_best = float(best[anchor])
    remaining = [i for i in order if i not in selected
                 and best[i] >= .55 and best[i] >= anchor_best - .22]
    by_category = {}
    for index in remaining:
        category = _category(products[index])
        if category:
            by_category.setdefault(category, []).append(index)
    probes = []
    for category in sorted(by_category):
        probes.extend(by_category[category][:4])
    probes = sorted(probes, key=lambda i: (-float(consensus[i]), products[i]['id']))[:probe_limit]
    result.extend({'product': products[i], 'score': float(best[i]),
                   'match_type': 'probe', '_detail_probe': True}
                  for i in probes)
    return result


def rescue_region_matches(encoder, image, rows, mapping, matches, cancelled, diagnostic=None,
                          seconds=None, regions=REGIONS, force=False, coarse_threshold=.70,
                          max_refined=3, include_detail_probes=False):
    diagnostic = diagnostic if diagnostic is not None else {}
    if not force and not needs_region_check(matches):
        diagnostic['outcome'] = 'not_needed'
        return matches
    started = time.monotonic()
    deadline = started + (REGION_SECONDS if seconds is None else seconds)
    worker = RegionEncoder(encoder, deadline, cancelled)
    try:
        result = collect_region_scores(worker, image, rows, mapping,
                                       deadline, cancelled, diagnostic, regions,
                                       coarse_threshold=coarse_threshold,
                                       max_refined=max_refined)
        if result is None:
            return matches
        scores, products = result
        selected = select_region_matches(matches, scores, products, force=force,
                                         diagnostic=diagnostic,
                                         include_detail_probes=include_detail_probes)
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
