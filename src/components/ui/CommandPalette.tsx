import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, History, X, BookOpen, Mic, Compass, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const quickActions = [
  { icon: Compass, label: "Go to Guides Hub", href: "/guides", color: "text-accent-blue-neon" },
  { icon: Mic, label: "Open Podcast Feed", href: "/podcast", color: "text-accent-orange" },
];

const topMatches = [
  { icon: BookOpen, label: "Why Does This Type Error?", sub: "Story // TypeScript", href: "/stories/fs-1-why-this-type-error", color: "text-primary" },
  { icon: User, label: "Think on paper, but digital: why I built Soma", sub: "Developer Story", href: "/stories/benjamin-mayanja", color: "text-secondary" },
  { icon: BookOpen, label: "Harness the power of generative AI", sub: "Technical Guide // AI & ML", href: "/guides/generative-ai", color: "text-tertiary" },
];

function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem("recentSearches") || "[]"); } catch { return []; }
}
function saveRecent(searches: string[]) {
  localStorage.setItem("recentSearches", JSON.stringify(searches.slice(0, 5)));
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const submit = useCallback(
    (term: string) => {
      if (!term.trim()) return;
      const updated = [term, ...recent.filter((r) => r !== term)].slice(0, 5);
      setRecent(updated);
      saveRecent(updated);
      onClose();
      navigate(`/search?q=${encodeURIComponent(term)}`);
    },
    [recent, onClose, navigate]
  );

  const removeRecent = (term: string) => {
    const updated = recent.filter((r) => r !== term);
    setRecent(updated);
    saveRecent(updated);
  };

  const hasQuery = query.trim().length > 0;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-32 px-md bg-background/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[680px] bg-surface-container-low border border-border-default rounded-lg shadow-[0_0_40px_-10px_rgba(33,139,255,0.15)] overflow-hidden flex flex-col max-h-[520px]">
        {/* Search Input */}
        <div className="flex items-center px-lg py-md border-b border-border-default bg-surface-container">
          <Search className="w-5 h-5 text-on-surface-muted mr-md" />
          <input
            ref={inputRef}
            autoComplete="off"
            className="flex-1 bg-transparent border-none outline-none focus:ring-0 font-dm-sans text-body-base text-on-background placeholder-on-surface-muted py-sm"
            placeholder="Search stories, guides, and podcasts..."
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(-1); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (selectedIdx >= 0 && hasQuery) {
                  const match = topMatches[selectedIdx];
                  if (match) { onClose(); navigate(match.href); return; }
                }
                submit(query);
              }
              if (e.key === "ArrowDown") setSelectedIdx((i) => Math.min(i + 1, topMatches.length - 1));
              if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, -1)); }
            }}
          />
          <kbd className="bg-surface-variant text-on-surface-muted px-2 py-1 rounded text-[10px] font-bold border border-border-default ml-md">ESC</kbd>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {hasQuery ? (
            <div className="p-lg space-y-sm">
              <div className="flex items-center gap-sm pb-xs">
                <div className="w-8 h-[2px] bg-accent-blue-neon" />
                <h3 className="font-sora text-label-caps text-on-surface-muted uppercase">Top Matches</h3>
              </div>
              {topMatches.map((match, i) => (
                <div
                  key={match.label}
                  onClick={() => { onClose(); navigate(match.href); }}
                  className={cn(
                    "group flex items-center justify-between p-md hover:bg-surface-variant border border-transparent hover:border-border-default transition-all cursor-pointer rounded",
                    i === selectedIdx && "bg-surface-variant border-border-default"
                  )}
                >
                  <div className="flex items-center gap-md">
                    <match.icon className={cn("w-5 h-5", match.color)} />
                    <div>
                      <p className="font-dm-sans text-on-background group-hover:text-on-surface font-semibold">{match.label}</p>
                      <p className="text-xs text-on-surface-muted">{match.sub}</p>
                    </div>
                  </div>
                  <CornerDownLeft className="w-4 h-4 text-on-surface-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border-default/50">
              {/* Quick Actions */}
              <div className="p-lg space-y-sm">
                <div className="flex items-center gap-sm pb-xs">
                  <div className="w-8 h-[2px] bg-secondary" />
                  <h3 className="font-sora text-label-caps text-on-surface-muted uppercase">Quick Actions</h3>
                </div>
                <div className="grid grid-cols-2 gap-sm">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => { onClose(); navigate(action.href); }}
                      className="flex items-center gap-md p-md bg-surface-container border border-border-default hover:bg-surface-bright hover:border-on-surface-muted transition-all text-left rounded"
                    >
                      <action.icon className={cn("w-5 h-5", action.color)} />
                      <span className="font-sora text-metadata-tag text-on-surface">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recent Searches */}
              {recent.length > 0 && (
                <div className="p-lg space-y-sm">
                  <div className="flex items-center gap-sm pb-xs">
                    <div className="w-8 h-[2px] bg-on-surface-muted" />
                    <h3 className="font-sora text-label-caps text-on-surface-muted uppercase">Recent Searches</h3>
                  </div>
                  <ul className="space-y-1">
                    {recent.map((term) => (
                      <li
                        key={term}
                        onClick={() => { setQuery(term); submit(term); }}
                        className="group flex items-center justify-between p-md hover:bg-surface-variant transition-all cursor-pointer rounded"
                      >
                        <div className="flex items-center gap-md">
                          <History className="w-4 h-4 text-on-surface-muted" />
                          <span className="font-dm-sans text-on-surface group-hover:text-on-background">{term}</span>
                        </div>
                        <X
                          className="w-4 h-4 text-on-surface-muted opacity-0 group-hover:opacity-100 cursor-pointer hover:text-error"
                          onClick={(e) => { e.stopPropagation(); removeRecent(term); }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-lg py-sm bg-surface-lowest border-t border-border-default flex items-center justify-between text-[11px] font-sora text-on-surface-muted">
          <div className="flex items-center gap-md">
            <span className="flex items-center gap-xs"><kbd className="bg-surface-variant px-1 rounded border border-border-default">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-xs"><kbd className="bg-surface-variant px-1 rounded border border-border-default">↵</kbd> select</span>
            <span className="flex items-center gap-xs"><kbd className="bg-surface-variant px-1 rounded border border-border-default">Esc</kbd> close</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest">Soma Search</span>
        </div>
      </div>
    </div>
  );
}
