import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import { CatalogProvider } from "@/context/CatalogContext";
import { SettingsProvider } from "@/context/SettingsContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import CategoryPage from "@/pages/CategoryPage";
import CollectionsIndex from "@/pages/CollectionsIndex";
import CollectionPage from "@/pages/CollectionPage";
import SpacesIndex from "@/pages/SpacesIndex";
import SpacePage from "@/pages/SpacePage";
import ProductDetail from "@/pages/ProductDetail";
import Favorites from "@/pages/Favorites";
import Cart from "@/pages/Cart";
import Contact from "@/pages/Contact";
import Admin from "@/pages/Admin";
import CollectionsAdmin from "@/pages/CollectionsAdmin";
import SpacesAdmin from "@/pages/SpacesAdmin";
import AdminAuthGate from "@/components/AdminAuthGate";
import Catalogue from "@/pages/Catalogue";
import About from "@/pages/About";
import Craft from "@/pages/Craft";
import FAQ from "@/pages/FAQ";
import Gallery from "@/pages/Gallery";
import GalleryProject from "@/pages/GalleryProject";
import StyledBy from "@/pages/StyledBy";
import LegalPage from "@/pages/LegalPage";
import NotFound from "@/pages/NotFound";
import CustomLighting from "@/pages/CustomLighting";
import ArchitectsDesigners from "@/pages/ArchitectsDesigners";
import ChandelierManufacturerIndia from "@/pages/ChandelierManufacturerIndia";
import FloatingActions from "@/components/FloatingActions";
import MobileReachStrip from "@/components/MobileReachStrip";
import AnalyticsRouteTracker from "@/components/AnalyticsRouteTracker";
import ScrollToTop from "@/components/ScrollToTop";

function App() {
  React.useEffect(() => {
    const remove = () => {
      const el = document.getElementById("emergent-badge");
      if (el) el.remove();
    };
    remove();
    const t = setInterval(remove, 500);
    setTimeout(() => clearInterval(t), 5000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    let start = null;
    const selector = '[data-testid="influencer-carousel-viewport"]';

    const onTouchStart = (event) => {
      const viewport = event.target?.closest?.(selector);
      const touch = event.touches?.[0];
      if (!viewport || !touch) {
        start = null;
        return;
      }
      start = { x: touch.clientX, y: touch.clientY, viewport };
    };

    const onTouchEnd = (event) => {
      if (!start) return;
      const touch = event.changedTouches?.[0];
      const { x, y, viewport } = start;
      start = null;
      if (!touch || !viewport.isConnected) return;

      const dx = touch.clientX - x;
      const dy = touch.clientY - y;
      if (Math.abs(dx) < 44 || Math.abs(dx) <= Math.abs(dy) * 1.15) return;

      const section = viewport.closest('[data-testid="influencer-promotions-section"]');
      const direction = dx < 0 ? "next" : "prev";
      section?.querySelector(`[data-testid="influencer-carousel-${direction}-mobile"]`)?.click();
    };

    const onTouchCancel = () => { start = null; };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
    };
  }, []);

  React.useEffect(() => {
    const selector = '[data-testid="product-main-image"], button[data-testid^="thumb-"] img';
    const attached = new WeakSet();

    const sampleBackground = (img) => {
      if (!img?.complete || !img.naturalWidth || !img.naturalHeight) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 12;
        canvas.height = 12;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const points = [
          [0, 0], [1, 0], [0, 1],
          [11, 0], [10, 0], [11, 1],
          [0, 11], [1, 11], [0, 10],
          [11, 11], [10, 11], [11, 10],
        ];
        let total = 0;
        let count = 0;
        points.forEach(([x, y]) => {
          const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;
          if (a < 32) return;
          total += (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
          count += 1;
        });
        if (!count) return;

        const isLight = (total / count) >= 165;
        const frame = img.closest('button[data-testid^="thumb-"]') || img.parentElement;
        if (frame) frame.style.backgroundColor = isLight ? "#ffffff" : "#000000";
      } catch (_) {
        // Cross-origin images keep the existing dark fallback if pixels cannot be sampled.
      }
    };

    const attach = (img) => {
      if (!img || attached.has(img)) return;
      attached.add(img);
      img.addEventListener("load", () => sampleBackground(img));
      if (img.complete) sampleBackground(img);
    };

    const scan = () => document.querySelectorAll(selector).forEach(attach);
    scan();

    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="App min-h-screen flex flex-col">
      <CatalogProvider>
        <SettingsProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AnalyticsRouteTracker />
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/category/:slug" element={<CategoryPage />} />
              <Route path="/collections" element={<CollectionsIndex />} />
              <Route path="/collection/:slug" element={<CollectionPage />} />
              <Route path="/spaces" element={<SpacesIndex />} />
              <Route path="/space/:slug" element={<SpacePage />} />
              <Route path="/about" element={<About />} />
              <Route path="/craft" element={<Craft />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/gallery/:slug" element={<GalleryProject />} />
              <Route path="/styled-by" element={<StyledBy />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/custom-lighting-bulk-orders" element={<CustomLighting />} />
              <Route path="/architects-interior-designers" element={<ArchitectsDesigners />} />
              <Route path="/chandelier-manufacturer-india" element={<ChandelierManufacturerIndia />} />
              <Route path="/admin" element={<AdminAuthGate><Admin /></AdminAuthGate>} />
              <Route path="/admin/collections" element={<AdminAuthGate><CollectionsAdmin /></AdminAuthGate>} />
              <Route path="/admin/spaces" element={<AdminAuthGate><SpacesAdmin /></AdminAuthGate>} />
              <Route path="/catalogue" element={<AdminAuthGate><Catalogue /></AdminAuthGate>} />
              <Route path="/legal/:slug" element={<LegalPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <FloatingActions />
          <MobileReachStrip />
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "#0d0d0d",
                border: "1px solid rgba(212,175,55,0.4)",
                color: "#fff",
                borderRadius: 0,
              },
            }}
          />
        </BrowserRouter>
        </SettingsProvider>
      </CatalogProvider>
    </div>
  );
}

export default App;
