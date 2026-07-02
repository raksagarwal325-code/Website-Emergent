import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer data-testid="site-footer" className="border-t border-white/10 mt-24 py-16 text-white/60">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-2">
          <div className="font-serif text-3xl">Lumière<span className="text-[#D4AF37]">.</span></div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            A curated boutique of timeless objects — watches, leather, jewelry, and the finer things.
          </p>
        </div>
        <div>
          <div className="eyebrow mb-4">Explore</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/catalog" className="link-underline">Catalog</Link></li>
            <li><Link to="/favorites" className="link-underline">Favorites</Link></li>
            <li><Link to="/cart" className="link-underline">Inquiry Basket</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-4">Support</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/contact" className="link-underline">Contact</Link></li>
            <li><a href="#" className="link-underline">Shipping</a></li>
            <li><a href="#" className="link-underline">Warranty</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-xs text-white/40">
        <div>© {new Date().getFullYear()} Lumière. All rights reserved.</div>
        <div className="tracking-widest uppercase mt-3 md:mt-0">Made with care</div>
      </div>
    </footer>
  );
}
