import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { NAV_CATEGORIES } from "../lib/categories";
import ProductCard from "./ProductCard";
import { Slider } from "./ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const PAGE_SIZE = 24;

/**
 * Shared product browser used by both `/catalog` and `/category/<slug>`.
 *
 * Pagination model (Batch B · Item 1):
 *   - The current page lives in the URL as `?page=N` (default 1).
 *   - Changing page **replaces** products (no append) and scrolls to the
 *     top of the grid.
 *   - Changing search / sort / category / price / lockedCategory always
 *     resets `?page=1` so the visitor never lands on an out-of-range page
 *     for a new filter set.
 *   - Invalid page values (`abc`, `-5`, `1e9`) are clamped to the valid
 *     range once the total_pages is known — the URL is normalised back
 *     via `setSearchParams(..., { replace: true })`.
 *   - Previous is disabled on page 1; Next is disabled on the last page.
 */
export default function CatalogueBrowser({
  lockedCategory = null,
  initialProducts = [],
  initialTotal = 0,
  dynamicCategories = null,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState(initialProducts);
  // Sidebar filter categories come from the parent (Catalog page fetches
  // /api/products/categories and merges with the registry) OR fall back
  // to the curated NAV_CATEGORIES so this component works standalone.
  const navCats = Array.isArray(dynamicCategories) && dynamicCategories.length > 0
    ? dynamicCategories
    : NAV_CATEGORIES;
  // Keep the full nav-cat objects ({ slug, db_name, label, ... }) so the
  // sidebar can render the title-cased `label` (e.g. "Ceiling Light")
  // while still filtering products against the raw `db_name`.
  const categories = navCats;
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState(() => {
    if (lockedCategory) return lockedCategory;
    return searchParams.get("category") || "all";
  });
  const [sort, setSort] = useState("newest");
  const [priceRange, setPriceRange] = useState([0, 60000]);
  const [showFilters, setShowFilters] = useState(true);
  const requestKeyRef = useRef(0);
  const gridTopRef = useRef(null);

  // Parse `?page=` safely. NaN / <1 / non-integer → 1.
  const parsePage = (raw) => {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return n;
  };
  const currentPage = parsePage(searchParams.get("page"));

  // Whenever the caller changes `lockedCategory` (e.g. navigating between
  // /category/chandeliers and /category/floor-lamps), reset internal state
  // so the new category renders from scratch.
  useEffect(() => {
    if (!lockedCategory) return;
    setCategory(lockedCategory);
    setProducts([]);
    setTotal(0);
    // Reset URL page as well when a new locked category comes in.
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    setLoading(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedCategory]);

  const buildParams = (nextPage) => {
    const params = { sort, page: nextPage, limit: PAGE_SIZE };
    if (q) params.q = q;
    if (category !== "all") params.category = category;
    if (priceRange[0] > 0) params.min_price = priceRange[0];
    if (priceRange[1] < 60000) params.max_price = priceRange[1];
    return params;
  };

  // Whenever a filter/search/sort/price/category changes → reset to page 1.
  // We compare against the previously-seen filterKey so we do NOT reset on
  // the very first render (React 18+ Strict Mode double-fires effects,
  // which makes a plain `isFirstRender` ref unreliable).
  const filterKey = useMemo(
    () => JSON.stringify([q, category, sort, priceRange, lockedCategory || ""]),
    [q, category, sort, priceRange, lockedCategory],
  );
  const prevFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKeyRef.current === filterKey) {
      // First render (or strict-mode double-fire) — nothing to reset.
      return;
    }
    prevFilterKeyRef.current = filterKey;
    const next = new URLSearchParams(searchParams);
    // Sync ?category= only on the catalogue page.
    if (!lockedCategory) {
      if (category && category !== "all") next.set("category", category);
      else next.delete("category");
    }
    next.delete("page");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  // Fetch whenever page OR filters change. Products are REPLACED, never
  // appended — pagination is deliberately non-infinite so page state is
  // deterministic and shareable.
  useEffect(() => {
    setLoading(true);
    const myKey = ++requestKeyRef.current;
    const t = setTimeout(() => {
      api
        .listProducts(buildParams(currentPage))
        .then((res) => {
          if (myKey !== requestKeyRef.current) return;
          const items = res?.items || [];
          const tp = Math.max(1, res?.total_pages || 1);
          setProducts(items);
          setTotal(res?.total || 0);
          setTotalPages(tp);
          setLoading(false);
          // Clamp URL page if it's now out of range (e.g. filters shrank
          // the result set below the requested page). We replace so
          // back-button behaviour still lands on the pre-filter state.
          if (currentPage > tp) {
            const next = new URLSearchParams(searchParams);
            if (tp === 1) next.delete("page");
            else next.set("page", String(tp));
            setSearchParams(next, { replace: true });
          }
        })
        .catch(() => {
          if (myKey === requestKeyRef.current) {
            setProducts([]);
            setLoading(false);
          }
        });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, sort, priceRange, lockedCategory, currentPage]);

  const goToPage = (n) => {
    const target = Math.min(Math.max(1, n), totalPages);
    if (target === currentPage) return;
    const next = new URLSearchParams(searchParams);
    if (target === 1) next.delete("page");
    else next.set("page", String(target));
    setSearchParams(next);
    // Scroll to the top of the grid so the user notices the change.
    if (gridTopRef.current && typeof gridTopRef.current.scrollIntoView === "function") {
      try {
        gridTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch { /* jsdom / older browsers */ }
    }
  };

  const clearFilters = () => {
    setQ("");
    if (!lockedCategory) setCategory("all");
    setSort("newest");
    setPriceRange([0, 60000]);
  };

  // Compact page numbers: 1 … currentPage-1, currentPage, currentPage+1 … totalPages
  const pageWindow = useMemo(() => {
    const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
    return [...pages]
      .filter((n) => n >= 1 && n <= totalPages)
      .sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  const startIdx = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(total, currentPage * PAGE_SIZE);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-10 no-print">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            data-testid="catalog-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, SKUs, tags…"
            className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none pl-11 pr-4 py-3 text-sm text-white placeholder:text-white/40"
          />
        </div>
        <button
          data-testid="filters-toggle"
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 border border-white/15 hover:border-white/40 px-4 py-3 text-xs uppercase tracking-[0.2em] text-white/80"
        >
          <SlidersHorizontal size={14} /> Filters
        </button>
        <div className="w-full md:w-48">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger data-testid="sort-select" className="rounded-none bg-[#0a0a0a] border-white/15 h-12 text-white">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-white/15 text-white">
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="name">Name A→Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {showFilters && (
          <aside data-testid="filters-panel" className="lg:col-span-3 space-y-10 no-print">
            {!lockedCategory && (
              <div>
                <div className="eyebrow mb-4">Category</div>
                <div className="space-y-2">
                  <button
                    data-testid="cat-all"
                    onClick={() => setCategory("all")}
                    className={`block text-sm w-full text-left ${category === "all" ? "text-[#D4AF37]" : "text-white/70 hover:text-white"}`}
                  >
                    All
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.slug || c.db_name}
                      data-testid={`cat-${String(c.db_name).replace(/\s+/g, "-").toLowerCase()}`}
                      onClick={() => setCategory(c.db_name)}
                      className={`block text-sm w-full text-left ${category === c.db_name ? "text-[#D4AF37]" : "text-white/70 hover:text-white"}`}
                    >
                      {c.label || c.db_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="eyebrow mb-4">Price</div>
              <Slider
                data-testid="price-slider"
                min={0}
                max={60000}
                step={500}
                value={priceRange}
                onValueChange={setPriceRange}
                className="mb-4"
              />
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>₹{priceRange[0].toLocaleString("en-IN")}</span>
                <span>₹{priceRange[1].toLocaleString("en-IN")}</span>
              </div>
            </div>

            <button
              data-testid="clear-filters-btn"
              onClick={clearFilters}
              className="text-xs uppercase tracking-[0.2em] text-white/60 hover:text-white link-underline"
            >
              Clear all
            </button>
          </aside>
        )}

        <div className={showFilters ? "lg:col-span-9" : "lg:col-span-12"} ref={gridTopRef}>
          <div className="flex items-center justify-between mb-6 text-xs text-white/50 uppercase tracking-widest">
            <span data-testid="results-count">
              {loading
                ? "Loading…"
                : total === 0
                  ? "0 pieces"
                  : `Showing ${startIdx}–${endIdx} of ${total} piece${total === 1 ? "" : "s"}`}
            </span>
            {totalPages > 1 && !loading && (
              <span data-testid="page-indicator" className="text-white/40">
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>
          {total === 0 && !loading ? (
            <div className="py-24 text-center text-white/40 border border-white/10">
              <div className="font-serif text-2xl mb-2">Nothing matches.</div>
              <div className="text-sm">Try adjusting your filters.</div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
              </div>
              {totalPages > 1 && (
                <nav
                  aria-label="Catalog pagination"
                  data-testid="catalog-pagination"
                  className="mt-14 flex items-center justify-center gap-2 no-print flex-wrap"
                >
                  <button
                    type="button"
                    data-testid="pagination-prev"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    className="inline-flex items-center gap-1 border border-white/15 hover:border-[#D4AF37] hover:text-[#D4AF37] px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/80 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/15 disabled:hover:text-white/80"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  {pageWindow.map((n, idx) => {
                    const prev = pageWindow[idx - 1];
                    const showGap = prev !== undefined && n - prev > 1;
                    return (
                      <React.Fragment key={n}>
                        {showGap && (
                          <span
                            data-testid={`pagination-gap-${prev}-${n}`}
                            className="px-2 text-white/40 select-none"
                          >
                            …
                          </span>
                        )}
                        <button
                          type="button"
                          data-testid={`pagination-page-${n}`}
                          onClick={() => goToPage(n)}
                          disabled={loading}
                          aria-current={n === currentPage ? "page" : undefined}
                          className={`min-w-[40px] px-3 py-2 text-xs uppercase tracking-[0.24em] border transition-colors ${
                            n === currentPage
                              ? "border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/10"
                              : "border-white/15 text-white/70 hover:border-[#D4AF37] hover:text-[#D4AF37]"
                          }`}
                        >
                          {n}
                        </button>
                      </React.Fragment>
                    );
                  })}
                  <button
                    type="button"
                    data-testid="pagination-next"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    className="inline-flex items-center gap-1 border border-white/15 hover:border-[#D4AF37] hover:text-[#D4AF37] px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/80 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/15 disabled:hover:text-white/80"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
