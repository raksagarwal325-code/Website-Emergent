import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Heart, ShoppingBag, Search, Menu, X, Images, ArrowUpRight, Grid2X2, Layers3, ArrowUp, House } from "lucide-react";
import { useCatalog } from "../../context/CatalogContext";
import { api } from "../../lib/api";

const NAV_ITEMS = [
  {
    to: "/",
    label: "Home",
    testid: "nav-home",
    end: true,
    eyebrow: "Start here",
    title: "A quick view of Samrat Glass",
    description: "Featured lighting, spaces, heritage, atelier pieces and real installations in one editorial overview.",
    links: [["/collections", "Collections"], ["/spaces", "Shop by Space"], ["/gallery", "Installations"]],
  },
  {
    to: "/catalog",
    label: "Catalog",
    testid: "nav-catalog",
    eyebrow: "Browse lighting",
    title: "Explore the complete lighting range",
    description: "Browse chandeliers, hanging lights, wall lights, lamps and the wider catalogue by category, price or search.",
    links: [["/catalog", "Full Catalog"], ["/spaces", "By Space"], ["/custom-lighting-bulk-orders", "Custom Lighting"]],
  },
  {
    to: "/collections",
    label: "Collections",
    testid: "nav-collections",
    eyebrow: "Curated families",
    title: "Lighting grouped by design language",
    description: "Discover related pieces and coordinated families without searching through the full catalogue.",
    links: [["/collections", "All Collections"], ["/catalog", "All Products"], ["/styled-by", "Styled By"]],
  },
  {
    to: "/craft",
    label: "The Craft",
    testid: "nav-craft",
    eyebrow: "Made in Firozabad",
    title: "Glassmaking, finishing and custom work",
    description: "See the craftsmanship behind the fixtures, the manufacturing story and how custom lighting is developed.",
    links: [["/craft", "The Craft"], ["/chandelier-manufacturer-india", "Manufacturing"], ["/custom-lighting-bulk-orders", "Custom Orders"]],
  },
  {
    to: "/gallery",
    label: "Gallery",
    testid: "nav-gallery",
    eyebrow: "Real installations",
    title: "See Samrat Glass in finished spaces",
    description: "Browse completed residential, hospitality and project installations across India.",
    links: [["/gallery", "Project Gallery"], ["/styled-by", "Styled By"], ["/architects-interior-designers", "For Designers"]],
  },
  {
    to: "/about",
    label: "About",
    testid: "nav-about",
    eyebrow: "Since 1981",
    title: "The people and legacy behind the brand",
    description: "Learn about Samrat Glass Emporium, its Firozabad roots, founder story and four decades of decorative lighting.",
    links: [["/about", "Our Story"], ["/craft", "Our Craft"], ["/faq", "FAQ"]],
  },
  {
    to: "/contact",
    label: "Contact",
    testid: "nav-contact",
    eyebrow: "Talk to us",
    title: "Product, project and custom enquiries",
    description: "Reach the team for product questions, custom lighting, bulk requirements and architect or designer projects.",
    links: [["/contact", "Contact"], ["/custom-lighting-bulk-orders", "Custom Lighting"], ["/architects-interior-designers", "Architects & Designers"]],
  },
];

const MOBILE_QUICK_LINKS = [
  { to: "/catalog", label: "Catalog", Icon: Grid2X2, section: "catalog" },
  { to: "/collections", label: "Collections", Icon: Layers3, section: "collections" },
  { to: "/gallery", label: "Gallery", Icon: Images, section: "gallery" },
];

const MOBILE_HOME_LINK = { to: "/", label: "Home", Icon: House, section: "home" };

const quickNavSection = (pathname) => {
  if (pathname === "/catalog" || pathname.startsWith("/category/") || pathname.startsWith("/product/")) return "catalog";
  if (pathname === "/collections" || pathname.startsWith("/collection/")) return "collections";
  if (pathname === "/gallery" || pathname.startsWith("/gallery/")) return "gallery";
  return null;
};

