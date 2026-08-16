import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, ShoppingBag, MessageCircle, Star, ArrowLeft, Truck, CreditCard, MapPin } from "lucide-react";
import { api, formatPrice, formatProductPrice } from "../lib/api";
import { schemaAvailabilityFor, isMadeToOrder } from "../lib/productAvailability";
import { useCatalog } from "../context/CatalogContext";
import { toast } from "sonner";
import SEO from "../components/SEO";
import SchemaLD from "../components/SchemaLD";
import SeenInProjects from "../components/SeenInProjects";
import { trackViewItem } from "../lib/analytics";
import { waProductLink } from "../lib/whatsapp";
import { imgGuardProps, imgGuardStyle, containerGuardProps, containerGuardStyle } from "../lib/imageGuard";
import { productPath } from "../lib/productUrl";
import { productImageAlt } from "../lib/imageSeo";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedImg, setSelectedImg] = useState(0);
  const [reviewForm, setReviewForm] = useState({ author: "", rating: 5, title: "", body: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [activeTab, setActiveTab] = useState("description");
  const productTabsRef = useRef(null);
  const { addToCart, toggleFavorite, isFavorite } = useCatalog();

  useEffect(() => {
    setNotFound(false);
    setProduct(null);
    api
      .getProduct(id)
      .then((p) => {
        setProduct(p);
        setSelectedImg(0);
        trackViewItem(p);
        const canonicalPath = productPath(p);
        if (window.location.pathname !== canonicalPath) {
          // Normalize legacy UUID links without remounting/refetching the
          // product. BrowserRouter picks up the readable path on the next
          // navigation, while this page keeps its already-resolved record.
          window.history.replaceState(window.history.state, "", canonicalPath);
        }
        return api.listReviews(p.id);
      })
      .then(setReviews)
      .catch((err) => {
        const status = err?.response?.status ?? err?.status;
        if (status === 404) setNotFound(true);
      });
    api.getSettings().then(setSettings).catch(() => {});
  }, [id]);

  if (notFound) {
    return (
      <div
        data-testid="product-not-found"
        className="max-w-3xl mx-auto px-6 py-24 text-center"
      >
        <div className="eyebrow mb-6">Error · 404</div>
        <h1 className="font-serif text-4xl sm:text-5xl leading-tight">Product not found</h1>
        <p className="mt-6 text-white/60 max-w-xl mx-auto leading-relaxed">
          This piece may have been renamed, discontinued, or the link is
          incorrect. Browse the full catalogue to find something similar.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/catalog"
            data-testid="product-notfound-catalog-btn"
            className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] transition-colors"
          >
            <ShoppingBag size={14} /> Browse Catalogue
          </Link>
          <Link
            to="/"
            data-testid="product-notfound-home-btn"
            className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.28em]"
          >
            <ArrowLeft size={14} /> Home
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return <div className="max-w-7xl mx-auto px-6 py-24 text-white/40">Loading…</div>;
  }

  const fav = isFavorite(product.id);
  const images = (product.images || []).map(api.resolveImage);

  const productUrl =
    typeof window !== "undefined" && window.location
      ? `${window.location.origin}${productPath(product)}`
      : "";
  const waLink = waProductLink(settings?.whatsapp_number, product, productUrl) || "#";

  const handleAdd = () => {
    addToCart(product);
    toast.success(`${product.name} added to inquiry`);
  };

  const openShippingTab = () => {
    setActiveTab("shipping");
    requestAnimationFrame(() => {
      productTabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (reviewSubmitting) return; // prevent duplicate submissions
    setReviewError("");
    const author = (reviewForm.author || "").trim();
    const body = (reviewForm.body || "").trim();
    if (author.length < 2 || author.length > 60) {
      setReviewError("Please enter your name (2–60 characters).");
      return;
    }
    if (body.length < 10 || body.length > 1000) {
      setReviewError("Review must be between 10 and 1000 characters.");
      return;
    }
    setReviewSubmitting(true);
    try {
      await api.createReview({
        product_id: product.id,
        author,
        rating: reviewForm.rating,
        title: (reviewForm.title || "").trim(),
        body,
      });
      // Reviews go through moderation — do NOT add to the list or refetch
      // the product rating. Just confirm the submission.
      setReviewForm({ author: "", rating: 5, title: "", body: "" });
      setReviewSubmitted(true);
      toast.success("Thank you. Your review has been submitted for approval.");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const msg = typeof detail === "string"
        ? detail
        : Array.isArray(detail) && detail[0]?.msg
          ? detail[0].msg
          : "Could not submit review. Please try again.";
      setReviewError(msg);
      toast.error(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const availabilityUrl = product ? schemaAvailabilityFor(product) : null;
  const visiblePrice = formatProductPrice(product);
  const hasPublicOfferPrice = !visiblePrice.onRequest && Number(product.price) > 0;
  // Site origin — used inside Offer.shippingDetails / hasMerchantReturnPolicy
  // links. Falls back to samratglass.com so the JSON-LD is complete even
  // in SSR/prerender contexts where `window` is not defined.
  const siteOrigin =
    (typeof window !== "undefined" && window.location?.origin) ||
    "https://samratglass.com";
  const productSchema = product && availabilityUrl ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${siteOrigin}${productPath(product)}#product`,
    "url": `${siteOrigin}${productPath(product)}`,
    "name": product.name,
    "sku": product.sku,
    "description": product.short_description || product.description || "",
    "image": (product.images || []).map((u) => api.resolveImage(u)).filter(Boolean),
    "brand": { "@type": "Brand", "name": "Samrat Glass Emporium" },
    "category": product.category,
    ...(product.rating > 0 ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": String(product.rating.toFixed(1)),
        "reviewCount": String(product.review_count || 0),
      },
    } : {}),
    "offers": {
      "@type": "Offer",
      ...(hasPublicOfferPrice ? {
        "price": String(product.price),
        "priceCurrency": "INR",
      } : {}),
      "availability": availabilityUrl,
      "url": `${siteOrigin}${productPath(product)}`,
      "seller": { "@type": "Organization", "name": "Samrat Glass Emporium" },
      // Returns / replacements — handcrafted, fragile glass. We do NOT
      // accept general returns; transit-damage replacements are handled
      // per the linked policy page. `MerchantReturnNotPermitted` is the
      // narrowest truthful enum value; the merchantReturnLink surfaces
      // the damage-replacement carve-out to visitors and crawlers.
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "IN",
        "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
        "merchantReturnLink": `${siteOrigin}/legal/returns`
      },
      // Shipping — India-only. Typical transit is 7-10 business days.
      // We intentionally OMIT `shippingRate` because the business does
      // not offer a fixed monetary shipping charge; per Google's guidance
      // it is better to omit an optional pricing field than to invent
      // one that isn't truthful.
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "IN"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": 7,
            "maxValue": 10,
            "unitCode": "DAY"
          }
        }
      }
    }
  } : null;

  return (
    <div data-testid="page-product-detail" className="max-w-7xl mx-auto px-6 py-16">
      {product && (
        <>
          <SEO
            title={`${product.name} · Samrat Glass Emporium`}
            description={(product.short_description || product.description || "").slice(0, 155) || `${product.name} — handcrafted in Firozabad by Samrat Glass Emporium.`}
            image={api.resolveImage(product.images?.[0])}
            path={productPath(product)}
            type="product"
          />
          <SchemaLD id={`product-${product.id}`} data={productSchema} />
        </>
      )}
      <Link to="/catalog" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-white mb-10 link-underline">
        <ArrowLeft size={14} /> Back to catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Gallery */}
        <div className="lg:col-span-7">
          <div
            className="aspect-[4/5] overflow-hidden bg-[#0a0a0a] border border-white/5 flex items-center justify-center p-6 relative"
            {...containerGuardProps}
            style={containerGuardStyle}
          >
            {images.length > 0 && (
              <img
                src={images[selectedImg]}
                alt={productImageAlt({ name: product.name, category: product.category, sku: product.sku, view: selectedImg + 1 })}
                className="max-w-full max-h-full w-auto h-auto object-contain object-center"
                data-testid="product-main-image"
                {...imgGuardProps}
                style={imgGuardStyle}
              />
            )}
            {/* Transparent interaction overlay — captures right-click / long-press
                on the image area so browsers can't offer "Save image" on the raw
                <img>. Purely deterrent; does not block screenshots. */}
            <div
              aria-hidden="true"
              data-testid="product-image-guard-overlay"
              className="absolute inset-0"
              {...containerGuardProps}
              style={{ ...containerGuardStyle, background: "transparent" }}
            />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  data-testid={`thumb-${i}`}
                  onClick={() => setSelectedImg(i)}
                  {...containerGuardProps}
                  className={`aspect-square overflow-hidden border flex items-center justify-center bg-[#0a0a0a] p-2 ${selectedImg === i ? "border-[#D4AF37]" : "border-white/10 hover:border-white/30"}`}
                >
                  <img
                    src={img}
                    alt={productImageAlt({ name: product.name, category: product.category, sku: product.sku, view: i + 1 })}
                    className="max-w-full max-h-full w-auto h-auto object-contain object-center"
                    {...imgGuardProps}
                    style={imgGuardStyle}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="lg:col-span-5 space-y-8">
          <div>
            <div className="eyebrow mb-3">{product.category}</div>
            <h1 className="font-serif text-4xl leading-tight">{product.name}</h1>
            <div className="mt-3 text-white/50 text-sm" data-testid="product-reference-code">Reference Code: {product.sku}</div>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            {(() => {
              const p = formatProductPrice(product);
              if (p.onRequest) {
                return (
                  <span data-testid="product-price" className="font-serif text-3xl text-[#D4AF37] italic">
                    Price on request
                  </span>
                );
              }
              return (
                <>
                  {p.label && (
                    <span className="text-[10px] uppercase tracking-[0.28em] text-[#BF9972]">{p.label}</span>
                  )}
                  <span data-testid="product-price" className="font-serif text-3xl text-[#D4AF37]">{p.primary}</span>
                  {p.compareAt && (
                    <span data-testid="product-mrp" className="text-white/40 line-through">{p.compareAt}</span>
                  )}
                  {p.label && (
                    <span className="text-[11px] text-white/40 italic ml-1">· final quotation on inquiry</span>
                  )}
                </>
              );
            })()}
          </div>

          <p className="text-white/70 leading-relaxed">{product.short_description}</p>

          <div className="flex flex-wrap gap-3">
            <button
              data-testid="add-to-cart-btn"
              onClick={handleAdd}
              className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] transition-colors"
            >
              <ShoppingBag size={14} /> Add to inquiry
            </button>
            <a
              data-testid="whatsapp-btn"
              href={waLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-8 py-4 uppercase text-xs tracking-[0.28em]"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
            <button
              data-testid="detail-favorite-btn"
              onClick={() => toggleFavorite(product)}
              className={`inline-flex items-center justify-center h-14 w-14 border ${fav ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/25 text-white/70 hover:border-white/60"}`}
              aria-label="Toggle favorite"
            >
              <Heart size={16} fill={fav ? "#D4AF37" : "none"} />
            </button>
          </div>

          {/* Buying confidence — surface reassurance at the decision point instead of hiding it in tabs. */}
          <div data-testid="buying-confidence" className="border border-white/10 bg-white/[0.02] p-5">
            <div className="text-[10px] uppercase tracking-[0.24em] text-[#D4AF37] mb-3">
              Handcrafted in Firozabad · Since 1981
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-white/70">
              <div>✓ Secure Pan-India delivery</div>
              <div>✓ Transit-damage replacement</div>
              <div>✓ Custom sizes & finishes</div>
              <div>✓ Installation guidance</div>
              <div>✓ GST invoice available</div>
            </div>
            <button
              type="button"
              data-testid="buying-confidence-shipping-link"
              onClick={openShippingTab}
              className="mt-4 text-[10px] uppercase tracking-[0.22em] text-[#BF9972] hover:text-[#D4AF37]"
            >
              Shipping & ordering details →
            </button>
          </div>

          {/* Pre-order note — shown only for published items with no
              current stock so ready-stock pieces are not mislabelled. */}
          {isMadeToOrder(product) && (
            <p
              data-testid="made-to-order-note"
              className="text-xs text-white/60 leading-relaxed max-w-md"
            >
              <span className="text-[#D4AF37]">Pre-order.</span>{" "}
              Production and dispatch timelines will be confirmed after your enquiry.
            </p>
          )}

          {/* Stock / availability — inquiry-based products never say "unavailable". */}
          <div className="text-xs text-white/50 border-t border-white/10 pt-6">
            {product.stock > 0 ? `${product.stock} in stock` : "Available on request"}
          </div>
        </div>
      </div>

      {/* Tabbed details */}
      <ProductTabs
        product={product}
        settings={settings}
        waLink={waLink}
        active={activeTab}
        onSelect={setActiveTab}
        sectionRef={productTabsRef}
      />

      {/* Seen in gallery projects (auto-hides when this product isn't tagged in any project) */}
      <SeenInProjects productId={product.id} />

      {/* Reviews */}
      <section className="mt-24 border-t border-white/10 pt-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <div className="eyebrow mb-3">Reviews</div>
            {reviews.length === 0 ? (
              <>
                <h2 data-testid="reviews-heading" className="font-serif text-3xl mb-2">Share your experience</h2>
                <p data-testid="reviews-supporting" className="text-white/60 text-sm leading-relaxed">
                  Purchased this piece? Tell us what you loved about it.
                </p>
              </>
            ) : (
              <>
                <h2 data-testid="reviews-heading" className="font-serif text-3xl mb-2">What clients say</h2>
                <div data-testid="reviews-rating-row" className="flex items-center gap-2 text-white/70">
                  <span className="text-[#D4AF37] text-lg">★</span>
                  <span data-testid="avg-rating">{product.rating > 0 ? product.rating.toFixed(1) : "—"}</span>
                  <span className="text-white/40">({product.review_count} reviews)</span>
                </div>
              </>
            )}

            {reviewSubmitted ? (
              <div
                role="status"
                data-testid="review-submitted-thanks"
                className="mt-8 border border-[#D4AF37]/50 bg-[#D4AF37]/[0.06] p-6 text-sm text-white/85 leading-relaxed"
              >
                Thank you. Your review has been submitted for approval.
                It will appear here once our team has verified it.
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="mt-8 space-y-4" noValidate>
                <label htmlFor="review-author-input" className="sr-only">Your name</label>
                <input
                  id="review-author-input"
                  data-testid="review-author"
                  placeholder="Your name"
                  value={reviewForm.author}
                  onChange={(e) => setReviewForm({ ...reviewForm, author: e.target.value })}
                  maxLength={60}
                  required
                  aria-required="true"
                  aria-invalid={reviewError ? "true" : undefined}
                  className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60 px-4 py-3 text-sm"
                />
                <div
                  role="radiogroup"
                  aria-label="Rate this product from 1 to 5 stars"
                  className="flex items-center gap-2"
                >
                  {[1,2,3,4,5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={reviewForm.rating === n}
                      aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
                      data-testid={`review-star-${n}`}
                      onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                      className={`p-1 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/70 ${n <= reviewForm.rating ? "text-[#D4AF37]" : "text-white/25 hover:text-white/50"}`}
                    >
                      <Star size={20} fill={n <= reviewForm.rating ? "#D4AF37" : "none"} />
                    </button>
                  ))}
                </div>
                <label htmlFor="review-title-input" className="sr-only">Title (optional)</label>
                <input
                  id="review-title-input"
                  data-testid="review-title"
                  placeholder="Title (optional)"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  maxLength={100}
                  className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60 px-4 py-3 text-sm"
                />
                <label htmlFor="review-body-input" className="sr-only">Your review</label>
                <textarea
                  id="review-body-input"
                  data-testid="review-body"
                  placeholder="Your thoughts (10–1000 characters)…"
                  rows="4"
                  value={reviewForm.body}
                  onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                  maxLength={1000}
                  required
                  aria-required="true"
                  aria-invalid={reviewError ? "true" : undefined}
                  className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/60 px-4 py-3 text-sm resize-none"
                />
                {reviewError && (
                  <div
                    data-testid="review-error"
                    role="alert"
                    aria-live="assertive"
                    className="text-xs text-red-300 border border-red-500/30 bg-red-500/10 px-3 py-2"
                  >
                    {reviewError}
                  </div>
                )}
                <button
                  type="submit"
                  data-testid="submit-review-btn"
                  disabled={reviewSubmitting}
                  aria-busy={reviewSubmitting ? "true" : "false"}
                  className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] hover:text-[#D4AF37] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/70 px-6 py-3 text-xs uppercase tracking-[0.28em] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reviewSubmitting ? "Submitting…" : "Submit review"}
                </button>
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                  Reviews are reviewed by our team before appearing.
                </p>
              </form>
            )}
          </div>

          <div className="md:col-span-7 space-y-6">
            {reviews.length === 0 && !reviewSubmitted && (
              <div
                data-testid="reviews-empty-prompt"
                className="border border-white/10 bg-white/[0.02] p-6 md:p-7"
              >
                <div className="font-serif text-xl md:text-2xl text-white leading-snug">
                  Your feedback matters
                </div>
                <p className="mt-1 text-white/60 text-sm md:text-[15px]">
                  Reviews are moderated before appearing publicly.
                </p>
                <button
                  type="button"
                  data-testid="write-review-cta"
                  onClick={() => {
                    const el = document.getElementById("review-author-input");
                    if (!el) return;
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                    // Focus after the smooth-scroll settles so the input
                    // actually gets focus on mobile browsers.
                    setTimeout(() => el.focus({ preventScroll: true }), 250);
                  }}
                  className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-[#BF9972] hover:text-[#D4AF37] border-b border-white/10 hover:border-[#D4AF37] pb-1 transition-colors"
                >
                  Write a review →
                </button>
              </div>
            )}
            {reviews.map((r) => (
              <div key={r.id} data-testid={`review-${r.id}`} className="border border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-serif text-lg">{r.title || r.author}</div>
                    <div className="text-xs text-white/40 mt-1">by {r.author}</div>
                  </div>
                  <div className="text-[#D4AF37]">{"★".repeat(r.rating)}<span className="text-white/20">{"★".repeat(5 - r.rating)}</span></div>
                </div>
                <p className="text-white/70 mt-3 text-sm leading-relaxed">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}


// Values that mean "no real content" — we hide these spec rows entirely so
// the page never shows "N/A · —" filler. See requirements #1 & #2.
const EMPTY_SPEC_VALUES = new Set(["", "-", "—", "n/a", "na", "not available", "unknown", "none", "null"]);
function isMeaningfulSpec(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  if (!s) return false;
  return !EMPTY_SPEC_VALUES.has(s);
}

function filterSpecs(specs) {
  if (!specs) return [];
  return Object.entries(specs).filter(([, v]) => isMeaningfulSpec(v));
}

const TABS = [
  { key: "description", label: "Description" },
  { key: "specifications", label: "Specifications" },
  { key: "shipping", label: "Shipping & Delivery" },
  { key: "inquiry", label: "Inquiry" },
];

function ProductTabs({ product, settings, waLink, active, onSelect, sectionRef }) {
  const specEntries = filterSpecs(product?.specs);
  const glanceSpecKeys = [
    "Height",
    "Width",
    "Diameter",
    "Dimensions",
    "Material",
    "Glass",
    "Crystal",
    "Finish",
    "Lights",
    "Number of Lights",
    "Holder",
    "Wattage",
    "Weight",
  ];
  const glanceSpecs = glanceSpecKeys
    .filter((key) => isMeaningfulSpec(product?.specs?.[key]))
    .slice(0, 6);

  return (
    <section ref={sectionRef} className="mt-20 border-t border-white/10 pt-12" data-testid="product-tabs">
      {/* Editorial tab strip */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 border-b border-white/10 mb-10">
        {TABS.map((t) => (
          <button
            key={t.key}
            data-testid={`tab-${t.key}`}
            onClick={() => onSelect(t.key)}
            className={`relative py-4 text-xs uppercase tracking-[0.28em] transition-colors ${active === t.key ? "text-[#D4AF37]" : "text-white/50 hover:text-white"}`}
          >
            {t.label}
            {active === t.key && (
              <span className="absolute left-0 right-0 -bottom-px h-px bg-[#D4AF37]"></span>
            )}
          </button>
        ))}
      </div>

      <div className="min-h-[240px] fade-up" key={active}>
        {active === "description" && (
          <div data-testid="tab-content-description" className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-8">
              <div className="eyebrow mb-3">About this piece</div>
              <p className="text-white/75 leading-relaxed whitespace-pre-wrap text-[15px]">
                {product.description || product.short_description || "No description provided."}
              </p>
              {product.tags?.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {product.tags.map((t) => (
                    <span key={t} className="text-[10px] uppercase tracking-[0.24em] border border-white/15 px-3 py-1 text-white/70">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-4 border border-white/10 p-6">
              <div className="eyebrow mb-3">At a glance</div>
              <ul className="space-y-2 text-sm text-white/70">
                <li>Reference Code · <span className="text-white">{product.sku}</span></li>
                <li>Category · <span className="text-white">{product.category}</span></li>
                {glanceSpecs.map((key) => (
                  <li key={key}>{key} · <span className="text-white">{String(product.specs[key])}</span></li>
                ))}
                <li>Availability · <span className="text-white">{product.stock > 0 ? `${product.stock} available` : "Available on request"}</span></li>
                {product.rating > 0 && (
                  <li>Rating · <span className="text-white">{product.rating.toFixed(1)} / 5</span></li>
                )}
              </ul>
            </div>
          </div>
        )}

        {active === "specifications" && (
          <div data-testid="tab-content-specifications">
            <div className="eyebrow mb-6">Product specifications</div>
            {specEntries.length > 0 && (
              <div className="border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {specEntries.map(([k, v], i) => (
                      <tr key={k} data-testid={`spec-row-${k}`} className={`${i % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"} border-b border-white/5 last:border-b-0`}>
                        <th scope="row" className="text-left align-top py-4 px-6 md:w-1/3 text-white/50 uppercase text-[11px] tracking-[0.22em] font-normal">{k}</th>
                        <td className="py-4 px-6 text-white leading-relaxed whitespace-pre-wrap">{String(v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Customization note — always shown (works for both fully-specced and inquiry-based pieces). */}
            <div
              data-testid="spec-customization-note"
              className="mt-6 border-l-2 border-[#D4AF37] bg-white/[0.02] px-5 py-4 text-sm text-white/75 leading-relaxed"
            >
              <span className="text-[#D4AF37] font-serif italic">Pre-order — </span>
              Specifications can be customised as per requirement. Please inquire for exact size,
              holder type, finish, and pricing.
            </div>
          </div>
        )}

        {active === "shipping" && (
          <div data-testid="tab-content-shipping" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-3"><Truck size={16} className="text-[#D4AF37]" /><div className="eyebrow">Shipping</div></div>
              <div className="text-white text-sm mb-1">{settings?.delivery_info || "Pan-India shipping · 7–10 business days"}</div>
              <p className="text-white/60 text-sm leading-relaxed mt-2">
                All items are carefully packaged in double-corrugated boxes with foam inserts. Larger chandeliers ship in custom crates.
              </p>
            </div>
            <div className="border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-3"><CreditCard size={16} className="text-[#D4AF37]" /><div className="eyebrow">Payments</div></div>
              <div className="text-white text-sm mb-1">{settings?.payment_methods || "UPI · Net Banking"}</div>
              <p className="text-white/60 text-sm leading-relaxed mt-2">
                Confirm your order via WhatsApp — we&apos;ll share UPI ID or bank details. GST invoice provided.
              </p>
            </div>
            <div className="border border-white/10 p-6">
              <div className="flex items-center gap-3 mb-3"><MapPin size={16} className="text-[#D4AF37]" /><div className="eyebrow">Origin</div></div>
              <div className="text-white text-sm mb-1">Firozabad, Uttar Pradesh</div>
              <p className="text-white/60 text-sm leading-relaxed mt-2">
                Ships from our workshop. Transit damage? We replace at our cost — just share an unboxing photo within 48 hours.
              </p>
            </div>
          </div>
        )}

        {active === "inquiry" && (
          <div data-testid="tab-content-inquiry" className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-white/10 p-8">
              <div className="eyebrow mb-3">Chat instantly</div>
              <h3 className="font-serif text-2xl mb-3">Talk to us on WhatsApp</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Get availability, custom size quotes, bulk pricing, or installation advice within minutes.
              </p>
              <a
                data-testid="tab-wa-btn"
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]"
              >
                <MessageCircle size={14} /> Chat on WhatsApp
              </a>
            </div>
            <div className="border border-white/10 p-8">
              <div className="eyebrow mb-3">Email or basket</div>
              <h3 className="font-serif text-2xl mb-3">Send us a detailed inquiry</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Add this piece to your inquiry basket along with others, then submit — we&apos;ll respond by email or phone.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/cart" className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-6 py-3 uppercase text-xs tracking-[0.28em]">
                  <ShoppingBag size={14} /> Open basket
                </Link>
                <a href={`mailto:${settings?.admin_email || "samratglassemp@gmail.com"}?subject=${encodeURIComponent(`Inquiry: ${product.name} (${product.sku})`)}`} className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] px-6 py-3 uppercase text-xs tracking-[0.28em]">
                  Email us
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
