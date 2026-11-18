"""Minimal public readiness probe for external uptime monitors."""
import asyncio

from fastapi import Response

PING_TIMEOUT_SECONDS = 2.0


def install_public_health(router, database):
    @router.api_route("/health", methods=["GET", "HEAD"], include_in_schema=False)
    async def public_health():
        # No catalogue reads, writes, credentials, or error details in response.
        try:
            result = await asyncio.wait_for(
                database.command("ping"), timeout=PING_TIMEOUT_SECONDS
            )
            healthy = result.get("ok") == 1
        except Exception:
            healthy = False

        return Response(
            status_code=200 if healthy else 503,
            headers={"Cache-Control": "no-store, max-age=0"},
        )
