import React from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Clock, Phone, Download, ExternalLink } from "lucide-react";
import { useSettings } from "../../context/SettingsContext";

// WhatsApp glyph (brand-safe)
const WA = ({ size = 15 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
    <path fill="currentColor" d="M19.1 17.3c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.8-.7-1.4-1.7-1.6-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.3 0-.5-.1-.1-.6-1.5-.9-2.1-.2-.5-.5-.5-.6-.5h-.5c-.2 0-.5.1-.7.4s-1 1-1 2.3 1 2.7 1.1 2.9c.1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3zM16 26.1c-1.8 0-3.7-.5-5.2-1.4l-.4-.2-3.9 1 1-3.8-.2-.4a10.1 10.1 0 0 1-1.6-5.4c0-5.6 4.6-10.2 10.2-10.2a10 10 0 0 1 7.2 3 10 10 0 0 1 3 7.2c0 5.6-4.6 10.2-10.1 10.2zm8.6-18.8A12 12 0 0 0 16 4C9.4 4 4 9.4 4 16c0 2.1.6 4.2 1.6 6L4 28l6.1-1.6a12 12 0 0 0 5.9 1.5c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.4-8.5z" />
  </svg>
);

// Inline platform icons — keeps footer light (no external network fetch)
const IconInstagram = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const IconFacebook = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M13.5 21v-8h2.7l.4-3.2h-3.1v-2c0-.9.3-1.6 1.7-1.6h1.6V3.3c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.5H7.7V13h2.6v8h3.2z" />
  </svg>
);
const IconYouTube = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M21.6 7.2s-.2-1.4-.8-2c-.7-.8-1.6-.8-2-.9C15.9 4 12 4 12 4s-3.9 0-6.8.3c-.4.1-1.3.1-2 .9-.6.6-.8 2-.8 2S2 8.8 2 10.4v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.7.8 1.7.8 2.1.9C6.7 18.2 12 18.3 12 18.3s3.9 0 6.8-.3c.4-.1 1.3-.1 2-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5c0-1.6-.2-3.2-.2-3.2zM10 14.1V7.9l4.9 3.1L10 14.1z" />
  </svg>
);
const IconPinterest = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.5 2 2 6.5 2 12c0 4.2 2.6 7.8 6.3 9.3-.1-.8-.2-2 0-2.9.2-.7 1.2-4.7 1.2-4.7s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.3 1 .5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.7 0-2.4-1.8-4.2-4.3-4.2-2.9 0-4.7 2.2-4.7 4.5 0 .9.3 1.9.7 2.4.1.1.1.2.1.3l-.3 1.2c-.1.2-.2.3-.4.2-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.8-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.2 6.4-5.4 6.4-1 0-2-.6-2.4-1.2l-.6 2.5c-.2.9-.9 2.1-1.3 2.8.9.3 2 .5 3 .5 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
  </svg>
);

// Row helper for the Contact column — icon + clickable value
function ContactRow({ icon: Icon, label, value, href, external, testId, children }) {
  const content = children || value;
  const inner = (
    <div className="flex items-start gap-3 group">
      <Icon size={14} strokeWidth={1.5} className="text-[#D4AF37] mt-1 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        {label && <div className="text-[9px] uppercase tracking-[0.24em] text-white/40 mb-0.5">{label}</div>}
        <div className="text-sm text-white/70 group-hover:text-white transition-colors leading-snug">{content}</div>
      </div>
    </div>
  );
  if (!href) return <div data-testid={testId}>{inner}</div>;
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" data-testid={testId}>{inner}</a>
  ) : (
    <Link to={href} data-testid={testId}>{inner}</Link>
  );
}

// Splits an email at `@` and `.` with `<wbr>` so browsers can break only
// at those natural boundaries (never in the middle of "gmail"). Falls back
// to keeping it on one line when the container is wide enough.
function BreakableEmail({ address }) {
  if (!address) return null;
  const chunks = [];
  let buf = "";
  for (const ch of address) {
    if (ch === "@" || ch === ".") {
      if (buf) chunks.push(buf);
      chunks.push(<wbr key={chunks.length} />);
      chunks.push(ch);
      buf = "";
    } else {
      buf += ch;
    }
  }
  if (buf) chunks.push(buf);
  return <span style={{ wordBreak: "keep-all", overflowWrap: "normal" }}>{chunks}</span>;
}

