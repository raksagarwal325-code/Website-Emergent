import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Heart, ShoppingBag, Search, Menu, X, Images } from "lucide-react";
import { useCatalog } from "../../context/CatalogContext";
import { api } from "../../lib/api";

export default function Header() {
  const { cart, favorites } = useCatalog();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("Samrat Glass Emporium");
  const [projectTabHost, setProjectTabHost] = useState(null);
  const [projectTabActive, setProjectTabActive] = useState(() => window.location.hash === "#project-gallery");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    api.getSettings().then((s) => setBrand(s.brand_name || "Lumière")).catch(() => {});
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const linkClass = ({ isActive }) =>
    `relative text-[13px] font-medium uppercase tracking-[0.22em] transition-colors pb-1 ${
      isActive
        ? "text-[#F4E6CC] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-[#D4AF37]"
        : "text-white/65 hover:text-white"
    }`;

  return (
    <header
      data-testid="site-header"
      className={`sticky top-0 z-50 w-full backdrop-blur-2xl transition-all duration-300 ${scrolled ? "bg-[#16070f]/90 border-b border-[#BF9972]/20" : "bg-[#16070f]/50"}`}
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
          <NavLink to="/" end className={linkClass} data-testid="nav-home">Home</NavLink>
          <NavLink to="/catalog" className={linkClass} data-testid="nav-catalog">Catalog</NavLink>
          <NavLink to="/collections" className={linkClass} data-testid="nav-collections">Collections</NavLink>
          <NavLink to="/craft" className={linkClass} data-testid="nav-craft">The Craft</NavLink>
          <NavLink to="/gallery" className={linkClass} data-testid="nav-gallery">Gallery</NavLink>
          <NavLink to="/about" className={linkClass} data-testid="nav-about">About</NavLink>
          <NavLink to="/contact" className={linkClass} data-testid="nav-contact">Contact</NavLink>
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
      {open && (
        <div className="md:hidden border-t border-[#BF9972]/20 px-6 py-6 flex flex-col gap-4 bg-[#16070f]">
          {[["/", "Home"],["/catalog", "Catalog"],["/collections", "Collections"],["/craft", "The Craft"],["/gallery", "Gallery"],["/about", "About"],["/contact", "Contact"]].map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)} className={linkClass}>{label}</NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
