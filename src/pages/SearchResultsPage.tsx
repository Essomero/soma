import { md } from "@/lib/markdown";
import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search, BookOpen, Mic, Star, ArrowRight, SearchX,
  Bookmark, User, StickyNote, Loader2,
} from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import { fetchContentList } from "@/lib/content";
import type { StoryContent, GuideContent } from "@/types";
import { fetchNotesList, fetchNotesSearch, deriveExcerpt } from "@/lib/notes";
import { type NoteArticle } from "@/types";

// Mirrors ROUTE_BASE in api/content.js so the client knows how to link.
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

const TYPE_LABELS: Record<string, string> = {
  story: "Story",
  guide: "Guide",
  doc: "Docs",
  course: "Course",
  book: "Book",
  series: "Series",
  test: "Test",
  featured: "Featured",
  podcast: "Podcast",
};

const filters = [
  { label: "All Results", icon: Search, color: "text-secondary", type: null },
  { label: "Top Stories", icon: BookOpen, color: "text-primary", type: "story" },
  { label: "Technical Guides", icon: Bookmark, color: "text-tertiary", type: "guide" },
  { label: "Notes", icon: StickyNote, color: "text-accent-blue-neon", type: "note" },
  { label: "Podcasts", icon: Mic, color: "text-accent-orange", type: "podcast" },
];

const trendingTopics = ["REACT", "WEBGL", "RUST", "DOCKER"];

import { usePageMeta } from "@/hooks/usePageMeta";
import { formatDate } from "@/lib/format-date";
import SafeImage from "@/components/ui/SafeImage";

