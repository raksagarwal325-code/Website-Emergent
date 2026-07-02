import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import { CatalogProvider } from "@/context/CatalogContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import ProductDetail from "@/pages/ProductDetail";
import Favorites from "@/pages/Favorites";
import Cart from "@/pages/Cart";
import Contact from "@/pages/Contact";
import Admin from "@/pages/Admin";

function App() {
  return (
    <div className="App min-h-screen flex flex-col">
      <CatalogProvider>
        <BrowserRouter>
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>
          <Footer />
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
      </CatalogProvider>
    </div>
  );
}

export default App;
