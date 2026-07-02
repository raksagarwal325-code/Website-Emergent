import React, { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, Download } from "lucide-react";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";
import { Slider } from "../components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [priceRange, setPriceRange] = useState([0, 60000]);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { sort };
    if (q) params.q = q;
    if (category !== "all") params.category = category;
    if (priceRange[0] > 0) params.min_price = priceRange[0];
    if (priceRange[1] < 60000) params.max_price = priceRange[1];
    const t = setTimeout(() => {
      api.listProducts(params).then((data) => { setProducts(data); setLoading(false); }).catch(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, category, sort, priceRange]);

  const total = products.length;

  const handleExportCsv = () => {
    window.open(api.exportCsvUrl(), "_blank");
    toast.success("Downloading CSV…");
  };

  const handleExportPdf = () => {
    window.print();
  };

  const clearFilters = () => {
    setQ(""); setCategory("all"); setSort("newest"); setPriceRange([0, 60000]);
  };

  return (
    <div data-testid="page-catalog" className="max-w-7xl mx-auto px-6 py-16">
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
          <button data-testid="export-csv-btn" onClick={handleExportCsv} className="inline-flex items-center gap-2 border border-white/15 hover:border-[#D4AF37] px-4 py-3 text-xs uppercase tracking-[0.2em] text-white/80">
            <Download size={14} /> CSV
          </button>
          <button data-testid="export-pdf-btn" onClick={handleExportPdf} className="inline-flex items-center gap-2 border border-white/15 hover:border-[#D4AF37] px-4 py-3 text-xs uppercase tracking-[0.2em] text-white/80">
            <Download size={14} /> PDF
          </button>
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
            <span data-testid="results-count">{loading ? "Loading…" : `${total} pieces`}</span>
          </div>
          {total === 0 && !loading ? (
            <div className="py-24 text-center text-white/40 border border-white/10">
              <div className="font-serif text-2xl mb-2">Nothing matches.</div>
              <div className="text-sm">Try adjusting your filters.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
