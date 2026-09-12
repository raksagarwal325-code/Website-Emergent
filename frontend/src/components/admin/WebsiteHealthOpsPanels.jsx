import React, { useEffect, useState } from "react";
import { Activity, CheckCircle2, ExternalLink, RefreshCw, SearchCheck, TrendingUp, XCircle } from "lucide-react";
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

function CheckRow({ label, ok, detail }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-white/10 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div>
        <div className="text-sm text-white/90">{label}</div>
        {detail && <div className="mt-1 break-all text-[11px] text-white/40">{detail}</div>}
      </div>
      <div className={`inline-flex shrink-0 items-center gap-1.5 text-xs ${ok ? "text-emerald-300" : "text-amber-200"}`}>
        {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
        {ok ? "Pass" : "Check"}
      </div>
    </div>
  );
}

export default function WebsiteHealthOpsPanels() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/admin/health/ops`, {
        credentials: "include",
        headers: { "X-Requested-With": "fetch" },
      });
      if (!response.ok) throw new Error(`Extended health check failed (${response.status})`);
      setData(await response.json());
    } catch (err) {
      setError(err?.message || "Extended health check unavailable");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const technical = data?.technical;
  const search = data?.search;
  const conversion = data?.conversion;

  return (
    <section className="max-w-7xl mx-auto px-6 pb-16" data-testid="admin-website-health-ops">
      <div className="border-t border-white/10 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow mb-3">Live site operations</div>
            <h2 className="font-serif text-3xl">Technical, Search & Conversion Health</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
              Live read-only checks against samratglass.com plus enquiry/contact activity from the production database. These checks do not modify the website.
            </p>
          </div>
          <button onClick={refresh} disabled={loading} className="inline-flex items-center gap-2 border border-[#D4AF37]/50 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#D4AF37] disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh live checks
          </button>
        </div>

        {loading ? (
          <div className="mt-8 border border-white/10 p-8 text-sm text-white/50">Running live production checks…</div>
        ) : error ? (
          <div className="mt-8 border border-amber-300/30 bg-amber-400/5 p-6 text-sm text-amber-100">{error}</div>
        ) : (
          <div className="mt-8 space-y-10">
            <section>
              <div className="mb-4 flex items-center gap-3"><Activity size={18} className="text-[#D4AF37]" /><h3 className="font-serif text-2xl">Technical Health</h3></div>
              <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Live checks passing" value={`${technical?.passing || 0}/${technical?.total || 0}`} hint={technical?.origin || "Production origin"} />
                  <Metric label="Homepage SEO shell" value={technical?.homepage_canonical && technical?.homepage_jsonld ? "Healthy" : "Review"} hint={`Canonical ${technical?.homepage_canonical ? "present" : "missing"} · JSON-LD ${technical?.homepage_jsonld ? "present" : "missing"}`} />
                </div>
                <div className="border border-white/10 p-5">
                  {(technical?.checks || []).map((item) => <CheckRow key={item.name} label={item.name} ok={item.ok} detail={`${item.status || "—"} · ${item.url}${item.error ? ` · ${item.error}` : ""}`} />)}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-3"><SearchCheck size={18} className="text-[#D4AF37]" /><h3 className="font-serif text-2xl">Search Health</h3></div>
              <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
                <div className="space-y-3">
                  <Metric label="Discoverability checks" value={`${search?.passing || 0}/${search?.total || 0}`} hint="Robots, sitemaps, canonical and structured-data readiness" />
                  <div className="border border-white/10 p-5 text-xs leading-5 text-white/50">
                    <div className="text-sm text-white/80">Google Search Console</div>
                    <p className="mt-2">{search?.search_console_note}</p>
                    <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-[#D4AF37]">Open Search Console <ExternalLink size={12} /></a>
                  </div>
                </div>
                <div className="border border-white/10 p-5">
                  {(search?.checks || []).map((item) => <CheckRow key={item.name} label={item.name} ok={item.ok} />)}
                  {(search?.declared_sitemaps || []).length > 0 && <div className="mt-4 border-t border-white/10 pt-4"><div className="text-[10px] uppercase tracking-[0.18em] text-white/40">Declared sitemaps</div>{search.declared_sitemaps.map((url) => <div key={url} className="mt-2 break-all text-[11px] text-white/45">{url}</div>)}</div>}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center gap-3"><TrendingUp size={18} className="text-[#D4AF37]" /><h3 className="font-serif text-2xl">Conversion Health</h3></div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Metric label="Inquiries · 7 days" value={conversion?.inquiries_7d ?? "—"} hint={`${conversion?.inquiries_30d ?? "—"} in 30 days · ${conversion?.inquiries_total ?? "—"} total`} />
                <Metric label="Contact messages · 7 days" value={conversion?.contact_messages_7d ?? "—"} hint={`${conversion?.contact_messages_30d ?? "—"} in 30 days · ${conversion?.contact_messages_total ?? "—"} total`} />
                <Metric label="Inquiry statuses" value={Object.keys(conversion?.inquiry_status_counts || {}).length} hint={Object.entries(conversion?.inquiry_status_counts || {}).map(([key, value]) => `${key}: ${value}`).join(" · ") || "No status data"} />
                <Metric label="Sales attribution" value={conversion?.lead_attribution_connected ? "Connected" : "Manual"} hint="Qualified lead → quote → order remains in the Lead Register workflow" />
              </div>
              <div className="mt-4 border border-white/10 p-5 text-xs leading-5 text-white/50">{conversion?.note}</div>
            </section>
          </div>
        )}

        {data?.generated_at && <div className="mt-8 text-[11px] text-white/35">Live operational snapshot generated: {new Date(data.generated_at).toLocaleString()}</div>}
      </div>
    </section>
  );
}
