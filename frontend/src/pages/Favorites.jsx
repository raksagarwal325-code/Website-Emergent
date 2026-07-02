import React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { api, formatPrice } from "../lib/api";

export default function Favorites() {
  const { favorites, toggleFavorite } = useCatalog();

  return (
    <div data-testid="page-favorites" className="max-w-7xl mx-auto px-6 py-16">
      <div className="mb-12">
        <div className="eyebrow mb-3">Saved</div>
        <h1 className="font-serif text-4xl sm:text-5xl">Favorites</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="py-24 text-center border border-white/10">
          <div className="font-serif text-2xl mb-3">No favorites yet.</div>
          <div className="text-white/60 mb-8">Save pieces you love and revisit them at any time.</div>
          <Link to="/catalog" className="inline-block bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">
            Browse catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {favorites.map((p) => (
            <div key={p.id} data-testid={`fav-card-${p.id}`} className="group border border-white/5 hover:border-white/25 transition-all">
              <Link to={`/product/${p.id}`} className="block">
                <div className="aspect-[4/5] overflow-hidden bg-[#0a0a0a]">
                  <img src={api.resolveImage(p.image)} alt={p.name} className="product-image w-full h-full object-cover" />
                </div>
                <div className="p-5 space-y-1">
                  <div className="eyebrow">{p.category}</div>
                  <div className="font-serif text-lg">{p.name}</div>
                  <div className="text-white/70">{formatPrice(p.price)}</div>
                </div>
              </Link>
              <button
                data-testid={`remove-fav-${p.id}`}
                onClick={() => toggleFavorite({ id: p.id, name: p.name, price: p.price, images: [p.image], category: p.category })}
                className="w-full text-xs uppercase tracking-[0.28em] py-3 border-t border-white/10 text-white/60 hover:text-[#D4AF37]"
              >
                <span className="inline-flex items-center gap-2"><Heart size={12} fill="currentColor" /> Remove</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
