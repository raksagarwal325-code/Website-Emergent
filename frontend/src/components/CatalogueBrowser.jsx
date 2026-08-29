import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { NAV_CATEGORIES } from "../lib/categories";
import ProductCard from "./ProductCard";
import { Slider } from "./ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const PAGE_SIZE = 24;
const FALLBACK_PRICE_CEILING = 60000;
const VALID_SORTS = new Set(["newest", "price_asc", "price_desc", "rating", "name"]);
const normalizeSort = (value) => (VALID_SORTS.has(value) ? value : "newest");

export default function CatalogueBrowser({ lockedCategory = null, initialProducts = [], initialTotal = 0, dynamicCategories = null, onListingChange = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState(initialProducts);
  const navCats = Array.isArray(dynamicCategories) && dynamicCategories.length > 0 ? dynamicCategories : NAV_CATEGORIES;
  const categories = navCats;
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [q, setQ] = useState(() => searchParams.get("q") || "");
  const [category, setCategory] = useState(() => lockedCategory || searchParams.get("category") || "all");
  const [sort, setSort] = useState(() => normalizeSort(searchParams.get("sort")));
  const [priceCeiling, setPriceCeiling] = useState(FALLBACK_PRICE_CEILING);
  const [priceRange, setPriceRange] = useState([0, FALLBACK_PRICE_CEILING]);
  const [showFilters, setShowFilters] = useState(false);
  const requestKeyRef = useRef(0);
  const priceCeilingLoadedRef = useRef(false);
  const gridTopRef = useRef(null);

  const parsePage = (raw) => {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return n;
  };
  const currentPage = parsePage(searchParams.get("page"));

  useEffect(() => {
    if (!showFilters || priceCeilingLoadedRef.current) return undefined;
    priceCeilingLoadedRef.current = true;
    let alive = true;
    api.listProducts({ sort: "price_desc", page: 1, limit: 1 }).then((res) => {
      if (!alive) return;
      const highest = Number(res?.items?.[0]?.price);
      if (!Number.isFinite(highest) || highest <= 0) return;
      setPriceCeiling(highest);
      setPriceRange((current) => {
        const upperWasUnbounded = current[1] >= FALLBACK_PRICE_CEILING;
        return upperWasUnbounded ? [current[0], highest] : [current[0], Math.min(current[1], highest)];
      });
    }).catch(() => { priceCeilingLoadedRef.current = false; });
    return () => { alive = false; };
  }, [showFilters]);

  useEffect(() => {
    const nextQ = searchParams.get("q") || "";
    const rawSort = searchParams.get("sort");
    const nextSort = normalizeSort(rawSort);
    setQ((current) => (current === nextQ ? current : nextQ));
    setSort((current) => (current === nextSort ? current : nextSort));
    if (rawSort && nextSort === "newest") {
      const next = new URLSearchParams(searchParams);
      next.delete("sort");
      if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!lockedCategory) return;
    setCategory(lockedCategory);
    setProducts([]);
    setTotal(0);
    const next = new URLSearchParams(searchParams);
    next.delete("page");
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
    setLoading(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedCategory]);

  const buildParams = (nextPage) => {
    const params = { sort, page: nextPage, limit: PAGE_SIZE };
    if (q) params.q = q;
    if (category !== "all") params.category = category;
    if (priceRange[0] > 0) params.min_price = priceRange[0];
    if (priceRange[1] < priceCeiling) params.max_price = priceRange[1];
    return params;
  };

  const filterKey = useMemo(() => JSON.stringify([category, priceRange, lockedCategory || ""]), [category, priceRange, lockedCategory]);
  const prevFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (prevFilterKeyRef.current === filterKey) return;
    prevFilterKeyRef.current = filterKey;
    const next = new URLSearchParams(searchParams);
    if (!lockedCategory) {
      if (category && category !== "all") next.set("category", category);
      else next.delete("category");
    }
    next.delete("page");
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    setLoading(true);
    const myKey = ++requestKeyRef.current;
    const t = setTimeout(() => {
      api.listProducts(buildParams(currentPage)).then((res) => {
        if (myKey !== requestKeyRef.current) return;
        const items = res?.items || [];
        const nextTotal = res?.total || 0;
        const tp = Math.max(1, res?.total_pages || 1);
        setProducts(items);
        setTotal(nextTotal);
        setTotalPages(tp);
        setLoading(false);
        if (typeof onListingChange === "function") onListingChange({ products: items, total: nextTotal, totalPages: tp, page: currentPage });
        if (currentPage > tp) {
          const next = new URLSearchParams(searchParams);
          if (tp === 1) next.delete("page");
          else next.set("page", String(tp));
          setSearchParams(next, { replace: true });
        }
      }).catch(() => {
        if (myKey === requestKeyRef.current) {
          setProducts([]);
          setLoading(false);
        }
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, sort, priceRange, priceCeiling, lockedCategory, currentPage]);

  const updateSearch = (nextQ) => {
    setQ(nextQ);
    const next = new URLSearchParams(searchParams);
    if (nextQ) next.set("q", nextQ);
    else next.delete("q");
    next.delete("page");
    if (next.toString() !== searchParams.toString()) setSearchParams(next);
  };

  const updateSort = (nextValue) => {
    const nextSort = normalizeSort(nextValue);
    setSort(nextSort);
    const next = new URLSearchParams(searchParams);
    if (nextSort === "newest") next.delete("sort");
    else next.set("sort", nextSort);
    next.delete("page");
    if (next.toString() !== searchParams.toString()) setSearchParams(next);
  };

  const goToPage = (n) => {
    const target = Math.min(Math.max(1, n), totalPages);
    if (target === currentPage) return;
    const next = new URLSearchParams(searchParams);
    if (target === 1) next.delete("page");
    else next.set("page", String(target));
    setSearchParams(next);
    if (gridTopRef.current && typeof gridTopRef.current.scrollIntoView === "function") {
      try { gridTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); } catch { /* older browsers */ }
    }
  };

  const clearFilters = () => {
    setQ("");
    if (!lockedCategory) setCategory("all");
    setSort("newest");
    setPriceRange([0, priceCeiling]);
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    next.delete("sort");
    next.delete("page");
    if (!lockedCategory) next.delete("category");
    if (next.toString() !== searchParams.toString()) setSearchParams(next);
  };

  const pageWindow = useMemo(() => {
    const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
    return [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  const startIdx = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(total, currentPage * PAGE_SIZE);

  return (
    <>
      <div className="mb-7 flex flex-col gap-4 no-print md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input data-testid="catalog-search" value={q} onChange={(e) => updateSearch(e.target.value)} placeholder="Search products, SKUs, tags…" className="w-full border border-white/15 bg-[#0a0a0a] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#D4AF37]" />
        </div>
        <button data-testid="filters-toggle" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} className={`inline-flex items-center gap-2 border px-4 py-3 text-xs uppercase tracking-[0.2em] transition-colors ${showFilters ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/15 text-white/80 hover:border-white/40"}`}><SlidersHorizontal size={14} /> Filters</button>
        <div className="w-full md:w-52">
          <Select value={sort} onValueChange={updateSort}>
            <SelectTrigger data-testid="sort-select" className="h-12 rounded-none border-white/15 bg-[#0a0a0a] text-white"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent className="border-white/15 bg-[#0a0a0a] text-white"><SelectItem value="newest">Newest</SelectItem><SelectItem value="price_asc">Price: Low to High</SelectItem><SelectItem value="price_desc">Price: High to Low</SelectItem><SelectItem value="rating">Top Rated</SelectItem><SelectItem value="name">Name A→Z</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      {showFilters && (
        <aside data-testid="filters-panel" className="mb-8 border border-white/10 bg-[#11070e]/80 p-5 no-print md:p-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.7fr_auto] lg:items-end">
            {!lockedCategory ? <div><div className="eyebrow mb-4">Category</div><div className="flex flex-wrap gap-x-5 gap-y-3"><button data-testid="cat-all" onClick={() => setCategory("all")} className={`text-sm ${category === "all" ? "text-[#D4AF37]" : "text-white/65 hover:text-white"}`}>All</button>{categories.map((c) => <button key={c.slug || c.db_name} data-testid={`cat-${String(c.db_name).replace(/\s+/g, "-").toLowerCase()}`} onClick={() => setCategory(c.db_name)} className={`text-sm ${category === c.db_name ? "text-[#D4AF37]" : "text-white/65 hover:text-white"}`}>{c.label || c.db_name}</button>)}</div></div> : <div><div className="eyebrow mb-3">Collection</div><div className="font-serif text-xl text-white">{categories.find((c) => c.db_name === lockedCategory)?.label || lockedCategory}</div></div>}
            <div><div className="eyebrow mb-4">Price</div><Slider data-testid="price-slider" min={0} max={priceCeiling} step={500} value={priceRange} onValueChange={setPriceRange} className="mb-4" /><div className="flex items-center justify-between text-xs text-white/60"><span>₹{priceRange[0].toLocaleString("en-IN")}</span><span data-testid="price-upper-label">₹{priceRange[1].toLocaleString("en-IN")}</span></div><p className="mt-2 text-[10px] leading-relaxed text-white/40">Price range automatically follows the highest-priced piece currently in the catalogue.</p></div>
            <button data-testid="clear-filters-btn" onClick={clearFilters} className="justify-self-start text-xs uppercase tracking-[0.2em] text-white/60 link-underline hover:text-white lg:justify-self-end">Clear all</button>
          </div>
        </aside>
      )}

      <div ref={gridTopRef} className="scroll-mt-56">
        <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-widest text-white/50"><span data-testid="results-count">{loading ? "Loading…" : total === 0 ? "0 pieces" : `Showing ${startIdx}–${endIdx} of ${total} piece${total === 1 ? "" : "s"}`}</span>{totalPages > 1 && !loading && <span data-testid="page-indicator" className="text-white/40">Page {currentPage} of {totalPages}</span>}</div>
        {total === 0 && !loading ? <div className="border border-white/10 py-24 text-center text-white/40"><div className="mb-2 font-serif text-2xl">Nothing matches.</div><div className="text-sm">Try adjusting your filters.</div></div> : <>
          <div className="grid grid-cols-2 gap-3 sm:gap-7 xl:grid-cols-3 2xl:grid-cols-4">{products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}</div>
          {totalPages > 1 && <nav aria-label="Catalog pagination" data-testid="catalog-pagination" className="mt-14 flex flex-wrap items-center justify-center gap-2 no-print"><button type="button" data-testid="pagination-prev" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1 || loading} className="inline-flex items-center gap-1 border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/80 hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /> Previous</button>{pageWindow.map((n, idx) => { const prev = pageWindow[idx - 1]; const showGap = prev !== undefined && n - prev > 1; return <React.Fragment key={n}>{showGap && <span data-testid={`pagination-gap-${prev}-${n}`} className="select-none px-2 text-white/40">…</span>}<button type="button" data-testid={`pagination-page-${n}`} onClick={() => goToPage(n)} disabled={loading} aria-current={n === currentPage ? "page" : undefined} className={`min-w-[40px] border px-3 py-2 text-xs uppercase tracking-[0.24em] transition-colors ${n === currentPage ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]" : "border-white/15 text-white/70 hover:border-[#D4AF37] hover:text-[#D4AF37]"}`}>{n}</button></React.Fragment>; })}<button type="button" data-testid="pagination-next" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages || loading} className="inline-flex items-center gap-1 border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/80 hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={14} /></button></nav>}
        </>}
      </div>
    </>
  );
}
