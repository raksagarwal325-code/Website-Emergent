import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, MessageCircle } from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { api, formatPrice } from "../lib/api";
import { toast } from "sonner";

export default function Cart() {
  const { cart, removeFromCart, updateQty, clearCart, cartTotal } = useCatalog();
  const [form, setForm] = useState({ customer_name: "", customer_email: "", customer_phone: "", message: "" });
  const [settings, setSettings] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name || !form.customer_email) {
      toast.error("Name and email are required");
      return;
    }
    if (cart.length === 0) {
      toast.error("Your inquiry basket is empty");
      return;
    }
    setSubmitting(true);
    try {
    const items = cart.map((i) => ({ product_id: i.product_id, name: i.name, quantity: i.quantity, price: i.price }));
      await api.createInquiry({ ...form, items });
      toast.success("Inquiry sent. We'll be in touch shortly.");
      clearCart();
      setForm({ customer_name: "", customer_email: "", customer_phone: "", message: "" });
    } catch {
      toast.error("Could not send inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const waNumber = (settings?.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waMsg = cart.length > 0
    ? encodeURIComponent("Hello, I would like to enquire about:\n" + cart.map((i) => `- ${i.name} (x${i.quantity})`).join("\n"))
    : "";
  const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waMsg}` : "#";

  return (
    <div data-testid="page-cart" className="max-w-7xl mx-auto px-6 py-16">
      <div className="mb-12">
        <div className="eyebrow mb-3">Basket</div>
        <h1 className="font-serif text-4xl sm:text-5xl">Inquiry Basket</h1>
        <p className="text-white/60 mt-4 max-w-lg">Submit an inquiry — we&apos;ll respond with availability, private viewing options, or WhatsApp directly.</p>
      </div>

      {cart.length === 0 ? (
        <div className="py-24 text-center border border-white/10">
          <div className="font-serif text-2xl mb-3">Your basket is empty.</div>
          <Link to="/catalog" className="inline-block mt-6 bg-[#D4AF37] text-black px-8 py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">
            Browse catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-4">
            {cart.map((i) => (
              <div key={i.product_id} data-testid={`cart-item-${i.product_id}`} className="flex gap-5 border border-white/10 p-5">
                <div className="w-24 h-24 overflow-hidden bg-[#0a0a0a] flex-shrink-0">
                  {i.image && <img src={api.resolveImage(i.image)} alt={i.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1">
                  <div className="font-serif text-lg">{i.name}</div>
                  <div className="text-white/60 text-sm mt-1">{formatPrice(i.price)}</div>
                  <div className="flex items-center gap-3 mt-3">
                    <button data-testid={`qty-minus-${i.product_id}`} onClick={() => updateQty(i.product_id, i.quantity - 1)} className="w-8 h-8 border border-white/15 hover:border-[#D4AF37]"><Minus size={12} className="mx-auto" /></button>
                    <span data-testid={`qty-${i.product_id}`} className="text-sm w-6 text-center">{i.quantity}</span>
                    <button data-testid={`qty-plus-${i.product_id}`} onClick={() => updateQty(i.product_id, i.quantity + 1)} className="w-8 h-8 border border-white/15 hover:border-[#D4AF37]"><Plus size={12} className="mx-auto" /></button>
                    <button data-testid={`remove-${i.product_id}`} onClick={() => removeFromCart(i.product_id)} className="ml-4 text-white/50 hover:text-red-400"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#D4AF37] font-serif">{formatPrice(i.price * i.quantity)}</div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-4 text-white/80">
              <button onClick={clearCart} data-testid="clear-basket-btn" className="text-xs uppercase tracking-[0.28em] text-white/50 hover:text-red-400">Clear basket</button>
              <div className="text-lg">Total: <span data-testid="cart-total" className="text-[#D4AF37] font-serif text-2xl">{formatPrice(cartTotal)}</span></div>
            </div>
          </div>

          <form onSubmit={submit} className="lg:col-span-5 border border-white/10 p-8 space-y-5">
            <div className="eyebrow mb-2">Send Inquiry</div>
            <input required data-testid="inq-name" placeholder="Full name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm" />
            <input required type="email" data-testid="inq-email" placeholder="Email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm" />
            <input data-testid="inq-phone" placeholder="Phone (optional)" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm" />
            <textarea data-testid="inq-message" placeholder="Notes (optional)" rows="4" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm resize-none" />
            <button disabled={submitting} data-testid="submit-inquiry-btn" className="w-full bg-[#D4AF37] text-black py-4 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] disabled:opacity-50">
              {submitting ? "Sending…" : "Send inquiry"}
            </button>
            {waNumber && (
              <a data-testid="wa-basket-btn" href={waLink} target="_blank" rel="noreferrer" className="w-full inline-flex items-center justify-center gap-2 border border-white/25 py-4 uppercase text-xs tracking-[0.28em] hover:border-[#D4AF37]">
                <MessageCircle size={14} /> Enquire on WhatsApp
              </a>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
