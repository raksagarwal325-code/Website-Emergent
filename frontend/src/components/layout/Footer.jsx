import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer data-testid="site-footer" className="border-t border-[#BF9972]/15 mt-24 py-16 text-white/60 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: "radial-gradient(ellipse at 85% 30%, rgba(163,99,80,0.25), transparent 55%)" }}></div>
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 relative">
        <div className="md:col-span-2">
          <div className="flex items-start gap-5">
            <img src="/logo.jpeg" alt="Samrat Glass Emporium" className="w-24 h-24 object-cover brand-glow flex-shrink-0" />
            <div>
              <div className="font-serif text-2xl md:text-3xl brand-gradient-text">Samrat Glass Emporium</div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed">
                Fancy lights, crystal chandeliers, glass lamps &amp; decorative lighting — handcrafted in the city of glass, Firozabad.
              </p>
            </div>
          </div>
          <p className="mt-6 text-xs text-white/40 leading-relaxed">
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
            <li><a href="/catalogue?print=1" target="_blank" rel="noreferrer" data-testid="footer-download-catalogue" className="link-underline text-[#D4AF37]">Download Catalogue PDF</a></li>
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
      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-[#BF9972]/15 flex flex-col md:flex-row items-center justify-between text-xs text-white/40 relative">
        <div>© {new Date().getFullYear()} Samrat Glass Emporium. All rights reserved.</div>
        <div className="tracking-widest uppercase mt-3 md:mt-0">Handcrafted in Firozabad</div>
      </div>
    </footer>
  );
}
