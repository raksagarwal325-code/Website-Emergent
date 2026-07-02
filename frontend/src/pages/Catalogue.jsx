import React, { useEffect, useState } from "react";
import { api, formatPrice } from "../lib/api";

export default function Catalogue() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([api.listProducts(), api.getSettings()]).then(([p, s]) => {
      setProducts(p); setSettings(s); setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const auto = new URLSearchParams(window.location.search).get("print") === "1";
    if (auto) setTimeout(() => window.print(), 900);
  }, [ready]);

  if (!ready) return <div className="p-16 text-white/50">Preparing catalogue…</div>;

  const wa = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waLink = wa ? `https://wa.me/${wa}` : "#";

  return (
    <div className="catalogue-doc bg-[#1a0a17] text-white min-h-screen">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          body, html, #root { background: #16070f !important; }
          .no-print { display: none !important; }
          .cat-page { break-after: page; }
          .cat-card { break-inside: avoid; }
          a { text-decoration: none; color: inherit; }
        }
        .cat-card { border: 1px solid rgba(191,153,114,0.28); background: linear-gradient(180deg, rgba(163,99,80,0.10), transparent 60%), #1e0d1a; }
        .cat-hairline { border-color: rgba(191,153,114,0.28); }
      `}</style>

      {/* Print controls */}
      <div className="no-print sticky top-0 z-30 bg-[#16070f]/90 backdrop-blur border-b border-[#BF9972]/20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.28em] text-white/60">Print-ready catalogue</div>
          <div className="flex gap-3">
            <button data-testid="catalogue-print-btn" onClick={() => window.print()} className="bg-[#D4AF37] text-black px-6 py-2 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">Download PDF</button>
            <button onClick={() => window.close()} className="border border-white/25 hover:border-[#D4AF37] px-6 py-2 uppercase text-xs tracking-[0.28em]">Close</button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {/* Cover */}
        <section className="cat-page min-h-[85vh] flex flex-col justify-between border cat-hairline p-10 relative overflow-hidden" style={{background: "radial-gradient(circle at 80% 20%, rgba(163,99,80,0.35), transparent 55%), #1e0d1a"}}>
          <div className="flex items-start justify-between">
            <img src="/logo.jpeg" alt="Samrat Glass Emporium" className="w-28 h-28 object-cover" style={{boxShadow:"0 0 0 1px rgba(212,175,55,0.6), 0 12px 40px -8px rgba(163,99,80,0.7)"}} />
            <div className="text-right text-xs uppercase tracking-[0.28em] text-white/50">
              Product Catalogue<br/>
              <span className="text-[#BF9972]">{new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.28em] text-[#BF9972] mb-6">Est. Firozabad · The City of Glass</div>
            <h1 className="font-serif text-6xl leading-[1.05]" style={{background:"linear-gradient(90deg,#D4AF37,#BF9972,#AE765C)",WebkitBackgroundClip:"text",backgroundClip:"text",color:"transparent"}}>
              Samrat Glass<br/>Emporium
            </h1>
            <p className="mt-6 text-white/70 max-w-xl leading-relaxed">
              Fancy lights, crystal chandeliers, glass lamps &amp; decorative lighting — hand-blown and hand-assembled by our artisans in Firozabad.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm border-t cat-hairline pt-6">
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/40 mb-1">WhatsApp / Phone</div>
              <div>{settings.whatsapp_number}</div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/40 mt-4 mb-1">Email</div>
              <div>{settings.admin_email}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/40 mb-1">Showroom</div>
              <div className="leading-relaxed">{settings.address}</div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-white/40 mb-1">GSTIN</div>
                  <div>{settings.gstin}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-white/40 mb-1">Payments</div>
                  <div>{settings.payment_methods}</div>
                </div>
              </div>
              <div className="text-[10px] uppercase tracking-[0.24em] text-white/40 mt-4 mb-1">Delivery</div>
              <div>{settings.delivery_info}</div>
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="mt-10">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-3xl">The Collection</h2>
            <div className="text-xs uppercase tracking-[0.24em] text-white/50">{products.length} pieces</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {products.map((p) => (
              <article key={p.id} className="cat-card p-5 flex gap-5" data-testid={`catalogue-item-${p.id}`}>
                <div className="w-32 h-40 flex-shrink-0 bg-[#0e0510] overflow-hidden border cat-hairline">
                  {p.images?.[0] && <img src={api.resolveImage(p.images[0])} alt={p.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-[#BF9972]">{p.category}</div>
                  <h3 className="font-serif text-lg mt-1 leading-snug">{p.name}</h3>
                  <div className="text-[10px] text-white/40 mt-0.5">SKU · {p.sku}</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-[#D4AF37] font-serif text-lg">{formatPrice(p.price)}</span>
                    {p.compare_at_price && <span className="text-white/40 line-through text-xs">{formatPrice(p.compare_at_price)}</span>}
                  </div>
                  {p.short_description && <p className="text-white/70 text-xs mt-2 leading-relaxed">{p.short_description}</p>}
                  {p.specs && Object.keys(p.specs).length > 0 && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
                      {Object.entries(p.specs).slice(0, 6).map(([k, v]) => (
                        <React.Fragment key={k}>
                          <dt className="text-white/40 uppercase tracking-widest">{k}</dt>
                          <dd className="text-white/80 truncate">{String(v)}</dd>
                        </React.Fragment>
                      ))}
                    </dl>
                  )}
                  {p.tags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {p.tags.slice(0, 4).map((t) => (
                        <span key={t} className="text-[9px] uppercase tracking-widest border cat-hairline px-1.5 py-0.5 text-white/60">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-[10px]">
                    <a href={`${waLink}?text=${encodeURIComponent(`Enquiry: ${p.name} (${p.sku})`)}`} className="border border-[#D4AF37] text-[#D4AF37] px-2 py-1 uppercase tracking-widest">WhatsApp</a>
                    <a href={`mailto:${settings.admin_email}?subject=${encodeURIComponent(`Inquiry: ${p.name} (${p.sku})`)}`} className="border cat-hairline px-2 py-1 uppercase tracking-widest text-white/60">Email</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 border-t cat-hairline pt-6 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-white/40">
          <div>© {new Date().getFullYear()} Samrat Glass Emporium · Firozabad</div>
          <div>{settings.whatsapp_number} · {settings.admin_email}</div>
        </footer>
      </div>
    </div>
  );
}
