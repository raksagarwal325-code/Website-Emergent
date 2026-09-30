"""Conservative detail reranking. Product relationships are data, never SKU rules."""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

from customer_visual_features import EMBEDDING_DIM, model_input

DESIGN_VERSION = 'dinov2-patches-32-v1'
RELATIONS_PATH = Path(__file__).with_name('customer_design_relations.json')


def encode_details(encoder, image):
    view = ImageOps.pad(image, (256, 256), method=Image.Resampling.BICUBIC, color='white')
    pixels = model_input(view)
    with encoder.lock:
        tokens = encoder.session.run(['last_hidden_state'], {'pixel_values': pixels})[0][0, 1:]
    if tokens.shape != (256, EMBEDDING_DIM) or not np.isfinite(tokens).all():
        raise ValueError('Unexpected detail feature shape')
    rgb = (pixels[0].transpose(1, 2, 0) * np.array([.229, .224, .225]) + np.array([.485, .456, .406])) * 255
    patches = rgb.reshape(16, 14, 16, 14, 3).transpose(0, 2, 1, 3, 4).reshape(256, -1, 3)
    brightness = patches.mean(axis=(1, 2))
    mask = (patches.std(axis=1).mean(axis=1) > 8) & (brightness > 15) & (brightness < 245)
    if mask.sum() < 8:
        mask[:] = True
    selected = tokens[mask]
    selected /= np.maximum(np.linalg.norm(selected, axis=1, keepdims=True), 1e-12)
    selected = selected[np.linspace(0, len(selected) - 1, min(32, len(selected))).round().astype(int)]
    # Float16 keeps a maximum of 24 KiB per image; versioned and shape-checked.
    return selected.astype('<f2').tobytes()


def unpack_details(data):
    if not isinstance(data, bytes) or not (8 * EMBEDDING_DIM * 2 <= len(data) <= 32 * EMBEDDING_DIM * 2) or len(data) % (EMBEDDING_DIM * 2):
        return None
    vectors = np.frombuffer(data, dtype='<f2').astype(np.float32).reshape(-1, EMBEDDING_DIM)
    if not np.isfinite(vectors).all():
        return None
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    if np.any(norms < 1e-6):
        return None
    return vectors / norms


def needs_detail_check(matches):
    return bool(len(matches) >= 2 and matches[0]['match_type'] == 'similar'
                and .80 <= matches[0]['score'] < .90
                and matches[0]['score'] - matches[1]['score'] < .05)


def promote_detail_match(matches, query_data, rows, mapping):
    """Only promote one well-supported candidate; preserve every other position."""
    if not needs_detail_check(matches):
        return matches
    query = unpack_details(query_data)
    if query is None:
        return matches
    eligible = {m['product']['id'] for m in matches if m['match_type'] == 'similar'}
    scores = {}
    for row in rows:
        ids = {p['id'] for p in mapping.get(row['url'], [])} & eligible
        if not ids:
            continue
        stored = unpack_details(row.get('design_vectors')) if row.get('design_version') == DESIGN_VERSION else None
        if stored is None:
            # Incomplete backfill must not reorder results using partial evidence.
            return matches
        similarity = query @ stored.T
        score = float((similarity.max(axis=0).mean() + similarity.max(axis=1).mean()) / 2)
        for product_id in ids:
            scores[product_id] = max(score, scores.get(product_id, -1))
    if len(scores) != len(eligible) or len(scores) < 2:
        return matches
    ordered = sorted(scores, key=lambda key: (-scores[key], key))
    if scores[ordered[0]] < .55 or scores[ordered[0]] - scores[ordered[1]] < .01:
        return matches
    selected = next(m for m in matches if m['product']['id'] == ordered[0])
    if selected is matches[0]:
        return matches
    return [{**selected, 'match_type': 'closest'}] + [m for m in matches if m is not selected]


