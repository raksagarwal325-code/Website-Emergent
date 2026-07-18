import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";
import SEO from "../components/SEO";
import { Slider } from "../components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { trackSearch } from "../lib/analytics";

const PAGE_SIZE = 24;

// Build a compact, ellipsized list of page tokens for the pagination bar.
// Example for current=5, total=20 -> [1, "…", 4, 5, 6, "…", 20]
function buildPageTokens(current, total) {
  if (total <= 1) return [1];
  const tokens = [];
  const push = (v) => {
    if (tokens[tokens.length - 1] !== v) tokens.push(v);
  };
  const window = 1; // pages around current
  const first = 1;
  const last = total;
  const start = Math.max(first + 1, current - window);
  const end = Math.min(last - 1, current + window);
  push(first);
  if (start > first + 1) push("…");
  for (let i = start; i <= end; i++) push(i);
  if (end < last - 1) push("…");
  if (last > first) push(last);
  return tokens;
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(urlPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [priceRange, setPriceRange] = useState([0, 60000]);
  const [showFilters, setShowFilters] = useState(true);
  // Tracks the current request-signature so an in-flight response from a
  // stale filter/page set can't overwrite the current results.
  const requestKeyRef = useRef(0);
  // Guard so the initial URL-driven load isn't treated as a filter change.
  const initialLoadRef = useRef(true);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  // Build the params object once so all fetches share the same shape.
  const buildParams = (nextPage) => {
    const params = { sort, page: nextPage, limit: PAGE_SIZE };
    if (q) params.q = q;
    if (category !== "all") params.category = category;
    if (priceRange[0] > 0) params.min_price = priceRange[0];
    if (priceRange[1] < 60000) params.max_price = priceRange[1];
    return params;
  };

  // Update the ?page= query param without reloading the route.
  const writePageToUrl = (nextPage, { replace = false } = {}) => {
    const params = new URLSearchParams(searchParams);
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    setSearchParams(params, { replace });
  };

  // Reset to page 1 whenever any filter, search, sort or price range changes.
  // The very first mount is skipped so we honour the URL's ?page= value.
  useEffect(() => {
    if (initialLoadRef.current) return;
    if (page !== 1) {
      setPage(1);
      writePageToUrl(1, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, sort, priceRange]);

  // Keep local `page` in sync when the URL changes (e.g., back/forward).
  useEffect(() => {
    if (urlPage !== page) setPage(urlPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPage]);

  // Single fetch effect — depends on all filters + the current page.
  useEffect(() => {
    setLoading(true);
    const myKey = ++requestKeyRef.current;
    const t = setTimeout(() => {
      api
        .listProducts(buildParams(page))
        .then((res) => {
          if (myKey !== requestKeyRef.current) return; // stale response — discard
          const items = res?.items || [];
          setProducts(items);
          setTotal(res?.total || items.length);
          const tp = res?.total_pages || 1;
          setTotalPages(tp);
          // If the requested page is beyond the available range (e.g. filters
          // shrank the set), snap back to the last valid page.
          if (page > tp && tp >= 1) {
            setPage(tp);
            writePageToUrl(tp, { replace: true });
          }
          setLoading(false);
          initialLoadRef.current = false;
        })
        .catch(() => {
          if (myKey === requestKeyRef.current) {
            setLoading(false);
            initialLoadRef.current = false;
          }
        });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, sort, priceRange, page]);

  const goToPage = (next) => {
    const target = Math.min(Math.max(1, next), totalPages);
    if (target === page) return;
    setPage(target);
    writePageToUrl(target);
    // Scroll product grid back to the top after paging.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const clearFilters = () => {
    setQ(""); setCategory("all"); setSort("newest"); setPriceRange([0, 60000]);
  };

  const pageTokens = useMemo(() => buildPageTokens(page, totalPages), [page, totalPages]);

  // Human-friendly "Showing X–Y of Z" summary.
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  return (
    <div data-testid="page-catalog" className="max-w-7xl mx-auto px-6 py-16">
      <SEO
        title="Catalog · Chandeliers, Pendants & Decorative Lighting · Samrat Glass Emporium"
        description="Browse 1000+ handcrafted chandeliers, crystal hurricanes, pendant lights, wall sconces and table lamps — made in Firozabad since 1981."
        path="/catalog"
      />
      {/* Title */}
      <div className="mb-12 fade-up">
        <div className="eyebrow mb-3">The Collection</div>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl">Catalog</h1>
        <p className="mt-6 text-white/60 max-w-xl">Browse, filter, and enquire on any piece. Add favorites for later or send us your inquiry basket.</p>
      </div>

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
        <div className="flex gap-2">
          <a href="/catalogue?print=1" target="_blank" rel="noreferrer" data-testid="export-pdf-btn" className="inline-flex items-center gap-2 border border-[#D4AF37]/50 hover:border-[#D4AF37] hover:text-[#D4AF37] px-4 py-3 text-xs uppercase tracking-[0.2em] text-white/80">
            <Download size={14} /> Catalogue PDF
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar filters */}
        {showFilters && (
          <aside data-testid="filters-panel" className="lg:col-span-3 space-y-10 no-print">
            <div>
              <div className="eyebrow mb-4">Category</div>
              <div className="space-y-2">
                <button data-testid="cat-all" onClick={() => setCategory("all")} className={`block text-sm w-full text-left ${category === "all" ? "text-[#D4AF37]" : "text-white/70 hover:text-white"}`}>All</button>
                {categories.map((c) => (
                  <button
                    key={c}
                    data-testid={`cat-${c.replace(/\s+/g, "-").toLowerCase()}`}
                    onClick={() => setCategory(c)}
                    className={`block text-sm w-full text-left ${category === c ? "text-[#D4AF37]" : "text-white/70 hover:text-white"}`}
                  >{c}</button>
                ))}
              </div>
            </div>

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

        {/* Product grid */}
        <div className={showFilters ? "lg:col-span-9" : "lg:col-span-12"}>
          <div className="flex items-center justify-between mb-6 text-xs text-white/50 uppercase tracking-widest">
            <span data-testid="results-count">
              {loading
                ? "Loading…"
                : total === 0
                  ? "0 pieces"
                  : `Showing ${rangeStart}–${rangeEnd} of ${total} piece${total === 1 ? "" : "s"}`}
            </span>
            {!loading && totalPages > 1 && (
              <span data-testid="page-indicator" className="hidden sm:inline">
                Page {page} of {totalPages}
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

              {/* Numbered pagination — replaces the previous Load More button. */}
              {totalPages > 1 && (
                <nav
                  data-testid="pagination"
                  aria-label="Catalog pagination"
                  className="mt-12 flex flex-wrap items-center justify-center gap-2 no-print"
                >
                  <button
                    data-testid="pagination-prev"
                    onClick={() => goToPage(page - 1)}
                    disabled={page <= 1 || loading}
                    aria-label="Previous page"
                    className="inline-flex items-center gap-1 border border-white/15 hover:border-[#D4AF37] hover:text-[#D4AF37] px-4 py-2.5 text-[11px] uppercase tracking-[0.24em] text-white/80 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/15 disabled:hover:text-white/80"
                  >
                    <ChevronLeft size={14} />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  {pageTokens.map((tok, idx) => {
                    if (tok === "…") {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          aria-hidden="true"
                          className="w-9 h-9 flex items-center justify-center text-white/40 text-sm select-none"
                        >
                          …
                        </span>
                      );
                    }
                    const isActive = tok === page;
                    return (
                      <button
                        key={tok}
                        data-testid={`pagination-page-${tok}`}
                        onClick={() => goToPage(tok)}
                        disabled={loading}
                        aria-label={`Go to page ${tok}`}
                        aria-current={isActive ? "page" : undefined}
                        className={
                          "min-w-[36px] h-9 px-3 text-[12px] tracking-[0.14em] border transition-colors " +
                          (isActive
                            ? "border-[#D4AF37] text-[#D4AF37] bg-[#D4AF37]/5"
                            : "border-white/15 text-white/70 hover:border-[#D4AF37] hover:text-[#D4AF37]") +
                          " disabled:cursor-not-allowed"
                        }
                      >
                        {tok}
                      </button>
                    );
                  })}

                  <button
                    data-testid="pagination-next"
                    onClick={() => goToPage(page + 1)}
                    disabled={page >= totalPages || loading}
                    aria-label="Next page"
                    className="inline-flex items-center gap-1 border border-white/15 hover:border-[#D4AF37] hover:text-[#D4AF37] px-4 py-2.5 text-[11px] uppercase tracking-[0.24em] text-white/80 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/15 disabled:hover:text-white/80"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={14} />
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
