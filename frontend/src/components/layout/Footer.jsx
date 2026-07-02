import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer data-testid="site-footer" className="border-t border-white/10 mt-24 py-16 text-white/60">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-2">
          <div className="font-serif text-2xl md:text-3xl">Samrat Glass<span className="text-[#D4AF37]"> Emporium</span></div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Fancy lights, crystal chandeliers, glass lamps &amp; decorative lighting — handcrafted in the city of glass, Firozabad.
          </p>
          <p className="mt-4 text-xs text-white/40 leading-relaxed">
            Raniwala Market, Babboo Ji Ki Jeen,<br />
            Firozabad – 283203, Uttar Pradesh, India<br />
            GSTIN: 09ADCFS9258D1ZS
          </p>
        </div>
        <div>
          <div className="eyebrow mb-4">Explore</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/catalog" className="link-underline">Catalog</Link></li>
            <li><Link to="/favorites" className="link-underline">Wishlist</Link></li>
            <li><Link to="/cart" className="link-underline">Inquiry Basket</Link></li>
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-4">Support</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/contact" className="link-underline">Contact</Link></li>
            <li className="text-white/50">Pan-India Shipping · 7–10 days</li>
            <li className="text-white/50">Payments: UPI · Net Banking</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-xs text-white/40">
        <div>© {new Date().getFullYear()} Samrat Glass Emporium. All rights reserved.</div>
        <div className="tracking-widest uppercase mt-3 md:mt-0">Handcrafted in Firozabad</div>
      </div>
    </footer>
  );
}
