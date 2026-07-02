import React from "react";
import { Link } from "react-router-dom";
import { useSettings } from "../../context/SettingsContext";

export default function Footer() {
  const { settings, hp } = useSettings();
  const f = hp.footer;
  return (
    <footer data-testid="site-footer" className="border-t border-[#BF9972]/15 mt-24 py-16 text-white/60 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: "radial-gradient(ellipse at 85% 30%, rgba(163,99,80,0.25), transparent 55%)" }}></div>
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 relative">
        <div className="md:col-span-2">
          <div className="flex items-start gap-5">
            <img src="/logo.jpeg" alt="Samrat Glass Emporium" className="w-24 h-24 object-cover brand-glow flex-shrink-0" />
            <div>
              <div className="font-serif text-2xl md:text-3xl brand-gradient-text">{settings?.brand_name || "Samrat Glass Emporium"}</div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed">{f.description}</p>
            </div>
          </div>
          <p className="mt-6 text-xs text-white/40 leading-relaxed whitespace-pre-line">
            {settings?.address || ""}
            {settings?.gstin ? `\nGSTIN: ${settings.gstin}` : ""}
          </p>
        </div>
        <div>
          <div className="eyebrow mb-4">Explore</div>
          <ul className="space-y-2 text-sm">
            {(f.quick_links || []).map((l, i) => {
              const external = l.href?.startsWith("http") || l.href?.startsWith("mailto") || l.href?.startsWith("tel");
              return (
                <li key={i}>
                  {external ? (
                    <a href={l.href} target="_blank" rel="noreferrer" className="link-underline">{l.label}</a>
                  ) : (
                    <Link to={l.href || "#"} className="link-underline">{l.label}</Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <div className="eyebrow mb-4">Support</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/contact" className="link-underline">Contact</Link></li>
            <li className="text-white/50">{settings?.delivery_info || "Pan-India Shipping · 7–10 days"}</li>
            <li className="text-white/50">Payments: {settings?.payment_methods || "UPI · Net Banking"}</li>
            {settings?.whatsapp_number && <li className="text-white/50">WhatsApp: {settings.whatsapp_number}</li>}
            {settings?.admin_email && <li className="text-white/50">{settings.admin_email}</li>}
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-[#BF9972]/15 flex flex-col md:flex-row items-center justify-between text-xs text-white/40 relative">
        <div>© {new Date().getFullYear()} {settings?.brand_name || "Samrat Glass Emporium"}. All rights reserved.</div>
        <div className="tracking-widest uppercase mt-3 md:mt-0">Handcrafted in Firozabad</div>
      </div>
    </footer>
  );
}
