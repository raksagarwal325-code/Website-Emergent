import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Heart, ShoppingBag, Search, Menu, X } from "lucide-react";
import { useCatalog } from "../../context/CatalogContext";
import { api } from "../../lib/api";

export default function Header() {
  const { cart, favorites } = useCatalog();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("Samrat Glass Emporium");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    api.getSettings().then((s) => setBrand(s.brand_name || "Lumière")).catch(() => {});
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const linkClass = ({ isActive }) =>
    `text-xs uppercase tracking-[0.28em] transition-colors ${isActive ? "text-white" : "text-white/60 hover:text-white"}`;

  return (
    <header
      data-testid="site-header"
      className={`sticky top-0 z-50 w-full backdrop-blur-2xl transition-all duration-300 ${scrolled ? "bg-black/85 border-b border-white/10" : "bg-black/40"}`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" data-testid="header-brand" className="font-serif text-lg md:text-xl tracking-wide whitespace-nowrap">
          Samrat Glass<span className="text-[#D4AF37]"> Emporium</span>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          <NavLink to="/" end className={linkClass} data-testid="nav-home">Home</NavLink>
          <NavLink to="/catalog" className={linkClass} data-testid="nav-catalog">Catalog</NavLink>
          <NavLink to="/contact" className={linkClass} data-testid="nav-contact">Contact</NavLink>
          <NavLink to="/admin" className={linkClass} data-testid="nav-admin">Admin</NavLink>
        </nav>

        <div className="flex items-center gap-5">
          <Link to="/catalog" aria-label="Search" data-testid="header-search" className="text-white/70 hover:text-[#D4AF37]">
            <Search size={18} strokeWidth={1.5} />
          </Link>
          <Link to="/favorites" aria-label="Favorites" data-testid="header-favorites" className="relative text-white/70 hover:text-[#D4AF37]">
            <Heart size={18} strokeWidth={1.5} />
            {favorites.length > 0 && (
              <span className="absolute -top-2 -right-3 text-[10px] bg-[#D4AF37] text-black px-1.5 py-0.5">{favorites.length}</span>
            )}
          </Link>
          <Link to="/cart" aria-label="Cart" data-testid="header-cart" className="relative text-white/70 hover:text-[#D4AF37]">
            <ShoppingBag size={18} strokeWidth={1.5} />
            {cartCount > 0 && (
              <span data-testid="cart-count" className="absolute -top-2 -right-3 text-[10px] bg-[#D4AF37] text-black px-1.5 py-0.5">{cartCount}</span>
            )}
          </Link>
          <button
            className="md:hidden text-white/70"
            data-testid="header-menu-toggle"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-white/10 px-6 py-6 flex flex-col gap-4 bg-black">
          {[["/", "Home"],["/catalog", "Catalog"],["/contact", "Contact"],["/admin", "Admin"]].map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)} className={linkClass}>{label}</NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
