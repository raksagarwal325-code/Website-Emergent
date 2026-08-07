"""
Regression: backend CATEGORY_FEATURED_ALLOWED must contain exactly the
db_names of every curated category in categories.data.json. If a curator
adds a new category to the JSON registry but forgets to add it here, all
admin category-image endpoints will reject uploads for that category
with 400 — this test catches that drift immediately.
"""
import json
from pathlib import Path

from server import CATEGORY_FEATURED_ALLOWED


def _curated_db_names():
    registry_path = (
        Path(__file__).resolve().parents[2]
        / "frontend"
        / "src"
        / "lib"
        / "categories.data.json"
    )
    with registry_path.open() as fh:
        data = json.load(fh)
    return {c["db_name"] for c in data["categories"] if c.get("published")}


def test_allow_list_matches_curated_registry_exactly():
    """Prevents Admin → Category Images from silently rejecting a new category."""
    curated = _curated_db_names()
    assert CATEGORY_FEATURED_ALLOWED == curated, (
        "CATEGORY_FEATURED_ALLOWED is out of sync with categories.data.json.\n"
        f"  Missing from allow-list: {curated - CATEGORY_FEATURED_ALLOWED}\n"
        f"  Stale in allow-list:     {CATEGORY_FEATURED_ALLOWED - curated}"
    )


def test_allow_list_includes_new_chandelier_variants():
    """Both Floor Chandelier and Table Chandelier must be manageable."""
    assert "Floor Chandelier" in CATEGORY_FEATURED_ALLOWED
    assert "Table Chandelier" in CATEGORY_FEATURED_ALLOWED


def test_allow_list_still_covers_original_six():
    """Nothing removed by the recent additions."""
    for name in (
        "Chandelier",
        "Hanging Light",
        "Wall Light",
        "Table Lamp",
        "Floor Lamp",
        "Candle Stand",
    ):
        assert name in CATEGORY_FEATURED_ALLOWED, f"{name} regressed out of the allow-list"
