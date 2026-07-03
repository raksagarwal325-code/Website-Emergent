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
import ProductDetail from "@/pages/ProductDetail";
import Favorites from "@/pages/Favorites";
import Cart from "@/pages/Cart";
import Contact from "@/pages/Contact";
import Admin from "@/pages/Admin";
import Catalogue from "@/pages/Catalogue";
import About from "@/pages/About";
import Craft from "@/pages/Craft";
import FAQ from "@/pages/FAQ";
import Gallery from "@/pages/Gallery";
import GalleryProject from "@/pages/GalleryProject";
import LegalPage from "@/pages/LegalPage";
import FloatingActions from "@/components/FloatingActions";
import MobileReachStrip from "@/components/MobileReachStrip";

function App() {
  React.useEffect(() => {
    // Remove Emergent-injected badge on public site
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
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/about" element={<About />} />
              <Route path="/craft" element={<Craft />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/gallery/:slug" element={<GalleryProject />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/catalogue" element={<Catalogue />} />
              <Route path="/legal/:slug" element={<LegalPage />} />
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
