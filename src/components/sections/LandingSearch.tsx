import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, Command, StickyNote, BookOpen, Mic, Bookmark, Compass, Loader2 } from "lucide-react";
import { fetchNotesSearch } from "@/lib/notes";
import { createNote } from "@/lib/notes";
import { cn } from "@/lib/utils";
import type { NoteArticle } from "@/types";

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
  topic: "topics",
};

const TYPE_ICONS: Record<string, typeof BookOpen> = {
  story: BookOpen,
  guide: Bookmark,
  doc: BookOpen,
  course: BookOpen,
  book: BookOpen,
  series: BookOpen,
  test: Compass,
  featured: BookOpen,
  podcast: Mic,
  topic: Compass,
  note: StickyNote,
};

const TYPE_COLORS: Record<string, string> = {
  story: "text-primary",
  guide: "text-secondary",
  doc: "text-on-surface-muted",
  note: "text-accent-blue-neon",
  podcast: "text-accent-orange",
};

/** True on macOS/iOS — shows ⌘ in keyboard hints; shows Ctrl elsewhere. */
const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "\u2318" : "Ctrl";

interface LiveResult {
  slug: string;
  type: string;
  title: string;
  excerpt: string;
  href: string;
}

export default function LandingSearch() {
  const [query, setQuery] = useState("");
  const [contentResults, setContentResults] = useState<LiveResult[]>([]);
  const [noteResults, setNoteResults] = useState<LiveResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const navigate = useNavigate();

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  // Combined display items: content results first, then notes.
  const combinedResults = [...contentResults, ...noteResults];
  // "Create a note" always appears when there's text, regardless of results.
  const showCreateOption = hasQuery;
  // Total selectable items: results + 1 create option when query present.
  const totalItems = combinedResults.length + (showCreateOption ? 1 : 0);

  // ── Debounced multi-source search ─────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!trimmed) {
      setContentResults([]);
      setNoteResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [apiData, notes] = await Promise.all([
          fetch(`/api/content?type=all&q=${encodeURIComponent(trimmed)}&limit=5`).then((r) =>
            r.ok ? r.json() : []
          ),
          fetchNotesSearch(trimmed).catch(() => [] as NoteArticle[]),
        ]);

        setContentResults(
          (apiData || []).map((item: any) => ({
            slug: item.slug,
            type: item.type,
            title: item.title,
            excerpt: item.excerpt?.slice(0, 120) || "",
            href: `/${TYPE_ROUTES[item.type] || item.type}/${item.slug}`,
          }))
        );

        setNoteResults(
          (notes || []).map((n) => ({
            slug: n.slug,
            type: "note",
            title: n.title,
            excerpt: n.content?.slice(0, 120).replace(/#{1,6}\s/g, "").trim() || "",
            href: `/notes/${n.slug}`,
          }))
        );
      } catch {
        setContentResults([]);
        setNoteResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(debounceRef.current);
    };
  }, [trimmed]);

  const submitSearch = useCallback(
    (term: string) => {
      if (!term.trim()) return;
      navigate(`/search?q=${encodeURIComponent(term)}`);
    },
    [navigate]
  );

  // ── Canvas shooting star ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const later = (fn: () => void, ms: number) => {
      const id = setTimeout(() => { if (!cancelled) fn(); }, ms);
      timeouts.push(id);
    };

    const canvas = document.getElementById("shooting-star-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const parent = canvas.parentElement!;

    const resize = () => { canvas.width = parent.offsetWidth; canvas.height = parent.offsetHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    const ctx = canvas.getContext("2d")!;
    let animId = 0;

    let active = false;
    let sx = 0, sy = 0, svx = 0, svy = 0, sage = 0;

    const spawn = () => {
      // Pick a random edge: 0=top, 1=right, 2=bottom, 3=left
      const edge = Math.floor(Math.random() * 4);
      const t = Math.random(); // position along the edge (0–1)
      const angleRad = (20 + Math.random() * 30) * (Math.PI / 180); // 20–50° from horizontal
      const speed = 500 + Math.random() * 300;

      switch (edge) {
        case 0: // top edge → shoots down-left or down-right
          sx = canvas.width * (0.1 + t * 0.8);
          sy = canvas.height * (0.02 + Math.random() * 0.06);
          svx = (Math.random() > 0.5 ? -1 : 1) * Math.cos(angleRad) * speed;
          svy = Math.sin(angleRad) * speed;
          break;
        case 1: // right edge → shoots leftward
          sx = canvas.width * (0.92 + Math.random() * 0.08);
          sy = canvas.height * (0.05 + t * 0.4);
          svx = -Math.cos(angleRad) * speed;
          svy = (Math.random() - 0.5) * Math.sin(angleRad) * speed * 0.8;
          break;
        case 2: // bottom edge → shoots upward (rare)
          sx = canvas.width * (0.1 + t * 0.8);
          sy = canvas.height * (0.92 + Math.random() * 0.08);
          svx = (Math.random() - 0.5) * Math.cos(angleRad) * speed * 0.6;
          svy = -Math.sin(angleRad) * speed;
          break;
        default: // left edge → shoots rightward
          sx = canvas.width * (0 + Math.random() * 0.08);
          sy = canvas.height * (0.05 + t * 0.4);
          svx = Math.cos(angleRad) * speed;
          svy = (Math.random() - 0.5) * Math.sin(angleRad) * speed * 0.8;
          break;
      }
      sage = 0;
      active = true;
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (active) {
        sx += svx / 60;
        sy += svy / 60;
        sage += 1 / 60;

        const len = 70;
        const nx = svx / Math.hypot(svx, svy);
        const ny = svy / Math.hypot(svx, svy);

        // Trail gradient — white at head, transparent at tail
        const grad = ctx.createLinearGradient(sx, sy, sx - nx * len, sy - ny * len);
        grad.addColorStop(0, "rgba(255,255,255,0.9)");
        grad.addColorStop(0.5, "rgba(255,255,255,0.25)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - nx * len, sy - ny * len);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Star head
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        // Glow
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fill();

        // Despawn when off-screen or after 2s
        if (sx < -150 || sx > canvas.width + 150 || sy < -150 || sy > canvas.height + 150 || sage > 2) {
          active = false;
          later(spawn, 8000 + Math.random() * 7000);
        }
      }

      animId = requestAnimationFrame(tick);
    };

    later(spawn, 3000);
    animId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      timeouts.forEach(clearTimeout);
      ro.disconnect();
    };
  }, []);

  const handleCreateNote = useCallback(
    async (title: string) => {
      setCreating(true);
      try {
        const note = await createNote({ title, content: "" });
        navigate(`/notes/${note.slug}/edit`, { replace: true });
      } catch {
        navigate("/notes/new", { state: { title } });
      } finally {
        setCreating(false);
      }
    },
    [navigate]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Cmd/Ctrl+Enter always creates a note.
      if (e.metaKey || e.ctrlKey) {
        if (showCreateOption) {
          handleCreateNote(trimmed);
          return;
        }
        submitSearch(trimmed);
        return;
      }
      // Plain Enter: navigate the selected item, or show all results.
      if (selectedIdx >= 0) {
        if (showCreateOption && selectedIdx === combinedResults.length) {
          handleCreateNote(trimmed);
          return;
        }
        const match = combinedResults[selectedIdx];
        if (match) {
          navigate(match.href);
          return;
        }
      }
      submitSearch(trimmed);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, totalItems - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    }
    if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = focused && (hasQuery || loading);

  return (
    <header className="relative w-full min-h-[90vh] flex items-center justify-center">
      {/* Cosmic decorative background — dark space gradient with visible nebula */}
      <div className="absolute inset-0 z-0">
        {/* Deep space base gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#e8e4f0] via-[#d4d0e8] to-[#e8e4f0] dark:from-[#0a0a1a] dark:via-[#0f0f2e] dark:to-[#0a0a1a]" />
        {/* Nebula glow spots */}
        <div className="absolute top-1/4 -left-1/4 w-3/5 h-3/5 rounded-full bg-[#6b3fa0]/30 blur-[120px]" />
        <div className="absolute bottom-1/4 -right-1/4 w-3/5 h-2/3 rounded-full bg-[#2563eb]/25 blur-[120px]" />
        <div className="absolute top-1/2 left-1/3 w-1/3 h-1/3 rounded-full bg-[#06b6d4]/20 blur-[100px]" />
        {/* Bright core hotspots */}
        <div className="absolute top-1/3 left-1/4 w-1/4 h-1/4 rounded-full bg-[#a855f7]/15 blur-[80px]" />
        <div className="absolute bottom-1/3 right-1/4 w-1/5 h-1/4 rounded-full bg-[#3b82f6]/15 blur-[80px]" />
        {/* Star field — bright white dots */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: [
              "radial-gradient(1.5px 1.5px at 12% 8%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 22% 15%, #e0e0e0 50%, transparent 50%)",
              "radial-gradient(2px 2px at 35% 5%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 48% 12%, #ddd 50%, transparent 50%)",
              "radial-gradient(1.5px 1.5px at 60% 3%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 75% 9%, #ccc 50%, transparent 50%)",
              "radial-gradient(2px 2px at 88% 6%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 5% 25%, #ddd 50%, transparent 50%)",
              "radial-gradient(1.5px 1.5px at 18% 32%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 30% 22%, #e0e0e0 50%, transparent 50%)",
              "radial-gradient(1px 1px at 42% 28%, #ccc 50%, transparent 50%)",
              "radial-gradient(2px 2px at 55% 35%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 68% 20%, #ddd 50%, transparent 50%)",
              "radial-gradient(1.5px 1.5px at 82% 30%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 95% 18%, #ccc 50%, transparent 50%)",
              "radial-gradient(1.5px 1.5px at 8% 45%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 20% 50%, #ddd 50%, transparent 50%)",
              "radial-gradient(2px 2px at 33% 40%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 45% 55%, #ccc 50%, transparent 50%)",
              "radial-gradient(1.5px 1.5px at 58% 48%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 72% 52%, #ddd 50%, transparent 50%)",
              "radial-gradient(1px 1px at 85% 42%, #ccc 50%, transparent 50%)",
              "radial-gradient(2px 2px at 15% 65%, #fff 50%, transparent 50%)",
              "radial-gradient(1.5px 1.5px at 28% 72%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 40% 62%, #ddd 50%, transparent 50%)",
              "radial-gradient(1px 1px at 52% 75%, #ccc 50%, transparent 50%)",
              "radial-gradient(1.5px 1.5px at 65% 68%, #fff 50%, transparent 50%)",
              "radial-gradient(2px 2px at 78% 58%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 90% 70%, #ddd 50%, transparent 50%)",
              "radial-gradient(1px 1px at 10% 82%, #ccc 50%, transparent 50%)",
              "radial-gradient(1.5px 1.5px at 25% 88%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 38% 80%, #ddd 50%, transparent 50%)",
              "radial-gradient(2px 2px at 50% 90%, #fff 50%, transparent 50%)",
              "radial-gradient(1.5px 1.5px at 62% 85%, #fff 50%, transparent 50%)",
              "radial-gradient(1px 1px at 75% 92%, #ccc 50%, transparent 50%)",
              "radial-gradient(1px 1px at 88% 78%, #ddd 50%, transparent 50%)",
            ].join(","),
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
          }}
        />
        {/* Shooting star — canvas for pixel-perfect trail */}
        <canvas
          id="shooting-star-canvas"
          className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
        />
        <style>{`
          #shooting-star-canvas {
            opacity: 0.9;
          }
        `}</style>
        {/* Bottom fade to blend with content section */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 -mt-16">
        {/* Prompt */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-3 text-on-surface tracking-tight">
          What are we learning today?
        </h1>
        <p className="text-center text-on-surface-muted mb-10 max-w-md mx-auto">
          Search stories, guides, and notes — or start something new.
        </p>

        {/* Search bar wrapper (relative for dropdown positioning) */}
        <div className="relative">
          <div
            className={cn(
              "flex items-center w-full bg-surface-container-low/95 backdrop-blur-sm border border-border-default rounded-xl overflow-hidden transition-all duration-200",
              focused ? "border-brand/50 shadow-lg shadow-brand/5 ring-1 ring-brand/20" : "shadow-md"
            )}
          >
            <div className="pl-5 pr-3">
              {loading ? (
                <Loader2 className="w-5 h-5 text-on-surface-muted animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-on-surface-muted" />
              )}
            </div>
            <input
              ref={inputRef}
              autoComplete="off"
              className="flex-1 bg-transparent border-none outline-none focus:ring-0 font-dm-sans text-lg text-on-background placeholder-on-surface-muted py-4 pr-4"
              placeholder="Search or create something..."
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIdx(-1);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setTimeout(() => setFocused(false), 200);
              }}
              onKeyDown={handleKeyDown}
            />
            {hasQuery && (
              <button
                className="mr-3 p-1.5 rounded-md hover:bg-surface-variant text-on-surface-muted hover:text-on-surface transition-colors"
                onClick={() => { setQuery(""); setSelectedIdx(-1); inputRef.current?.focus(); }}
                tabIndex={-1}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 mr-4 bg-surface-variant text-on-surface-muted px-2 py-1 rounded text-[10px] font-bold border border-border-default">
              {isMac ? <Command className="w-3 h-3" /> : <span>Ctrl</span>}
              <span>K</span>
            </kbd>
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface-container-low/95 backdrop-blur-sm border border-border-default rounded-xl shadow-xl overflow-hidden max-h-[440px] overflow-y-auto z-20">
              {/* Loading skeleton (only before first result arrives) */}
              {loading && combinedResults.length === 0 && (
                <div className="p-5 space-y-4 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-bright shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-3/4 bg-surface-bright rounded" />
                        <div className="h-3 w-1/2 bg-surface-bright rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results section (only when there are results) */}
              {combinedResults.length > 0 && (
                <div>
                  <div className="px-5 pt-4 pb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-muted">
                      Results
                    </span>
                  </div>
                  <div className="pb-2">
                    {combinedResults.map((result, i) => {
                      const Icon = TYPE_ICONS[result.type] || Search;
                      const color = TYPE_COLORS[result.type] || "text-on-surface-muted";
                      const isSelected = i === selectedIdx;
                      return (
                        <button
                          key={`${result.type}-${result.slug}`}
                          className={cn(
                            "w-full flex items-start gap-3 px-5 py-3 text-left transition-colors",
                            isSelected ? "bg-surface-variant" : "hover:bg-surface"
                          )}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            navigate(result.href);
                          }}
                        >
                          <div className={cn("w-10 h-10 rounded-lg bg-surface shrink-0 flex items-center justify-center mt-0.5", color)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-sora text-sm font-semibold text-on-surface truncate">
                                {result.title}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-muted shrink-0 border border-border-default px-1.5 py-0.5 rounded">
                                {result.type === "note" ? "Note" : result.type}
                              </span>
                            </div>
                            {result.excerpt && (
                              <p className="text-xs text-on-surface-muted mt-1 line-clamp-1">
                                {result.excerpt}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-border-default mx-5" />
                </div>
              )}

              {/* Empty state — still searching or no results */}
              {!loading && combinedResults.length === 0 && (
                <div className="px-5 pt-4 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-muted">
                    No existing content
                  </span>
                </div>
              )}

              {/* "Create a note" — always shown when there's text */}
              {showCreateOption && (
                <div className={cn("px-5 pt-3 pb-4", combinedResults.length === 0 && "pt-4")}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-[2px] bg-accent-blue-neon" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent-blue-neon">
                      {combinedResults.length > 0 ? "Or create" : "Create a note"}
                    </span>
                  </div>
                  <button
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed transition-all text-left",
                      selectedIdx === combinedResults.length
                        ? "bg-accent-blue-neon/10 border-accent-blue-neon/50"
                        : "border-border-default hover:border-accent-blue-neon/30 hover:bg-accent-blue-neon/5"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleCreateNote(trimmed);
                    }}
                    disabled={creating}
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent-blue-neon/10 shrink-0 flex items-center justify-center">
                      <StickyNote className={cn("w-4 h-4", creating ? "animate-spin" : "", "text-accent-blue-neon")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-sora text-sm font-semibold text-accent-blue-neon block">
                        {creating ? "Creating note..." : `Start a note about "${trimmed}"`}
                      </span>
                      <span className="text-xs text-on-surface-muted mt-0.5 block">
                        Opens the editor to refine your idea
                      </span>
                    </div>
                    <div className="flex items-center justify-center min-w-[4rem] px-3 py-2 rounded-lg border border-border-default bg-surface shrink-0">
                      <kbd className="flex items-center gap-1 text-[11px] font-mono font-semibold text-on-surface-muted">
                        {isMac ? (
                          <Command className="w-3.5 h-3.5" />
                        ) : (
                          <span>Ctrl</span>
                        )}
                        <span>+</span>
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </kbd>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Keyboard shortcut hint */}
        <p className="text-center text-xs text-on-surface-muted mt-6">
          Press <kbd className="inline-flex items-center gap-0.5 bg-surface-variant px-1.5 py-0.5 rounded text-[10px] font-bold border border-border-default">{isMac ? <Command className="w-3 h-3" /> : <span>Ctrl</span>}<span>K</span></kbd> to search from anywhere
        </p>
      </div>
    </header>
  );
}
