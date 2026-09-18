"""Audit and normalize legacy product currency metadata to INR.

Dry-run is the default. Pass --apply only after reviewing the printed counts.
This script changes currency metadata only; it never converts or edits prices.
"""

import argparse
import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient


ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

LEGACY_CURRENCY_FILTER = {
    "$or": [
        {"currency": {"$exists": False}},
        {"currency": None},
        {"currency": {"$regex": r"^\s*$"}},
        {"currency": {"$regex": r"^\s*USD\s*$", "$options": "i"}},
    ]
}


async def currency_counts(products):
    pipeline = [
        {
            "$group": {
                "_id": {"$ifNull": ["$currency", "<missing>"]},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"count": -1, "_id": 1}},
    ]
    return await products.aggregate(pipeline).to_list(None)


async def run(apply: bool) -> int:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    database = client[db_name]
    products = database.products

    try:
        before = await currency_counts(products)
        affected = await products.find(
            LEGACY_CURRENCY_FILTER,
            {"_id": 0, "id": 1, "sku": 1, "currency": 1},
        ).to_list(None)
        report = {
            "mode": "apply" if apply else "dry-run",
            "before": before,
            "affected_count": len(affected),
            "sample": affected[:20],
            "price_values_changed": 0,
        }

        if apply and affected:
            migration_id = f"product-currency-inr-{uuid.uuid4()}"
            captured_at = datetime.now(timezone.utc).isoformat()
            backups = [
                {
                    "migration_id": migration_id,
                    "captured_at": captured_at,
                    "product_id": row.get("id"),
                    "sku": row.get("sku"),
                    "original_currency": row.get("currency", "<missing>"),
                }
                for row in affected
            ]
            await database.product_currency_migration_backups.insert_many(backups)
            result = await products.update_many(
                LEGACY_CURRENCY_FILTER,
                {"$set": {"currency": "INR", "updated_at": captured_at}},
            )
            report.update(
                {
                    "migration_id": migration_id,
                    "matched_count": result.matched_count,
                    "modified_count": result.modified_count,
                    "after": await currency_counts(products),
                }
            )

        print(json.dumps(report, indent=2, default=str))
        return 0
    finally:
        client.close()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Back up affected currency values and update USD/blank/missing values to INR.",
    )
    args = parser.parse_args()
    return asyncio.run(run(args.apply))


if __name__ == "__main__":
    raise SystemExit(main())
