import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Heart, ShoppingBag, MessageCircle, Star, ArrowLeft } from "lucide-react";
import { api, formatPrice } from "../lib/api";
import { useCatalog } from "../context/CatalogContext";
import { toast } from "sonner";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedImg, setSelectedImg] = useState(0);
  const [reviewForm, setReviewForm] = useState({ author: "", rating: 5, title: "", body: "" });
  const { addToCart, toggleFavorite, isFavorite } = useCatalog();

  useEffect(() => {
    api.getProduct(id).then((p) => { setProduct(p); setSelectedImg(0); }).catch(() => {});
    api.listReviews(id).then(setReviews).catch(() => {});
    api.getSettings().then(setSettings).catch(() => {});
  }, [id]);

  if (!product) {
    return <div className="max-w-7xl mx-auto px-6 py-24 text-white/40">Loading…</div>;
  }

  const fav = isFavorite(product.id);
  const images = (product.images || []).map(api.resolveImage);

  const waNumber = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waMessage = encodeURIComponent(`Hello, I'd like to enquire about the ${product.name} (${product.sku}).`);
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waMessage}` : "#";

  const handleAdd = () => {
    addToCart(product);
    toast.success(`${product.name} added to inquiry`);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.author || !reviewForm.body) {
      toast.error("Name and review body required");
      return;
    }
    try {
      const r = await api.createReview({ ...reviewForm, product_id: product.id });
      setReviews([r, ...reviews]);
      setReviewForm({ author: "", rating: 5, title: "", body: "" });
      toast.success("Thank you for your review");
      api.getProduct(id).then(setProduct);
    } catch {
      toast.error("Could not submit review");
    }
  };

  return (
    <div data-testid="page-product-detail" className="max-w-7xl mx-auto px-6 py-16">
      <Link to="/catalog" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-white/60 hover:text-white mb-10 link-underline">
        <ArrowLeft size={14} /> Back to catalog
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Gallery */}
        <div className="lg:col-span-7">
          <div className="aspect-[4/5] overflow-hidden bg-[#0a0a0a] border border-white/5">
            {images.length > 0 && (
              <img src={images[selectedImg]} alt={product.name} className="w-full h-full object-cover" data-testid="product-main-image" />
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3 mt-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  data-testid={`thumb-${i}`}
                  onClick={() => setSelectedImg(i)}
                  className={`aspect-square overflow-hidden border ${selectedImg === i ? "border-[#D4AF37]" : "border-white/10 hover:border-white/30"}`}
                >
                  <img src={img} alt={`thumb ${i + 1}`} className="w-full h-full object-cover" />
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
            <div className="mt-3 text-white/50 text-sm">SKU: {product.sku}</div>
          </div>

          <div className="flex items-baseline gap-3">
            <span data-testid="product-price" className="font-serif text-3xl text-[#D4AF37]">{formatPrice(product.price)}</span>
            {product.compare_at_price && (
              <span className="text-white/40 line-through">{formatPrice(product.compare_at_price)}</span>
            )}
          </div>

          <p className="text-white/70 leading-relaxed">{product.description || product.short_description}</p>

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

          {/* Specs */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="border-t border-white/10 pt-8">
              <div className="eyebrow mb-4">Specifications</div>
              <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                {Object.entries(product.specs).map(([k, v]) => (
                  <React.Fragment key={k}>
                    <dt className="text-white/50">{k}</dt>
                    <dd className="text-white">{v}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          )}

          {/* Stock */}
          <div className="text-xs text-white/50 border-t border-white/10 pt-6">
            {product.stock > 0 ? `${product.stock} in stock` : "Currently unavailable"}
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-24 border-t border-white/10 pt-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <div className="eyebrow mb-3">Reviews</div>
            <h2 className="font-serif text-3xl mb-2">What clients say</h2>
            <div className="flex items-center gap-2 text-white/70">
              <span className="text-[#D4AF37] text-lg">★</span>
              <span data-testid="avg-rating">{product.rating > 0 ? product.rating.toFixed(1) : "—"}</span>
              <span className="text-white/40">({product.review_count} reviews)</span>
            </div>

            <form onSubmit={handleSubmitReview} className="mt-8 space-y-4">
              <input
                data-testid="review-author"
                placeholder="Your name"
                value={reviewForm.author}
                onChange={(e) => setReviewForm({ ...reviewForm, author: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm"
              />
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    data-testid={`review-star-${n}`}
                    onClick={() => setReviewForm({ ...reviewForm, rating: n })}
                    className={`p-1 ${n <= reviewForm.rating ? "text-[#D4AF37]" : "text-white/25"}`}
                  ><Star size={20} fill={n <= reviewForm.rating ? "#D4AF37" : "none"} /></button>
                ))}
              </div>
              <input
                data-testid="review-title"
                placeholder="Title (optional)"
                value={reviewForm.title}
                onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm"
              />
              <textarea
                data-testid="review-body"
                placeholder="Your thoughts…"
                rows="4"
                value={reviewForm.body}
                onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm resize-none"
              />
              <button data-testid="submit-review-btn" className="inline-flex items-center gap-2 border border-white/25 hover:border-[#D4AF37] hover:text-[#D4AF37] px-6 py-3 text-xs uppercase tracking-[0.28em]">
                Submit review
              </button>
            </form>
          </div>

          <div className="md:col-span-7 space-y-6">
            {reviews.length === 0 && <div className="text-white/40">Be the first to review.</div>}
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
