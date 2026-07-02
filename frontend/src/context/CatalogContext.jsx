import React, { createContext, useContext, useEffect, useState } from "react";

const CatalogContext = createContext(null);

const load = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export function CatalogProvider({ children }) {
  const [cart, setCart] = useState(() => load("cart", []));
  const [favorites, setFavorites] = useState(() => load("favorites", []));

  useEffect(() => { localStorage.setItem("cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem("favorites", JSON.stringify(favorites)); }, [favorites]);

  const addToCart = (product, qty = 1) => {
    setCart((prev) => {
      const found = prev.find((i) => i.product_id === product.id);
      if (found) {
        return prev.map((i) => i.product_id === product.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { product_id: product.id, name: product.name, price: product.price, image: product.images?.[0], quantity: qty }];
    });
  };
  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.product_id !== id));
  const updateQty = (id, qty) => setCart((prev) => prev.map((i) => i.product_id === id ? { ...i, quantity: Math.max(1, qty) } : i));
  const clearCart = () => setCart([]);

  const toggleFavorite = (product) => {
    setFavorites((prev) => {
      if (prev.find((p) => p.id === product.id)) return prev.filter((p) => p.id !== product.id);
      return [...prev, { id: product.id, name: product.name, price: product.price, image: product.images?.[0], category: product.category }];
    });
  };
  const isFavorite = (id) => favorites.some((p) => p.id === id);

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CatalogContext.Provider value={{ cart, favorites, addToCart, removeFromCart, updateQty, clearCart, toggleFavorite, isFavorite, cartTotal }}>
      {children}
    </CatalogContext.Provider>
  );
}

export const useCatalog = () => {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
};