const EXPLORE_LINKS = [
  { label: "Catalog", href: "/catalog" },
  { label: "The Craft", href: "/craft" },
  { label: "About Us", href: "/about" },
  { label: "Custom Lighting / Bulk Orders", href: "/contact?type=bulk" },
  { label: "Architects & Interior Designers", href: "/contact?type=trade" },
  { label: "Wishlist", href: "/favorites" },
  { label: "Inquiry Basket", href: "/cart" },
];

const LEGAL_LINKS = [
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms & Conditions", href: "/legal/terms" },
  { label: "Shipping & Delivery Policy", href: "/legal/shipping" },
  { label: "Return & Replacement Policy", href: "/legal/returns" },
  { label: "Payment Policy", href: "/legal/payment" },
];

function FooterLink({ label, href, external, icon: Icon, testId }) {
  const inner = (
    <span className="inline-flex items-center gap-1.5 group">
      {Icon && <Icon size={12} className="opacity-70 group-hover:opacity-100" />}
      <span className="link-underline">{label}</span>
    </span>
  );
  if (external) return <a href={href} target="_blank" rel="noreferrer" data-testid={testId}>{inner}</a>;
  return <Link to={href} data-testid={testId}>{inner}</Link>;
}

export default function Footer() {
  const { settings, hp } = useSettings();
  const f = hp.footer || {};

  const waRaw = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waHref = waRaw ? `https://wa.me/${waRaw}?text=${encodeURIComponent("Hi Rakshit ji, I am interested in Samrat Glass Emporium products. Please share more details.")}` : "";
  const phoneHref = settings?.whatsapp_number ? `tel:${settings.whatsapp_number.replace(/\s+/g, "")}` : "";
  const emailHref = settings?.admin_email ? `mailto:${settings.admin_email}` : "";
  const mapsHref = settings?.google_maps_url || (settings?.google_cid ? `https://www.google.com/maps?cid=${settings.google_cid}` : "");
  const googleReviewsView = settings?.google_cid ? `https://www.google.com/maps?cid=${settings.google_cid}` : "";

  const SUPPORT_LINKS = [
    { label: "Contact Us", href: "/contact" },
    ...(waHref ? [{ label: "WhatsApp Support", href: waHref, external: true }] : []),
    ...(googleReviewsView ? [{ label: "Google Reviews", href: googleReviewsView, external: true }] : []),
    { label: "FAQ", href: "/faq" },
    { label: "Shipping Info", href: "/legal/shipping" },
  ];

  // Real social platforms user has provided URLs for
  const socialPlatforms = [
    { key: "instagram", url: settings?.instagram_url, Icon: IconInstagram, label: "Instagram" },
    { key: "facebook",  url: settings?.facebook_url,  Icon: IconFacebook,  label: "Facebook"  },
    { key: "youtube",   url: settings?.youtube_url,   Icon: IconYouTube,   label: "YouTube"   },
    { key: "pinterest", url: settings?.pinterest_url, Icon: IconPinterest, label: "Pinterest" },
  ].filter((s) => (s.url || "").trim());
  // WhatsApp is always shown alongside; label switches to "Connect" when it's the only channel available
  const socials = [
    ...socialPlatforms,
    ...(waHref ? [{ key: "whatsapp", url: waHref, Icon: WA, label: "WhatsApp" }] : []),
  ];
  const socialsLabel = socialPlatforms.length === 0 && waHref ? "Connect" : "Follow";

  return (
    <footer data-testid="site-footer" className="border-t border-[#BF9972]/15 mt-24 pt-16 pb-10 text-white/60 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{ background: "radial-gradient(ellipse at 85% 30%, rgba(163,99,80,0.22), transparent 55%)" }}></div>
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{ background: "radial-gradient(ellipse at 10% 80%, rgba(212,175,55,0.08), transparent 55%)" }}></div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Top: brand block + 4 link columns · 5 cols on desktop, 2 on tablet, stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-10">
          {/* Brand block */}
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="flex items-start gap-4 md:gap-5">
              <img src="/logo.jpeg" alt="Samrat Glass Emporium" className="w-20 h-20 md:w-24 md:h-24 object-cover brand-glow flex-shrink-0" />
              <div>
                <div className="font-serif text-xl md:text-2xl brand-gradient-text leading-tight">{settings?.brand_name || "Samrat Glass Emporium"}</div>
                <div className="text-[10px] uppercase tracking-[0.28em] text-[#BF9972] mt-1.5">Firozabad · Since 1981</div>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed max-w-sm">{f.description}</p>

            {/* Social icons — label switches to "Connect" if only WhatsApp is available */}
            {socials.length > 0 && (
              <div className="mt-7">
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/40 mb-3">{socialsLabel}</div>
                <div className="flex flex-wrap gap-2" data-testid="footer-socials">
                  {socials.map((s) => (
                    <a
                      key={s.key}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={s.label}
                      data-testid={`social-${s.key}`}
                      className="w-9 h-9 border border-[#BF9972]/40 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/70 flex items-center justify-center transition-colors"
                    >
                      <s.Icon size={15} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Explore */}
          <div className="lg:col-span-2">
            <div className="eyebrow mb-4">Explore</div>
            <ul className="space-y-2.5 text-sm">
              {EXPLORE_LINKS.map((l) => (
                <li key={l.label}>
                  <FooterLink {...l} testId={`footer-explore-${l.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`} />
                </li>
              ))}
            </ul>
            {/* Small premium pill for PDF download — kept out of the list so it never wraps */}
            <a
              href="/catalogue?print=1"
              target="_blank"
              rel="noreferrer"
              data-testid="footer-catalogue-btn"
              className="mt-5 inline-flex items-center gap-2 whitespace-nowrap border border-[#BF9972]/50 hover:border-[#D4AF37] hover:text-[#D4AF37] text-white/80 px-3.5 py-2 text-[10px] uppercase tracking-[0.22em] transition-colors"
            >
              <Download size={12} strokeWidth={1.6} />
              Catalogue PDF
            </a>
          </div>

          {/* Support */}
          <div className="lg:col-span-2">
            <div className="eyebrow mb-4">Support</div>
            <ul className="space-y-2.5 text-sm">
              {SUPPORT_LINKS.map((l) => (
                <li key={l.label}>
                  <FooterLink {...l} testId={`footer-support-${l.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`} />
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-2">
            <div className="eyebrow mb-4">Legal</div>
            <ul className="space-y-2.5 text-sm">
              {LEGAL_LINKS.map((l) => (
                <li key={l.label}>
                  <FooterLink {...l} testId={`footer-legal-${l.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`} />
                </li>
              ))}
            </ul>
          </div>

          {/* Contact — widened to col-span-3 so email/hours/address never break awkwardly */}
          <div className="sm:col-span-2 lg:col-span-3" data-testid="footer-contact-col">
            <div className="eyebrow mb-4">Contact</div>
            <div className="space-y-3.5">
              {waHref && (
                <ContactRow icon={WA} label="WhatsApp" value={settings?.whatsapp_number} href={waHref} external testId="footer-contact-whatsapp" />
              )}
              {phoneHref && (
                <ContactRow icon={Phone} label="Call" value={settings?.whatsapp_number} href={phoneHref} testId="footer-contact-phone" />
              )}
              {emailHref && (
                <ContactRow icon={Mail} label="Email" href={emailHref} external testId="footer-contact-email">
                  <BreakableEmail address={settings?.admin_email} />
                </ContactRow>
              )}
              {settings?.address && (
                <ContactRow icon={MapPin} label="Showroom" testId="footer-contact-address">
                  <span className="whitespace-pre-line">{settings.address}</span>
                  {mapsHref && (
                    <a href={mapsHref} target="_blank" rel="noreferrer" data-testid="footer-contact-maps" className="mt-1.5 inline-flex items-center gap-1 whitespace-nowrap text-[10px] uppercase tracking-[0.24em] text-[#D4AF37] hover:text-[#B5952F]">
                      Visit our showroom <ExternalLink size={10} />
                    </a>
                  )}
                </ContactRow>
              )}
              {settings?.business_hours && (
                <ContactRow icon={Clock} label="Hours" value={settings.business_hours} testId="footer-contact-hours" />
              )}
              {settings?.gstin && (
                <div className="pt-1 text-[10px] text-white/40 uppercase tracking-[0.22em]" data-testid="footer-contact-gstin">
                  GSTIN · <span className="text-white/60">{settings.gstin}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom row — single-line combined copyright */}
        <div className="mt-14 pt-6 border-t border-[#BF9972]/15 text-center text-[11px] text-white/40 tracking-wide" data-testid="footer-copyright">
          © {new Date().getFullYear()} {settings?.brand_name || "Samrat Glass Emporium"}. All rights reserved. <span className="text-white/30 mx-1">·</span> Handcrafted in Firozabad.
        </div>
      </div>
    </footer>
  );
}
