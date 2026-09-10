import React, { useMemo, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";

const starter = {
  role: "assistant",
  content: "Tell me what is wrong with this draft in normal language. I will revise the same product using its images, the uploaded conversation and the category SOP.",
};

export default function ProductDraftConversation({
  product,
  imageFilenames = [],
  onApply,
  compact = false,
}) {
  const [messages, setMessages] = useState([starter]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  const sessionId = useMemo(
    () => `draft-review-${product?.sku || "new"}-${Date.now()}`,
    [product?.sku],
  );

  if (!product) return null;

  const send = async () => {
    const instruction = input.trim();
    if (!instruction || busy) return;
    const userMessage = { role: "user", content: instruction };
    const history = [...messages, userMessage];
    setMessages(history);
    setInput("");
    setBusy(true);
    try {
      const response = await api.aiReviseProductConversation({
        product,
        instruction,
        history: history.map(({ role, content }) => ({ role, content })),
        image_filenames: imageFilenames,
        session_id: sessionId,
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.message || "I revised the product draft.",
        },
      ]);
      if (response.action === "revision" && response.product) {
        onApply?.(response.product, {
          validation: response.validation || [],
          warnings: response.warnings || [],
        });
        if ((response.validation || []).length) {
          toast.warning("Draft revised, but SOP validation still needs attention");
        } else {
          toast.success("Draft revised and SOP validation passed");
        }
      }
    } catch (error) {
      const message =
        error?.response?.data?.detail || error.message || "Could not revise the draft";
      setMessages((current) => [...current, { role: "assistant", content: message }]);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-3 inline-flex items-center gap-2 border border-[#D4AF37]/40 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#D4AF37]"
        data-testid="open-product-correction"
      >
        <MessageSquare size={12} />
        Correct this draft with AI
      </button>
    );
  }

  return (
    <div className={`border border-[#D4AF37]/35 bg-black/35 ${compact ? "mt-3 p-3" : "p-4"}`} data-testid="product-draft-conversation">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]">
        <MessageSquare size={13} />
        Product correction conversation
      </div>
      <div className={`mt-3 space-y-2 overflow-y-auto ${compact ? "max-h-40" : "max-h-64"}`}>
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`text-xs leading-relaxed p-2 ${message.role === "user" ? "ml-6 bg-[#D4AF37]/15 text-white" : "mr-6 bg-white/5 text-white/75"}`}
          >
            <span className="block text-[9px] uppercase tracking-widest text-white/35 mb-1">
              {message.role === "user" ? "You" : "AI reviewer"}
            </span>
            {message.content}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder='For example: "It has 6 lights, not 9. Keep the title long and do not invent the family."'
          rows={compact ? 2 : 3}
          className="min-w-0 flex-1 resize-none bg-black border border-white/15 px-3 py-2 text-xs"
          disabled={busy}
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !input.trim()}
          className="self-stretch border border-[#D4AF37]/50 px-3 text-[#D4AF37] disabled:opacity-40"
          aria-label="Send product correction"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-white/35">
        Corrections revise this same draft. Images, SKU, Draft status, Price on Request and SOP safeguards remain locked.
      </p>
    </div>
  );
}
