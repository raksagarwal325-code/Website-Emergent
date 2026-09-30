import sys
import threading
import time
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from customer_region_search import (BACKGROUND_REGIONS, REGIONS, collect_region_scores,
                                    needs_background_region_check, needs_region_check,
                                    select_region_matches, rescue_region_matches)


def match(score=.76, kind='similar', identity='a'):
    return {'product': {'id': identity}, 'score': score, 'match_type': kind}


def vectors():
    value = np.zeros((2, 384), dtype=np.float32)
    value[:, 0] = 1
    return value.tolist()


class RegionSearchTests(unittest.TestCase):
    def test_existing_strong_and_exact_matches_bypass_regions(self):
        for matches in ([], [match(.95)], [match(.80)], [match(1, 'exact')],
                        [match(.76), match(1, 'exact', 'b')], [match(.79, 'closest')]):
            self.assertFalse(needs_region_check(matches))
        self.assertTrue(needs_region_check([match()]))
        self.assertTrue(needs_region_check([match(.65, 'possible')]))
        self.assertTrue(needs_background_region_check([]))
        self.assertFalse(needs_background_region_check([match(.9)]))

    def test_background_regions_add_full_height_views_for_small_room_objects(self):
        self.assertGreater(len(BACKGROUND_REGIONS), len(REGIONS))
        self.assertTrue(any(box[1] == 0 and box[3] == 1 for box in BACKGROUND_REGIONS))

    def test_region_scan_is_bounded_and_deduplicates_shared_products(self):
        encoder = SimpleNamespace(encode=Mock(return_value=vectors()[:1]), encode_query=Mock(return_value=vectors()*3))
        rows = [{'url': 'one', 'vectors': vectors()}, {'url': 'two', 'vectors': vectors()},
                {'url': 'deleted', 'vectors': vectors()}]
        mapping = {'one': [{'id': 'a'}, {'id': 'b'}], 'two': [{'id': 'a'}]}
        scores, products = collect_region_scores(encoder, Image.new('RGB', (400, 300)),
            rows, mapping, time.monotonic()+30, threading.Event())
        self.assertEqual(scores.shape, (3, 2))
        self.assertEqual(encoder.encode_query.call_count, 3)
        self.assertEqual([p['id'] for p in products], ['a', 'b'])
        self.assertEqual(encoder.encode.call_count, len(REGIONS))
        self.assertTrue(np.allclose(scores, 1))

    def test_cancelled_expired_and_incomplete_scans_do_not_return_partial_evidence(self):
        encoder = SimpleNamespace(encode=Mock(return_value=vectors()[:1]), encode_query=Mock(return_value=vectors()*3))
        image = Image.new('RGB', (200, 200))
        rows = [{'url': 'a', 'vectors': vectors()}]
        mapping = {'a': [{'id': 'a'}]}
        cancelled = threading.Event(); cancelled.set()
        self.assertIsNone(collect_region_scores(encoder, image, rows, mapping,
            time.monotonic()+30, cancelled))
        self.assertIsNone(collect_region_scores(encoder, image, rows, mapping,
            time.monotonic()-1, threading.Event()))
        encoder.encode.assert_not_called()
        rows.append({'url': 'b', 'vectors': []}); mapping['b'] = [{'id': 'b'}]
        self.assertIsNone(collect_region_scores(encoder, image, rows, mapping,
            time.monotonic()+30, threading.Event()))
        encoder.encode.assert_not_called()


    def test_multiple_fixture_winners_and_close_variants_lead_without_exact_claims(self):
        old = [match(.77, identity='old')]
        products = [{'id': key} for key in ('a', 'b', 'c', 'similar', 'background')]
        scores = [[.86, .85, .74, .79, .60], [.74, .73, .78, .74, .65], [.70, .71, .73, .72, .80]]
        result = select_region_matches(old, scores, products)
        self.assertEqual([m['product']['id'] for m in result[:3]], ['a', 'c', 'b'])
        self.assertTrue(all(m['match_type'] == 'closest' for m in result[:3]))
        self.assertTrue(all(m['match_type'] != 'exact' for m in result))
        self.assertEqual(next(m['match_type'] for m in result if m['product']['id']=='background'), 'similar')
        self.assertEqual(old, [match(.77, identity='old')])

    def test_weak_or_invalid_regional_evidence_and_unchanged_winner_keep_original_order(self):
        old = [match(.77, identity='a')]
        products = [{'id': 'a'}, {'id': 'b'}]
        for scores in ([[.70, .79]], [[.91, .93]], [[.90, .80]],
                       [[float('nan'), .90]], [], [[.9]], [[.1,.9]]*5):
            # The .91/.93 case is bypassed below with an already-confident input.
            baseline = [match(.91, identity='a')] if scores == [[.91,.93]] else old
            self.assertIs(select_region_matches(baseline, scores, products), baseline)

    def test_region_output_is_bounded_and_deterministic(self):
        products = [{'id': str(i)} for i in range(30)]
        result = select_region_matches([match(.75, identity='old')], [[.85]*30], products)
        self.assertEqual(len(result), 12)
        self.assertEqual(sum(m['match_type']=='closest' for m in result), 6)
        self.assertEqual(len({m['product']['id'] for m in result}), 12)

    def test_repeated_second_product_leads_before_same_object_variants(self):
        products = [{'id': key} for key in ('wrong', 'chandelier', 'table-lamp', 'variant')]
        scores = [
            [.86, .85, .65, .845],
            [.73, .83, .76, .81],
            [.62, .70, .82, .69],
        ]
        result = select_region_matches([match(.74, identity='old')], scores, products, force=True)
        ids = [item['product']['id'] for item in result]
        self.assertEqual(ids[0], 'chandelier')
        self.assertLess(ids.index('chandelier'), ids.index('variant'))
        self.assertLess(ids.index('table-lamp'), ids.index('variant'))
        self.assertEqual(result[ids.index('table-lamp')]['match_type'], 'closest')

    def test_more_than_three_regions_are_rejected(self):
        products = [{'id': 'a'}, {'id': 'b'}]
        valid = select_region_matches([], [[.86, .72]] * 3, products, force=True)
        self.assertEqual(valid[0]['product']['id'], 'a')
        invalid = select_region_matches([], [[.86, .72]] * 4, products, force=True)
        self.assertEqual(invalid, [])

    def test_background_scan_can_recover_when_whole_photo_has_no_candidates(self):
        products = [{'id': 'catalogue'}, {'id': 'other'}]
        result = select_region_matches([], [[.86, .72]], products, force=True)
        self.assertEqual(result[0]['product']['id'], 'catalogue')
        self.assertEqual(result[0]['match_type'], 'closest')

    def test_forced_background_scan_can_expand_a_gallery_leader(self):
        old = [match(.86, kind='closest', identity='chandelier')]
        products = [{'id': key} for key in ('chandelier', 'table-lamp', 'variant')]
        scores = [[.87, .62, .855], [.83, .80, .81], [.69, .77, .68]]
        result = select_region_matches(old, scores, products, force=True)
        self.assertIsNot(result, old)
        self.assertEqual(result[0]['product']['id'], 'chandelier')
        self.assertEqual(result[1]['product']['id'], 'table-lamp')
        self.assertLess(
            [item['product']['id'] for item in result].index('table-lamp'),
            [item['product']['id'] for item in result].index('variant'),
        )

    def test_exact_results_do_not_even_start_a_scan(self):
        encoder = SimpleNamespace(encode=Mock(side_effect=AssertionError('must bypass')))
        old = [match(1, 'exact')]
        self.assertIs(rescue_region_matches(encoder, None, [], {}, old, threading.Event()), old)

    def test_background_scan_can_override_interactive_deadline(self):
        encoder = SimpleNamespace(
            lock=threading.Lock(),
            session=SimpleNamespace(run=Mock(return_value=np.ones((1, 1, 384), dtype=np.float32))),
        )
        diagnostic = {}
        result = rescue_region_matches(
            encoder, Image.new('RGB', (400, 300)),
            [{'url': 'one', 'vectors': vectors()}], {'one': [{'id': 'a'}]},
            [match(.76, identity='old')], threading.Event(), diagnostic, seconds=30,
        )
        self.assertIsNotNone(result)
        self.assertNotEqual(diagnostic['outcome'], 'budget_exceeded')

if __name__ == '__main__':
    unittest.main()
