import React, { useMemo, useState } from "react";
import { Wand2, X, RefreshCw, Check, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

/**
 * "Regenerate Full Product Details" tool. Sits at the top of the Admin
 * product edit form (next to the "Save" bar).
 *
 * Flow:
 *  1. Click button → backend runs full AI draft on the primary product image
 *     (endpoint: `/api/ai/regenerate-details`, does NOT persist).
 *  2. A side-by-side DIFF modal opens showing every field with its CURRENT
 *     value vs the NEW AI suggestion. Each row has a checkbox — checked =
 *     will be applied on save.
 *  3. User clicks "Apply Selected Fields" → the parent form is merged with
 *     the selected fields and the product's `status` flips to `draft` so
 *     nothing is silently republished.
 */

// Fields shown in the diff. `type: text` = single-line, `textarea` = multi-line,
// `spec` = renders inside the specs table. Order matters — visual layout.
const FIELDS = [
  { key: "name", label: "Name", type: "text" },
  { key: "seo_name", label: "SEO title", type: "text" },
  { key: "category", label: "Category", type: "text" },
  { key: "short_description", label: "Short description", type: "textarea" },
  { key: "description", label: "Full description", type: "textarea" },
  { key: "tags", label: "Tags", type: "textarea" },
];

// Nested spec keys we surface in the diff. Anything present on the AI's specs
// object but NOT listed here is shown at the bottom under "Other specs".
const SPEC_FIELDS = [
  ["Material", "Material"],
  ["Finish", "Finish"],
  ["Glass Type", "Glass Type"],
  ["Product Type", "Product Type"],
  ["Suitable For", "Suitable For"],
  ["Style", "Style"],
  ["Color", "Color / finish"],
];

// Fields that, when changed, warrant flipping the product back to Draft.
const MAJOR_FIELDS = new Set(["name", "category", "short_description", "description"]);

// Some fields on the working form are non-strings (tags is an array). This
// helper normalises them to the same shape the AI returns (comma-joined) for
// diffing/display.
function currentAsString(form, key) {
  const v = form[key];
  if (Array.isArray(v)) return v.join(", ");
  return String(v || "");
}

function DiffRow({ label, current, next: nextVal, selected, onToggle, isTextarea }) {
  const changed = String(current || "").trim() !== String(nextVal || "").trim();
  return (
    <div
      className={`border border-white/10 p-3 rounded-sm bg-black/30 ${
        changed ? "" : "opacity-60"
      }`}
      data-testid={`diff-row-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <label className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#BF9972] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            disabled={!changed}
            className="accent-[#D4AF37]"
          />
          {label}
          {!changed && (
            <span className="ml-1 text-white/40 normal-case tracking-normal text-[10px]">
              · no change
            </span>
          )}
        </label>
      </div>
      <div className="grid grid-cols-[1fr_16px_1fr] gap-2 text-xs items-start">
        <div>
          <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Current</div>
          {isTextarea ? (
            <div className="text-white/70 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {current || <span className="text-white/30 italic">empty</span>}
            </div>
          ) : (
            <div className="text-white/75">
              {current || <span className="text-white/30 italic">empty</span>}
            </div>
          )}
        </div>
        <ArrowRight size={12} className="text-[#BF9972] mt-4" />
        <div>
          <div className="text-[#D4AF37] text-[10px] uppercase tracking-widest mb-1">AI suggestion</div>
          {isTextarea ? (
            <div className="text-white/90 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {nextVal || <span className="text-white/30 italic">empty</span>}
            </div>
          ) : (
            <div className="text-white/90">
              {nextVal || <span className="text-white/30 italic">empty</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductFullRegenerator({ form, onMerge }) {
  const [loading, setLoading] = useState(false);
  const [ai, setAi] = useState(null);
  const [selection, setSelection] = useState({});

  const canRun = Boolean(
    form && (form.id || (form.images && form.images.length > 0))
  );

  // Derive the list of spec keys visible in the diff — SPEC_FIELDS (always
  // shown) + any extras the AI returned.
  const allSpecKeys = useMemo(() => {
    if (!ai?.specs) return SPEC_FIELDS;
    const known = new Set(SPEC_FIELDS.map(([k]) => k));
    const extras = Object.keys(ai.specs).filter((k) => !known.has(k));
    return [...SPEC_FIELDS, ...extras.map((k) => [k, k])];
  }, [ai]);

  const openDiff = async () => {
    if (loading || !canRun) return;
    setLoading(true);
    try {
      const opts = {};
      if (form.id) opts.product_id = form.id;
      else if (form.images && form.images.length > 0) opts.image_url = form.images[0];
      const { ai: newAi } = await api.aiRegenerateDetails(opts);
      setAi(newAi);
      // Default selection: any field that actually changed AND is a top-level
      // field the user asked to control. Specs default to unselected.
      const init = {};
      FIELDS.forEach(({ key }) => {
        init[key] = currentAsString(form, key).trim() !== String(newAi[key] || "").trim();
      });
      init.specs = {};
      const aiSpecs = newAi.specs || {};
      const curSpecs = form.specs || {};
      Object.keys(aiSpecs).forEach((k) => {
        init.specs[k] = String(curSpecs[k] || "").trim() !== String(aiSpecs[k] || "").trim();
      });
      setSelection(init);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not regenerate details.");
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setAi(null);
    setSelection({});
  };

  const applySelected = () => {
    if (!ai) return;
    const merge = {};
    let majorChanged = false;
    FIELDS.forEach(({ key }) => {
      if (selection[key] && ai[key] !== undefined) {
        merge[key] = ai[key];
        if (MAJOR_FIELDS.has(key)) majorChanged = true;
      }
    });
    // Merge selected specs into the existing specs object.
    const aiSpecs = ai.specs || {};
    const specSelection = selection.specs || {};
    const anySpecPicked = Object.values(specSelection).some(Boolean);
    if (anySpecPicked) {
      merge.specs = { ...(form.specs || {}) };
      Object.entries(specSelection).forEach(([k, on]) => {
        if (on) merge.specs[k] = aiSpecs[k];
      });
    }
    if (Object.keys(merge).length === 0) {
      toast("Nothing selected — no fields updated.", { icon: "ℹ️" });
      return;
    }
    onMerge?.(merge, { setDraft: majorChanged });
    toast.success(
      majorChanged
        ? `${Object.keys(merge).length} field(s) updated · marked as Draft`
        : `${Object.keys(merge).length} field(s) updated`
    );
    close();
  };

  const toggleAll = (on) => {
    const next = { ...selection, specs: { ...(selection.specs || {}) } };
    FIELDS.forEach(({ key }) => {
      if (ai && currentAsString(form, key).trim() !== String(ai[key] || "").trim()) {
        next[key] = on;
      }
    });
    Object.keys(next.specs).forEach((k) => {
      if (ai && String((form.specs || {})[k] || "").trim() !== String((ai.specs || {})[k] || "").trim()) {
        next.specs[k] = on;
      }
    });
    setSelection(next);
  };

  return (
    <>
      <button
        type="button"
        data-testid="ai-full-regen-btn"
        onClick={openDiff}
        disabled={loading || !canRun}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/15 text-white/80 hover:border-[#D4AF37] hover:text-[#D4AF37] text-xs disabled:opacity-40 disabled:cursor-not-allowed transition"
        title={
          canRun
            ? "Regenerate all AI-authored fields and review the diff before applying."
            : "Add a product photo first."
        }
      >
        {loading ? (
          <RefreshCw size={12} className="animate-spin" />
        ) : (
          <Wand2 size={12} />
        )}
        Regenerate Full Product Details
      </button>

      {ai && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={close}
          data-testid="ai-full-regen-modal"
        >
          <div
            className="bg-[#0f0f0f] border border-white/15 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#0f0f0f] z-10">
              <div>
                <div className="font-serif text-xl text-[#D4AF37]">
                  Review AI-Regenerated Product Details
                </div>
                <div className="text-white/50 text-xs mt-0.5">
                  Tick every field you want to overwrite. Anything you leave unchecked stays as-is.
                  Any major change flips this product to <span className="text-[#D4AF37]">Draft</span>.
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                className="text-white/60 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3 text-[11px] uppercase tracking-widest">
              <button
                type="button"
                onClick={() => toggleAll(true)}
                className="text-[#D4AF37] hover:underline"
              >
                Select all changes
              </button>
              <span className="text-white/20">|</span>
              <button
                type="button"
                onClick={() => toggleAll(false)}
                className="text-white/60 hover:text-white hover:underline"
              >
                Keep all current
              </button>
            </div>

            <div className="p-5 space-y-3">
              {FIELDS.map(({ key, label, type }) => (
                <DiffRow
                  key={key}
                  label={label}
                  current={currentAsString(form, key)}
                  next={ai[key]}
                  selected={Boolean(selection[key])}
                  onToggle={(e) => setSelection((s) => ({ ...s, [key]: e.target.checked }))}
                  isTextarea={type === "textarea"}
                />
              ))}

              <div className="mt-6 mb-2 text-[11px] uppercase tracking-widest text-[#BF9972]">
                Specifications
              </div>
              {allSpecKeys.map(([specKey, specLabel]) => (
                <DiffRow
                  key={`spec-${specKey}`}
                  label={specLabel}
                  current={(form.specs || {})[specKey]}
                  next={(ai.specs || {})[specKey]}
                  selected={Boolean((selection.specs || {})[specKey])}
                  onToggle={(e) =>
                    setSelection((s) => ({
                      ...s,
                      specs: { ...(s.specs || {}), [specKey]: e.target.checked },
                    }))
                  }
                  isTextarea={false}
                />
              ))}
            </div>

            <div className="px-5 py-4 border-t border-white/10 sticky bottom-0 bg-[#0f0f0f] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 text-xs uppercase tracking-widest border border-white/15 text-white/70 hover:border-white/40 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="ai-full-regen-apply"
                onClick={applySelected}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs uppercase tracking-widest bg-[#D4AF37] text-black hover:bg-[#B5952F]"
              >
                <Check size={14} />
                Apply Selected Fields
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