export default function Header() {
  const { cart, favorites } = useCatalog();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [quickNavVisible, setQuickNavVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("Samrat Glass Emporium");
  const [navPreview, setNavPreview] = useState(null);
  const [projectTabHost, setProjectTabHost] = useState(null);
  const [projectTabActive, setProjectTabActive] = useState(() => window.location.hash === "#project-gallery");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setQuickNavVisible(window.scrollY > 320);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    api.getSettings().then((s) => setBrand(s.brand_name || "Lumière")).catch(() => {});
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setNavPreview(null);
  }, [location.pathname]);

  useEffect(() => {
    const onHashChange = () => setProjectTabActive(window.location.hash === "#project-gallery");
    window.addEventListener("hashchange", onHashChange);
    onHashChange();
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (location.pathname !== "/admin") {
      setProjectTabHost(null);
      return undefined;
    }

    let host = null;
    let nav = null;
    let retryTimer = null;

    const clearProjectState = (event) => {
      const button = event.target.closest('button[data-testid^="admin-tab-"]');
      if (!button || button.dataset.testid === "admin-tab-project-gallery") return;
      if (window.location.hash === "#project-gallery") {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        setProjectTabActive(false);
      }
    };

    const attach = () => {
      const homepageButton = document.querySelector('[data-testid="admin-tab-homepage"]');
      const nextNav = homepageButton?.parentElement;
      if (!homepageButton || !nextNav) {
        retryTimer = window.setTimeout(attach, 50);
        return;
      }

      nav = nextNav;
      const existing = nav.querySelector('[data-persistent-project-gallery-tab-host="true"]');
      host = existing || document.createElement("span");
      host.setAttribute("data-persistent-project-gallery-tab-host", "true");
      host.style.display = "contents";
      if (!existing) homepageButton.insertAdjacentElement("afterend", host);
      nav.addEventListener("click", clearProjectState);
      setProjectTabHost(host);
    };

    attach();

    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      if (nav) nav.removeEventListener("click", clearProjectState);
      if (host?.parentNode) host.parentNode.removeChild(host);
      setProjectTabHost(null);
    };
  }, [location.pathname]);

  const openProjectGallery = () => {
    const homepageButton = document.querySelector('[data-testid="admin-tab-homepage"]');
    if (!homepageButton) return;
    homepageButton.click();
    window.setTimeout(() => {
      window.location.hash = "project-gallery";
      setProjectTabActive(true);
    }, 0);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const activeQuickSection = quickNavSection(location.pathname);
  const mobileQuickLinks = activeQuickSection
    ? [MOBILE_HOME_LINK, ...MOBILE_QUICK_LINKS.filter((item) => item.section !== activeQuickSection)]
    : MOBILE_QUICK_LINKS;

  const linkClass = ({ isActive }) =>
    `relative text-[13px] font-medium uppercase tracking-[0.22em] transition-colors pb-1 ${
      isActive
        ? "text-[#F4E6CC] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-[#D4AF37]"
        : "text-white/65 hover:text-white"
    }`;

  return (
    <header
      data-testid="site-header"
      onMouseLeave={() => setNavPreview(null)}
      className={`relative sticky top-0 z-50 w-full backdrop-blur-2xl transition-all duration-300 ${scrolled ? "bg-[#16070f]/90 border-b border-[#BF9972]/20" : "bg-[#16070f]/50"}`}
    >
      {projectTabHost && createPortal(
        <button
          type="button"
          data-testid="admin-tab-project-gallery"
          onClick={openProjectGallery}
          className={`inline-flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-[0.24em] border-b-2 transition-colors ${projectTabActive ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-white/60 hover:text-white"}`}
        >
          <Images size={14} /> Project Gallery
        </button>,
        projectTabHost
      )}

      {quickNavVisible && !open && location.pathname !== "/admin" && createPortal(
        <nav
          aria-label="Mobile quick links"
          data-testid="mobile-quick-nav"
          className="fixed right-2 top-1/2 z-[65] -translate-y-1/2 overflow-hidden border border-[#BF9972]/30 bg-[#12070d]/95 shadow-[0_14px_34px_rgba(0,0,0,0.38)] backdrop-blur-xl md:hidden"
        >
          {mobileQuickLinks.map(({ to, label, Icon }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              className="flex h-[54px] w-[54px] flex-col items-center justify-center gap-1 border-b border-white/10 text-white/68 transition-colors active:bg-white/[0.06] active:text-[#D4AF37]"
            >
              <Icon size={17} strokeWidth={1.5} />
              <span className="max-w-[48px] truncate text-[7px] font-medium uppercase tracking-[0.08em]">{label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Back to top"
            className="flex h-[54px] w-[54px] flex-col items-center justify-center gap-1 text-[#D4AF37] transition-colors active:bg-white/[0.06]"
          >
            <ArrowUp size={17} strokeWidth={1.5} />
            <span className="text-[7px] font-medium uppercase tracking-[0.08em]">Top</span>
          </button>
        </nav>,
        document.body
      )}

      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" data-testid="header-brand" className="flex items-center gap-3 whitespace-nowrap">
          <span className="logo-badge inline-flex h-10 w-10 flex-shrink-0">
            <img src="/logo.jpeg" alt="Samrat Glass Emporium" className="w-full h-full object-cover" />
          </span>
          <span className="font-serif text-base md:text-lg tracking-wide leading-tight">
            <span className="block text-white">Samrat Glass</span>
            <span className="block text-[10px] tracking-[0.28em] uppercase text-[#BF9972]">Emporium</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map((item, index) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={linkClass}
              data-testid={item.testid}
              onMouseEnter={() => setNavPreview(index)}
              onFocus={() => setNavPreview(index)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/catalog" aria-label="Search" data-testid="header-search" className="h-10 w-10 flex items-center justify-center text-white/75 hover:text-[#D4AF37] transition-colors">
            <Search size={20} strokeWidth={1.6} />
          </Link>
          <Link to="/favorites" aria-label="Favorites" data-testid="header-favorites" className="relative h-10 w-10 flex items-center justify-center text-white/75 hover:text-[#D4AF37] transition-colors">
            <Heart size={20} strokeWidth={1.6} />
            {favorites.length > 0 && (
              <span className="absolute top-0 right-0 text-[10px] bg-[#D4AF37] text-black px-1.5 py-0.5">{favorites.length}</span>
            )}
          </Link>
          <Link to="/cart" aria-label="Cart" data-testid="header-cart" className="relative h-10 w-10 flex items-center justify-center text-white/75 hover:text-[#D4AF37] transition-colors">
            <ShoppingBag size={20} strokeWidth={1.6} />
            {cartCount > 0 && (
              <span data-testid="cart-count" className="absolute top-0 right-0 text-[10px] bg-[#D4AF37] text-black px-1.5 py-0.5">{cartCount}</span>
            )}
          </Link>
          <button
            className="md:hidden h-10 w-10 flex items-center justify-center text-white/75"
            data-testid="header-menu-toggle"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {navPreview !== null && NAV_ITEMS[navPreview] && (
        <div
          data-testid="nav-preview-overlay"
          className="absolute left-0 right-0 top-full z-[70] hidden border-y border-[#BF9972]/35 bg-[#12070d] shadow-[0_22px_60px_rgba(0,0,0,0.48)] md:block"
        >
          <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "linear-gradient(110deg, rgba(88,27,55,.28), transparent 42%, rgba(212,175,55,.035))" }} />
          <div className="relative mx-auto grid max-w-7xl grid-cols-[1.15fr_.85fr] gap-12 px-6 py-8">
            <div className="min-w-0 pr-4">
              <div className="text-[10px] font-medium uppercase tracking-[0.32em] text-[#D6B07B]">{NAV_ITEMS[navPreview].eyebrow}</div>
              <div className="mt-2 max-w-3xl font-serif text-[30px] leading-tight text-[#FFF8ED]">{NAV_ITEMS[navPreview].title}</div>
              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-white/80">{NAV_ITEMS[navPreview].description}</p>
            </div>
            <div className="grid grid-cols-3 gap-0 self-stretch border-l border-white/10">
              {NAV_ITEMS[navPreview].links.map(([to, label]) => (
                <Link
                  key={`${NAV_ITEMS[navPreview].to}-${to}-${label}`}
                  to={to}
                  className="group flex min-h-[96px] flex-col justify-center border-r border-white/10 px-5 py-3 transition-colors hover:bg-white/[0.035]"
                >
                  <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-white/85 transition-colors group-hover:text-[#E0C15D]">{label}</span>
                  <ArrowUpRight size={14} className="mt-3 text-[#D4AF37] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="md:hidden border-t border-[#BF9972]/20 px-6 py-6 flex flex-col gap-4 bg-[#16070f]">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)} className={linkClass}>{item.label}</NavLink>
          ))}
        </div>
      )}
    </header>
  );
}