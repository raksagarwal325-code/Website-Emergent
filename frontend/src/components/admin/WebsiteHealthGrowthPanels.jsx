import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Layers3, Link2, RefreshCw, TrendingUp, Warehouse, Wrench } from "lucide-react";
import { API } from "../../lib/api";

function Metric({ label, value, hint }) {
  return (
    <div className="border border-white/10 p-5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">{label}</div>
      <div className="mt-2 font-serif text-3xl">{value}</div>
      {hint && <div className="mt-2 text-xs leading-5 text-white/45">{hint}</div>}
    </div>
  );
}

const severityStyle = {
  critical: "border-red-400/30 bg-red-500/5 text-red-100",
  review: "border-amber-300/25 bg-amber-400/5 text-amber-100",
  info: "border-white/10 text-white/60",
};

const actionClass = "inline-flex items-center gap-1.5 border border-[#D4AF37]/45 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#D4AF37] hover:bg-[#D4AF37]/10";

function collectionMembershipSlugs(product) {
  return (product?.tags || [])
    .map((tag) => String(tag || "").trim())
    .filter((tag) => tag.startsWith("collection:"))
    .map((tag) => tag.slice("collection:".length).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))
    .filter(Boolean);
}

function findingActions(item) {
  if (item.scope === "collection") {
    return [
      { label: "Open collection editor", href: `/admin/collections?collection=${encodeURIComponent(item.key)}`, fix: true },
      { label: "View collection", href: `/collection/${encodeURIComponent(item.key)}` },
    ];
  }
  if (item.scope === "project") {
    return [
      { label: "Open project editor", href: `/admin?tab=homepage&project=${encodeURIComponent(item.key)}#project-gallery`, fix: true },
      { label: "View project", href: `/gallery/${encodeURIComponent(item.key)}` },
    ];
  }
  if (item.scope === "route") {
    return [{ label: "Open affected route", href: item.key === "product" ? "/catalog" : `/product/${encodeURIComponent(item.key)}` }];
  }
  return [];
}

function AffectedProducts({ item, products = [] }) {
  if (item.scope !== "collection" || item.issue !== "Orphan collection membership tag") return null;
  const affected = products.filter((product) => collectionMembershipSlugs(product).includes(String(item.key || "").toLowerCase()));
  if (!affected.length) return null;
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="mb-2 text-[10px] uppercase tracking-[0.18em] opacity-60">Affected product{affected.length === 1 ? "" : "s"}</div>
      <div className="space-y-2">
        {affected.slice(0, 12).map((product) => (
          <div key={product.id || product.sku || product.name} className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-black/10 px-3 py-2">
            <div>
              <div className="text-sm text-white">{product.name || "Unnamed product"}</div>
              <div className="mt-0.5 text-[11px] opacity-55">{product.sku || "No SKU"} · {product.category || "No category"} · {product.status || "published"}</div>
            </div>
            {product.id && (
              <div className="flex flex-wrap gap-2">
                <a href={`/admin?tab=products&product=${encodeURIComponent(product.id)}`} className={actionClass}><Wrench size={12} /> Edit product</a>
                <a href={`/product/${encodeURIComponent(product.id)}`} className={actionClass}><ExternalLink size={12} /> View product</a>
              </div>
            )}
          </div>
        ))}
      </div>
      {affected.length > 12 && <div className="mt-2 text-xs opacity-50">Showing first 12 of {affected.length} affected products.</div>}
    </div>
  );
}

