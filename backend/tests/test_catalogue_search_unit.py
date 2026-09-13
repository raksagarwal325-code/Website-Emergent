import unittest

from catalogue_search import catalogue_search_filter, resolve_catalogue_query


class CatalogueSearchUnitTests(unittest.TestCase):
    def test_common_chandelier_typos_resolve_to_one_verified_term(self):
        for typo in ("chandlier", "chandeliar", "chandalier", "chandeller"):
            self.assertEqual(resolve_catalogue_query(typo), ("chandelier", "chandelier"))

    def test_query_is_trimmed_lowercased_and_regex_escaped(self):
        resolved, suggestion = resolve_catalogue_query("  SGE-CH-(007)  ")
        self.assertEqual(resolved, "sge-ch-(007)")
        self.assertIsNone(suggestion)
        clauses = catalogue_search_filter(resolved)
        sku_pattern = clauses[1]["sku"]["$regex"]
        self.assertEqual(sku_pattern, r"sge\-ch\-\(007\)")

    def test_colour_search_uses_name_tags_and_colour_specs_not_description(self):
        clauses = catalogue_search_filter("red")
        fields = {next(iter(clause)) for clause in clauses}
        self.assertIn("name", fields)
        self.assertIn("tags", fields)
        self.assertIn("specs.Glass Colour", fields)
        self.assertNotIn("description", fields)
        self.assertNotIn("short_description", fields)

    def test_non_colour_search_keeps_description_recovery(self):
        fields = {next(iter(clause)) for clause in catalogue_search_filter("lotus")}
        self.assertIn("description", fields)
        self.assertIn("short_description", fields)


if __name__ == "__main__":
    unittest.main()
