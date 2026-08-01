"""Sitemap contract tests — SEO category URLs and legacy URL hygiene.

The sitemap is our single indexable-URL manifest for Google. Two things must
be true after the category-SEO refactor:

  1. The six clean permanent URLs `/category/<slug>` appear in the sitemap,
     exactly once each, with a valid `<loc>` element.
  2. Legacy `?category=<name>` query URLs must NEVER appear — those are
     client-side redirects, not indexable endpoints.

A third smoke check confirms the response is well-formed XML with the
correct namespace and the `application/xml` content type.
"""

from __future__ import annotations

import os
import xml.etree.ElementTree as ET

import httpx


def _api_base() -> str:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip() + "/api"
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


API = _api_base()
SITE_ORIGIN = "https://samratglass.com"

# Canonical, sorted list — mirrors src/lib/categories.data.json.
CATEGORY_URLS = [
    f"{SITE_ORIGIN}/category/candle-stands",
    f"{SITE_ORIGIN}/category/chandeliers",
    f"{SITE_ORIGIN}/category/floor-chandeliers",
    f"{SITE_ORIGIN}/category/floor-lamps",
    f"{SITE_ORIGIN}/category/hanging-lights",
    f"{SITE_ORIGIN}/category/table-chandeliers",
    f"{SITE_ORIGIN}/category/table-lamps",
    f"{SITE_ORIGIN}/category/wall-lights",
]


def _get_sitemap_body() -> str:
    with httpx.Client(base_url=API, timeout=20) as c:
        r = c.get("/sitemap.xml")
        assert r.status_code == 200, r.text
        assert "xml" in r.headers.get("content-type", "").lower()
        return r.text


def test_sitemap_is_well_formed_xml():
    body = _get_sitemap_body()
    root = ET.fromstring(body)
    # <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    assert root.tag.endswith("urlset"), root.tag


def test_sitemap_contains_all_eight_category_urls():
    body = _get_sitemap_body()
    for url in CATEGORY_URLS:
        # Each URL should appear exactly once as a <loc>.
        needle = f"<loc>{url}</loc>"
        assert body.count(needle) == 1, f"{url} appeared {body.count(needle)}x"


def test_sitemap_excludes_all_and_query_urls():
    """`All` is a filter-only concept — the sitemap must not advertise it."""
    body = _get_sitemap_body()
    # Legacy query URLs are handled by client-side redirect; they must not be
    # advertised as canonical, indexable endpoints.
    assert "/catalog?category=" not in body
    assert "?category=" not in body
    # Explicitly guard against an "All" pseudo-category slug.
    assert "/category/all" not in body.lower()
    assert "/category/none" not in body.lower()
    assert "/category/undefined" not in body.lower()


def test_sitemap_category_urls_have_priority_and_changefreq():
    body = _get_sitemap_body()
    root = ET.fromstring(body)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    entries = {
        url_el.findtext("sm:loc", namespaces=ns): url_el
        for url_el in root.findall("sm:url", namespaces=ns)
    }
    for url in CATEGORY_URLS:
        el = entries.get(url)
        assert el is not None, f"missing entry for {url}"
        assert el.findtext("sm:changefreq", namespaces=ns) == "weekly"
        prio = el.findtext("sm:priority", namespaces=ns)
        # Comfortably higher than legal pages, deliberately just below /
        # and /catalog so it doesn't outrank the storefront.
        assert 0.6 < float(prio) < 1.0, f"unexpected priority for {url}: {prio}"
