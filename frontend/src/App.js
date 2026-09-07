import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import { CatalogProvider } from "@/context/CatalogContext";
import { SettingsProvider } from "@/context/SettingsContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Home from "@/pages/Home";
import FloatingActions from "@/components/FloatingActions";
import MobileReachStrip from "@/components/MobileReachStrip";
import AnalyticsRouteTracker from "@/components/AnalyticsRouteTracker";
import ScrollToTop from "@/components/ScrollToTop";

const Toaster = React.lazy(() => import("sonner").then((module) => ({ default: module.Toaster })));
const AdminAuthGate = React.lazy(() => import("@/components/AdminAuthGate"));
const Catalog = React.lazy(() => import("@/pages/Catalog"));
const CategoryPage = React.lazy(() => import("@/pages/CategoryPage"));
const CollectionsIndex = React.lazy(() => import("@/pages/CollectionsIndex"));
const CollectionPage = React.lazy(() => import("@/pages/CollectionPage"));
const SpacesIndex = React.lazy(() => import("@/pages/SpacesIndex"));
const SpacePage = React.lazy(() => import("@/pages/SpacePage"));
const ProductDetail = React.lazy(() => import("@/pages/ProductDetail"));
const ProductDimensionPilot = React.lazy(() => import("@/components/ProductDimensionPilot"));
const Favorites = React.lazy(() => import("@/pages/Favorites"));
const Cart = React.lazy(() => import("@/pages/Cart"));
const Contact = React.lazy(() => import("@/pages/Contact"));
const Admin = React.lazy(() => import("@/pages/Admin"));
const CollectionsAdmin = React.lazy(() => import("@/pages/CollectionsAdmin"));
const SpacesAdmin = React.lazy(() => import("@/pages/SpacesAdmin"));
const Catalogue = React.lazy(() => import("@/pages/Catalogue"));
const About = React.lazy(() => import("@/pages/About"));
const Craft = React.lazy(() => import("@/pages/Craft"));
const FAQ = React.lazy(() => import("@/pages/FAQ"));
const Gallery = React.lazy(() => import("@/pages/Gallery"));
const GalleryProject = React.lazy(() => import("@/pages/GalleryProject"));
const StyledBy = React.lazy(() => import("@/pages/StyledBy"));
const LegalPage = React.lazy(() => import("@/pages/LegalPage"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const CustomLighting = React.lazy(() => import("@/pages/CustomLighting"));
const ArchitectsDesigners = React.lazy(() => import("@/pages/ArchitectsDesigners"));
const ChandelierManufacturerIndia = React.lazy(() => import("@/pages/ChandelierManufacturerIndia"));
const DoubleHeightChandeliersIndia = React.lazy(() => import("@/pages/DoubleHeightChandeliersIndia"));
const GuidesIndex = React.lazy(() => import("@/pages/GuidesIndex"));
const GuidePage = React.lazy(() => import("@/pages/GuidePage"));

function RouteScopedEffects() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    if (pathname !== "/") return undefined;

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
  }, [pathname]);

  React.useEffect(() => {
    if (!pathname.startsWith("/product/")) return undefined;

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
  }, [pathname]);

  return null;
}

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

  return (
    <div className="App min-h-screen flex flex-col">
      <CatalogProvider>
        <SettingsProvider>
        <BrowserRouter>
          <ScrollToTop />
          <AnalyticsRouteTracker />
          <RouteScopedEffects />
          <Header />
          <main className="flex-1">
            <React.Suspense fallback={<div aria-hidden="true" className="min-h-[40vh]" />}>
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
                <Route path="/guides" element={<GuidesIndex />} />
                <Route path="/guides/:slug" element={<GuidePage />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/gallery/:slug" element={<GalleryProject />} />
                <Route path="/styled-by" element={<StyledBy />} />
                <Route path="/product/:id" element={<><ProductDetail /><ProductDimensionPilot /></>} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/custom-lighting-bulk-orders" element={<CustomLighting />} />
                <Route path="/architects-interior-designers" element={<ArchitectsDesigners />} />
                <Route path="/chandelier-manufacturer-india" element={<ChandelierManufacturerIndia />} />
                <Route path="/double-height-chandeliers-india" element={<DoubleHeightChandeliersIndia />} />
                <Route path="/admin" element={<AdminAuthGate><Admin /></AdminAuthGate>} />
                <Route path="/admin/collections" element={<AdminAuthGate><CollectionsAdmin /></AdminAuthGate>} />
                <Route path="/admin/spaces" element={<AdminAuthGate><SpacesAdmin /></AdminAuthGate>} />
                <Route path="/catalogue" element={<AdminAuthGate><Catalogue /></AdminAuthGate>} />
                <Route path="/legal/:slug" element={<LegalPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </React.Suspense>
          </main>
          <Footer />
          <FloatingActions />
          <MobileReachStrip />
          <React.Suspense fallback={null}>
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
          </React.Suspense>
        </BrowserRouter>
        </SettingsProvider>
      </CatalogProvider>
    </div>
  );
}

export default App;
