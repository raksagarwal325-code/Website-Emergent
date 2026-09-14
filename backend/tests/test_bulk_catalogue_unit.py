from bulk_catalogue import build_bulk_change_plan, bulk_preview_token, normalize_bulk_changes


def test_bulk_changes_are_allow_listed_and_sync_fixed_price():
    patch = normalize_bulk_changes({
        "category": "  Chandelier  ",
        "status": "draft",
        "price_display": "fixed",
        "sku": "SHOULD-NOT-CHANGE",
    })
    assert patch == {
        "category": "Chandelier",
        "status": "draft",
        "price_display": "fixed",
        "fixed_price": True,
    }


def test_plan_only_includes_real_changes():
    products = [
        {"id": "p1", "name": "One", "sku": "SGE-CH-001", "status": "published", "featured": False},
        {"id": "p2", "name": "Two", "sku": "SGE-CH-002", "status": "draft", "featured": False},
    ]
    plan = build_bulk_change_plan(products, {"status": "draft", "featured": True})
    assert plan[0]["changes"] == [
        {"field": "status", "old": "published", "new": "draft"},
        {"field": "featured", "old": False, "new": True},
    ]
    assert plan[1]["changes"] == [
        {"field": "featured", "old": False, "new": True},
    ]


def test_preview_token_changes_when_product_changes_after_preview():
    before = build_bulk_change_plan(
        [{"id": "p1", "updated_at": "one", "status": "published"}],
        {"status": "draft"},
    )
    after = build_bulk_change_plan(
        [{"id": "p1", "updated_at": "two", "status": "published"}],
        {"status": "draft"},
    )
    assert bulk_preview_token(before) != bulk_preview_token(after)
