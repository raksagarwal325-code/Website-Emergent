import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit3, Upload, X, LayoutDashboard, Package, MessageSquare, Mail, Settings as SettingsIcon, PlusCircle, Home as HomeIcon } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import AdminHomepage from "../components/AdminHomepage";
import AIProductGenerator from "../components/AIProductGenerator";
import ProductNameSuggester from "../components/ProductNameSuggester";

const emptyProduct = {
  name: "", sku: "", category: "", price: 0, compare_at_price: null, currency: "USD",
  short_description: "", description: "", images: [], tags: [], specs: {}, stock: 0, featured: false, badge: "", fixed_price: false, price_display: "starting_from", status: "published",
};

export default function Admin() {
  const [tab, setTab] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);

  const refresh = async () => {
    const [p, i, m, s, st, cats] = await Promise.all([
      api.listProducts({ include_drafts: 1 }).catch(() => []),
      api.listInquiries().catch(() => []),
      api.listContact().catch(() => []),
      api.getSettings().catch(() => null),
      api.stats().catch(() => null),
      api.categories().catch(() => []),
    ]);
    setProducts(p); setInquiries(i); setMessages(m); setSettings(s); setStats(st); setCategories(cats);
  };
  useEffect(() => { refresh(); }, []);

  const tabs = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "homepage", label: "Homepage", icon: HomeIcon },
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
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[["Products", stats.products],["Inquiries", stats.inquiries],["Messages", stats.contact_messages],["Reviews", stats.reviews]].map(([label, val]) => (
              <div key={label} className="border border-white/10 p-8">
                <div className="eyebrow mb-3">{label}</div>
                <div className="font-serif text-4xl">{val}</div>
              </div>
            ))}
          </div>
          <div className="border border-[#D4AF37]/30 p-6 flex flex-wrap items-center justify-between gap-4" style={{background:"linear-gradient(90deg, rgba(163,99,80,0.14), transparent)"}}>
            <div>
              <div className="eyebrow mb-1">Brand catalogue</div>
              <div className="font-serif text-xl">Download the complete product catalogue</div>
              <div className="text-white/50 text-xs mt-1">Auto-generated from current products — updates instantly on edits.</div>
            </div>
            <a data-testid="admin-download-catalogue" href="/catalogue?print=1" target="_blank" rel="noreferrer" className="bg-[#D4AF37] text-black px-6 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F]">Generate PDF</a>
          </div>
        </div>
      )}

      {tab === "homepage" && <AdminHomepage />}

      {tab === "products" && (
        <ProductsAdmin products={products} categories={categories} refresh={refresh} setEditing={setEditing} editing={editing} />
      )}

      {tab === "inquiries" && <InquiriesAdmin inquiries={inquiries} refresh={refresh} />}

      {tab === "messages" && <MessagesAdmin messages={messages} />}

      {tab === "settings" && settings && (
        <div className="space-y-8">
          <SettingsAdmin settings={settings} onSave={refresh} />
          <WatermarkAdmin settings={settings} onSave={refresh} />
        </div>
      )}
    </div>
  );
}

