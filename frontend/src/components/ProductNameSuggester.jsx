import React, { useState } from "react";
import { Sparkles, X, Check, Info, RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

/**
 * Sits directly under the Name input inside the Admin product form.
 *
 *   • Inline "chips" for quick selection.
 *   • "See all rationales" opens a modal with 5 named cards, full reasoning
 *     and per-card Apply buttons.
 *
 * The backend guarantees the 5 suggestions are unique against the current
 * catalogue, so no client-side dedupe is needed.
 */
export default function ProductNameSuggester({ form, onApply }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const canSuggest = Boolean(
    (form && (form.id || (form.images && form.images.length > 0)))
  );

  const fetchSuggestions = async () => {
    if (loading) return;
    if (!canSuggest) {
      toast.error("Add a product photo first so the AI has something to look at.");
      return;
    }
    setLoading(true);
    try {
      // If we already have a product_id, backend will pull the primary image.
      // Otherwise, send the first image_url from the working draft.
      const opts = {};
      if (form.id) opts.product_id = form.id;
      else if (form.images && form.images.length > 0) opts.image_url = form.images[0];
      // Include the current in-progress name in the avoid list so the AI has
      // to actually change it (unless the field is empty).
      if (form.name && form.name.trim()) opts.exclude_names = [form.name.trim()];
      const { suggestions: s } = await api.aiNameSuggestions(opts);
      if (!s || s.length === 0) {
        toast.error("The AI could not produce fresh unique names. Please try again.");
        return;
      }
      setSuggestions(s);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not fetch suggestions.");
    } finally {
      setLoading(false);
    }
  };

  const apply = (name) => {
    onApply(name);
    setModalOpen(false);
    toast.success(`Name updated to "${name}"`);
  };

  return (
    <div className="mt-1.5">
      {/* Toolbar row */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          data-testid="ai-name-suggest-btn"
          onClick={fetchSuggestions}
          disabled={loading || !canSuggest}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          {suggestions.length > 0 ? "Regenerate Names" : "Suggest Names"}
        </button>
        {suggestions.length > 0 && (
          <button
            type="button"
            data-testid="ai-name-see-all-btn"
            onClick={() => setModalOpen(true)}
            className="text-white/60 hover:text-[#D4AF37] underline underline-offset-4"
          >
            See all rationales →
          </button>
        )}
        {!canSuggest && (
          <span className="text-white/40 text-[11px]">
            Upload a product photo to enable AI naming.
          </span>
        )}
      </div>

      {/* Inline chips */}
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" data-testid="ai-name-chips">
          {suggestions.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => apply(s.name)}
              title={s.rationale}
              className="group inline-flex items-center gap-1 max-w-full px-2.5 py-1 border border-white/15 hover:border-[#D4AF37] hover:bg-[#D4AF37]/5 text-[11px] text-white/80 hover:text-[#D4AF37] transition"
            >
              <Check size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
          data-testid="ai-name-modal"
        >
          <div
            className="bg-[#0f0f0f] border border-white/15 max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-[#0f0f0f]">
              <div>
                <div className="font-serif text-xl text-[#D4AF37]">Suggested Product Names</div>
                <div className="text-white/50 text-xs mt-0.5">Each name is grounded in a visible design feature and is unique against your catalogue.</div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-white/60 hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {suggestions.map((s, idx) => (
                <div
                  key={s.name}
                  className="border border-white/10 hover:border-[#D4AF37]/50 p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-[#BF9972]">#{idx + 1}</span>
                        <div className="font-serif text-lg text-white">{s.name}</div>
                      </div>
                      <div className="mt-2 text-white/60 text-xs flex items-start gap-1.5">
                        <Info size={12} className="mt-0.5 flex-shrink-0 text-[#BF9972]" />
                        <span>{s.rationale}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => apply(s.name)}
                      data-testid={`ai-name-apply-${idx}`}
                      className="flex-shrink-0 px-3 py-1.5 text-[11px] uppercase tracking-widest border border-[#D4AF37]/60 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={fetchSuggestions}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2 border border-white/15 text-white/70 hover:border-[#D4AF37] hover:text-[#D4AF37] disabled:opacity-40"
                >
                  {loading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Generate 5 More
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