/** Minimal search result shape from the API. */
interface SearchResult {
  id: string;
  slug: string;
  type: string;
  title: string;
  excerpt: string;
  category?: string;
  tags?: string[];
  image?: string;
  imageAlt?: string;
  publishedAt?: string;
  updatedAt?: string | null;
  href?: string;
}

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [activeFilter, setActiveFilter] = useState("All Results");
  usePageMeta({ title: query ? `Search: ${query}` : "Search" });

  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [noteResults, setNoteResults] = useState<NoteArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 20;

  // ── Fetch search results ──────────────────────────────────────────
  // Cross-type search from the API (FTS5 ranked). Notes are searched
  // server-side too via a separate endpoint.
  const doSearch = useCallback(async (q: string, reset: boolean) => {
    if (!q.trim()) {
      setAllResults([]);
      setNoteResults([]);
      setHasMore(false);
      setPage(0);
      return;
    }
    const offset = reset ? 0 : page * PAGE_SIZE;
    setLoading(true);

    const [contentResults, notes] = await Promise.all([
      fetchContentList<SearchResult>("all", q).catch(() => [] as SearchResult[]),
      fetchNotesSearch(q).catch(() => [] as NoteArticle[]),
    ]);

    const merged = [...contentResults, ...notes.map((n) => ({
      id: `note-${n.slug}`,
      slug: n.slug,
      type: "note",
      title: n.title,
      excerpt: deriveExcerpt(n.content),
      publishedAt: n.createdAt,
      updatedAt: n.updatedAt,
      href: `/notes/${n.slug}`,
    }))];

    if (reset) {
      setAllResults(merged);
    } else {
      setAllResults((prev) => [...prev, ...merged]);
    }
    setNoteResults(notes);
    setHasMore(merged.length >= PAGE_SIZE);
    setPage((p) => (reset ? 1 : p + 1));
    setLoading(false);
  }, [page]);

  useEffect(() => {
    doSearch(query, true);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Intersection observer for infinite scroll ───────────────────
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          doSearch(query, false);
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, query, doSearch]);

  // ── Filter results by type ──────────────────────────────────────
  const activeType = filters.find((f) => f.label === activeFilter)?.type;
  const filteredResults = activeType
    ? allResults.filter((r) => r.type === activeType)
    : allResults;
  const hasResults = filteredResults.length > 0;

  // Hero = first story result (rich layout), rest = cards
  const firstStoryIdx = filteredResults.findIndex((r) => r.type === "story");
  const heroResult = firstStoryIdx >= 0 ? filteredResults[firstStoryIdx] : null;
  const remainingResults = heroResult
    ? filteredResults.filter((_, i) => i !== firstStoryIdx)
    : filteredResults;

  return (
    <div className="flex max-w-readme mx-auto pt-16 min-h-screen">
      {/* Filter Sidebar */}
      <aside className="h-screen w-64 sticky top-16 hidden lg:flex flex-col p-lg gap-md border-r border-border-default bg-surface-container shrink-0">
        <div className="mb-lg">
          <h3 className="font-sora text-headline-md text-on-surface">Filter Results</h3>
          <p className="font-sora text-label-caps text-on-surface-muted mt-sm">Narrow by category</p>
        </div>
        <div className="flex flex-col gap-xs">
          {filters.map((f) => (
            <button
              key={f.label}
              onClick={() => setActiveFilter(f.label)}
              className={`flex items-center gap-sm px-md py-sm rounded-lg transition-all duration-150 cursor-pointer ${
                activeFilter === f.label
                  ? `${f.color} font-bold bg-surface-variant`
                  : "text-on-surface-muted hover:bg-surface-bright hover:text-on-surface"
              }`}
            >
              <f.icon className="w-4 h-4" />
              <span className="font-sora text-label-caps">{f.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setActiveFilter("All Results")}
          className="mt-xl text-left font-sora text-label-caps text-on-surface-muted hover:text-accent-blue-neon underline transition-all"
        >
          Clear All
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-xl lg:px-giant overflow-hidden">
        {/* Header */}
        <header className="mb-xxl">
          <AccentBar variant="small" className="mb-sm" />
          <h1 className="font-sora text-headline-md text-on-surface flex items-center gap-md">
            Search results for: <span className="text-primary italic">{query}</span>
          </h1>
          <p className="font-dm-sans text-body-base text-on-surface-muted mt-sm">
            {loading ? "Searching..." : `Showing ${filteredResults.length} results from Soma.`}
          </p>
        </header>

        {/* AI Insights */}
        {hasResults && !loading && (
          <section className="mb-giant">
            <div className="glass-card p-xl rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary-container" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-md mb-md">
                <div className="flex items-center gap-sm">
                  <Star className="w-4 h-4 text-primary-container" />
                  <span className="font-sora text-label-caps text-primary-container uppercase tracking-widest">
                    Summarized Insights
                  </span>
                </div>
              </div>
              <h2 className="font-sora text-article-title text-on-surface mb-md leading-snug">
                {query} is a catalyst for innovation.
              </h2>
              <p className="font-dm-sans text-body-base text-on-surface-muted max-w-3xl leading-relaxed">
                The current landscape suggests that {query.toLowerCase()} isn't just a
                requirement:it's a competitive advantage. Key themes across the
                community highlight that by solving for these challenges,
                developers often discover more efficient workflows.
              </p>
              <div className="mt-lg flex flex-wrap gap-md border-t border-border-default pt-lg">
                <span className="font-sora text-label-caps text-on-surface">Inclusive Architecture</span>
                <span className="font-sora text-label-caps text-on-surface">Universal UX</span>
                <span className="font-sora text-label-caps text-on-surface">Dev Tools</span>
              </div>
            </div>
          </section>
        )}

        {/* Loading state */}
        {loading && allResults.length === 0 && (
          <div className="flex items-center justify-center py-giant">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}

        {/* Results List */}
        {hasResults ? (
          <div className="space-y-xxl">
            {/* Hero Result - first story */}
            {heroResult && (
              <Link to={`/stories/${heroResult.slug}`} className="grid grid-cols-1 xl:grid-cols-12 gap-xl group cursor-pointer block">
                <div className="xl:col-span-7 overflow-hidden rounded-lg border border-border-default">
                  <SafeImage alt={heroResult.imageAlt || heroResult.title}
                    className="w-full h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
                    src={heroResult?.image}
                  />
                </div>
                <div className="xl:col-span-5 flex flex-col justify-center">
                  <span className="font-sora text-metadata-tag text-primary mb-sm uppercase">
                    // {heroResult.category?.split("//")[0] || "Story"}
                  </span>
                  <h2 className="font-sora text-[40px] leading-none text-on-surface group-hover:text-primary transition-colors">
                    {heroResult.title}
                  </h2>
                  <p className="font-dm-sans text-on-surface-muted mt-md mb-lg line-clamp-3" dangerouslySetInnerHTML={{ __html: md(heroResult.excerpt) }} />
                  <div className="flex items-center gap-md">
                    <span className="font-sora text-[11px] text-on-surface border border-border-default px-sm py-xs rounded">
                      {heroResult.tags?.[0] || "STORY"}
                    </span>
                    <span className="font-sora text-[11px] text-on-surface-muted uppercase">
                      {formatDate(heroResult.publishedAt || heroResult.updatedAt || "")}
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {heroResult && <div className="border-t border-border-default" />}

            {/* Remaining Results Grid */}
            {remainingResults.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-xl">
                {remainingResults.map((result) => {
                  const routeBase = TYPE_ROUTES[result.type] || result.type;
                  const label = TYPE_LABELS[result.type] || result.type;
                  return (
                    <Link
                      key={result.id}
                      to={result.href || `/${routeBase}/${result.slug}`}
                      className={`p-lg rounded-lg border border-border-default group hover:border-primary transition-all cursor-pointer block ${
                        result.type === "note" ? "bg-surface-container" : "bg-surface-container-low"
                      }`}
                    >
                      <span className={`font-sora text-metadata-tag mb-xs uppercase ${
                        result.type === "story" ? "text-primary" :
                        result.type === "guide" ? "text-secondary" :
                        result.type === "note" ? "text-accent-blue-neon" :
                        "text-on-surface-muted"
                      }`}>
                        // {label}
                      </span>
                      <h3 className="font-sora text-article-title text-on-surface mb-sm group-hover:text-primary transition-colors line-clamp-3">
                        {result.title}
                      </h3>
                      <p className="font-dm-sans text-on-surface-muted text-sm line-clamp-2">
                        {result.excerpt}
                      </p>
                      {result.publishedAt && (
                        <span className="font-sora text-[10px] text-on-surface-muted uppercase mt-sm block">
                          {formatDate(result.publishedAt)}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ) : !loading && query.trim() ? (
          /* Empty State */
          <div className="mt-giant text-center py-giant border-2 border-dashed border-border-default rounded-xl">
            <SearchX className="w-16 h-16 text-on-surface-muted mx-auto mb-md" />
            <h2 className="font-sora text-article-title text-on-surface">No exact matches for "{query}"</h2>
            <p className="font-dm-sans text-on-surface-muted mt-sm mb-xl">
              Try broadening your search or explore these trending topics.
            </p>
            <div className="flex flex-wrap justify-center gap-md max-w-2xl mx-auto">
              {trendingTopics.map((topic) => (
                <Link
                  key={topic}
                  to={`/search?q=${topic.toLowerCase()}`}
                  className="bg-surface-container-high border border-border-default px-lg py-sm rounded-full font-sora text-label-caps hover:bg-primary hover:text-on-primary transition-all text-on-surface-muted"
                >
                  #{topic}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* Infinite scroll sentinel */}
        <div ref={loadMoreRef} className="h-10" />
        {loading && allResults.length > 0 && (
          <div className="flex justify-center py-lg">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}