function ProductsAdmin({ products, categories = [], refresh, editing, setEditing }) {
  const [form, setForm] = useState(emptyProduct);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!editing) { setForm(emptyProduct); return; }
    // Backfill price_display from legacy fixed_price when older products don't have it set.
    const price_display =
      editing.price_display ||
      (editing.fixed_price ? "fixed" : "starting_from");
    setForm({ ...emptyProduct, ...editing, price_display });
  }, [editing]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const cmp = form.compare_at_price === "" || form.compare_at_price == null
        ? null
        : parseFloat(form.compare_at_price);
      const price = form.price_display === "on_request"
        ? 0
        : parseFloat(form.price) || 0;
      const payload = {
        ...form,
        price,
        compare_at_price: Number.isFinite(cmp) && cmp > 0 ? cmp : null,
        stock: parseInt(form.stock) || 0,
        price_display: form.price_display || "starting_from",
        fixed_price: form.price_display === "fixed", // legacy sync
        status: form.status || "published",
      };
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
    <div className="space-y-8">
      {/* AI drafts — visible for both create and edit flows */}
      {!editing && (
        <AIProductGenerator
          onDone={refresh}
          setEditingProduct={(draft) => { setEditing(draft); refresh(); }}
        />
      )}

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <form onSubmit={submit} className="lg:col-span-5 border border-white/10 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-serif text-2xl">{editing ? "Edit Product" : "New Product"}</div>
          {editing && (
            <button type="button" onClick={() => setEditing(null)} className="text-white/50 hover:text-white"><X size={16} /></button>
          )}
        </div>
        <div>
          <input required data-testid="p-name" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm" />
          <ProductNameSuggester
            form={form}
            onApply={(name) => setForm({ ...form, name })}
          />
        </div>
        <input required data-testid="p-sku" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm" />
        <div>
          <input
            required
            data-testid="p-category"
            list="product-category-suggestions"
            placeholder="Category (e.g. Crystal Chandeliers, Pendant Lights, Wall Sconces)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm"
          />
          <datalist id="product-category-suggestions">
            {categories.map((c) => <option key={c} value={c} />)}
          </datalist>
          {categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-[9px] uppercase tracking-[0.24em] text-white/40 mr-1 self-center">Existing:</span>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, category: c })}
                  data-testid={`cat-chip-${c}`}
                  className={`text-[10px] uppercase tracking-[0.16em] px-2 py-1 border transition-colors ${form.category === c ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/15 text-white/60 hover:border-[#BF9972] hover:text-white"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Pricing block */}
        <div className="border border-white/10 p-4 bg-black/20 space-y-3">
          <div className="eyebrow text-[#D4AF37]">Pricing</div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.22em] text-white/50 mb-2">Price display</label>
            <select
              data-testid="p-price-display"
              value={form.price_display || "starting_from"}
              onChange={(e) => setForm({ ...form, price_display: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm"
            >
              <option value="starting_from">Starting from ₹X (default — good for handmade/bespoke)</option>
              <option value="fixed">Fixed price ₹X (locked, no “From” prefix)</option>
              <option value="on_request">Price on request (custom & bespoke pieces)</option>
            </select>
          </div>

          {form.price_display !== "on_request" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.22em] text-white/50 mb-1">Selling price ₹ *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  data-testid="p-price"
                  placeholder="e.g. 25000"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-[0.22em] text-white/50 mb-1">
                  MRP / Original ₹ <span className="text-white/35 lowercase tracking-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  data-testid="p-compare-at-price"
                  placeholder="Only if higher than selling price"
                  value={form.compare_at_price ?? ""}
                  onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Discount preview */}
          {form.price_display !== "on_request" &&
            Number(form.compare_at_price) > 0 &&
            Number(form.compare_at_price) > Number(form.price) && (
              <div className="text-[11px] text-[#BF9972]" data-testid="p-discount-preview">
                Will show <span className="text-white/40 line-through mx-1">₹{Number(form.compare_at_price).toLocaleString("en-IN")}</span>
                — a{" "}
                {Math.round(
                  ((Number(form.compare_at_price) - Number(form.price)) / Number(form.compare_at_price)) * 100
                )}
                % discount badge on the card.
              </div>
            )}
          {form.price_display !== "on_request" &&
            form.compare_at_price !== "" &&
            form.compare_at_price != null &&
            Number(form.compare_at_price) > 0 &&
            Number(form.compare_at_price) <= Number(form.price) && (
              <div className="text-[11px] text-white/40 italic">
                MRP is ≤ selling price — the crossed-out price is hidden automatically. Leave MRP blank to keep it clean.
              </div>
            )}

          <div>
            <label className="block text-[10px] uppercase tracking-[0.22em] text-white/50 mb-1">Stock</label>
            <input
              type="number"
              data-testid="p-stock"
              placeholder="e.g. 10"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <input data-testid="p-short-desc" placeholder="Short description" value={form.short_description} onChange={(e) => setForm({ ...form, short_description: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm" />
        <textarea rows="4" data-testid="p-desc" placeholder="Full description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm resize-none" />
        <input data-testid="p-tags" placeholder="Tags (comma-separated)" value={form.tags.join(", ")} onChange={(e) => setTag(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm" />
        <label className="inline-flex items-center gap-2 text-sm text-white/80">
          <input data-testid="p-featured" type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
          Featured
        </label>

        {/* Publish status — controls whether the product is visible on the public site. */}
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">Publish status</span>
          <div className="flex gap-3">
            {[["published", "Published (visible on site)"], ["draft", "Draft (Needs Review — hidden)"]].map(([val, label]) => (
              <label key={val} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  data-testid={`p-status-${val}`}
                  name="p-status"
                  checked={(form.status || "published") === val}
                  onChange={() => setForm({ ...form, status: val, badge: val === "published" && form.badge === "Needs Review" ? "" : form.badge })}
                />
                <span className={val === "draft" ? "text-[#D4AF37]" : "text-white/85"}>{label}</span>
              </label>
            ))}
          </div>
          {form.status === "draft" && (
            <p className="text-[10px] text-[#BF9972] mt-1">This product is currently hidden from the public site. Switch to Published when ready.</p>
          )}
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block mb-1">Signature Badge (optional, shown on the product card)</span>
          <input
            data-testid="p-badge"
            list="badge-suggestions"
            placeholder="e.g. Firozabad Signature, Bestseller, Made to Order, Signed Edition"
            value={form.badge || ""}
            onChange={(e) => setForm({ ...form, badge: e.target.value })}
            className="w-full bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm"
          />
          <datalist id="badge-suggestions">
            <option value="Firozabad Signature" />
            <option value="Bestseller" />
            <option value="Made to Order" />
            <option value="Signed Edition" />
            <option value="Limited Edition" />
            <option value="Heritage Piece" />
          </datalist>
          <p className="text-[10px] text-white/40 mt-1">Leave blank to hide the badge. Replaces star rating on the card.</p>
        </div>

        <SpecsEditor value={form.specs || {}} onChange={(specs) => setForm({ ...form, specs })} />

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
          <div className="eyebrow">All products ({products.length}{products.filter((x) => x.status === "draft").length > 0 ? ` · ${products.filter((x) => x.status === "draft").length} draft` : ""})</div>
          <button data-testid="p-new-btn" onClick={() => setEditing(null)} className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.24em] text-[#D4AF37] hover:text-[#B5952F]">
            <Plus size={12} /> New
          </button>
        </div>
        {products.map((p) => (
          <div key={p.id} data-testid={`admin-product-${p.id}`}
            className={`flex items-center gap-4 border p-3 ${p.status === "draft" ? "border-[#D4AF37]/50 bg-[#D4AF37]/[0.04]" : "border-white/10"}`}>
            <div className="w-14 h-14 bg-[#0a0a0a] overflow-hidden flex-shrink-0">
              {p.images?.[0] && <img src={api.resolveImage(p.images[0])} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-serif truncate flex items-center gap-2">
                {p.name}
                {p.status === "draft" && (
                  <span className="text-[9px] uppercase tracking-widest bg-[#D4AF37] text-black px-2 py-0.5 flex-shrink-0" data-testid={`draft-badge-${p.id}`}>
                    Needs Review
                  </span>
                )}
              </div>
              <div className="text-xs text-white/50">{p.category} · {p.status === "draft" ? "Price on request" : `₹${p.price?.toLocaleString("en-IN")}`} · {p.stock} in stock</div>
            </div>
            <button onClick={() => setEditing(p)} data-testid={`edit-${p.id}`} className="text-white/60 hover:text-[#D4AF37]"><Edit3 size={14} /></button>
            <button onClick={() => remove(p.id)} data-testid={`del-${p.id}`} className="text-white/60 hover:text-red-400"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
    </div>
  );
}

function InquiriesAdmin({ inquiries, refresh }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const setStatus = async (id, s) => {
    await api.updateInquiryStatus(id, s);
    toast.success("Status updated");
    refresh();
  };

  const counts = {
    all: inquiries.length,
    new: inquiries.filter((i) => i.status === "new").length,
    in_progress: inquiries.filter((i) => i.status === "in_progress").length,
    closed: inquiries.filter((i) => i.status === "closed").length,
  };

  const filtered = inquiries.filter((i) => {
    if (filter !== "all" && i.status !== filter) return false;
    if (q.trim()) {
      const needle = q.toLowerCase();
      const hay = `${i.customer_name || ""} ${i.customer_email || ""} ${i.customer_phone || ""} ${i.message || ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const waNumber = (raw) => (raw || "").replace(/[^0-9]/g, "");

  return (
    <div className="space-y-4">
      {/* Toolbar: filters + search */}
      <div className="flex flex-wrap items-center gap-3 mb-2">
        {[["all","All"],["new","New"],["in_progress","In progress"],["closed","Closed"]].map(([k, label]) => (
          <button key={k} type="button" data-testid={`inq-filter-${k}`} onClick={() => setFilter(k)}
            className={`text-[10px] uppercase tracking-[0.24em] px-3 py-1.5 border transition-colors inline-flex items-center gap-2 ${filter === k ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/15 text-white/60 hover:border-[#BF9972] hover:text-white"}`}>
            {label}
            <span className={`text-[10px] tabular-nums ${filter === k ? "text-[#D4AF37]" : "text-white/40"}`}>{counts[k]}</span>
          </button>
        ))}
        <input
          data-testid="inq-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, phone, message…"
          className="flex-1 min-w-[200px] bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-3 py-2 text-sm"
        />
      </div>

      {filtered.length === 0 && <div className="text-white/50 text-sm py-12 text-center border border-white/5">No inquiries match this filter.</div>}

      {filtered.map((inq) => {
        const digits = waNumber(inq.customer_phone);
        const waLink = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(`Hi ${inq.customer_name}, thank you for your inquiry to Samrat Glass Emporium. `)}` : "";
        const mailLink = inq.customer_email ? `mailto:${inq.customer_email}?subject=Re: Your inquiry to Samrat Glass Emporium` : "";
        return (
          <div key={inq.id} data-testid={`inq-${inq.id}`} className="border border-white/10 p-6 hover:border-white/20 transition-colors">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <div className="font-serif text-lg">{inq.customer_name}</div>
                <div className="text-white/50 text-sm mt-1">
                  {inq.customer_email && <span>{inq.customer_email}</span>}
                  {inq.customer_phone && <span> · {inq.customer_phone}</span>}
                </div>
                <div className="text-xs text-white/40 mt-1">{new Date(inq.created_at).toLocaleString()}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer" data-testid={`inq-wa-${inq.id}`}
                    className="text-[10px] uppercase tracking-[0.24em] px-3 py-1.5 border border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366]/10">
                    WhatsApp
                  </a>
                )}
                {mailLink && (
                  <a href={mailLink} data-testid={`inq-mail-${inq.id}`}
                    className="text-[10px] uppercase tracking-[0.24em] px-3 py-1.5 border border-white/25 text-white/70 hover:border-[#D4AF37] hover:text-[#D4AF37]">
                    Email
                  </a>
                )}
                {["new","in_progress","closed"].map((s) => (
                  <button key={s} onClick={() => setStatus(inq.id, s)} className={`text-[10px] uppercase tracking-[0.24em] px-3 py-1.5 border ${inq.status === s ? "border-[#D4AF37] text-[#D4AF37]" : "border-white/15 text-white/60 hover:text-white"}`}>{s === "in_progress" ? "In progress" : s}</button>
                ))}
              </div>
            </div>
            {inq.message && <p className="mt-3 text-white/70 text-sm whitespace-pre-wrap">{inq.message}</p>}
            {inq.items?.length > 0 && (
              <div className="mt-4 space-y-2">
                {inq.items.map((i, k) => (
                  <div key={k} className="flex justify-between text-sm border-t border-white/5 pt-2">
                    <span>{i.name} × {i.quantity}</span>
                    <span className="text-white/60">₹{(i.price * i.quantity).toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            )}
            {inq.total > 0 && (
              <div className="mt-3 text-right text-[#D4AF37] font-serif">Total: ₹{inq.total.toLocaleString("en-IN")}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MessagesAdmin({ messages }) {
  const [q, setQ] = useState("");
  const filtered = messages.filter((m) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return `${m.name || ""} ${m.email || ""} ${m.subject || ""} ${m.message || ""}`.toLowerCase().includes(needle);
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <div className="text-[10px] uppercase tracking-[0.24em] text-white/50 px-3 py-1.5 border border-white/15">
          {messages.length} total
        </div>
        <input
          data-testid="msg-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, subject, message…"
          className="flex-1 min-w-[200px] bg-[#0a0a0a] border border-white/15 focus:border-[#D4AF37] outline-none px-3 py-2 text-sm"
        />
      </div>
      {filtered.length === 0 && (
        <div className="text-white/50 text-sm py-12 text-center border border-white/5">
          {messages.length === 0 ? "No messages yet." : "No messages match this search."}
        </div>
      )}
      {filtered.map((m) => {
        const mailLink = m.email ? `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "Your enquiry to Samrat Glass Emporium"}`)}` : "";
        return (
          <div key={m.id} className="border border-white/10 p-6 hover:border-white/20 transition-colors" data-testid={`msg-${m.id}`}>
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div>
                <div className="font-serif text-lg">{m.subject || "No subject"}</div>
                <div className="text-white/50 text-sm mt-1">from {m.name} · <span className="text-white/70">{m.email}</span></div>
                <div className="text-xs text-white/40 mt-1">{new Date(m.created_at).toLocaleString()}</div>
              </div>
              {mailLink && (
                <a href={mailLink} data-testid={`msg-reply-${m.id}`}
                  className="text-[10px] uppercase tracking-[0.24em] px-3 py-1.5 border border-white/25 text-white/70 hover:border-[#D4AF37] hover:text-[#D4AF37]">
                  Reply by email
                </a>
              )}
            </div>
            <p className="mt-4 text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
          </div>
        );
      })}
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
        ["business_hours", "Business hours (footer)"],
        ["google_maps_url", "Google Maps URL (Visit showroom link)"],
        ["google_cid", "Google Business CID"],
        ["google_place_id", "Google Place ID (for live reviews)"],
        ["google_maps_api_key", "Google Maps API Key (server-side, keep secret)"],
        ["instagram_url", "Instagram URL (blank = hide icon)"],
        ["facebook_url", "Facebook URL (blank = hide icon)"],
        ["youtube_url", "YouTube URL (blank = hide icon)"],
        ["pinterest_url", "Pinterest URL (blank = hide icon)"],
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

const DEFAULT_WATERMARK = {
  enabled: true,
  opacity: 0.15,
  size_pct: 0.30,
  position: "center",
  adaptive_tone: true,
};

function WatermarkAdmin({ settings, onSave }) {
  const [wm, setWm] = useState({ ...DEFAULT_WATERMARK, ...(settings?.watermark || {}) });
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const debounceRef = React.useRef(null);

  const runPreview = React.useCallback(async () => {
    if (!previewFile) return;
    try {
      const fd = new FormData();
      fd.append("file", previewFile);
      fd.append("opacity", String(wm.opacity));
      fd.append("size_pct", String(wm.size_pct));
      fd.append("adaptive_tone", wm.adaptive_tone ? "true" : "false");
      const API = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(`${API}/api/watermark/preview`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`Preview failed (${res.status})`);
      const blob = await res.blob();
      setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
    } catch (e) { toast.error(e.message || "Preview failed"); }
  }, [previewFile, wm.opacity, wm.size_pct, wm.adaptive_tone]);

  // Debounced preview whenever sliders/toggles change
  useEffect(() => {
    if (!previewFile) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(runPreview, 250);
    return () => clearTimeout(debounceRef.current);
  }, [previewFile, wm.opacity, wm.size_pct, wm.adaptive_tone, runPreview]);

  const save = async () => {
    setBusy(true);
    try {
      await api.updateSettings({ watermark: wm });
      toast.success("Watermark settings saved");
      onSave();
    } catch { toast.error("Save failed"); }
    finally { setBusy(false); }
  };

  const reprocess = async () => {
    if (!window.confirm("Regenerate watermarks for every uploaded image? This may take a moment.")) return;
    setBusy(true);
    try {
      const API = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(`${API}/api/watermark/reprocess`, { method: "POST" });
      const j = await res.json();
      toast.success(`Reprocessed ${j.processed} / ${j.total} images (skipped ${j.skipped}, failed ${j.failed})`);
    } catch { toast.error("Reprocess failed"); }
    finally { setBusy(false); }
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setPreviewFile(f);
  };

  return (
    <div className="max-w-3xl space-y-6 border border-white/10 p-8" data-testid="watermark-admin">
      <div>
        <div className="eyebrow text-[#D4AF37]">Image watermark</div>
        <h3 className="font-serif text-xl mt-1">Centered logo watermark for uploaded images</h3>
        <p className="text-white/50 text-sm mt-1">
          Applied automatically to every new product & gallery image you upload.
          Originals are kept privately for admin use only.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm text-white/85">
        <input
          type="checkbox"
          checked={!!wm.enabled}
          onChange={(e) => setWm({ ...wm, enabled: e.target.checked })}
          data-testid="wm-enabled"
        />
        Enable watermark on all future uploads
      </label>

      <fieldset disabled={!wm.enabled} className="space-y-5 disabled:opacity-40">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs uppercase tracking-[0.2em] text-white/60">Opacity</label>
            <span className="text-xs text-[#D4AF37] font-mono">{Math.round(wm.opacity * 100)}%</span>
          </div>
          <input
            type="range" min="0.05" max="0.6" step="0.01"
            value={wm.opacity}
            onChange={(e) => setWm({ ...wm, opacity: parseFloat(e.target.value) })}
            className="w-full accent-[#D4AF37]"
            data-testid="wm-opacity"
          />
          <p className="text-[11px] text-white/40 mt-1">Recommended: 12–20% — visible but never harsh.</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs uppercase tracking-[0.2em] text-white/60">Size (% of image width)</label>
            <span className="text-xs text-[#D4AF37] font-mono">{Math.round(wm.size_pct * 100)}%</span>
          </div>
          <input
            type="range" min="0.15" max="0.6" step="0.01"
            value={wm.size_pct}
            onChange={(e) => setWm({ ...wm, size_pct: parseFloat(e.target.value) })}
            className="w-full accent-[#D4AF37]"
            data-testid="wm-size"
          />
          <p className="text-[11px] text-white/40 mt-1">Recommended: 25–35% — hard to crop out without losing the product.</p>
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-white/60 mb-1 block">Position</label>
          <div className="inline-flex border border-white/15 overflow-hidden">
            <button
              type="button"
              onClick={() => setWm({ ...wm, position: "center" })}
              className={`px-4 py-2 text-xs uppercase tracking-[0.2em] ${wm.position === "center" ? "bg-[#D4AF37] text-black" : "text-white/60 hover:text-white"}`}
              data-testid="wm-pos-center"
            >
              Center (recommended)
            </button>
          </div>
          <p className="text-[11px] text-white/40 mt-1">Center placement can&apos;t be cropped out — side/corner watermarks always can.</p>
        </div>

        <label className="flex items-center gap-3 text-sm text-white/85">
          <input
            type="checkbox"
            checked={!!wm.adaptive_tone}
            onChange={(e) => setWm({ ...wm, adaptive_tone: e.target.checked })}
            data-testid="wm-adaptive"
          />
          Adaptive tone (white on dark photos · dark grey on light photos)
        </label>
      </fieldset>

      {/* Preview */}
      <div className="border border-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-[#BF9972]">Live preview</div>
            <p className="text-[11px] text-white/40 mt-1">Upload any sample product photo — the preview updates as you drag the sliders.</p>
          </div>
          <label className="inline-flex items-center gap-2 border border-[#D4AF37]/60 hover:border-[#D4AF37] text-[#D4AF37] px-4 py-2 uppercase text-xs tracking-[0.24em] cursor-pointer">
            <Upload size={14} /> Choose sample
            <input type="file" accept="image/*" onChange={onFile} className="hidden" data-testid="wm-preview-file" />
          </label>
        </div>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Watermark preview"
            className="w-full max-h-[520px] object-contain bg-black/40"
            data-testid="wm-preview-image"
          />
        ) : (
          <div className="w-full aspect-[4/3] flex items-center justify-center bg-black/30 border border-dashed border-white/10 text-white/40 text-sm">
            Choose a sample image to see the watermark preview
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="bg-[#D4AF37] text-black px-8 py-3 uppercase text-xs tracking-[0.28em] hover:bg-[#B5952F] disabled:opacity-50"
          data-testid="wm-save"
        >
          Save watermark settings
        </button>
        <button
          type="button"
          onClick={reprocess}
          disabled={busy}
          className="border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] px-6 py-3 uppercase text-xs tracking-[0.28em] disabled:opacity-50"
          data-testid="wm-reprocess"
        >
          Apply to all existing uploads
        </button>
      </div>
      <p className="text-[11px] text-white/35">
        Reprocess re-generates watermarks for images uploaded through this Admin panel (using their stored original).
        Externally-linked images (Unsplash/CDN URLs) aren&apos;t touched — replace them by re-uploading.
      </p>
    </div>
  );
}

const PRESET_SPEC_KEYS = [
  "Material", "Finish", "Size", "Height", "Width", "Diameter",
  "Holder Type", "Bulb Type", "Wattage", "Color", "Weight",
  "Package Contents", "Care Instructions", "Warranty",
];

function SpecsEditor({ value, onChange }) {
  const entries = Object.entries(value || {});
  const [customKey, setCustomKey] = useState("");

  const updateKey = (oldKey, newKey) => {
    if (!newKey || newKey === oldKey) return;
    const next = {};
    entries.forEach(([k, v]) => { next[k === oldKey ? newKey : k] = v; });
    onChange(next);
  };
  const updateVal = (k, v) => onChange({ ...value, [k]: v });
  const removeKey = (k) => {
    const next = { ...value };
    delete next[k];
    onChange(next);
  };
  const addKey = (k) => {
    if (!k || value?.[k] !== undefined) return;
    onChange({ ...(value || {}), [k]: "" });
  };

  const missingPresets = PRESET_SPEC_KEYS.filter((k) => value?.[k] === undefined);

  return (
    <div className="border border-white/10 p-4 space-y-3" data-testid="specs-editor">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Specifications</div>
        <span className="text-[10px] text-white/40">{entries.length} field(s)</span>
      </div>

      {entries.length === 0 && (
        <div className="text-xs text-white/50 py-2">No specifications yet. Add from presets or a custom key.</div>
      )}

      <div className="space-y-2">
        {entries.map(([k, v]) => (
          <div key={k} className="grid grid-cols-12 gap-2 items-start" data-testid={`spec-row-edit-${k}`}>
            <input
              defaultValue={k}
              key={`key-${k}`}
              onBlur={(e) => updateKey(k, e.target.value.trim())}
              className="col-span-4 bg-[#0a0a0a] border border-white/15 px-3 py-2 text-xs uppercase tracking-[0.16em] text-white/70"
              data-testid={`spec-key-${k}`}
            />
            <input
              value={v}
              onChange={(e) => updateVal(k, e.target.value)}
              placeholder="Value"
              className="col-span-7 bg-[#0a0a0a] border border-white/15 px-3 py-2 text-sm"
              data-testid={`spec-val-${k}`}
            />
            <button type="button" onClick={() => removeKey(k)} data-testid={`spec-remove-${k}`} className="col-span-1 h-9 border border-white/15 hover:border-red-500 hover:text-red-400 text-white/60 flex items-center justify-center">
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {missingPresets.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Add preset</div>
          <div className="flex flex-wrap gap-1.5">
            {missingPresets.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => addKey(k)}
                data-testid={`spec-preset-${k.replace(/\s+/g, "-").toLowerCase()}`}
                className="inline-flex items-center gap-1 border border-white/15 hover:border-[#D4AF37] hover:text-[#D4AF37] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-white/60"
              >
                <PlusCircle size={10} /> {k}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-white/5">
        <input
          value={customKey}
          onChange={(e) => setCustomKey(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addKey(customKey.trim()); setCustomKey(""); }
          }}
          placeholder="Custom key (press Enter)"
          data-testid="spec-custom-key"
          className="flex-1 bg-[#0a0a0a] border border-white/15 px-3 py-2 text-xs"
        />
        <button
          type="button"
          data-testid="spec-add-custom"
          onClick={() => { addKey(customKey.trim()); setCustomKey(""); }}
          className="border border-white/15 hover:border-[#D4AF37] hover:text-[#D4AF37] px-4 py-2 text-[10px] uppercase tracking-[0.2em]"
        >
          Add
        </button>
      </div>
    </div>
  );
}

