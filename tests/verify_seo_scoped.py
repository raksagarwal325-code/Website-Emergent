"""
Scoped verification for iteration 29:
1) LocalBusiness JSON-LD in /app/frontend/public/index.html:
   - Valid JSON, @type == 'LocalBusiness'
   - No aggregateRating key; no '4.9' or '236' literals in that script block
   - Preserved: openingHoursSpecification (Mon-Sat, 10:30-20:00), address, telephone,
     url, sameAs (instagram + youtube), name.
2) robots.txt:
   - No 'Disallow: /favorites' (case-insensitive)
   - Still has 'Disallow: /admin', 'Disallow: /catalogue',
     'Sitemap: https://samratglass.com/api/sitemap.xml'
3) Dynamic sitemap ${REACT_APP_BACKEND_URL}/api/sitemap.xml:
   - HTTP 200, Content-Type application/xml (any casing)
   - Zero '/favorites' occurrences
4) Static /app/frontend/public/sitemap.xml:
   - Zero '/favorites' occurrences
"""

import json
import os
import re
import sys
import requests

INDEX_HTML = "/app/frontend/public/index.html"
ROBOTS_TXT = "/app/frontend/public/robots.txt"
STATIC_SITEMAP = "/app/frontend/public/sitemap.xml"

BASE_URL = "https://glass-product-hub.preview.emergentagent.com"

results = []


def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    results.append((status, name, detail))
    print(f"[{status}] {name}  {('- ' + detail) if detail else ''}")


# --- 1) index.html JSON-LD ---
with open(INDEX_HTML, "r", encoding="utf-8") as f:
    html = f.read()

# Extract all application/ld+json script blocks
blocks = re.findall(
    r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',
    html,
    flags=re.DOTALL,
)
check("index.html has at least one JSON-LD block", len(blocks) >= 1,
      f"found {len(blocks)} blocks")

lb_block_raw = None
lb_obj = None
for raw in blocks:
    try:
        obj = json.loads(raw)
    except Exception:
        continue
    if isinstance(obj, dict) and obj.get("@type") == "LocalBusiness":
        lb_block_raw = raw
        lb_obj = obj
        break

check("LocalBusiness JSON-LD parses and @type=='LocalBusiness'", lb_obj is not None)

if lb_obj is not None:
    check("LocalBusiness has NO 'aggregateRating' key",
          "aggregateRating" not in lb_obj,
          f"keys={list(lb_obj.keys())}")

    check("Literal '4.9' NOT present in LocalBusiness JSON-LD block",
          "4.9" not in lb_block_raw)
    check("Literal '236' NOT present in LocalBusiness JSON-LD block",
          "236" not in lb_block_raw)

    check("LocalBusiness.name == 'Samrat Glass Emporium'",
          lb_obj.get("name") == "Samrat Glass Emporium",
          f"got {lb_obj.get('name')!r}")
    check("LocalBusiness.telephone == '+91-89203-92937'",
          lb_obj.get("telephone") == "+91-89203-92937",
          f"got {lb_obj.get('telephone')!r}")
    check("LocalBusiness.url present",
          bool(lb_obj.get("url")),
          f"got {lb_obj.get('url')!r}")
    check("LocalBusiness.address present (PostalAddress dict)",
          isinstance(lb_obj.get("address"), dict)
          and lb_obj["address"].get("@type") == "PostalAddress")

    same_as = lb_obj.get("sameAs") or []
    check("sameAs includes Instagram",
          any("instagram.com" in s for s in same_as), f"sameAs={same_as}")
    check("sameAs includes YouTube",
          any("youtube.com" in s for s in same_as), f"sameAs={same_as}")

    ohs = lb_obj.get("openingHoursSpecification")
    # Could be a dict or list; normalize to list
    if isinstance(ohs, dict):
        ohs_list = [ohs]
    elif isinstance(ohs, list):
        ohs_list = ohs
    else:
        ohs_list = []

    check("openingHoursSpecification present", len(ohs_list) >= 1)

    if ohs_list:
        # Union all dayOfWeek entries
        days = []
        for entry in ohs_list:
            d = entry.get("dayOfWeek")
            if isinstance(d, list):
                days.extend(d)
            elif isinstance(d, str):
                days.append(d)
        expected_days = {"Monday", "Tuesday", "Wednesday",
                         "Thursday", "Friday", "Saturday"}
        check("Opening hours cover Mon-Sat",
              set(days) == expected_days,
              f"got days={days}")
        check("Sunday NOT in opening hours",
              "Sunday" not in days)
        # opens/closes on first entry
        first = ohs_list[0]
        check("opens == '10:30'",
              first.get("opens") == "10:30",
              f"got {first.get('opens')!r}")
        check("closes == '20:00'",
              first.get("closes") == "20:00",
              f"got {first.get('closes')!r}")

# --- 2) robots.txt ---
with open(ROBOTS_TXT, "r", encoding="utf-8") as f:
    robots = f.read()

robots_lines = [ln.strip() for ln in robots.splitlines()]
has_favorites_disallow = any(
    re.match(r"disallow:\s*/favorites\b", ln, flags=re.IGNORECASE)
    for ln in robots_lines
)
check("robots.txt has NO 'Disallow: /favorites' line", not has_favorites_disallow,
      f"lines={robots_lines}")

check("robots.txt still has 'Disallow: /admin'",
      any(ln.lower() == "disallow: /admin" for ln in robots_lines))
check("robots.txt still has 'Disallow: /catalogue'",
      any(ln.lower() == "disallow: /catalogue" for ln in robots_lines))
check("robots.txt still has dynamic sitemap URL",
      any(ln.lower() == "sitemap: https://samratglass.com/api/sitemap.xml"
          for ln in robots_lines))

# --- 3) Dynamic sitemap over HTTP ---
sitemap_url = f"{BASE_URL}/api/sitemap.xml"
try:
    r = requests.get(sitemap_url, timeout=30)
    check("GET /api/sitemap.xml returns HTTP 200",
          r.status_code == 200, f"got {r.status_code}")
    ctype = r.headers.get("Content-Type", "")
    check("Content-Type contains application/xml",
          "application/xml" in ctype.lower(), f"got {ctype!r}")
    body = r.text
    check("Dynamic sitemap body has zero '/favorites' occurrences",
          "/favorites" not in body,
          f"count={body.count('/favorites')}")
except Exception as e:
    check("GET /api/sitemap.xml", False, f"exception: {e}")

# --- 4) Static sitemap file ---
with open(STATIC_SITEMAP, "r", encoding="utf-8") as f:
    static_sitemap = f.read()
check("Static sitemap.xml has zero '/favorites' occurrences",
      "/favorites" not in static_sitemap,
      f"count={static_sitemap.count('/favorites')}")

# --- Summary ---
fails = [r for r in results if r[0] == "FAIL"]
print("\n=================================")
print(f"TOTAL: {len(results)}  PASS: {len(results)-len(fails)}  FAIL: {len(fails)}")
print("=================================")
if fails:
    for _, name, detail in fails:
        print(f"  FAIL: {name} - {detail}")
    sys.exit(1)
sys.exit(0)
