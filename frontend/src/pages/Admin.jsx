import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit3, Upload, X, LayoutDashboard, Package, MessageSquare, Mail, Settings as SettingsIcon } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

const emptyProduct = {
  name: "", sku: "", category: "", price: 0, compare_at_price: null, currency: "USD",
  short_description: "", description: "", images: [], tags: [], specs: {}, stock: 0, featured: false,
};

export default function Admin() {
  const [tab, setTab] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(null);

  const refresh = async () => {
    const [p, i, m, s, st] = await Promise.all([
      api.listProducts().catch(() => []),
      api.listInquiries().catch(() => []),
      api.listContact().catch(() => []),
      api.getSettings().catch(() => null),
      api.stats().catch(() => null),
    ]);
    setProducts(p); setInquiries(i); setMessages(m); setSettings(s); setStats(st);
  };
  useEffect(() => { refresh(); }, []);

  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "products", label: "Products", icon: Package },
    { key: "inquiries", label: "Inquiries", icon: MessageSquare },
    { key: "messages", label: "Messages", icon: Mail },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div data-testid="page-admin" className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="eyebrow mb-3">Backoffice</div>
        <h1 className="font-serif text-4xl">Admin Dashboard</h1>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 mb-10">
        {tabs.map((t) => (
          <button
            key={t.key}
            data-testid={`admin-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-2 px-5 py-3 text-xs uppercase tracking-[0.24em] border-b-2 transition-colors ${tab === t.key ? "border-[#D4AF37] text-[#D4AF37]" : "border-transparent text-white/60 hover:text-white"}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[["Products", stats.products],["Inquiries", stats.inquiries],["Messages", stats.contact_messages],["Reviews", stats.reviews]].map(([label, val]) => (
            <div key={label} className="border border-white/10 p-8">
              <div className="eyebrow mb-3">{label}</div>
              <div className="font-serif text-4xl">{val}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "products" && (
        <ProductsAdmin products={products} refresh={refresh} setEditing={setEditing} editing={editing} />
      )}

      {tab === "inquiries" && <InquiriesAdmin inquiries={inquiries} refresh={refresh} />}

      {tab === "messages" && (
        <div className="space-y-4">
          {messages.length === 0 && <div className="text-white/50 text-sm py-12">No messages yet.</div>}
          {messages.map((m) => (
            <div key={m.id} className="border border-white/10 p-6" data-testid={`msg-${m.id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-serif text-lg">{m.subject || "No subject"}</div>
                  <div className="text-white/50 text-sm mt-1">from {m.name} · {m.email}</div>
                </div>
                <div className="text-xs text-white/40">{new Date(m.created_at).toLocaleString()}</div>
              </div>
              <p className="mt-4 text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && settings && <SettingsAdmin settings={settings} onSave={refresh} />}
    </div>
  );
}

function ProductsAdmin({ products, refresh, editing, setEditing }) {
  const [form, setForm] = useState(emptyProduct);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setForm(editing ? { ...emptyProduct, ...editing } : emptyProduct); }, [editing]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0 };
      if (editing) await api.updateProduct(editing.id, payload);
      else await api.createProduct(payload);
      toast.success(editing ? "Product updated" : "Product created");
      setEditing(null);
      setForm(emptyProduct);
      refresh();
    } catch { toast.error("Save failed"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try { await api.deleteProduct(id); toast.success("Deleted"); refresh(); }
    catch { toast.error("Delete failed"); }
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.upload(file);
      setForm((f) => ({ ...f, images: [...(f.images || []), url] }));
      toast.success("Image uploaded");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const setTag = (v) => setForm({ ...form, tags: v.split(",").map((s) => s.trim()).filter(Boolean) });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <form onSubmit={submit} className="lg:col-span-5 border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-serif text-2xl">{editing ? "Edit Product" : "New Product"}</div>
          {editing && (
            <button type="button" onClick={() => setEditing(null)} className="text-white/50 hover:text-white"><X size={16} /></button>
          )}
        </div>
        <input required data-testid="p-name" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm" />
        <input required data-testid="p-sku" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm" />
        <input required data-testid="p-category" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input required type="number" step="0.01" data-testid="p-price" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm" />
          <input type="number" data-testid="p-stock" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm" />
        </div>
        <input data-testid="p-short-desc" placeholder="Short description" value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm" />
        <textarea rows="4" data-testid="p-desc" placeholder="Full description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm resize-none" />
        <input data-testid="p-tags" placeholder="Tags (comma-separated)" value={form.tags.join(", ")} onChange={(e) => setTag(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm" />
        <label className="inline-flex items-center gap-2 text-sm text-white/80">
          <input data-testid="p-featured" type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
          Featured
        </label>

        <div>
          <div className="eyebrow mb-2">Images</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {form.images.map((img, i) => (
              <div key={i} className="relative">
                <img src={api.resolveImage(img)} alt="" className="w-16 h-16 object-cover border border-white/10" />
                <button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })} className="absolute -top-2 -right-2 w-5 h-5 bg-red-900 text-white text-xs">×</button>
              </div>
            ))}
          </div>
          <input data-testid="p-image-url" placeholder="Or paste image URL and press Enter" onKeyDown={(e) => {
            if (e.key === "Enter" && e.currentTarget.value) {
              e.preventDefault();
              setForm({ ...form, images: [...form.images, e.currentTarget.value] });
              e.currentTarget.value = "";
            }
          }} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm mb-2" />
          <label className="inline-flex items-center gap-2 border border-white/15 hover:border-[#D4AF37] px-4 py-2 text-xs uppercase tracking-[0.2em] cursor-pointer">
            <Upload size={12} /> {uploading ? "Uploading…" : "Upload image"}
            <input data-testid="p-upload" type="file" accept="image/*" onChange={upload} className="hidden" />
          </label>
        </div>

        <button data-testid="p-save-btn" className="w-full bg-[#D4AF37] text-black py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">
          {editing ? "Update product" : "Create product"}
        </button>
      </form>

      <div className="lg:col-span-7 space-y-3">
        <div className="flex items-center justify-between">
          <div className="eyebrow">All products ({products.length})</div>
          <button data-testid="p-new-btn" onClick={() => setEditing(null)} className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.24em] text-[#D4AF37] hover:text-[#B5952F]">
            <Plus size={12} /> New
          </button>
        </div>
        {products.map((p) => (
          <div key={p.id} data-testid={`admin-product-${p.id}`} className="flex items-center gap-4 border border-white/10 p-3">
            <div className="w-14 h-14 bg-[#0a0a0a] overflow-hidden flex-shrink-0">
              {p.images?.[0] && <img src={api.resolveImage(p.images[0])} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif truncate">{p.name}</div>
              <div className="text-xs text-white/50">{p.category} · ₹{p.price?.toLocaleString("en-IN")} · {p.stock} in stock</div>
            </div>
            <button onClick={() => setEditing(p)} data-testid={`edit-${p.id}`} className="text-white/60 hover:text-[#D4AF37]"><Edit3 size={14} /></button>
            <button onClick={() => remove(p.id)} data-testid={`del-${p.id}`} className="text-white/60 hover:text-red-400"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function InquiriesAdmin({ inquiries, refresh }) {
  const setStatus = async (id, s) => {
    await api.updateInquiryStatus(id, s);
    toast.success("Status updated");
    refresh();
  };
  return (
    <div className="space-y-4">
      {inquiries.length === 0 && <div className="text-white/50 text-sm py-12">No inquiries yet.</div>}
      {inquiries.map((inq) => (
        <div key={inq.id} data-testid={`inq-${inq.id}`} className="border border-white/10 p-6">
          <div className="flex flex-wrap justify-between gap-4">
            <div>
              <div className="font-serif text-lg">{inq.customer_name}</div>
              <div className="text-white/50 text-sm">{inq.customer_email} {inq.customer_phone && `· ${inq.customer_phone}`}</div>
              <div className="text-xs text-white/40 mt-1">{new Date(inq.created_at).toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              {["new","in_progress","closed"].map((s) => (
                <button key={s} onClick={() => setStatus(inq.id, s)} className={`text-xs uppercase tracking-[0.24em] px-3 py-1 border ${inq.status === s ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/15 text-white/60 hover:text-white"}`}>{s}</button>
              ))}
            </div>
          </div>
          {inq.message && <p className="mt-3 text-white/70 text-sm">{inq.message}</p>}
          <div className="mt-4 space-y-2">
            {inq.items.map((i, k) => (
              <div key={k} className="flex justify-between text-sm border-t border-white/5 pt-2">
                <span>{i.name} × {i.quantity}</span>
                <span className="text-white/60">₹{(i.price * i.quantity).toLocaleString("en-IN")}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right text-[#D4AF37] font-serif">Total: ₹{inq.total.toLocaleString("en-IN")}</div>
        </div>
      ))}
    </div>
  );
}

function SettingsAdmin({ settings, onSave }) {
  const [form, setForm] = useState(settings);
  const save = async (e) => {
    e.preventDefault();
    try { await api.updateSettings(form); toast.success("Settings saved"); onSave(); }
    catch { toast.error("Save failed"); }
  };
  return (
    <form onSubmit={save} className="max-w-2xl space-y-4 border border-white/10 p-8">
      <div className="eyebrow">Store settings</div>
      {[
        ["brand_name", "Brand name"],
        ["tagline", "Tagline"],
        ["whatsapp_number", "WhatsApp number (e.g., +918920392937)"],
        ["admin_email", "Admin email"],
        ["hero_image", "Hero image URL"],
        ["address", "Showroom address"],
        ["gstin", "GSTIN"],
        ["delivery_info", "Delivery info"],
        ["payment_methods", "Payment methods"],
      ].map(([k, label]) => (
        <div key={k}>
          <label className="text-xs uppercase tracking-[0.2em] text-white/50 mb-1 block">{label}</label>
          <input data-testid={`set-${k}`} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-4 py-3 text-sm" />
        </div>
      ))}
      <button data-testid="save-settings-btn" className="bg-[#D4AF37] text-black px-8 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">
        Save settings
      </button>
    </form>
  );
}
