import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, Check } from "lucide-react";

export interface SortOption {
  value: string;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title", label: "Title A–Z" },
];

interface SortControlProps {
  value: string;
  onChange: (value: string) => void;
  options?: SortOption[];
}

// Custom dropdown: trigger shows a static SORT label, the open menu marks
// the active option with a check. Closes on outside click, Escape, or pick.
export default function SortControl({ value, onChange, options = SORT_OPTIONS }: SortControlProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-sm font-sora text-label-caps text-on-surface-muted uppercase tracking-widest hover:text-primary transition-colors"
      >
        <ArrowUpDown className="w-4 h-4" />
        Sort
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-52 z-50 rounded-lg border border-border-default bg-surface shadow-xl py-xs"
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => pick(opt.value)}
                className={`w-full flex items-center gap-sm px-md py-sm font-sora text-xs uppercase tracking-widest transition-colors ${
                  selected ? "text-brand font-medium" : "text-on-surface hover:bg-surface-container"
                }`}
              >
                <span className="w-4 h-4 inline-flex items-center justify-center">
                  {selected && <Check className="w-4 h-4" />}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
