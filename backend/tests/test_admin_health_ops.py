import admin_health_ops as health


def test_robots_parser_accepts_public_site_and_collects_sitemaps():
    robots = """User-agent: *
Allow: /
Disallow: /admin
Sitemap: https://samratglass.com/api/sitemap.xml
Sitemap: https://samratglass.com/sitemap.xml
Sitemap: https://samratglass.com/authority-sitemap.xml
"""
    assert health._robots_allows_public(robots) is True
    assert health._robots_sitemaps(robots) == [
        "https://samratglass.com/api/sitemap.xml",
        "https://samratglass.com/sitemap.xml",
        "https://samratglass.com/authority-sitemap.xml",
    ]


def test_robots_parser_rejects_root_disallow():
    robots = "User-agent: *\nDisallow: /\n"
    assert health._robots_allows_public(robots) is False


def test_homepage_signal_detectors():
    html = """<html><head>
<link rel="canonical" href="https://samratglass.com/">
<script type="application/ld+json">{"@type":"WebSite"}</script>
</head></html>"""
    assert health._contains_canonical(html) is True
    assert health._contains_jsonld(html) is True
    assert health._contains_canonical("<html></html>") is False
    assert health._contains_jsonld("<html></html>") is False


def test_origin_is_pinned_to_production(monkeypatch):
    monkeypatch.setenv("SITE_ORIGIN", "https://evil.example")
    assert health._origin() == "https://samratglass.com"
    monkeypatch.setenv("SITE_ORIGIN", "https://samratglass.com/")
    assert health._origin() == "https://samratglass.com"