function Findings({ items = [], emptyMessage, products = [] }) {
  if (!items.length) {
    return <div className="border border-emerald-300/20 bg-emerald-400/5 p-5 text-sm text-emerald-100">{emptyMessage}</div>;
  }
  return (
    <div className="space-y-2">
      {items.slice(0, 100).map((item, index) => {
        const actions = findingActions(item);
        return (
          <div key={`${item.scope}-${item.key}-${item.issue}-${index}`} className={`border p-4 ${severityStyle[item.severity] || severityStyle.info}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-60">{item.scope} · {item.severity}</div>
                <div className="mt-1 text-sm text-white">{item.issue}</div>
                {item.detail && <div className="mt-1 text-xs opacity-60">{item.detail}</div>}
              </div>
              <div className="text-xs opacity-60">{item.key}</div>
            </div>
            <AffectedProducts item={item} products={products} />
            {actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                {actions.map((action) => (
                  <a key={action.label} href={action.href} className={actionClass}>
                    {action.fix ? <Wrench size={12} /> : <ExternalLink size={12} />} {action.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {items.length > 100 && <div className="text-xs text-white/40">Showing first 100 of {items.length} findings.</div>}
    </div>
  );
}

function CollectionTable({ rows = [] }) {
  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-white/5 text-[10px] uppercase tracking-[0.18em] text-white/50">
          <tr><th className="p-3">Collection</th><th className="p-3">Published products</th><th className="p-3">Categories</th><th className="p-3">Featured</th><th className="p-3">Findings</th><th className="p-3">Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.slug} className="border-t border-white/10">
              <td className="p-3"><a href={`/collection/${encodeURIComponent(row.slug)}`} className="hover:text-[#D4AF37]">{row.name}</a><div className="text-[11px] text-white/40">/collection/{row.slug}</div></td>
              <td className="p-3">{row.published_members}</td>
              <td className="p-3">{row.categories?.length || 0}</td>
              <td className="p-3">{row.featured_products}</td>
              <td className="p-3">{row.findings}</td>
              <td className="p-3"><a href={`/admin/collections?collection=${encodeURIComponent(row.slug)}`} className={actionClass}><Wrench size={12} /> Edit</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectTable({ rows = [] }) {
  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-white/5 text-[10px] uppercase tracking-[0.18em] text-white/50">
          <tr><th className="p-3">Project</th><th className="p-3">Location</th><th className="p-3">Images</th><th className="p-3">Linked products</th><th className="p-3">Findings</th><th className="p-3">Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.slug} className="border-t border-white/10">
              <td className="p-3"><a href={`/gallery/${encodeURIComponent(row.slug)}`} className="hover:text-[#D4AF37]">{row.title}</a><div className="text-[11px] text-white/40">/gallery/{row.slug}</div></td>
              <td className="p-3">{row.location || "—"}</td>
              <td className="p-3">{row.images}</td>
              <td className="p-3">{row.linked_products}</td>
              <td className="p-3">{row.findings}</td>
              <td className="p-3"><a href={`/admin?tab=homepage&project=${encodeURIComponent(row.slug)}#project-gallery`} className={actionClass}><Wrench size={12} /> Edit</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DemandTable({ rows = [] }) {
  if (!rows.length) return <div className="border border-white/10 p-5 text-sm text-white/50">No product-level website inquiry demand was recorded in the last 90 days.</div>;
  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-white/5 text-[10px] uppercase tracking-[0.18em] text-white/50">
          <tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Inquiries 30d</th><th className="p-3">Qty 30d</th><th className="p-3">Inquiries 90d</th><th className="p-3">Qty 90d</th><th className="p-3">Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.product_id} className="border-t border-white/10">
              <td className="p-3"><a href={`/product/${encodeURIComponent(row.product_id)}`} className="hover:text-[#D4AF37]">{row.name}</a><div className="text-[11px] text-white/40">{row.sku || "No SKU"}</div></td>
              <td className="p-3">{row.category || "—"}</td>
              <td className="p-3">{row.inquiries_30d}</td>
              <td className="p-3">{row.quantity_30d}</td>
              <td className="p-3">{row.inquiries_90d}</td>
              <td className="p-3">{row.quantity_90d}</td>
              <td className="p-3"><a href={`/admin?tab=products&product=${encodeURIComponent(row.product_id)}`} className={actionClass}><Wrench size={12} /> Edit</a></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WebsiteHealthGrowthPanels() {
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/admin/health/growth`, {
        credentials: "include",
        headers: { "X-Requested-With": "fetch" },
      });
      if (!response.ok) throw new Error(`Growth health check failed (${response.status})`);
      setData(await response.json());
      try {
        const productsResponse = await fetch(`${API}/products?include_drafts=1&limit=5000`, {
          credentials: "include",
          headers: { "X-Requested-With": "fetch" },
        });
        if (productsResponse.ok) {
          const payload = await productsResponse.json();
          setProducts(Array.isArray(payload) ? payload : (payload?.items || payload?.products || []));
        }
      } catch (_) {
        setProducts([]);
      }
    } catch (err) {
      setError(err?.message || "Growth health check unavailable");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const collections = data?.collections;
  const projects = data?.projects;
  const routes = data?.route_integrity;
  const demand = data?.product_demand;
  const totalStructuralFindings = (collections?.findings?.length || 0) + (projects?.findings?.length || 0) + (routes?.findings?.length || 0);

  const jumpTo = (event) => {
    const id = event.target.value;
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    event.target.value = "";
  };

  return (
    <section className="max-w-7xl mx-auto px-6 pb-16" data-testid="admin-website-health-growth">
      <div className="border-t border-white/10 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-3">Catalogue growth controls</div>
            <h2 className="font-serif text-3xl">Collection, Project, Route & Demand Health</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
              Read-only structural checks for collection membership, project-gallery links, public route identity and product-level website inquiry demand. Findings include direct editor links where a safe Admin destination exists.
            </p>
          </div>
          <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 border border-[#D4AF37]/50 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#D4AF37] disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh growth checks
          </button>
        </div>

        {loading ? (
          <div className="mt-8 border border-white/10 p-8 text-sm text-white/50">Running collection, project and demand checks…</div>
        ) : error ? (
          <div className="mt-8 border border-amber-300/30 bg-amber-400/5 p-6 text-sm text-amber-100">{error}</div>
        ) : (
          <div className="mt-8 space-y-12">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Structural findings" value={totalStructuralFindings} hint="Collections + projects + public route identity" />
              <Metric label="Healthy collections" value={`${collections?.healthy || 0}/${collections?.registered || 0}`} hint="Registered collections with no structural findings" />
              <Metric label="Healthy projects" value={`${projects?.healthy || 0}/${projects?.projects || 0}`} hint="Gallery projects with no structural findings" />
              <Metric label="Products with inquiry demand · 90d" value={demand?.products_with_inquiry_demand_90d ?? "—"} hint={`${demand?.published_products_without_inquiry_demand_90d ?? "—"} published products had no website inquiry-basket demand in 90 days`} />
            </div>

            <div className="sticky top-24 z-20 border border-[#D4AF37]/30 bg-[#16090d]/95 p-3 backdrop-blur">
              <label htmlFor="website-health-jump" className="mr-3 text-[10px] uppercase tracking-[0.18em] text-white/50">Jump to section</label>
              <select id="website-health-jump" defaultValue="" onChange={jumpTo} className="min-w-[260px] border border-white/20 bg-[#16090d] px-3 py-2 text-xs text-white outline-none focus:border-[#D4AF37]">
                <option value="">Choose a section…</option>
                <option value="health-collections">Collection Health</option>
                <option value="health-projects">Project Gallery Audit</option>
                <option value="health-routes">Link / Route Integrity</option>
                <option value="health-demand">Product Inquiry Demand</option>
                <option value="health-gsc">Search Console Status</option>
              </select>
            </div>

            <section id="health-collections" className="scroll-mt-36">
              <div className="mb-4 flex items-center gap-3"><Layers3 size={18} className="text-[#D4AF37]" /><h3 className="font-serif text-2xl">Collection Health</h3></div>
              <CollectionTable rows={collections?.rows || []} />
              <div className="mt-4"><Findings items={collections?.findings || []} emptyMessage="No collection integrity findings." products={products} /></div>
            </section>

            <section id="health-projects" className="scroll-mt-36">
              <div className="mb-4 flex items-center gap-3"><Warehouse size={18} className="text-[#D4AF37]" /><h3 className="font-serif text-2xl">Project Gallery Audit</h3></div>
              <ProjectTable rows={projects?.rows || []} />
              <div className="mt-4"><Findings items={projects?.findings || []} emptyMessage="No project-gallery integrity findings." /></div>
            </section>

            <section id="health-routes" className="scroll-mt-36">
              <div className="mb-4 flex items-center gap-3"><Link2 size={18} className="text-[#D4AF37]" /><h3 className="font-serif text-2xl">Link / Route Integrity</h3></div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-4">
                <Metric label="Published product routes" value={routes?.published_product_routes ?? "—"} hint={`${routes?.unique_product_routes ?? "—"} unique route identities`} />
                <Metric label="Collection routes" value={routes?.collection_routes ?? "—"} />
                <Metric label="Project routes" value={routes?.project_routes ?? "—"} />
                <Metric label="Route findings" value={routes?.findings?.length || 0} hint="Duplicate/missing product identities or empty collection routes" />
              </div>
              <Findings items={routes?.findings || []} emptyMessage="No structural route-integrity findings." />
              <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-white/40"><AlertTriangle size={14} className="mt-0.5 shrink-0" />This is a deterministic internal-link integrity audit. It avoids making hundreds of live HTTP requests on every Admin refresh; major production endpoints are already monitored in Technical Health above.</div>
            </section>

            <section id="health-demand" className="scroll-mt-36">
              <div className="mb-4 flex items-center gap-3"><TrendingUp size={18} className="text-[#D4AF37]" /><h3 className="font-serif text-2xl">Product Inquiry Demand</h3></div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 mb-4">
                <Metric label="Products with demand · 30d" value={demand?.products_with_inquiry_demand_30d ?? "—"} />
                <Metric label="Products with demand · 90d" value={demand?.products_with_inquiry_demand_90d ?? "—"} />
                <Metric label="No inquiry demand · 90d" value={demand?.published_products_without_inquiry_demand_90d ?? "—"} hint="Not the same as zero traffic or zero interest" />
              </div>
              <div className="mb-4 border border-white/10 p-4 text-xs leading-5 text-white/50">{demand?.metric_scope}</div>
              <DemandTable rows={demand?.top_products || []} />
            </section>

            <section id="health-gsc" className="scroll-mt-36 border border-white/10 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {data?.gsc?.runtime_connected ? <CheckCircle2 size={18} className="mt-0.5 text-emerald-300" /> : <AlertTriangle size={18} className="mt-0.5 text-[#D4AF37]" />}
                  <div><div className="text-sm">Google Search Console indexing metrics</div><div className="mt-1 text-xs leading-5 text-white/50">{data?.gsc?.note}</div></div>
                </div>
                <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className={actionClass}><ExternalLink size={12} /> Open Search Console</a>
              </div>
            </section>
          </div>
        )}

        {data?.generated_at && <div className="mt-8 text-[11px] text-white/35">Growth health snapshot generated: {new Date(data.generated_at).toLocaleString()}</div>}
      </div>
    </section>
  );
}
