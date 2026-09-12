"""Admin-only runtime/source-control health snapshot.

The endpoint intentionally exposes only non-secret release metadata: the local
Git HEAD/branch/dirty state when a repository is present and a deployment SHA
when the hosting environment provides one. It never returns arbitrary
environment variables or file contents.
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

from fastapi import HTTPException, Request


_DEPLOYMENT_SHA_KEYS = (
    "RELEASE_SHA",
    "GIT_COMMIT_SHA",
    "COMMIT_SHA",
    "SOURCE_VERSION",
    "VERCEL_GIT_COMMIT_SHA",
    "RENDER_GIT_COMMIT",
    "RAILWAY_GIT_COMMIT_SHA",
)


def _first_deployment_sha() -> str | None:
    for key in _DEPLOYMENT_SHA_KEYS:
        value = str(os.environ.get(key) or "").strip()
        if value:
            return value
    return None


def _run_git(args: list[str], cwd: Path) -> str | None:
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=str(cwd),
            check=False,
            capture_output=True,
            text=True,
            timeout=2,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    if completed.returncode != 0:
        return None
    return completed.stdout.strip()


def get_release_snapshot(repo_root: Path | None = None) -> dict:
    root = repo_root or Path(__file__).resolve().parents[1]
    git_head = _run_git(["rev-parse", "HEAD"], root)
    git_branch = _run_git(["rev-parse", "--abbrev-ref", "HEAD"], root)
    porcelain = _run_git(["status", "--porcelain"], root)
    deployment_sha = _first_deployment_sha()

    git_dirty = None if porcelain is None else bool(porcelain)
    aligned = None
    if git_head and deployment_sha:
        left = git_head.lower()
        right = deployment_sha.lower()
        aligned = left.startswith(right) or right.startswith(left)

    if git_head and deployment_sha:
        runtime = "git+deployment"
    elif git_head:
        runtime = "git"
    elif deployment_sha:
        runtime = "deployment"
    else:
        runtime = "unavailable"

    return {
        "runtime": runtime,
        "git_head": git_head,
        "git_branch": git_branch,
        "git_dirty": git_dirty,
        "deployment_sha": deployment_sha,
        "aligned": aligned,
    }


def install_admin_health(load_admin_func) -> None:
    """Install GET /api/admin/health/release on the active FastAPI app."""
    try:
        import server as server_module
    except ImportError:
        try:
            from backend import server as server_module
        except ImportError:
            return

    app = getattr(server_module, "app", None)
    db = getattr(server_module, "db", None)
    if app is None or db is None:
        return
    if getattr(app.state, "sge_admin_health_installed", False):
        return

    @app.get("/api/admin/health/release")
    async def admin_health_release(request: Request):
        user = await load_admin_func(db, request)
        if user is None:
            if request.cookies.get("session_token") or request.headers.get("Authorization"):
                raise HTTPException(status_code=403, detail="Not authorized for admin.")
            raise HTTPException(status_code=401, detail="Authentication required.")
        return get_release_snapshot()

    app.state.sge_admin_health_installed = True
