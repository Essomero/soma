import { useEffect, useRef, useState } from "react";
import { md } from "@/lib/markdown";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2, Search, ChevronDown } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import { useContentList, sortContent } from "@/lib/content";
import type { SortKey } from "@/lib/content";
import SortControl from "@/components/ui/SortControl";
import type { GuideContent } from "@/types";
import { usePageMeta } from "@/hooks/usePageMeta";
import SafeImage from "@/components/ui/SafeImage";

export default function GuidesIndexPage() {
  const { data: guides, loading } = useContentList<GuideContent>("guide");
  const [sort, setSort] = useState<SortKey>("newest");
  const [topic, setTopic] = useState("All");
  const [topicOpen, setTopicOpen] = useState(false);
  const topicRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  useEffect(() => {
    if (!topicOpen) return;
    const handler = (e: MouseEvent) => {
      if (topicRef.current && !topicRef.current.contains(e.target as Node)) setTopicOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [topicOpen]);
  usePageMeta({ title: "Guides", description: "Step-by-step guides that end somewhere new: self-hosting, drills, launch playbooks." });
  if (loading) {
    return (
      <div className="pt-24 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-on-surface-muted" />
      </div>
    );
  }
  const allGuides = guides ?? [];
  const featuredGuide = allGuides.find((g) => g.isFeatured);
  const rest = allGuides.filter((g) => !g.isFeatured);
  const sidebarGuides = rest.slice(0, 2);
  const guideTopics = Array.from(new Set(rest.flatMap((g) => g.tags ?? []))).sort((a, b) => a.localeCompare(b));
  const gridGuides = sortContent(
    rest.slice(2).filter((g) => topic === "All" || (g.tags ?? []).includes(topic)),
    sort,
  );
  return (
    <div>
      <main className="pt-24 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop">
        {/* Hero */}
        <header className="mb-xxl max-w-4xl">
          <AccentBar variant="small" className="mb-sm" />
          <h1 className="font-sora text-headline-md mb-md text-on-surface">Guides</h1>
          <p className="text-on-surface-variant font-sora text-article-title font-light max-w-3xl">
            In-depth technical guides and tutorials across the stack.
          </p>
        </header>

        {/* Featured Section (Bento) */}
        <section className="mb-giant">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
            {/* Large Featured Card */}
            <div className="md:col-span-8 group cursor-pointer">
              {featuredGuide && (
                <Link to={featuredGuide.href} className="block">
                  <div className="relative aspect-video overflow-hidden border border-border-default bg-surface-container mb-md">
                    <SafeImage alt={featuredGuide.imageAlt}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      src={featuredGuide?.image}
                    />
                    <div className="absolute top-md left-md">
                      <span className="bg-primary text-on-primary font-sora text-label-caps px-sm py-xs uppercase">
                        Featured Guide
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-xs">
                    <div className="flex items-center gap-sm font-sora text-metadata-tag text-on-surface-muted uppercase">
                      {featuredGuide.category.split(" // ").map((part, i) => (
                        <span key={i}>
                          {i > 0 && <span className="mx-1">//</span>}
                          {part}
                        </span>
                      ))}
                    </div>
                    <h2 className="font-sora text-article-title group-hover:text-primary transition-colors text-on-surface">
                      {featuredGuide.title}
                    </h2>
                    <p className="text-on-surface-variant mt-xs line-clamp-2"><span dangerouslySetInnerHTML={{ __html: md(featuredGuide.excerpt) }} /></p>
                    {featuredGuide.tags && (
                      <div className="mt-md flex gap-xs flex-wrap">
                        {featuredGuide.tags.map((tag) => (
                          <span
                            key={tag}
                            className="font-sora text-label-caps bg-surface-container-high px-sm py-1 rounded-full text-on-surface-muted"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              )}
            </div>

            {/* Sidebar Cards */}
            <div className="md:col-span-4 flex flex-col gap-lg">
              {sidebarGuides.map((guide) => (
                <div key={guide.id} className="group cursor-pointer">
                  <Link to={guide.href} className="block">
                    <div className="relative aspect-[1.67] overflow-hidden border border-border-default bg-surface-container mb-md">
                      <SafeImage alt={guide.imageAlt}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        src={guide.image}
                      />
                    </div>
                    <div className="flex flex-col gap-xs">
                      <div className="font-sora text-metadata-tag text-on-surface-muted uppercase">
                        {guide.category}
                      </div>
                      <h3 className="font-sora text-[24px] leading-tight group-hover:text-primary transition-colors text-on-surface">
                        {guide.title}
                      </h3>
                      {guide.tags && (
                        <div className="mt-xs flex gap-xs flex-wrap">
                          {guide.tags.map((tag) => (
                            <span
                              key={tag}
                              className="font-sora text-label-caps bg-surface-container-high px-sm py-1 rounded-full text-on-surface-muted"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Explore All Guides Grid */}
        <section>
          <div className="flex justify-between items-end border-b border-border-default pb-sm mb-lg">
            <h2 className="font-sora text-metadata-tag uppercase tracking-widest text-on-surface">
              Explore All Guides
            </h2>
            <div className="flex items-center gap-md">
              <div className="relative" ref={topicRef}>
                <button
                  type="button"
                  onClick={() => setTopicOpen((o) => !o)}
                  className="flex items-center gap-xs font-sora text-label-caps uppercase text-on-surface-muted hover:text-on-surface transition-colors"
                >
                  {topic === "All" ? "Filter by Topic" : topic} <ChevronDown className="w-4 h-4" />
                </button>
                {topicOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-52 rounded-lg border border-border-default bg-surface shadow-xl py-xs max-h-80 overflow-y-auto thin-scrollbar">
                    {["All", ...guideTopics].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setTopic(t); setVisibleCount(6); setTopicOpen(false); }}
                        className={`w-full text-left px-md py-sm font-sora text-xs uppercase tracking-widest transition-colors ${
                          t === topic ? "text-brand font-medium" : "text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {t === "All" ? "All topics" : t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <SortControl value={sort} onChange={(v) => { setSort(v as SortKey); setVisibleCount(6); }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-xl">
            {gridGuides.slice(0, visibleCount).map((guide) => (
              <article
                key={guide.id}
                className="group border border-border-default bg-surface-container hover:border-outline-variant transition-all duration-300"
              >
                <Link to={guide.href} className="block p-lg">
                  <div className="font-sora text-metadata-tag text-primary uppercase mb-xs">
                    {guide.category}
                  </div>
                  <h4 className="font-sora text-[20px] leading-snug mb-md group-hover:text-primary transition-colors text-on-surface">
                    {guide.title}
                  </h4>
                  <p className="text-on-surface-muted text-sm mb-lg line-clamp-3" dangerouslySetInnerHTML={{ __html: md(guide.excerpt) }} />
                  {guide.tags && (
                    <div className="flex flex-wrap gap-xs mb-lg">
                      {guide.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-sora text-label-caps bg-surface-lowest px-sm py-1 rounded text-on-surface-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="inline-flex items-center gap-sm font-sora text-metadata-tag uppercase border-b border-primary text-primary pb-1 group-hover:gap-md transition-all">
                    Read Guide <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              </article>
            ))}
          </div>

          {gridGuides.length === 0 && (
            <div className="text-center py-xxl border-2 border-dashed border-border-default rounded-xl">
              <p className="font-dm-sans text-body-lg text-on-surface-muted">No guides tagged &ldquo;{topic}&rdquo; yet.</p>
            </div>
          )}

          {/* More Button */}
          {visibleCount < gridGuides.length && (
            <div className="mt-xxl flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + 6)}
                className="bg-surface border border-border-default px-xl py-md font-sora text-metadata-tag uppercase tracking-widest hover:bg-surface-container-highest transition-colors active:scale-95 duration-200 text-on-surface"
              >
                View More Guides
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
