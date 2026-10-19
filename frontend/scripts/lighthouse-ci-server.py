#!/usr/bin/env python3
"""CI-only production-like server for Lighthouse.

Serves the built React app from ./build with gzip compression and proxies
anonymous GET/HEAD /api requests to https://samratglass.com. The browser sees
one localhost origin, so production same-origin image-variant requests are
tested without tripping hotlink protection on the live backend.

This script is intentionally CI-only. It does not change production runtime.
"""

from __future__ import annotations

import gzip
import mimetypes
import os
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib import error, request
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1] / "build"
UPSTREAM = os.environ.get("LIGHTHOUSE_UPSTREAM", "https://samratglass.com").rstrip("/")
PORT = int(os.environ.get("LIGHTHOUSE_PORT", "4173"))
COMPRESSIBLE = {
    ".html", ".js", ".css", ".json", ".svg", ".txt", ".xml", ".webmanifest",
}
PROXY_HEADERS = {
    "Accept": "*/*",
    "Accept-Encoding": "identity",
    "User-Agent": "SamratGlass-Lighthouse-CI/1.0",
}


def safe_build_path(raw_path: str) -> Path | None:
    path = urlsplit(raw_path).path
    relative = path.lstrip("/") or "index.html"
    candidate = (ROOT / relative).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        return None
    if candidate.is_dir():
        candidate = candidate / "index.html"
    if candidate.is_file():
        return candidate

    # React-router / prerender fallback.
    nested = (ROOT / relative / "index.html").resolve()
    try:
        nested.relative_to(ROOT.resolve())
    except ValueError:
        return None
    if nested.is_file():
        return nested
    index = ROOT / "index.html"
    return index if index.is_file() else None


class Handler(BaseHTTPRequestHandler):
    server_version = "SGELighthouseCI/1.0"

    def log_message(self, fmt: str, *args) -> None:
        print(f"[quality-server] {self.address_string()} - {fmt % args}", flush=True)

    def do_GET(self) -> None:  # noqa: N802
        self._handle(send_body=True)

    def do_HEAD(self) -> None:  # noqa: N802
        self._handle(send_body=False)

    def _handle(self, send_body: bool) -> None:
        if urlsplit(self.path).path.startswith("/api/"):
            self._proxy(send_body)
        else:
            self._static(send_body)

    def _proxy(self, send_body: bool) -> None:
        upstream_url = f"{UPSTREAM}{self.path}"
        req = request.Request(
            upstream_url,
            method="GET" if send_body else "HEAD",
            headers=PROXY_HEADERS,
        )
        try:
            with request.urlopen(req, timeout=30) as response:
                body = response.read() if send_body else b""
                self.send_response(response.status)
                for header in (
                    "Content-Type",
                    "Cache-Control",
                    "ETag",
                    "Last-Modified",
                    "Content-Disposition",
                ):
                    value = response.headers.get(header)
                    if value:
                        self.send_header(header, value)
                self.send_header("X-SGE-CI-Upstream", "samratglass.com")
                if send_body:
                    self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                if send_body:
                    self.wfile.write(body)
        except error.HTTPError as exc:
            body = exc.read() if send_body else b""
            self.send_response(exc.code)
            if exc.headers.get("Content-Type"):
                self.send_header("Content-Type", exc.headers["Content-Type"])
            if send_body:
                self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if send_body:
                self.wfile.write(body)
        except Exception as exc:
            body = f"CI upstream proxy failed: {exc}".encode("utf-8")
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            if send_body:
                self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if send_body:
                self.wfile.write(body)

    def _static(self, send_body: bool) -> None:
        path = safe_build_path(self.path)
        if path is None:
            self.send_error(404)
            return

        data = path.read_bytes()
        content_type, _ = mimetypes.guess_type(str(path))
        content_type = content_type or "application/octet-stream"
        if content_type.startswith("text/") and "charset=" not in content_type:
            content_type += "; charset=utf-8"

        accepts_gzip = "gzip" in (self.headers.get("Accept-Encoding") or "").lower()
        should_gzip = accepts_gzip and path.suffix.lower() in COMPRESSIBLE and len(data) > 512
        if should_gzip:
            data = gzip.compress(data, compresslevel=6)

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Vary", "Accept-Encoding")
        if should_gzip:
            self.send_header("Content-Encoding", "gzip")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if send_body:
            self.wfile.write(data)


def main() -> None:
    if not ROOT.is_dir():
        raise SystemExit(f"build directory missing: {ROOT}")
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(
        f"quality server ready on http://127.0.0.1:{PORT} "
        f"(build={ROOT}, api_upstream={UPSTREAM})",
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
