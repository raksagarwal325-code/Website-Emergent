from product_history import editable_product_snapshot, product_changes


def test_snapshot_only_contains_restorable_catalogue_fields():
    product = {
        "id": "p1",
        "name": "Old name",
        "sku": "SGE-CH-001",
        "category": "Chandelier",
        "price": 0,
        "specs": {"Lights": "8"},
        "rating": 4.8,
        "review_count": 12,
        "created_at": "yesterday",
        "updated_at": "today",
    }
    snapshot = editable_product_snapshot(product)
    assert snapshot["name"] == "Old name"
    assert snapshot["specs"] == {"Lights": "8"}
    assert "id" not in snapshot
    assert "rating" not in snapshot
    assert "review_count" not in snapshot
    assert "updated_at" not in snapshot


def test_changes_include_old_new_values_and_nested_specs():
    before = {
        "name": "Eight-Light Chandelier",
        "sku": "SGE-CH-001",
        "specs": {"Lights": "8", "Finish": "Brass"},
        "tags": ["heritage"],
    }
    after = {
        "name": "Twelve-Light Chandelier",
        "sku": "SGE-CH-001",
        "specs": {"Lights": "12", "Finish": "Brass"},
        "tags": ["heritage", "bespoke"],
    }
    changes = product_changes(before, after)
    assert changes["name"] == {
        "old": "Eight-Light Chandelier",
        "new": "Twelve-Light Chandelier",
    }
    assert changes["specs.Lights"] == {"old": "8", "new": "12"}
    assert changes["tags"] == {
        "old": ["heritage"],
        "new": ["heritage", "bespoke"],
    }
    assert "sku" not in changes
    assert "specs.Finish" not in changes