def promote_regional_detail_matches(matches, query_data, rows, mapping,
                                    diagnostic=None):
    """Reorder ambiguous products within a category using isolated-room crops."""
    if len(matches) < 2:
        return matches
    has_probes = any(match.get('_detail_probe') for match in matches)
    visible = ([match for match in matches if not match.get('_detail_probe')]
               if has_probes else matches)
    queries = [unpack_details(data) for data in query_data]
    queries = [query for query in queries if query is not None]
    if not queries:
        return visible
    by_category = {}
    for index, match in enumerate(matches):
        if match.get('match_type') == 'exact':
            continue
        category = str(match['product'].get('category') or '').strip().casefold()
        if category:
            by_category.setdefault(category, []).append(index)
    ambiguous = {category: positions for category, positions in by_category.items()
                 if len(positions) >= 2}
    probes = [index for index, match in enumerate(matches)
              if match.get('_detail_probe')]
    cross_category = len(by_category) >= 2
    if not ambiguous and not probes and not cross_category:
        return visible
    eligible = ({matches[index]['product']['id']
                 for positions in ambiguous.values() for index in positions}
                | {matches[index]['product']['id'] for index in probes})
    if probes or cross_category:
        eligible.update(match['product']['id'] for match in visible
                        if match.get('match_type') != 'exact')
    scores = {}
    scores_by_query = {}
    for row in rows:
        ids = {product['id'] for product in mapping.get(row.get('url'), [])} & eligible
        if not ids:
            continue
        stored = unpack_details(row.get('design_vectors')) \
            if row.get('design_version') == DESIGN_VERSION else None
        if stored is None:
            return visible
        per_query = [
            float(((query @ stored.T).max(axis=0).mean()
                   + (query @ stored.T).max(axis=1).mean()) / 2)
            for query in queries
        ]
        score = max(per_query)
        for product_id in ids:
            scores[product_id] = max(score, scores.get(product_id, -1))
            previous = scores_by_query.get(product_id)
            if previous is None:
                scores_by_query[product_id] = per_query
            else:
                scores_by_query[product_id] = [max(old, new)
                                               for old, new in zip(previous, per_query)]
    if any(product_id not in scores for product_id in eligible):
        return visible

    if probes or cross_category:
        candidate_ids = [match['product']['id'] for match in matches
                         if match.get('match_type') != 'exact'
                         and match['product']['id'] in scores]
        hidden_ids = {matches[index]['product']['id'] for index in probes}
        lead_category = next(
            (str(match['product'].get('category') or '').strip().casefold()
             for match in visible if match.get('match_type') != 'exact'),
            '',
        )
        promoted_ids = []
        evidence = []
        for query_index in range(len(queries)):
            ordered = sorted(
                candidate_ids,
                key=lambda key: (-scores_by_query[key][query_index], key),
            )
            winner = ordered[0]
            winner_score = scores_by_query[winner][query_index]
            runner_up = scores_by_query[ordered[1]][query_index] \
                if len(ordered) > 1 else -1
            margin = winner_score - runner_up
            winner_match = next(match for match in matches
                                if match['product']['id'] == winner)
            winner_category = str(
                winner_match['product'].get('category') or ''
            ).strip().casefold()
            # Same-category visible candidates are handled below without
            # disturbing unrelated positions. This stage exists to recover a
            # different fixture category (or a decisive internal probe).
            promoted = (winner_score >= .56 and margin >= .01
                        and (winner in hidden_ids
                             or winner_category != lead_category))
            evidence.append({
                'region': query_index,
                'winner': winner_match['product'].get('sku') or winner,
                'category': winner_match['product'].get('category'),
                'score': round(winner_score, 4),
                'margin': round(margin, 4),
                'promoted': promoted,
                'hidden_probe': winner in hidden_ids,
            })
            if promoted and winner not in promoted_ids:
                promoted_ids.append(winner)
        if diagnostic is not None:
            diagnostic['regional_detail_regions'] = evidence
            diagnostic['regional_detail_probes'] = [
                item for item in evidence if item['hidden_probe']
            ]
            if evidence:
                diagnostic['regional_detail_probe'] = evidence[0]
        if promoted_ids:
            promoted_matches = [
                {**next(match for match in matches
                        if match['product']['id'] == product_id),
                 'match_type': 'closest', '_detail_probe': False}
                for product_id in promoted_ids
            ]
            visible = promoted_matches + [
                match for match in visible
                if match['product']['id'] not in promoted_ids
            ]
        matches = visible
        by_category = {}
        for index, match in enumerate(matches):
            if match.get('match_type') == 'exact':
                continue
            category = str(match['product'].get('category') or '').strip().casefold()
            if category:
                by_category.setdefault(category, []).append(index)
        ambiguous = {category: positions for category, positions in by_category.items()
                     if len(positions) >= 2}
        if not ambiguous:
            return matches
    result = list(matches)
    evidence = []
    for category, positions in ambiguous.items():
        product_ids = [matches[index]['product']['id'] for index in positions]
        ordered = sorted(product_ids, key=lambda key: (-scores[key], key))
        margin = scores[ordered[0]] - scores[ordered[1]]
        winner_match = next(matches[index] for index in positions
                            if matches[index]['product']['id'] == ordered[0])
        evidence.append({
            'category': category,
            'winner': winner_match['product'].get('sku') or ordered[0],
            'score': round(scores[ordered[0]], 4),
            'margin': round(margin, 4),
        })
        if scores[ordered[0]] < .55 or margin < .01:
            continue
        ordered_matches = sorted(
            (matches[index] for index in positions),
            key=lambda match: (-scores[match['product']['id']],
                               match['product']['id']),
        )
        for position, match in zip(positions, ordered_matches):
            result[position] = ({**match, 'match_type': 'closest'}
                                if position == positions[0] else match)
    if diagnostic is not None:
        diagnostic['regional_detail_candidates'] = evidence
    return result


def load_relations():
    data = json.loads(RELATIONS_PATH.read_text())
    if data.get('version') != 1:
        raise ValueError('Unsupported design relationship version')
    return data.get('groups', [])


def add_related_designs(matches, products, groups, limit=12):
    """Owner-reviewed alternatives follow the leading design, never become exact."""
    if not matches or matches[0]['match_type'] == 'possible':
        return matches[:limit]
    by_sku = {}
    for product in products:
        by_sku.setdefault(product.get('sku'), {})[product['id']] = product
    anchor = matches[0]['product']
    skus = []
    for group in groups:
        members = group.get('skus', [])
        if anchor.get('sku') in members:
            skus.extend(members)
    leading = [m for m in matches if m['match_type'] == 'exact'] or [matches[0]]
    seen = {m['product']['id'] for m in leading}
    additions = []
    for sku in dict.fromkeys(skus):
        entries = by_sku.get(sku, {})
        if len(entries) != 1:
            continue
        product = next(iter(entries.values()))
        if product['id'] in seen or product.get('category') != anchor.get('category'):
            continue
        seen.add(product['id'])
        additions.append({'product': product, 'match_type': 'related', 'score': 0.0})
    if not additions:
        return matches[:limit]
    if leading[0]['match_type'] == 'similar':
        leading = [{**leading[0], 'match_type': 'closest'}]
    return (leading + additions + [m for m in matches if m['product']['id'] not in seen])[:limit]
