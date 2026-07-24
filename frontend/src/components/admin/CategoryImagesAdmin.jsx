import React, { useEffect, useMemo, useRef, useState } from "react";
import { Upload, RotateCcw, ImageIcon, Check, X } from "lucide-react";
import { api } from "../../lib/api";
import { toast } from "sonner";

/**
 * Category Images admin
 * ---------------------
 * Per-category "hero image" for the homepage "Shop by Category" section.
 * Two authorised sources per category:
 *   1. Pick a specific image from an existing product in that category.
 *   2. Upload a custom image to Emergent object storage.
 *   3. Reset to the automatic newest-product fallback.
 *
 * Arbitrary external URLs are intentionally not accepted (SSRF hardening).
 */
const CATEGORIES = [
  { db_name: "Chandelier",    label: "Chandeliers"    },
  { db_name: "Hanging Light", label: "Hanging Lights" },
  { db_name: "Wall Light",    label: "Wall Lights"    },
  { db_name: "Table Lamp",    label: "Table Lamps"    },
  { db_name: "Floor Lamp",    label: "Floor Lamps"    },
  { db_name: "Candle Stand",  label: "Candle Stands"  },
];

export default function CategoryImagesAdmin() {
  const [overrides, setOverrides] = useState({});   // category -> override doc
  const [fallbacks, setFallbacks] = useState({});   // category -> auto image url
  const [pickerFor, setPickerFor] = useState(null); // category db_name being picked
  const [busyCat, setBusyCat] = useState(null);
  const fileInputs = useRef({});

  const refresh = async () => {
    try {
      const [overridesList, allProducts] = await Promise.all([
        api.adminListCategoryFeatured(),
        api.listAllProducts({ limit: 5000 }),
      ]);
      const overrideMap = {};
      for (const o of overridesList || []) overrideMap[o.category] = o;
      // Build a map of the newest product image per category from the full list.
      // listAllProducts returns newest-first via default sort — take the first
      // matching product for each category.
      const fbMap = {};
      const byCat = new Map();
      for (const p of allProducts || []) {
        if (!p?.category || byCat.has(p.category)) continue;
        if (p.status && p.status !== "published") continue;
        const img = (p.images || [])[0];
        if (img) byCat.set(p.category, api.resolveImage(img));
      }
      for (const c of CATEGORIES) fbMap[c.db_name] = byCat.get(c.db_name) || "";
      setOverrides(overrideMap);
      setFallbacks(fbMap);
    } catch (e) {
      toast.error("Failed to load category images");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const currentImageFor = (dbName) => {
    const o = overrides[dbName];
    if (o?.image_url) return api.resolveImage(o.image_url);
    return fallbacks[dbName] || "";
  };

  const onFilePicked = async (dbName, file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are supported");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Image must be ≤ 6MB");
      return;
    }
    setBusyCat(dbName);
    try {
      await api.adminUploadCategoryFeatured(dbName, file);
      toast.success(`Uploaded custom image for ${dbName}`);
      await refresh();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Upload failed");
    } finally {
      setBusyCat(null);
    }
  };

  const onResetAutomatic = async (dbName) => {
    setBusyCat(dbName);
    try {
      await api.adminResetCategoryFeatured(dbName);
      toast.success(`Reset ${dbName} to automatic newest product`);
      await refresh();
    } catch (e) {
      toast.error("Reset failed");
    } finally {
      setBusyCat(null);
    }
  };

  return (
    <div data-testid="admin-category-images" className="space-y-6">
      <div className="border border-white/10 p-6 md:p-8">
        <div className="eyebrow mb-3">Homepage · Shop by Category</div>
        <div className="font-serif text-2xl mb-2">Category featured images</div>
        <p className="text-sm text-white/60 max-w-2xl leading-relaxed">
          Pin a specific image for each category tile on the homepage. Pick an image
          from an existing product in that category, or upload a custom photo to
          storage. Reset any tile to fall back to the newest product's image
          automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {CATEGORIES.map((c) => {
          const o = overrides[c.db_name];
          const src = currentImageFor(c.db_name);
          const busy = busyCat === c.db_name;
          return (
            <div
              key={c.db_name}
              data-testid={`cat-img-card-${c.db_name.toLowerCase().replace(/\s+/g, "-")}`}
              className="border border-white/10 flex flex-col"
            >
              {/* Preview */}
              <div className="relative aspect-[4/5] bg-black/60 overflow-hidden">
                {src ? (
                  <img
                    src={src}
                    alt={`${c.label} featured`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white/30">
                    <ImageIcon size={28} />
                    <div className="text-xs mt-2">No products yet</div>
                  </div>
                )}
                {/* Source badge */}
                <div className="absolute top-3 left-3 inline-flex items-center gap-1 bg-black/70 border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.24em]">
                  {o?.source_type === "upload" && (
                    <span className="text-[#D4AF37]">Custom upload</span>
                  )}
                  {o?.source_type === "product" && (
                    <span className="text-[#D4AF37]">Product image</span>
                  )}
                  {!o && <span className="text-white/60">Automatic</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div>
                  <div className="font-serif text-lg leading-tight">{c.label}</div>
                  <div className="text-[11px] text-white/40 mt-1">DB name: {c.db_name}</div>
                </div>
                <div className="flex flex-wrap gap-2 mt-auto">
                  <button
                    data-testid={`cat-img-pick-product-${c.db_name.toLowerCase().replace(/\s+/g, "-")}`}
                    onClick={() => setPickerFor(c.db_name)}
                    disabled={busy}
                    className="inline-flex items-center gap-2 border border-white/20 hover:border-[#D4AF37] px-3 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors disabled:opacity-40"
                  >
                    <ImageIcon size={13} /> From product
                  </button>
                  <button
                    data-testid={`cat-img-upload-${c.db_name.toLowerCase().replace(/\s+/g, "-")}`}
                    onClick={() => fileInputs.current[c.db_name]?.click()}
                    disabled={busy}
                    className="inline-flex items-center gap-2 border border-white/20 hover:border-[#D4AF37] px-3 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors disabled:opacity-40"
                  >
                    <Upload size={13} /> Upload
                  </button>
                  <input
                    ref={(el) => (fileInputs.current[c.db_name] = el)}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onFilePicked(c.db_name, e.target.files?.[0])}
                    data-testid={`cat-img-file-input-${c.db_name.toLowerCase().replace(/\s+/g, "-")}`}
                  />
                  {o && (
                    <button
                      data-testid={`cat-img-reset-${c.db_name.toLowerCase().replace(/\s+/g, "-")}`}
                      onClick={() => onResetAutomatic(c.db_name)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 text-white/60 hover:text-white px-3 py-2 text-[11px] uppercase tracking-[0.22em] transition-colors disabled:opacity-40"
                    >
                      <RotateCcw size={13} /> Reset
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {pickerFor && (
        <ProductImagePicker
          category={pickerFor}
          onClose={() => setPickerFor(null)}
          onSaved={async () => {
            setPickerFor(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Modal that lets the admin pick one product-image from the current
// category's products. Each product may have multiple images — each one
// is a selectable thumbnail. Saving PUTs the reference into the backend
// (which validates it belongs to that product).
// -----------------------------------------------------------------------
function ProductImagePicker({ category, onClose, onSaved }) {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [selection, setSelection] = useState(null); // {product_id, image_url}
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .listAllProducts({ category, include_drafts: 1, limit: 5000 })
      .then((all) => {
        if (!alive) return;
        setItems((all || []).filter((p) => (p.images || []).length > 0));
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [category]);

  const filtered = useMemo(() => {
    if (!items) return null;
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (p) =>
        p.name?.toLowerCase().includes(needle) ||
        p.sku?.toLowerCase().includes(needle),
    );
  }, [items, q]);

  const onSave = async () => {
    if (!selection) return;
    setSaving(true);
    try {
      await api.adminSetCategoryFeaturedFromProduct(
        category,
        selection.product_id,
        selection.image_url,
      );
      toast.success(`Set featured image for ${category}`);
      await onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="cat-img-picker-modal"
    >
      <div className="bg-[#1a0a12] border border-[#BF9972]/30 w-full max-w-5xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div>
            <div className="eyebrow mb-1">Choose product image</div>
            <div className="font-serif text-xl">{category}</div>
          </div>
          <button
            onClick={onClose}
            data-testid="cat-img-picker-close"
            className="p-2 hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 border-b border-white/10">
          <input
            data-testid="cat-img-picker-search"
            placeholder="Search by name or SKU…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full bg-black/40 border border-white/15 px-4 py-2 text-sm outline-none focus:border-[#D4AF37]"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {filtered === null && (
            <div className="text-white/50 text-sm">Loading products…</div>
          )}
          {filtered && filtered.length === 0 && (
            <div className="text-white/50 text-sm">
              No products with images found in this category.
            </div>
          )}
          {filtered && filtered.length > 0 && (
            <div className="space-y-6">
              {filtered.map((p) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm">
                      <span className="text-white">{p.name}</span>
                      <span className="ml-3 text-[11px] text-white/40 uppercase tracking-[0.22em]">
                        {p.sku}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {p.images.map((img, idx) => {
                      const isPicked =
                        selection?.product_id === p.id &&
                        selection?.image_url === img;
                      return (
                        <button
                          key={`${p.id}-${idx}`}
                          data-testid={`cat-img-picker-thumb-${p.sku}-${idx}`}
                          onClick={() =>
                            setSelection({
                              product_id: p.id,
                              image_url: img,
                            })
                          }
                          className={`relative aspect-square overflow-hidden border transition-colors ${
                            isPicked
                              ? "border-[#D4AF37]"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <img
                            src={api.resolveImage(img)}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                          {isPicked && (
                            <div className="absolute top-1 right-1 w-6 h-6 bg-[#D4AF37] text-black flex items-center justify-center">
                              <Check size={14} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs uppercase tracking-[0.24em] text-white/70 hover:text-white"
          >
            Cancel
          </button>
          <button
            data-testid="cat-img-picker-save"
            onClick={onSave}
            disabled={!selection || saving}
            className="bg-[#D4AF37] text-black px-6 py-2 text-xs uppercase tracking-[0.24em] hover:bg-[#B5952F] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save selection"}
          </button>
        </div>
      </div>
    </div>
  );
}
