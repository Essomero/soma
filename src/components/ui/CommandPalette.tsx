import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, History, X, BookOpen, Mic, Compass, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface LiveResult {
  slug: string;
  type: string;
  title: string;
  excerpt: string;
  href: string;
}

const quickActions = [
  { icon: Compass, label: "Go to Guides Hub", href: "/guides", color: "text-accent-blue-neon" },
  { icon: Mic, label: "Open Podcast Feed", href: "/podcast", color: "text-accent-orange" },
];

const TYPE_ROUTES: Record<string, string> = {
  story: "stories",
  guide: "guides",
  doc: "docs",
  course: "courses",
  book: "books",
  series: "series",
  test: "tests",
  featured: "featured",
  podcast: "podcast",
};

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
  const [liveResults, setLiveResults] = useState<LiveResult[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(-1);
      setLiveResults([]);
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

  // ── Debounced live search via FTS5 API ─────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) {
      setLiveResults([]);
      setLiveLoading(false);
      return;
    }
    setLiveLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/content?type=all&q=${encodeURIComponent(trimmed)}&limit=5`);
        if (!r.ok) { setLiveResults([]); return; }
        const data = await r.json();
        setLiveResults(
          (data || []).map((item: any) => ({
            slug: item.slug,
            type: item.type,
            title: item.title,
            excerpt: item.excerpt?.slice(0, 100) || "",
            href: `/${TYPE_ROUTES[item.type] || item.type}/${item.slug}`,
          }))
        );
      } catch {
        setLiveResults([]);
      } finally {
        setLiveLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

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
  const displayItems = hasQuery ? liveResults : [];
  const totalItems = displayItems.length;

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
                if (selectedIdx >= 0 && hasQuery && displayItems[selectedIdx]) {
                  const match = displayItems[selectedIdx];
                  onClose();
                  navigate(match.href);
                  return;
                }
                submit(query);
              }
              if (e.key === "ArrowDown") setSelectedIdx((i) => Math.min(i + 1, Math.max(totalItems - 1, 0)));
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
                <h3 className="font-sora text-label-caps text-on-surface-muted uppercase">
                  {liveLoading ? "Searching..." : "Results"}
                </h3>
              </div>
              {liveLoading && liveResults.length === 0 ? (
                <div className="space-y-1 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-md p-md rounded">
                      <div className="w-5 h-5 rounded bg-surface-container-high shrink-0" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 w-3/4 bg-surface-container-high rounded" />
                        <div className="h-3 w-1/2 bg-surface-container-high rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : displayItems.length === 0 ? (
                <p className="font-dm-sans text-on-surface-muted text-sm py-md text-center">
                  No results — press Enter to search all content
                </p>
              ) : (
                displayItems.map((result, i) => (
                  <div
                    key={result.slug}
                    onClick={() => { onClose(); navigate(result.href); }}
                    className={cn(
                      "group flex items-center justify-between p-md hover:bg-surface-variant border border-transparent hover:border-border-default transition-all cursor-pointer rounded",
                      i === selectedIdx && "bg-surface-variant border-border-default"
                    )}
                  >
                    <div className="flex items-center gap-md min-w-0">
                      <BookOpen className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="font-dm-sans text-on-background group-hover:text-on-surface font-semibold truncate">
                          {result.title}
                        </p>
                        <p className="text-xs text-on-surface-muted truncate capitalize">
                          {result.type} — {result.excerpt}
                        </p>
                      </div>
                    </div>
                    <CornerDownLeft className="w-4 h-4 text-on-surface-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                ))
              )}
              {displayItems.length > 0 && (
                <div
                  onClick={() => submit(query)}
                  className="flex items-center justify-center gap-sm p-md mt-sm bg-surface-container hover:bg-surface-bright rounded cursor-pointer transition-colors border border-dashed border-border-default"
                >
                  <Search className="w-4 h-4 text-on-surface-muted" />
                  <span className="font-sora text-label-caps text-on-surface-muted">
                    Search all content for "{query}"
                  </span>
                </div>
              )}
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
