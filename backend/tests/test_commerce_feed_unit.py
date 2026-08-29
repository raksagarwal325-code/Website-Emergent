from commerce_feed import REQUIRED_FIELDS, build_feed, build_feed_row


def slug(doc):
    return f"sample-{str(doc.get('sku', '')).lower()}"


def image(raw):
    if not raw:
        return ""
    return raw if raw.startswith("http") else f"https://samratglass.com{raw}"


def product(**overrides):
    base = {
        "id": "p1",
        "sku": "SGE-CH-001",
        "name": "Sample Chandelier",
        "short_description": "Handcrafted glass chandelier",
        "images": ["/api/media/sample.jpg"],
        "price": 42000,
        "currency": "INR",
        "price_display": "starting_from",
        "stock": 0,
        "status": "published",
    }
    base.update(overrides)
    return base


def build_one(doc):
    return build_feed_row(
        doc,
        site_origin="https://samratglass.com",
        slug_builder=slug,
        image_url_builder=image,
    )


def test_eligible_product_has_openai_required_fields():
    row, reasons = build_one(product())
    assert reasons == []
    assert all(row[field] for field in REQUIRED_FIELDS)
    assert row["price"] == "42000.00 INR"
    assert row["availability"] == "preorder"
    assert row["link"].endswith("/product/sample-sge-ch-001")


def test_in_stock_mapping():
    row, _ = build_one(product(stock=3))
    assert row["availability"] == "in_stock"


def test_price_on_request_never_leaks_stored_price():
    row, reasons = build_one(product(price=99999, price_display="on_request"))
    assert row is None
    assert "price_on_request" in reasons


def test_zero_price_is_excluded_and_legacy_currency_is_reported():
    row, reasons = build_one(product(price=0, currency="USD"))
    assert row is None
    assert reasons == ["missing_positive_price"]

    row, reasons = build_one(product(currency="USD"))
    assert reasons == []
    assert row["price"] == "42000.00 INR"
    assert row["_warnings"] == ["source_currency_not_inr"]


def test_missing_required_content_is_reported():
    row, reasons = build_one(product(short_description="", description="", images=[]))
    assert row is None
    assert "missing_description" in reasons
    assert "missing_image_link" in reasons


def test_readiness_summary_counts_each_reason():
    rows, excluded, counts = build_feed(
        [product(), product(id="p2", sku="SGE-CH-002", price_display="on_request")],
        site_origin="https://samratglass.com",
        slug_builder=slug,
        image_url_builder=image,
    )
    assert len(rows) == 1
    assert len(excluded) == 1
    assert counts == {"price_on_request": 1}
