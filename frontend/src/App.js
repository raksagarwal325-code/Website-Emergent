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
import CollectionPage from "@/pages/CollectionPage";
import ProductDetail from "@/pages/ProductDetail";
import Favorites from "@/pages/Favorites";
import Cart from "@/pages/Cart";
import Contact from "@/pages/Contact";
import Admin from "@/pages/Admin";
import CollectionsAdmin from "@/pages/CollectionsAdmin";
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
              <Route path="/collection/:slug" element={<CollectionPage />} />
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
              <Route path="/admin" element={<AdminAuthGate><Admin /></AdminAuthGate>} />
              <Route path="/admin/collections" element={<AdminAuthGate><CollectionsAdmin /></AdminAuthGate>} />
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
