import React, { useEffect, useMemo, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { api, formatProductPrice } from "../lib/api";

// --- Helpers ---------------------------------------------------------------

// Pre-fetch an image URL and convert to a data-URL so html2canvas can render
// it reliably (no CORS-tainted canvas / no black boxes).
async function urlToDataUrl(url) {
  if (!url) return null;
  try {
    const resp = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// A subtle SVG placeholder — used when a product has no image or the fetch
// fails. Encoded as data-URL so it survives the html2canvas snapshot.
const PLACEHOLDER_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 800'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0%' stop-color='#2a1125'/>
        <stop offset='100%' stop-color='#16070f'/>
      </linearGradient>
    </defs>
    <rect width='600' height='800' fill='url(#g)'/>
    <g fill='none' stroke='#BF9972' stroke-opacity='0.35' stroke-width='2'>
      <circle cx='300' cy='340' r='68'/>
      <path d='M232 340 L368 340 M300 272 L300 408' />
    </g>
    <text x='300' y='500' fill='#BF9972' font-family='Georgia, serif' font-style='italic' font-size='28' text-anchor='middle' opacity='0.7'>Image coming soon</text>
    <text x='300' y='545' fill='#BF9972' font-family='Georgia, serif' font-size='14' letter-spacing='4' text-anchor='middle' opacity='0.5'>SAMRAT GLASS EMPORIUM</text>
  </svg>`
)}`;

// --- Small building blocks -------------------------------------------------

const Page = ({ children, footerText, pageNum, totalPages }) => (
  <section
    className="pdf-page"
    style={{
      width: "210mm",
      height: "296mm",
      position: "relative",
      overflow: "hidden",
      background:
        "linear-gradient(180deg, #1e0d1a 0%, #16070f 100%)",
      color: "#f5efe7",
      // No page-break CSS here — html2pdf slices the canvas by pixel height,
      // and our elements are already exactly 297mm tall so one <Page> == one
      // A4 page. Adding page-break-after here causes double-breaks.
    }}
  >
    <div style={{ padding: "16mm 16mm 22mm 16mm", height: "100%", boxSizing: "border-box", position: "relative" }}>
      {children}
    </div>
    {/* Footer band */}
    <div
      style={{
        position: "absolute",
        left: "16mm", right: "16mm", bottom: "10mm",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        borderTop: "1px solid rgba(191,153,114,0.28)",
        paddingTop: "3mm",
        fontSize: "8.5pt", letterSpacing: "0.14em", textTransform: "uppercase",
        color: "rgba(245,239,231,0.5)",
      }}
    >
      <span style={{ color: "#BF9972" }}>Samrat Glass Emporium</span>
      <span>{footerText || ""}</span>
      <span>{pageNum ? `Page ${pageNum}${totalPages ? " / " + totalPages : ""}` : ""}</span>
    </div>
  </section>
);

const SectionTitle = ({ eyebrow, title, align = "left" }) => (
  <div style={{ textAlign: align, marginBottom: "8mm" }}>
    {eyebrow && (
      <div style={{ fontSize: "8.5pt", letterSpacing: "0.28em", textTransform: "uppercase", color: "#BF9972", marginBottom: "3mm" }}>
        {eyebrow}
      </div>
    )}
    <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "26pt", lineHeight: 1.1, margin: 0,
      color: "#D4AF37" }}>
      {title}
    </h2>
    <div style={{ width: align === "center" ? "50mm" : "35mm", margin: align === "center" ? "3mm auto 0" : "3mm 0 0", height: "1px",
      background: "linear-gradient(90deg,#D4AF37,transparent)" }} />
  </div>
);

const Divider = () => (
  <div style={{ height: "1px", background: "linear-gradient(90deg,transparent,rgba(191,153,114,0.4),transparent)", margin: "4mm 0" }} />
);

// --- Main component -------------------------------------------------------

export default function Catalogue() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  // Product image dataURL map keyed by product id
  const [imgMap, setImgMap] = useState({});
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const docRef = useRef(null);

  useEffect(() => {
    Promise.all([api.listProducts(), api.getSettings()]).then(([p, s]) => {
      setProducts(p);
      setSettings(s);
      setReady(true);
    });
  }, []);

  // Preload images as data URLs so the PDF snapshot doesn't produce black boxes.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    (async () => {
      setProgress("Preparing images…");
      // Logo — served from the frontend at /logo.jpeg — usually same-origin.
      const logoUrl = await urlToDataUrl("/logo.jpeg");
      if (!cancelled) setLogoDataUrl(logoUrl);
      // Products — route through the /api/proxy-image proxy so cross-origin
      // CDN URLs are served as same-origin (avoids CORS-tainted canvases).
      const entries = await Promise.all(
        products.map(async (p) => {
          const raw = p.images?.[0];
          if (!raw) return [p.id, null];
          const url = api.resolveImage(raw, { proxy: true });
          const dataUrl = await urlToDataUrl(url);
          return [p.id, dataUrl];
        })
      );
      if (cancelled) return;
      setImgMap(Object.fromEntries(entries));
      setProgress("");
    })();
    return () => { cancelled = true; };
  }, [ready, products]);

  // Group products by category — used for TOC + divider pages.
  const groups = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      const cat = (p.category || "Uncategorized").trim();
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(p);
    }
    // Preserve stable order (alphabetical)
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  // Chunk products of a group into pages of 2.
  const pageChunks = useMemo(() => {
    const out = [];
    for (const [cat, list] of groups) {
      for (let i = 0; i < list.length; i += 2) {
        out.push({ category: cat, items: list.slice(i, i + 2) });
      }
    }
    return out;
  }, [groups]);

  // Compute total pages: cover + TOC + about + why + (dividers + product pages) + contact
  const totalPages =
    1 + // cover
    1 + // TOC
    1 + // about
    1 + // why
    groups.length + // one divider per category
    pageChunks.length + // product pages (2 per)
    1; // contact

  // Page number tracker — increments as we render.
  const pageNumRef = { current: 0 };
  const nextPage = () => ++pageNumRef.current;

  const waRaw = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waLink = waRaw ? `https://wa.me/${waRaw}` : "";

  const downloadPdf = async () => {
    if (!docRef.current || generating) return;
    setGenerating(true);
    try {
      const filename = `Samrat-Glass-Emporium-Catalogue-${new Date().toISOString().slice(0, 10)}.pdf`;
      await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.94 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#16070f",
            logging: false,
            windowWidth: 794, // 210mm at 96dpi
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
          pagebreak: { mode: ["css"], avoid: [".pdf-card", ".pdf-toc-row"] },
        })
        .from(docRef.current)
        .save();
    } catch (e) {
      console.error(e);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    // Only auto-download once images have finished pre-loading.
    if (progress) return;
    if (new URLSearchParams(window.location.search).get("print") === "1") {
      setTimeout(downloadPdf, 400);
    }
  }, [ready, progress]);

  if (!ready) return <div className="p-16 text-white/50">Preparing catalogue…</div>;

  // Precompute page numbers per section so the TOC and footers align.
  const pageOfCover = 1;
  const pageOfToc = 2;
  const pageOfAbout = 3;
  const pageOfWhy = 4;
  // For each group we render 1 divider + N/2 product pages
  const groupStartPages = {};
  {
    let n = pageOfWhy + 1;
    for (const [cat, list] of groups) {
      groupStartPages[cat] = n; // divider page
      n += 1 + Math.ceil(list.length / 2);
    }
  }
  const contactPageNum = totalPages;

  return (
    <div className="catalogue-doc" style={{ background: "#0d0510", minHeight: "100vh", color: "#f5efe7" }}>
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          body, html, #root { background: #0d0510 !important; }
          .no-print { display: none !important; }
          a { text-decoration: none; color: inherit; }
        }
        .pdf-doc { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        .pdf-card { break-inside: avoid; page-break-inside: avoid; }
        .pdf-toc-row { break-inside: avoid; page-break-inside: avoid; }
      `}</style>

      {/* Print controls — hidden in the PDF output */}
      <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(13,5,16,0.95)", borderBottom: "1px solid rgba(191,153,114,0.2)" }}>
        <div style={{ maxWidth: "1024px", margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(245,239,231,0.6)" }}>
            {progress || "Print-ready catalogue"}
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              data-testid="catalogue-print-btn"
              disabled={generating || !!progress}
              onClick={downloadPdf}
              style={{
                background: "#D4AF37", color: "#000", padding: "8px 24px",
                textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.28em",
                border: "none", opacity: generating || progress ? 0.6 : 1, cursor: generating || progress ? "not-allowed" : "pointer",
              }}
            >
              {generating ? "Generating…" : progress ? "Loading images…" : "Download PDF"}
            </button>
            <button
              onClick={() => window.close()}
              style={{ background: "transparent", color: "#f5efe7", padding: "8px 24px", textTransform: "uppercase",
                fontSize: "11px", letterSpacing: "0.28em", border: "1px solid rgba(255,255,255,0.25)", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* PDF content — each <Page> becomes one A4 page */}
      <div className="pdf-doc" ref={docRef} style={{ width: "210mm", margin: "0 auto" }}>

        {/* ========== 1. COVER PAGE ========== */}
        <Page pageNum={nextPage()} totalPages={totalPages}
          footerText={new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}>
          <div style={{ position: "absolute", inset: "16mm", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              {logoDataUrl ? (
                <img src={logoDataUrl} alt="logo" style={{ width: "32mm", height: "32mm", objectFit: "contain",
                  border: "1px solid rgba(212,175,55,0.6)", padding: "3mm", background: "#0d0510" }} />
              ) : (
                <div style={{ width: "32mm", height: "32mm", border: "1px solid #D4AF37", display: "flex", alignItems: "center", justifyContent: "center", color: "#D4AF37", fontFamily: "Georgia, serif", fontSize: "18pt" }}>S</div>
              )}
              <div style={{ textAlign: "right", fontSize: "8.5pt", letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(245,239,231,0.5)" }}>
                Product Catalogue<br />
                <span style={{ color: "#BF9972" }}>
                  {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Title block */}
            <div>
              <div style={{ fontSize: "8.5pt", letterSpacing: "0.28em", textTransform: "uppercase", color: "#BF9972", marginBottom: "6mm" }}>
                Est. Firozabad · The City of Glass · Since 1981
              </div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: "56pt", lineHeight: 1.02, margin: 0,
                color: "#D4AF37" }}>
                Samrat Glass<br />Emporium
              </h1>
              <div style={{ marginTop: "6mm", width: "40mm", height: "1px", background: "linear-gradient(90deg,#D4AF37,transparent)" }} />
              <p style={{ marginTop: "6mm", fontSize: "11pt", lineHeight: 1.6, color: "rgba(245,239,231,0.75)", maxWidth: "140mm" }}>
                Fancy lights, crystal chandeliers, glass lamps &amp; decorative lighting — hand-blown and hand-assembled by our artisans in Firozabad. This catalogue features {products.length} pieces across {groups.length} collections.
              </p>
            </div>

            {/* Contact block */}
            <div style={{ borderTop: "1px solid rgba(191,153,114,0.4)", paddingTop: "6mm", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8mm", fontSize: "10pt", lineHeight: 1.6 }}>
              <div>
                <ContactLabel>WhatsApp / Phone</ContactLabel>
                <div style={{ color: "#f5efe7" }}>{settings.whatsapp_number || "—"}</div>
                <ContactLabel style={{ marginTop: "4mm" }}>Email</ContactLabel>
                <div style={{ color: "#f5efe7" }}>{settings.admin_email || "—"}</div>
                <ContactLabel style={{ marginTop: "4mm" }}>GSTIN</ContactLabel>
                <div style={{ color: "#f5efe7" }}>{settings.gstin || "—"}</div>
              </div>
              <div>
                <ContactLabel>Showroom</ContactLabel>
                <div style={{ color: "#f5efe7", lineHeight: 1.5 }}>{settings.address || "—"}</div>
                <ContactLabel style={{ marginTop: "4mm" }}>Delivery</ContactLabel>
                <div style={{ color: "#f5efe7" }}>{settings.delivery_info || "—"}</div>
                <ContactLabel style={{ marginTop: "4mm" }}>Payments</ContactLabel>
                <div style={{ color: "#f5efe7" }}>{settings.payment_methods || "—"}</div>
              </div>
            </div>
          </div>
        </Page>

        {/* ========== 2. TABLE OF CONTENTS ========== */}
        <Page pageNum={nextPage()} totalPages={totalPages} footerText="Contents">
          <SectionTitle eyebrow="Contents" title="Table of Contents" />
          <div style={{ marginTop: "10mm" }}>
            <TocRow label="About Us" page={pageOfAbout} />
            <TocRow label="Reasons We Are Better" page={pageOfWhy} />
            {groups.map(([cat, list]) => (
              <TocRow key={cat} label={cat} sub={`${list.length} piece${list.length === 1 ? "" : "s"}`} page={groupStartPages[cat]} />
            ))}
            <TocRow label="Contact & Inquiry" page={contactPageNum} />
          </div>
        </Page>

        {/* ========== 3. ABOUT US ========== */}
        <Page pageNum={nextPage()} totalPages={totalPages} footerText="About Us">
          <SectionTitle eyebrow="Our Story" title="Since 1981 · Firozabad" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "5mm", fontSize: "11pt", lineHeight: 1.75, color: "rgba(245,239,231,0.82)" }}>
            <p>Established in 1981 in Firozabad, the City of Glass, Samrat Glass Emporium is a trusted manufacturer of handcrafted decorative lighting. We create a wide range of hanging chandeliers, hanging lights, wall lights, table lamps, floor lamps, sconces, and customised decorative lighting solutions.</p>
            <p>Light does more than illuminate a space — it shapes mood, personality, and atmosphere. With this vision, Samrat Glass Emporium was founded to bring elegant, handcrafted lighting into Indian homes, hotels, showrooms, restaurants, and luxury interiors.</p>
            <p>Under the guidance of our founder, <span style={{ color: "#D4AF37" }}>Mr. Sunil Kumar Agarwal</span>, our craftsmen combine traditional glass-making techniques with modern design sensibilities. With more than four decades of experience, we continue to create decorative lighting that blends artistry, quality, and sophistication.</p>
            <p>Our aim is to provide Indian consumers with designer lighting products that transform ordinary spaces into memorable interiors.</p>
          </div>
          <Divider />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "5mm", marginTop: "6mm" }}>
            {[["1981", "Founded"], ["40+", "Years"], ["1000+", "Designs"], ["Pan-India", "Delivery"]].map(([v, l]) => (
              <div key={l} style={{ textAlign: "center", padding: "5mm 2mm", border: "1px solid rgba(191,153,114,0.28)" }}>
                <div style={{ fontFamily: "Georgia, serif", fontSize: "22pt", color: "#D4AF37" }}>{v}</div>
                <div style={{ fontSize: "8pt", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(245,239,231,0.55)", marginTop: "2mm" }}>{l}</div>
              </div>
            ))}
          </div>
        </Page>

        {/* ========== 4. REASONS WHY WE ARE BETTER ========== */}
        <Page pageNum={nextPage()} totalPages={totalPages} footerText="Why Choose Us">
          <SectionTitle eyebrow="Why Choose Us" title="Reasons We Are Better" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4mm 8mm", marginTop: "6mm" }}>
            {[
              ["Legacy craftsmanship", "More than 40 years of experience with a team of skilled Firozabad artisans."],
              ["Handcrafted, not mass-produced", "Every piece is hand-blown and hand-assembled — no two are ever identical."],
              ["Wide, coherent range", "Chandeliers, wall lights, table lamps, hanging lights, sconces, and floor lamps under one atelier."],
              ["Custom design service", "Bespoke lighting made exactly to your architect's or interior designer's brief."],
              ["Trusted by Indian homes & hotels", "Thousands of installations across residential, hospitality and retail interiors."],
              ["Quality, finish & timeliness", "Rigorous QC at every stage, with production timelines you can plan around."],
              ["Made in India's glass capital", "Based in Firozabad — the heartland of Indian glass-making since generations."],
              ["Fair pricing, transparent process", "Direct-from-manufacturer pricing with no middlemen mark-ups."],
            ].map(([title, body], i) => (
              <div key={i} style={{ display: "flex", gap: "3mm" }}>
                <div style={{ color: "#D4AF37", fontSize: "10pt", flexShrink: 0, lineHeight: 1 }}>◆</div>
                <div>
                  <div style={{ color: "#f5efe7", fontFamily: "Georgia, serif", fontSize: "12pt" }}>{title}</div>
                  <div style={{ color: "rgba(245,239,231,0.7)", fontSize: "9.5pt", lineHeight: 1.6, marginTop: "1mm" }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </Page>

        {/* ========== 5. CATEGORY DIVIDERS + PRODUCT PAGES ========== */}
        {groups.map(([cat, list]) => {
          const dividerPageNum = nextPage();
          return (
            <React.Fragment key={cat}>
              {/* Category divider */}
              <Page pageNum={dividerPageNum} totalPages={totalPages} footerText={cat}>
                <div style={{ position: "absolute", inset: "16mm", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                  <div style={{ fontSize: "9pt", letterSpacing: "0.32em", textTransform: "uppercase", color: "#BF9972", marginBottom: "5mm" }}>
                    Collection
                  </div>
                  <h2 style={{ fontFamily: "Georgia, serif", fontSize: "48pt", lineHeight: 1.05, margin: 0,
                    color: "#D4AF37" }}>
                    {cat}
                  </h2>
                  <div style={{ width: "60mm", height: "1px", background: "linear-gradient(90deg,transparent,#D4AF37,transparent)", margin: "8mm 0" }} />
                  <div style={{ fontSize: "11pt", letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(245,239,231,0.6)" }}>
                    {list.length} {list.length === 1 ? "piece" : "pieces"}
                  </div>
                </div>
              </Page>

              {/* Product pages — 2 per page */}
              {Array.from({ length: Math.ceil(list.length / 2) }, (_, gi) => {
                const pairs = list.slice(gi * 2, gi * 2 + 2);
                return (
                  <Page key={`${cat}-${gi}`} pageNum={nextPage()} totalPages={totalPages} footerText={cat}>
                    <div style={{ fontSize: "8.5pt", letterSpacing: "0.28em", textTransform: "uppercase", color: "#BF9972", marginBottom: "5mm" }}>
                      {cat}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6mm", height: "calc(100% - 20mm)" }}>
                      {pairs.map((p) => (
                        <ProductCard key={p.id} product={p} imgDataUrl={imgMap[p.id]} settings={settings} waLink={waLink} />
                      ))}
                    </div>
                  </Page>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* ========== 6. CONTACT PAGE ========== */}
        <Page pageNum={nextPage()} totalPages={totalPages} footerText="Contact & Inquiry">
          <SectionTitle eyebrow="Get in touch" title="Let's Light Your Space" align="center" />
          <div style={{ marginTop: "10mm", padding: "10mm", border: "1px solid rgba(191,153,114,0.35)", background: "linear-gradient(180deg, rgba(163,99,80,0.08), transparent 60%)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8mm", fontSize: "10.5pt", lineHeight: 1.7 }}>
              <div>
                <ContactLabel>WhatsApp / Phone</ContactLabel>
                <div style={{ color: "#D4AF37", fontFamily: "Georgia, serif", fontSize: "14pt" }}>{settings.whatsapp_number || "—"}</div>
                <ContactLabel style={{ marginTop: "5mm" }}>Email</ContactLabel>
                <div style={{ color: "#f5efe7" }}>{settings.admin_email || "—"}</div>
                <ContactLabel style={{ marginTop: "5mm" }}>GSTIN</ContactLabel>
                <div style={{ color: "#f5efe7" }}>{settings.gstin || "—"}</div>
                {settings.business_hours && (<>
                  <ContactLabel style={{ marginTop: "5mm" }}>Business Hours</ContactLabel>
                  <div style={{ color: "#f5efe7" }}>{settings.business_hours}</div>
                </>)}
              </div>
              <div>
                <ContactLabel>Showroom</ContactLabel>
                <div style={{ color: "#f5efe7", lineHeight: 1.6 }}>{settings.address || "—"}</div>
                <ContactLabel style={{ marginTop: "5mm" }}>Delivery</ContactLabel>
                <div style={{ color: "#f5efe7" }}>{settings.delivery_info || "—"}</div>
                <ContactLabel style={{ marginTop: "5mm" }}>Payments</ContactLabel>
                <div style={{ color: "#f5efe7" }}>{settings.payment_methods || "—"}</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: "10mm", textAlign: "center", color: "rgba(245,239,231,0.55)", fontSize: "9pt", lineHeight: 1.8 }}>
            <div style={{ fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: "13pt", color: "#BF9972", marginBottom: "3mm" }}>
              &ldquo;Every piece tells a story of Firozabad — carry one home.&rdquo;
            </div>
            © {new Date().getFullYear()} Samrat Glass Emporium · Firozabad, India<br />
            All designs and imagery are the property of Samrat Glass Emporium.
          </div>
        </Page>

      </div>
    </div>
  );
}

// --- Small inline components ----------------------------------------------

function ContactLabel({ children, style }) {
  return (
    <div style={{
      fontSize: "7.5pt", letterSpacing: "0.24em", textTransform: "uppercase",
      color: "rgba(245,239,231,0.5)", marginBottom: "1.2mm",
      ...(style || {}),
    }}>
      {children}
    </div>
  );
}

function TocRow({ label, sub, page }) {
  return (
    <div className="pdf-toc-row" style={{
      display: "flex", alignItems: "baseline", gap: "3mm",
      padding: "3.5mm 0", borderBottom: "1px dashed rgba(191,153,114,0.28)",
    }}>
      <div style={{ fontFamily: "Georgia, serif", fontSize: "14pt", color: "#f5efe7" }}>{label}</div>
      {sub && <div style={{ fontSize: "8.5pt", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(191,153,114,0.7)" }}>· {sub}</div>}
      <div style={{ flex: 1, borderBottom: "1px dotted rgba(191,153,114,0.35)", position: "relative", top: "-3px" }} />
      <div style={{ fontFamily: "Georgia, serif", fontSize: "13pt", color: "#D4AF37", minWidth: "10mm", textAlign: "right" }}>{page}</div>
    </div>
  );
}

function ProductCard({ product: p, imgDataUrl, settings, waLink }) {
  const fp = formatProductPrice(p);
  const src = imgDataUrl || PLACEHOLDER_SVG;
  const specEntries = p.specs ? Object.entries(p.specs).filter(([, v]) => v != null && String(v).trim() !== "").slice(0, 6) : [];

  return (
    <article
      className="pdf-card"
      style={{
        flex: 1, display: "flex", gap: "6mm",
        border: "1px solid rgba(191,153,114,0.32)",
        background: "linear-gradient(180deg, rgba(163,99,80,0.06), transparent 60%), #1a0a17",
        padding: "6mm",
        borderRadius: "1.5mm",
        pageBreakInside: "avoid", breakInside: "avoid",
      }}
    >
      {/* Image */}
      <div style={{
        width: "58mm", flexShrink: 0, aspectRatio: "3 / 4",
        background: "#0d0510", border: "1px solid rgba(191,153,114,0.28)",
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        <img
          src={src}
          alt={p.name}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "8pt", letterSpacing: "0.24em", textTransform: "uppercase", color: "#BF9972" }}>
          {p.category || "Uncategorized"}
        </div>
        <h3 style={{ fontFamily: "Georgia, serif", fontSize: "16pt", lineHeight: 1.2, margin: "1.5mm 0 0", color: "#f5efe7" }}>
          {p.name}
        </h3>
        {p.sku && (
          <div style={{ fontSize: "8pt", color: "rgba(245,239,231,0.45)", marginTop: "1mm", letterSpacing: "0.12em" }}>
            REF · {p.sku}
          </div>
        )}

        {/* Price */}
        <div style={{ marginTop: "3mm", display: "flex", alignItems: "baseline", gap: "2mm", flexWrap: "wrap" }}>
          {fp.onRequest ? (
            <span style={{ color: "#D4AF37", fontFamily: "Georgia, serif", fontSize: "13pt", fontStyle: "italic" }}>Price on request</span>
          ) : (
            <>
              {fp.label && <span style={{ fontSize: "7.5pt", letterSpacing: "0.22em", textTransform: "uppercase", color: "#BF9972" }}>{fp.label}</span>}
              <span style={{ color: "#D4AF37", fontFamily: "Georgia, serif", fontSize: "16pt" }}>{fp.primary}</span>
              {fp.compareAt && <span style={{ color: "rgba(245,239,231,0.4)", textDecoration: "line-through", fontSize: "10pt" }}>{fp.compareAt}</span>}
            </>
          )}
        </div>

        {/* Short description */}
        {p.short_description && (
          <p style={{ fontSize: "9.5pt", lineHeight: 1.55, color: "rgba(245,239,231,0.72)", marginTop: "3mm" }}>
            {p.short_description}
          </p>
        )}

        {/* Specifications */}
        {specEntries.length > 0 && (
          <dl style={{ marginTop: "3mm", display: "grid", gridTemplateColumns: "auto 1fr", columnGap: "3mm", rowGap: "1mm", fontSize: "8.5pt", lineHeight: 1.4 }}>
            {specEntries.map(([k, v]) => (
              <React.Fragment key={k}>
                <dt style={{ color: "rgba(245,239,231,0.5)", textTransform: "uppercase", letterSpacing: "0.14em", fontSize: "7.5pt" }}>{k}</dt>
                <dd style={{ color: "rgba(245,239,231,0.85)", margin: 0 }}>{String(v)}</dd>
              </React.Fragment>
            ))}
          </dl>
        )}

        {/* CTA row */}
        <div style={{ marginTop: "auto", paddingTop: "3mm", display: "flex", gap: "2mm", flexWrap: "wrap", fontSize: "8pt", letterSpacing: "0.2em", textTransform: "uppercase" }}>
          {waLink && (
            <span style={{ background: "#25D366", color: "#000", padding: "1.5mm 3mm", fontWeight: 600 }}>
              WhatsApp · {settings.whatsapp_number}
            </span>
          )}
          <span style={{ border: "1px solid rgba(212,175,55,0.6)", color: "#D4AF37", padding: "1.5mm 3mm" }}>
            samratglassemporium.com
          </span>
        </div>
      </div>
    </article>
  );
}
