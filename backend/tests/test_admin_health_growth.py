from admin_health_growth import (
    _collection_health,
    _demand_health,
    _project_health,
    _project_slugs,
    _route_integrity,
)
from datetime import datetime, timezone


def product(pid, sku, name, category="Chandelier", tags=None, status="published"):
    return {
        "id": pid,
        "sku": sku,
        "name": name,
        "category": category,
        "tags": tags or [],
        "status": status,
    }


def test_project_slugs_disambiguate_duplicate_titles():
    assert _project_slugs([{"title": "Lucknow Residence"}, {"title": "Lucknow Residence"}, {"title": ""}]) == [
        "lucknow-residence",
        "lucknow-residence-2",
        "project-3",
    ]


def test_collection_health_flags_orphans_and_weak_registry_entries():
    products = [
        product("1", "SGE-1", "One", tags=["collection:raj"]) ,
        product("2", "SGE-2", "Two", tags=["collection:orphan"]) ,
    ]
    settings = {"homepage_content": {"collections": [{"slug": "raj", "name": "Raj"}]}}
    health = _collection_health(products, settings)
    issues = {item["issue"] for item in health["findings"]}
    assert "Orphan collection membership tag" in issues
    assert "Collection has very few products" in issues
    assert "Collection has only one category represented" in issues
    assert "No featured collection product selected" in issues


def test_project_health_flags_missing_link_and_product_name_title():
    products = [product("p1", "SGE-1", "Rajsi Chandelier")]
    settings = {
        "homepage_content": {
            "gallery": {
                "items": [
                    {
                        "title": "Rajsi Chandelier",
                        "location": "",
                        "images": ["/api/files/a.jpg", "/api/files/a.jpg"],
                        "products": ["missing"],
                        "note": "",
                        "fixture_details": "",
                    }
                ]
            }
        }
    }
    health = _project_health(products, settings)
    issues = {item["issue"] for item in health["findings"]}
    assert "Missing project location" in issues
    assert "Duplicate project image URL" in issues
    assert "Project has orphaned product links" in issues
    assert "Project has no story or fixture details" in issues
    assert "Project title matches a product name" in issues


def test_route_integrity_flags_duplicate_product_slugs():
    products = [product("1", "A", "One"), product("2", "B", "Two")]
    collections = {"registered": 0, "rows": []}
    projects = {"projects": 0}
    result = _route_integrity(products, collections, projects, lambda _: "same")
    assert result["unique_product_routes"] == 1
    assert any(item["issue"] == "Duplicate published product route" for item in result["findings"])


def test_demand_health_is_explicitly_inquiry_only():
    now = datetime(2026, 9, 12, tzinfo=timezone.utc)
    products = [product("p1", "SGE-1", "One"), product("p2", "SGE-2", "Two")]
    inquiries = [
        {
            "id": "i1",
            "created_at": "2026-09-10T00:00:00+00:00",
            "items": [{"product_id": "p1", "quantity": 2}],
        }
    ]
    result = _demand_health(products, inquiries, now)
    assert result["products_with_inquiry_demand_30d"] == 1
    assert result["published_products_without_inquiry_demand_90d"] == 1
    assert result["top_products"][0]["sku"] == "SGE-1"
    assert "not page views" in result["metric_scope"].lower()
