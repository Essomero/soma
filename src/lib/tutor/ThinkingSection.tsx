import { useState, useId } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function ThinkingSection({ reasoning }: { reasoning: string }) {
  const [open, setOpen] = useState(false);
  const toggleId = useId();
  return (
    <div className="mb-sm border border-brand/10 rounded-lg overflow-hidden">
      <button
        type="button"
        id={toggleId}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={toggleId + "-content"}
        className="flex items-center gap-xs w-full px-md py-xs bg-brand/[0.03] hover:bg-brand/[0.06] transition-colors text-left"
      >
        {open ? <ChevronDown className="w-3 h-3 text-brand/70" /> : <ChevronRight className="w-3 h-3 text-brand/70" />}
        <span className="font-sora text-[10px] uppercase tracking-widest text-brand/70">Thought</span>
      </button>
      {open && (
        <div id={toggleId + "-content"} role="region" aria-labelledby={toggleId} className="px-md py-sm text-[11px] font-dm-sans text-brand/60 leading-relaxed whitespace-pre-wrap border-t border-brand/10 max-h-40 overflow-y-auto thin-scrollbar">
          {reasoning}
        </div>
      )}
    </div>
  );
}
