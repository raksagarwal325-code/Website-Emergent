import sys
import unittest
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from customer_design_ranking import (DESIGN_VERSION, add_related_designs,
    needs_detail_check, promote_detail_match, promote_regional_detail_matches,
    unpack_details)


def detail(axis):
    v = np.zeros((8, 384), dtype='<f2')
    v[:, axis] = 1
    return v.tobytes()


def match(sku, score=.85, kind='similar', category='chandelier'):
    return {'product': {'id': sku, 'sku': sku, 'category': category},
            'score': score, 'match_type': kind}


class DesignRankingTests(unittest.TestCase):
    def test_preserves_exact_confident_and_clear_leaders(self):
        for first in [match('a',1,'exact'),match('a',.95),match('a',.85)]:
            following = match('b', .70 if first['score']==.85 else .84)
            self.assertFalse(needs_detail_check([first,following]))

    def test_promotes_detail_winner_without_reordering_other_candidates(self):
        matches=[match('a'),match('b',.84),match('c',.82)]
        mapping={m['product']['id']:[m['product']] for m in matches}
        rows=[{'url':k,'design_version':DESIGN_VERSION,'design_vectors':detail(0 if k=='c' else 1)} for k in mapping]
        result=promote_detail_match(matches,detail(0),rows,mapping)
        self.assertEqual([m['product']['id'] for m in result],['c','a','b'])
        self.assertEqual(result[0]['match_type'],'closest')
        self.assertEqual(matches[2]['match_type'],'similar')
        rows[0].pop('design_vectors')
        self.assertIs(promote_detail_match(matches,detail(0),rows,mapping),matches)

    def test_invalid_details_and_weak_evidence_preserve_results(self):
        self.assertIsNone(unpack_details(b'bad'))
        self.assertIsNone(unpack_details(np.full((8,384),np.nan,dtype='<f2').tobytes()))
        matches=[match('a'),match('b',.84)]
        mapping={m['product']['id']:[m['product']] for m in matches}
        rows=[{'url':k,'design_version':DESIGN_VERSION,'design_vectors':detail(0)} for k in mapping]
        self.assertIs(promote_detail_match(matches,detail(0),rows,mapping),matches)

    def test_regional_details_reorder_only_within_the_same_category(self):
        matches = [
            match('SGE-CH-004', kind='closest'),
            match('SGE-TL-008', kind='closest', category='Table Lamp'),
            match('SGE-HL-075', kind='closest', category='Hanging Light'),
            match('SGE-CH-013', .79),
        ]
        mapping = {item['product']['id']: [item['product']] for item in matches}
        rows = [
            {'url': item['product']['id'], 'design_version': DESIGN_VERSION,
             'design_vectors': detail(0 if item['product']['id'] == 'SGE-CH-013' else 1)}
            for item in matches
        ]
        diagnostic = {}
        result = promote_regional_detail_matches(
            matches, [detail(0)], rows, mapping, diagnostic)
        self.assertEqual([item['product']['id'] for item in result], [
            'SGE-CH-013', 'SGE-TL-008', 'SGE-HL-075', 'SGE-CH-004'])
        self.assertEqual(result[0]['match_type'], 'closest')
        self.assertEqual(diagnostic['regional_detail_candidates'][0]['winner'],
                         'SGE-CH-013')

    def test_regional_details_require_complete_and_decisive_evidence(self):
        matches = [match('a'), match('b', .84)]
        mapping = {item['product']['id']: [item['product']] for item in matches}
        tied = [{'url': key, 'design_version': DESIGN_VERSION,
                 'design_vectors': detail(0)} for key in mapping]
        self.assertEqual(
            promote_regional_detail_matches(matches, [detail(0)], tied, mapping),
            matches)
        self.assertIs(
            promote_regional_detail_matches(matches, [detail(0)], tied[:1], mapping),
            matches)

    def test_regional_detail_can_promote_cross_category_internal_probe(self):
        chandelier = match('SGE-CH-034', kind='closest')
        hanging = match('SGE-HL-119', .66, kind='probe', category='Hanging Light')
        hanging['_detail_probe'] = True
        matches = [chandelier, hanging]
        mapping = {item['product']['id']: [item['product']] for item in matches}
        rows = [
            {'url': 'SGE-CH-034', 'design_version': DESIGN_VERSION,
             'design_vectors': detail(1)},
            {'url': 'SGE-HL-119', 'design_version': DESIGN_VERSION,
             'design_vectors': detail(0)},
        ]
        diagnostic = {}
        result = promote_regional_detail_matches(
            matches, [detail(0)], rows, mapping, diagnostic)
        self.assertEqual([item['product']['id'] for item in result],
                         ['SGE-HL-119', 'SGE-CH-034'])
        self.assertEqual(result[0]['match_type'], 'closest')
        self.assertTrue(diagnostic['regional_detail_probe']['promoted'])
        self.assertFalse(any(item.get('_detail_probe') for item in result))

    def test_regional_detail_never_leaks_weak_internal_probe(self):
        chandelier = match('SGE-CH-034', kind='closest')
        hanging = match('SGE-HL-119', .66, kind='probe', category='Hanging Light')
        hanging['_detail_probe'] = True
        matches = [chandelier, hanging]
        mapping = {item['product']['id']: [item['product']] for item in matches}
        rows = [
            {'url': item['product']['id'], 'design_version': DESIGN_VERSION,
             'design_vectors': detail(0)} for item in matches
        ]
        result = promote_regional_detail_matches(
            matches, [detail(0)], rows, mapping)
        self.assertEqual([item['product']['id'] for item in result], ['SGE-CH-034'])
        self.assertFalse(any(item.get('_detail_probe') for item in result))

    def test_regional_detail_can_recover_different_hanging_sets_from_separate_crops(self):
        chandelier = match('SGE-CH-034', kind='closest')
        hanging_69 = match('SGE-HL-069', .66, kind='probe', category='Hanging Light')
        hanging_70 = match('SGE-HL-070', .65, kind='probe', category='Hanging Light')
        hanging_69['_detail_probe'] = True
        hanging_70['_detail_probe'] = True
        matches = [chandelier, hanging_69, hanging_70]
        mapping = {item['product']['id']: [item['product']] for item in matches}
        rows = [
            {'url': 'SGE-CH-034', 'design_version': DESIGN_VERSION,
             'design_vectors': detail(1)},
            {'url': 'SGE-HL-069', 'design_version': DESIGN_VERSION,
             'design_vectors': detail(0)},
            {'url': 'SGE-HL-070', 'design_version': DESIGN_VERSION,
             'design_vectors': detail(2)},
        ]
        diagnostic = {}
        result = promote_regional_detail_matches(
            matches, [detail(0), detail(2)], rows, mapping, diagnostic)
        self.assertEqual([item['product']['id'] for item in result[:2]],
                         ['SGE-HL-069', 'SGE-HL-070'])
        self.assertTrue(all(item['match_type'] == 'closest' for item in result[:2]))
        self.assertEqual(
            [item['winner'] for item in diagnostic['regional_detail_probes']
             if item['promoted']],
            ['SGE-HL-069', 'SGE-HL-070'],
        )
        self.assertFalse(any(item.get('_detail_probe') for item in result))

    def test_related_designs_follow_anchor_and_require_available_unambiguous_sku(self):
        a,b,c=match('a'),match('b'),match('c',category='wall')
        result=add_related_designs([a,b],[a['product'],b['product'],c['product']],[{'skus':['a','b','c','missing']}])
        self.assertEqual([m['product']['id'] for m in result],['a','b'])
        self.assertEqual([m['match_type'] for m in result],['closest','related'])
        duplicate={**b['product'],'id':'another-b'}
        self.assertEqual(add_related_designs([a],[a['product'],b['product'],duplicate],[{'skus':['a','b']}]),[a])

    def test_all_exact_matches_stay_before_related_results(self):
        a,b,c=match('a',1,'exact'),match('b',1,'exact'),match('c')
        result=add_related_designs([a,b,c],[x['product'] for x in [a,b,c]],[{'skus':['a','c']}])
        self.assertEqual([m['match_type'] for m in result],['exact','exact','related'])

    def test_possible_results_never_expand_and_unrelated_order_is_preserved(self):
        a,b=match('a',.6,'possible'),match('b',.58,'possible')
        self.assertEqual(add_related_designs([a,b],[x['product'] for x in [a,b]],[{'skus':['a','b']}]),[a,b])


if __name__ == '__main__':
    unittest.main()
