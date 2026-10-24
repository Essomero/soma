import { useState, useEffect, useRef, useCallback } from "react";
import { Highlighter, MessageSquare, X, Brain, ListCollapse, Bot, ChevronDown } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  free?: boolean;
}

interface SelectionToolbarProps {
  visible: boolean;
  x: number;
  y: number;
  onHighlight: (color: string) => void;
  onComment: () => void;
  onExplain?: () => void;
  onSummarize?: () => void;
  onDismiss: () => void;
  models?: ModelInfo[];
  aiModel?: string;
  aiProvider?: string;
  onAiModelChange?: (modelId: string, provider?: string) => void;
  /**
   * When true the AI actions still render but are disabled with an
   * explanatory tooltip. Missing keys hide nothing: the reader sees
   * the feature exists and what would unlock it.
   */
  aiDisabled?: boolean;
}

const COLORS = [
  { value: "yellow", label: "Yellow", class: "bg-amber-400/60 border-amber-400" },
  { value: "green", label: "Green", class: "bg-emerald-400/60 border-emerald-400" },
  { value: "blue", label: "Blue", class: "bg-sky-400/60 border-sky-400" },
  { value: "pink", label: "Pink", class: "bg-pink-400/60 border-pink-400" },
];

export default function SelectionToolbar({
  visible,
  x,
  y,
  onHighlight,
  onComment,
  onExplain,
  onSummarize,
  onDismiss,
  models,
  aiModel,
  aiProvider,
  onAiModelChange,
  aiDisabled = false,
}: SelectionToolbarProps) {
  const [showColors, setShowColors] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [dropdownAlign, setDropdownAlign] = useState<"left" | "right" | "center">("right");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);

  // Dismiss on Esc
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, onDismiss]);

  // Dismiss on click outside
  useEffect(() => {
    if (!visible) return;
    const readyAt = Date.now() + 200;
    const handler = (e: MouseEvent) => {
      if (Date.now() < readyAt) return;
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setTimeout(() => onDismiss(), 50);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [visible, onDismiss]);

  // Close model menu on click outside + pick alignment
  useEffect(() => {
    if (!showModelMenu) return;
    if (modelBtnRef.current) {
      const rect = modelBtnRef.current.getBoundingClientRect();
      const menuWidth = 200;
      const spaceRight = window.innerWidth - rect.left;
      const spaceLeft = rect.right;
      if (spaceRight < menuWidth && spaceLeft >= menuWidth) {
        setDropdownAlign("right");
      } else if (spaceRight >= menuWidth && spaceLeft >= menuWidth) {
        setDropdownAlign("center");
      } else {
        setDropdownAlign("left");
      }
    }
    const handler = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showModelMenu]);

  const handleHighlight = useCallback((color: string) => {
    onHighlight(color);
    setShowColors(false);
  }, [onHighlight]);

  if (!visible) return null;

  const toolbarY = Math.max(y - 40, 8);
  const hasAiActions = !!(onExplain || onSummarize);
  const currentModel = models?.find(m => m.id === aiModel);

  // Clamp horizontal position so toolbar doesn't overflow viewport
  const toolbarRefWidth = 320; // approximate max width in px
  const clampedX = Math.max(4, Math.min(x, window.innerWidth - toolbarRefWidth));

  return (
    <div
      ref={toolbarRef}
      className="fixed z-40 flex items-center gap-0 bg-surface border border-border-default rounded-xl shadow-2xl"
      style={{ left: clampedX, top: toolbarY, maxWidth: `calc(100vw - 8px)` }}
    >
      <button
        onClick={() => setShowColors(!showColors)}
        className="flex items-center gap-xs px-sm sm:px-md py-sm font-sora text-[11px] text-on-surface hover:bg-surface-container transition-colors border-r border-border-default"
        title="Highlight"
      >
        <Highlighter className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">Highlight</span>
      </button>

      {showColors && (
        <div className="flex items-center gap-0 border-r border-border-default">
          {COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => handleHighlight(c.value)}
              className={`w-7 h-7 sm:w-8 sm:h-8 mx-0.5 sm:mx-1 rounded-md border-2 ${c.class} hover:scale-110 transition-transform`}
              title={c.label}
            />
          ))}
        </div>
      )}

      {onExplain && (
        <span title={aiDisabled ? "Add an AI provider key to enable" : "Explain with AI"} className="inline-flex">
        <button
          onClick={onExplain}
          disabled={aiDisabled}
          className="flex items-center gap-xs px-sm sm:px-md py-sm font-sora text-[11px] text-on-surface hover:bg-surface-container transition-colors border-r border-border-default disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Brain className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Explain</span>
        </button>
        </span>
      )}

      {onSummarize && (
        <span title={aiDisabled ? "Add an AI provider key to enable" : "Summarize with AI"} className="inline-flex">
        <button
          onClick={onSummarize}
          disabled={aiDisabled}
          className="flex items-center gap-xs px-sm sm:px-md py-sm font-sora text-[11px] text-on-surface hover:bg-surface-container transition-colors border-r border-border-default disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ListCollapse className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Summarize</span>
        </button>
        </span>
      )}

      <button
        onClick={onComment}
        className="flex items-center gap-xs px-sm sm:px-md py-sm font-sora text-[11px] text-on-surface hover:bg-surface-container transition-colors"
        title="Comment"
      >
        <MessageSquare className="w-3.5 h-3.5 text-primary" />
        <span className="hidden sm:inline">Comment</span>
      </button>

      {hasAiActions && models && models.length > 0 && onAiModelChange && (
        <div className="relative flex items-center border-l border-border-default" ref={modelMenuRef}>
          <button
            ref={modelBtnRef}
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-xs px-sm py-sm text-on-surface-muted hover:text-on-surface transition-colors"
            title={currentModel?.label || "AI model"}
          >
            <Bot className="w-3.5 h-3.5" />
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
          {showModelMenu && (
            <div className={`absolute top-full mt-1 bg-surface border border-border-default rounded-lg shadow-xl z-50 py-xs min-w-[180px] max-h-[260px] overflow-y-auto thin-scrollbar ${
              dropdownAlign === "right" ? "right-0" : dropdownAlign === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
            }`}>
              {(() => {
                const d = models.filter(m => m.provider === "deepseek"), g = models.filter(m => m.provider === "gemini"),
                  o = models.filter(m => m.provider === "openrouter"), gr = models.filter(m => m.provider === "groq"),
                  ce = models.filter(m => m.provider === "cerebras"),
                  mt = models.filter(m => m.provider === "meta"),
                  st = models.filter(m => m.provider === "straitly");
                return (<>
                  {d.length > 0 && (<><SectionHeader label="DeepSeek" dotColor="#b8c3ff" />{d.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { onAiModelChange?.(m.id, m.provider); setShowModelMenu(false); }} className={`w-full text-left px-md py-xs font-sora text-[11px] hover:bg-surface-container transition-colors ${m.id === aiModel && (!aiProvider || m.provider === aiProvider) ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                  {g.length > 0 && (<><SectionHeader label="Gemini" dotColor="#47e175" />{g.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { onAiModelChange?.(m.id, m.provider); setShowModelMenu(false); }} className={`w-full text-left px-md py-xs font-sora text-[11px] hover:bg-surface-container transition-colors flex items-center justify-between ${m.id === aiModel && (!aiProvider || m.provider === aiProvider) ? "text-brand font-medium" : "text-on-surface"}`}><span className="truncate mr-sm">{m.label}</span>{m.free && <span className="text-[9px] text-accent-orange flex-shrink-0">FREE</span>}</button>)}</>)}
                  {gr.length > 0 && (<><SectionHeader label="Groq" dotColor="#fde68a" />{gr.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { onAiModelChange?.(m.id, m.provider); setShowModelMenu(false); }} className={`w-full text-left px-md py-xs font-sora text-[11px] hover:bg-surface-container transition-colors ${m.id === aiModel && (!aiProvider || m.provider === aiProvider) ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                  {ce.length > 0 && (<><SectionHeader label="Cerebras" dotColor="#a78bfa" />{ce.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { onAiModelChange?.(m.id, m.provider); setShowModelMenu(false); }} className={`w-full text-left px-md py-xs font-sora text-[11px] hover:bg-surface-container transition-colors ${m.id === aiModel && (!aiProvider || m.provider === aiProvider) ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                  {mt.length > 0 && (<><SectionHeader label="Meta" dotColor="#0866FF" />{mt.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { onAiModelChange?.(m.id, m.provider); setShowModelMenu(false); }} className={`w-full text-left px-md py-xs font-sora text-[11px] hover:bg-surface-container transition-colors ${m.id === aiModel && (!aiProvider || m.provider === aiProvider) ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                  {st.length > 0 && (<><SectionHeader label="Straightly" dotColor="#06B6D4" />{st.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { onAiModelChange?.(m.id, m.provider); setShowModelMenu(false); }} className={`w-full text-left px-md py-xs font-sora text-[11px] hover:bg-surface-container transition-colors ${m.id === aiModel && (!aiProvider || m.provider === aiProvider) ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                  {o.filter(m => m.free).length > 0 && (<><SectionHeader label="OpenRouter · Free" dotColor="#fb923c" />{o.filter(m => m.free).map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { onAiModelChange?.(m.id, m.provider); setShowModelMenu(false); }} className={`w-full text-left px-md py-xs font-sora text-[11px] hover:bg-surface-container transition-colors flex items-center justify-between ${m.id === aiModel && (!aiProvider || m.provider === aiProvider) ? "text-brand font-medium" : "text-on-surface"}`}><span className="truncate mr-sm">{m.label}</span>{m.free && <span className="text-[9px] text-accent-orange flex-shrink-0">FREE</span>}</button>)}</>)}
                  {o.filter(m => !m.free).length > 0 && (<><SectionHeader label="OpenRouter · Paid" dotColor="#fb923c" />{o.filter(m => !m.free).map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { onAiModelChange?.(m.id, m.provider); setShowModelMenu(false); }} className={`w-full text-left px-md py-xs font-sora text-[11px] hover:bg-surface-container transition-colors ${m.id === aiModel && (!aiProvider || m.provider === aiProvider) ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                </>);
              })()}
            </div>
          )}
        </div>
      )}

      <button
        onMouseDown={(e) => { e.preventDefault(); onDismiss(); }}
        className="flex items-center px-sm py-sm text-on-surface-muted hover:text-on-surface transition-colors border-l border-border-default"
        title="Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
