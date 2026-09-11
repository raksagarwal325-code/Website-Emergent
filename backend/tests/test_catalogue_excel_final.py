import io
import zipfile

from openpyxl import load_workbook
from PIL import Image

import catalogue_excel as base
import catalogue_excel_final as final


def _tiny_png():
    out = io.BytesIO()
    Image.new("RGB", (20, 12), "white").save(out, format="PNG")
    return out.getvalue()


def test_real_product_image_hosts_are_allowed_for_excel_export():
    assert "customer-assets.emergentagent.com" in base._ALLOWED_EXTERNAL_IMAGE_HOSTS
    assert "d3adwkbyhxyrtq.cloudfront.net" in base._ALLOWED_EXTERNAL_IMAGE_HOSTS
    assert "d33sy5i8bnduwe.cloudfront.net" in base._ALLOWED_EXTERNAL_IMAGE_HOSTS


def test_compatible_workbook_removes_table_parts_but_keeps_filter_and_image():
    products = [
        {
            "id": "p-1",
            "sku": "SGE-CH-001",
            "name": "Test Chandelier",
            "category": "Chandelier",
            "status": "published",
            "price_display": "starting_from",
            "price": 12500,
            "currency": "INR",
            "images": ["https://customer-assets.emergentagent.com/test.jpg"],
            "specs": {"Lights": "8"},
        }
    ]

    payload, metadata = final._build_compatible_workbook(
        products,
        {"https://customer-assets.emergentagent.com/test.jpg": _tiny_png()},
    )

    assert metadata["embedded_images"] == 1

    with zipfile.ZipFile(io.BytesIO(payload), "r") as archive:
        names = set(archive.namelist())
        assert not any(name.startswith("xl/tables/") for name in names)
        assert "xl/worksheets/sheet1.xml" in names
        sheet_xml = archive.read("xl/worksheets/sheet1.xml")
        assert b"tableParts" not in sheet_xml
        assert b"autoFilter" in sheet_xml

    wb = load_workbook(io.BytesIO(payload))
    ws = wb["Products"]
    assert ws.auto_filter.ref
    assert len(ws._images) == 1
    assert ws.tables == {}


def test_strip_table_parts_is_idempotent_for_plain_zip_workbook():
    products = [
        {
            "id": "p-2",
            "sku": "SGE-TL-001",
            "name": "Test Lamp",
            "category": "Table Lamp",
            "status": "published",
            "images": [],
            "specs": {},
        }
    ]
    payload, _ = base.build_catalogue_workbook(products)
    once = final._strip_table_parts(payload)
    twice = final._strip_table_parts(once)

    wb = load_workbook(io.BytesIO(twice))
    assert wb["Products"].max_row == 2
    assert wb["Products"].tables == {}
