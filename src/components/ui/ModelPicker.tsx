import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { writeModelPref } from "@/lib/modelPref";

export interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  free?: boolean;
}

interface ModelPickerProps {
  models: ModelInfo[];
  selectedModel: string;
  selectedProvider: string;
  onChange: (modelId: string, provider: string) => void;
  disabled?: boolean;
  /** When true, models are unavailable — shown in trigger label. */
  unavailable?: boolean;
  /** Extra trigger button classes. */
  className?: string;
  /** Alignment of the dropdown panel relative to the trigger. */
  align?: "left" | "right";
  /** Override the trigger label. Falls back to the selected model label. */
  triggerLabel?: string;
}

// Ordered provider list for display.
const PROVIDER_ORDER = [
  "deepseek",
  "gemini",
  "openrouter",
  "groq",
  "cerebras",
  "straitly",
];

const PROVIDER_COLORS: Record<string, string> = {
  deepseek: "#b8c3ff",
  gemini: "#47e175",
  openrouter: "#c084fc",
  groq: "#f97316",
  cerebras: "#06b6d4",
  straitly: "#f472b6",
};

function providerLabel(provider: string): string {
  switch (provider) {
    case "deepseek":
      return "DeepSeek";
    case "gemini":
      return "Gemini";
    case "openrouter":
      return "OpenRouter";
    case "groq":
      return "Groq";
    case "cerebras":
      return "Cerebras";
    case "straitly":
      return "Straitly";
    default:
      return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}

/**
 * Model picker dropdown that groups models by provider with visual
 * section headers and a colored dot per provider.
 *
 * Keyboard: ArrowUp/Down to navigate, Enter/Space to select, Escape to close.
 * Click-outside closes the dropdown.
 */
export function ModelPicker({
  models,
  selectedModel,
  selectedProvider,
  onChange,
  disabled,
  unavailable,
  className = "",
  align = "left",
  triggerLabel,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build grouped option list.
  // Returns { provider, models }[] in PROVIDER_ORDER, with unknown
  // providers appended alphabetically.
  const grouped = (() => {
    const byProvider = new Map<string, ModelInfo[]>();
    for (const m of models) {
      const list = byProvider.get(m.provider);
      if (list) list.push(m);
      else byProvider.set(m.provider, [m]);
    }
    const ordered: { provider: string; models: ModelInfo[] }[] = [];
    const seen = new Set<string>();
    for (const p of PROVIDER_ORDER) {
      const list = byProvider.get(p);
      if (list) {
        ordered.push({ provider: p, models: list });
        seen.add(p);
      }
    }
    // Append any unlisted providers alphabetically.
    for (const [p, list] of byProvider) {
      if (!seen.has(p)) {
        ordered.push({ provider: p, models: list });
      }
    }
    return ordered;
  })();

  // Flatten for keyboard nav indexing.
  const flatOptions = grouped.flatMap((g) => g.models);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Flip dropdown upward when there isn't enough room below the trigger.
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const trigger = containerRef.current.querySelector("button");
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    // Estimate dropdown max height (matches the max-h-[400px] on the list).
    // Include the mt-1 gap (4px) + border (1px each side) ≈ 410px.
    setOpenUpward(spaceBelow < 410);
  }, [open]);

  // Reset active index when opening.
  useEffect(() => {
    if (open) {
      const idx = flatOptions.findIndex(
        (m) => m.id === selectedModel && m.provider === selectedProvider,
      );
      setActiveIdx(idx >= 0 ? idx : 0);
    } else {
      setActiveIdx(-1);
    }
  }, [open, flatOptions, selectedModel, selectedProvider]);

  const selected = flatOptions.find(
    (m) => m.id === selectedModel && m.provider === selectedProvider,
  );

  function commit(idx: number) {
    const m = flatOptions[idx];
    if (!m) return;
    writeModelPref(m.id);
    onChange(m.id, m.provider);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled || unavailable) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(flatOptions.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (activeIdx >= 0 && activeIdx < flatOptions.length) {
        commit(activeIdx);
      }
      return;
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled || unavailable}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && !unavailable && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={`inline-flex items-center gap-sm px-md py-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      >
        <span className="truncate">
          {triggerLabel ?? (selected ? selected.label : unavailable ? "No models available" : "Loading...")}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-on-surface-muted shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className={`absolute z-50 min-w-[200px] sm:min-w-[260px] max-h-[400px] overflow-y-auto bg-surface border border-border-default rounded-lg shadow-xl py-xs ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          } ${align === "right" ? "right-0" : "left-0"}`}
        >
          {grouped.map((group) => (
            <div key={group.provider}>
              <SectionHeader
                label={providerLabel(group.provider)}
                dotColor={PROVIDER_COLORS[group.provider] || "#999"}
              />
              {group.models.map((m) => {
                const isActive =
                  m.id === selectedModel && m.provider === selectedProvider;
                const flatIndex = flatOptions.indexOf(m);
                return (
                  <button
                    key={`${m.provider}/${m.id}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      writeModelPref(m.id);
                      onChange(m.id, m.provider);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setActiveIdx(flatIndex)}
                    className={`w-full text-left px-md py-sm font-dm-sans text-sm transition-colors ${
                      isActive
                        ? "text-primary bg-surface-container font-medium"
                        : activeIdx === flatIndex
                          ? "bg-surface-container text-on-surface"
                          : "text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
