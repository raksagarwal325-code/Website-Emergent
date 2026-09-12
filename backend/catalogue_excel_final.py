"""Final compatibility wrapper for the admin Excel catalogue export.

This keeps PR #275's bounded concurrent thumbnail preparation, expands the
trusted image hosts to match the website's real product-image sources, and
removes the optional Excel table package from the generated workbook. The
worksheet-level autofilter and styling remain, but avoiding the table part
prevents older desktop Excel versions from opening the file in Repair mode.

The route also supports category-wise exports. Filtering before thumbnail
preparation keeps each export bounded to one product category, which improves
image-embedding reliability and produces smaller workbooks.
"""
from __future__ import annotations

import asyncio
import io
import zipfile
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

from fastapi import HTTPException, Request
from starlette.responses import Response

import catalogue_excel as base
import catalogue_excel_fast as fast

# Product images already used by the main website/backend. These remain subject
# to catalogue_excel's HTTPS-only, DNS/IP, no-redirect and size checks.
base._ALLOWED_EXTERNAL_IMAGE_HOSTS.update({
    "customer-assets.emergentagent.com",
    "d3adwkbyhxyrtq.cloudfront.net",
    "d33sy5i8bnduwe.cloudfront.net",
})

_CATEGORY_SLUGS = {
    "Chandelier": "chandeliers",
    "Hanging Light": "hanging-lights",
    "Wall Light": "wall-lights",
    "Table Lamp": "table-lamps",
    "Floor Lamp": "floor-lamps",
    "Candle Stand": "candle-stands",
    "Floor Chandelier": "floor-chandeliers",
    "Table Chandelier": "table-chandeliers",
    "Ceiling Light": "ceiling-lights",
    "Gate Light": "gate-lights",
}


def _strip_table_parts(payload: bytes) -> bytes:
    """Remove optional Excel table XML while preserving filters, drawings and data.

    The Products sheet already has a worksheet-level autofilter and styled
    header row. The extra structured-table package is not required for the
    export and was the most compatibility-sensitive part when opened in older
    desktop Excel builds. Removing it leaves a normal filtered worksheet and
    does not touch embedded image/drawing parts.
    """
    source = io.BytesIO(payload)
    output = io.BytesIO()

    with zipfile.ZipFile(source, "r") as zin, zipfile.ZipFile(
        output, "w", compression=zipfile.ZIP_DEFLATED
    ) as zout:
        for item in zin.infolist():
            name = item.filename
            if name.startswith("xl/tables/"):
                continue

            data = zin.read(name)

            if name == "[Content_Types].xml":
                root = ET.fromstring(data)
                for node in list(root):
                    if (
                        node.tag.endswith("Override")
                        and node.attrib.get("PartName", "").startswith("/xl/tables/")
                    ):
                        root.remove(node)
                data = ET.tostring(root, encoding="utf-8", xml_declaration=True)

            elif name.startswith("xl/worksheets/") and name.endswith(".xml"):
                root = ET.fromstring(data)
                for node in list(root):
                    if node.tag.endswith("tableParts"):
                        root.remove(node)
                data = ET.tostring(root, encoding="utf-8", xml_declaration=True)

            elif name.startswith("xl/worksheets/_rels/") and name.endswith(".rels"):
                root = ET.fromstring(data)
                for node in list(root):
                    rel_type = node.attrib.get("Type", "")
                    target = node.attrib.get("Target", "")
                    if rel_type.endswith("/table") or "/tables/" in target:
                        root.remove(node)
                data = ET.tostring(root, encoding="utf-8", xml_declaration=True)

            zout.writestr(item, data)

    return output.getvalue()


def _build_compatible_workbook(products: list[dict], thumbnails: dict[str, bytes]):
    payload, metadata = base.build_catalogue_workbook(
        products,
        image_loader=lambda url: thumbnails.get(url),
    )
    return _strip_table_parts(payload), metadata


def install_catalogue_excel(load_admin_func) -> None:
    """Install the bounded-time, compatibility-safe Excel export route."""
    server_module = base._find_server_module()
    if server_module is None:
        return
    app = server_module.app
    if getattr(app.state, "sge_catalogue_excel_installed", False):
        return

    @app.get("/api/admin/catalogue/products.xlsx")
    async def admin_catalogue_products_xlsx(request: Request, category: str | None = None):
        user = await load_admin_func(server_module.db, request)
        if user is None:
            if request.cookies.get("session_token") or request.headers.get("Authorization"):
                raise HTTPException(status_code=403, detail="Not authorized for admin.")
            raise HTTPException(status_code=401, detail="Authentication required.")

        selected_category = str(category or "").strip()
        if selected_category and selected_category not in _CATEGORY_SLUGS:
            raise HTTPException(status_code=400, detail="Unknown catalogue category.")

        product_filter = {"category": selected_category} if selected_category else {}
        products = await server_module.db.products.find(
            product_filter, {"_id": 0}
        ).sort("sku", 1).to_list(length=10000)

        thumbnails, preload = await fast._prefetch_thumbnails(
            products, server_module.get_object
        )

        payload, metadata = await asyncio.to_thread(
            _build_compatible_workbook,
            products,
            thumbnails,
        )

        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if selected_category:
            filename = f"samrat-glass-{_CATEGORY_SLUGS[selected_category]}-catalogue-{stamp}.xlsx"
        else:
            filename = f"samrat-glass-full-product-catalogue-{stamp}.xlsx"

        return Response(
            content=payload,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Cache-Control": "private, no-store",
                "Content-Disposition": f'attachment; filename="{filename}"',
                "X-Catalogue-Products": str(metadata["total"]),
                "X-Catalogue-Embedded-Images": str(metadata["embedded_images"]),
                "X-Catalogue-Image-Failures": str(metadata["image_failures"]),
                "X-Catalogue-Thumbnail-Requested": str(preload["requested"]),
                "X-Catalogue-Thumbnail-Prepared": str(preload["prepared"]),
                "X-Catalogue-Thumbnail-Timed-Out": str(preload["timed_out"]),
                "X-Catalogue-Compatibility": "worksheet-autofilter-no-table-part",
                "X-Catalogue-Category": selected_category or "all",
            },
        )

    app.state.sge_catalogue_excel_installed = True
