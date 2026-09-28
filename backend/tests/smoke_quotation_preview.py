"""Run one real Preview catalogue image through the quotation backend.

Usage, after checking out the intended branch in /app:
    cd /app/backend && /root/.venv/bin/python tests/smoke_quotation_preview.py

This checks the deployed database and object store. It never changes products;
the normal quick search may backfill missing file signatures.
"""

import asyncio
import io
import sys
from pathlib import Path

from PIL import Image, ImageOps
from starlette.datastructures import Headers, UploadFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server  # noqa: E402


async def search(data: bytes, mime: str):
    upload = UploadFile(
        file=io.BytesIO(data), filename="preview-smoke.png",
        headers=Headers({"content-type": mime}),
    )
    return await server.match_quotation_product_by_image(
        file=upload, limit=10, quick=True,
        admin=server._AdminUser(user_id="preview-smoke", email="preview-smoke@localhost"),
    )


async def main():
    products = await server.db.products.find(
        {"status": "published", "images": {"$exists": True, "$ne": []}},
        {"_id": 0, "id": 1, "sku": 1, "images": 1},
    ).to_list(5000)
    linked = await server._quotation_project_photos(products)
    print(f"Preview: published_products={len(products)} linked_project_photos={len(linked)}", flush=True)
    if not linked:
        raise RuntimeError("No linked project photos in this database; cannot run this check")

    choices = [
        (url, rows) for url, rows in linked.items()
        if url.startswith("/api/files/") and rows
    ]
    choices.sort(key=lambda choice: (
        not any(row.get("sku") == "SGE-CH-007" for row in choice[1]),
        len(choice[1]), choice[0],
    ))
    url, linked_products = choices[0]
    expected = {str(row.get("sku") or "") for row in linked_products}
    path = url.removeprefix("/api/files/")
    row = await server.db.files.find_one(
        {"storage_path": path}, {"_id": 0, "public_sha256": 1, "public_pixel_hash": 1}
    )
    if not row:
        raise RuntimeError(f"Project photo is linked but has no db.files record: {url}")
    data, mime = await asyncio.to_thread(server.get_object, path)
    mime = (mime or "").split(";", 1)[0].lower()
    if mime not in {"image/jpeg", "image/png", "image/webp"}:
        raise RuntimeError(f"Unsupported project photo type: {mime}")

    print(f"Checking project photo {url} linked_skus={sorted(expected)}", flush=True)
    result = await search(data, mime)
    if not expected.intersection(str(m.get("sku")) for m in result.get("matches", [])):
        task = server._quotation_project_index_task
        if task and not task.done():
            print("Waiting up to 120 seconds for linked project photo signatures", flush=True)
            await asyncio.wait_for(asyncio.shield(task), timeout=120)
            result = await search(data, mime)
    found = [(m.get("sku"), m.get("match_label")) for m in result.get("matches", [])]
    print(f"Original: engine={result.get('engine')} results={found}", flush=True)
    if not expected.intersection(sku for sku, _ in found):
        raise AssertionError("FAIL: actual linked product missing for unchanged project photo")

    # Reencode the same pixels without the original metadata. WhatsApp and
    # downloaded photos often alter metadata without changing the product.
    with Image.open(io.BytesIO(data)) as opened:
        pixels = ImageOps.exif_transpose(opened).convert("RGB")
        output = io.BytesIO()
        pixels.save(output, format="PNG")
    edited = await search(output.getvalue(), "image/png")
    found = [(m.get("sku"), m.get("match_label")) for m in edited.get("matches", [])]
    print(f"Reencoded: engine={edited.get('engine')} results={found}", flush=True)
    if not expected.intersection(sku for sku, _ in found):
        raise AssertionError("FAIL: actual linked product missing after metadata change")
    print("PASS: a real linked Preview photo finds its catalogue product twice", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
