import sys
import unittest
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from customer_design_ranking import (DESIGN_VERSION, add_related_designs,
    needs_detail_check, promote_detail_match, unpack_details)


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
