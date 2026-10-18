import { md } from "@/lib/markdown";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search, BookOpen, Mic, Star, ArrowRight, SearchX,
  Bookmark, User, StickyNote,
} from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import { allStories, allGuides } from "@/content/registry";
import { fetchLearnList, deriveExcerpt } from "@/lib/learn";
import { type LearnArticle } from "@/types";

const filters = [
  { label: "All Results", icon: Search, color: "text-secondary" },
  { label: "Top Stories", icon: BookOpen, color: "text-primary" },
  { label: "Technical Guides", icon: Bookmark, color: "text-tertiary" },
  { label: "Learn Notes", icon: StickyNote, color: "text-accent-blue-neon" },
  { label: "Podcasts", icon: Mic, color: "text-accent-orange" },
];

const trendingTopics = ["REACT", "WEBGL", "RUST", "DOCKER"];

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [activeFilter, setActiveFilter] = useState("All Results");

  // Search across all content
  const storyResults = allStories.filter(
    (s) =>
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.excerpt.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase())
  );
  const guideResults = allGuides.filter(
    (g) =>
      g.title.toLowerCase().includes(query.toLowerCase()) ||
      g.excerpt.toLowerCase().includes(query.toLowerCase()) ||
      g.category.toLowerCase().includes(query.toLowerCase())
  );

  // Learn notes come from Turso at runtime : fetch once on mount
  const [learnArticles, setLearnArticles] = useState<LearnArticle[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchLearnList().then((list) => { if (!cancelled) setLearnArticles(list); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const learnResults = learnArticles.filter(
    (l) =>
      l.title.toLowerCase().includes(query.toLowerCase()) ||
      deriveExcerpt(l.content).toLowerCase().includes(query.toLowerCase())
  );

  const results =
    activeFilter === "Technical Guides" ? guideResults :
    activeFilter === "Learn Notes" ? learnResults :
    activeFilter === "Podcasts" ? [] :
    [...storyResults, ...guideResults, ...learnResults];
  const hasResults = results.length > 0;

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
            Showing {results.length} results from Soma.
          </p>
        </header>

        {/* AI Insights */}
        {hasResults && (
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

        {/* Results List */}
        {hasResults ? (
          <div className="space-y-xxl">
            {/* Hero Result - first story */}
            {storyResults[0] && (
              <Link to={`/stories/${storyResults[0].slug}`} className="grid grid-cols-1 xl:grid-cols-12 gap-xl group cursor-pointer block">
                <div className="xl:col-span-7 overflow-hidden rounded-lg border border-border-default">
                  <img
                    alt={storyResults[0].imageAlt}
                    className="w-full h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
                    src={storyResults[0].image}
                  />
                </div>
                <div className="xl:col-span-5 flex flex-col justify-center">
                  <span className="font-sora text-metadata-tag text-primary mb-sm uppercase">
                    // {storyResults[0].category.split("//")[0]}
                  </span>
                  <h2 className="font-sora text-[40px] leading-none text-on-surface group-hover:text-primary transition-colors">
                    {storyResults[0].title}
                  </h2>
                  <p className="font-dm-sans text-on-surface-muted mt-md mb-lg line-clamp-3" dangerouslySetInnerHTML={{ __html: md(storyResults[0].excerpt) }} />
                  <div className="flex items-center gap-md">
                    <span className="font-sora text-[11px] text-on-surface border border-border-default px-sm py-xs rounded">
                      {storyResults[0].tags?.[0] || "STORY"}
                    </span>
                    <span className="font-sora text-[11px] text-on-surface-muted uppercase">
                      {storyResults[0].date}
                    </span>
                  </div>
                </div>
              </Link>
            )}

            <div className="border-t border-border-default" />

            {/* Secondary Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-xxl">
              {storyResults.slice(1, 2).map((story) => (
                <Link key={story.slug} to={`/stories/${story.slug}`} className="flex flex-col group cursor-pointer">
                  <div className="aspect-video mb-lg overflow-hidden rounded-lg border border-border-default">
                    <img
                      alt={story.imageAlt}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      src={story.image}
                    />
                  </div>
                  <span className="font-sora text-metadata-tag text-on-surface-muted mb-xs uppercase">
                    // {story.category.split("//")[0]}
                  </span>
                  <h3 className="font-sora text-article-title text-on-surface group-hover:text-primary transition-colors">
                    {story.title}
                  </h3>
                  <p className="font-dm-sans text-on-surface-muted mt-sm line-clamp-2" dangerouslySetInnerHTML={{ __html: md(story.excerpt) }} />
                </Link>
              ))}

              <div className="flex flex-col gap-xxl">
                {guideResults.slice(0, 2).map((guide) => (
                  <Link
                    key={guide.slug}
                    to={`/guides/${guide.slug}`}
                    className="p-lg bg-surface-container rounded-lg border border-border-default group hover:border-primary transition-all cursor-pointer block"
                  >
                    <span className="font-sora text-metadata-tag text-secondary mb-xs uppercase">
                      // Guide
                    </span>
                    <h3 className="font-sora text-article-title text-on-surface mb-sm">{guide.title}</h3>
                    <p className="font-dm-sans text-on-surface-muted mb-md" dangerouslySetInnerHTML={{ __html: md(guide.excerpt) }} />
                    <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-2 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Learn Notes */}
            {learnResults.length > 0 && (activeFilter === "All Results" || activeFilter === "Learn Notes") && (
              <section>
                <div className="border-t border-border-default" />
                <h2 className="font-sora text-headline-md text-on-surface mt-giant mb-lg flex items-center gap-sm">
                  <StickyNote className="w-5 h-5 text-accent-blue-neon" /> Learn Notes
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {learnResults.map((note) => (
                    <Link
                      key={note.slug}
                      to={`/learn/${note.slug}`}
                      className="p-lg bg-surface-container rounded-lg border border-border-default group hover:border-primary transition-all cursor-pointer block"
                    >
                      <span className="font-sora text-metadata-tag text-accent-blue-neon mb-xs uppercase">
                        // Learn
                      </span>
                      <h3 className="font-sora text-article-title text-on-surface mb-sm group-hover:text-primary transition-colors">{note.title}</h3>
                      <p className="font-dm-sans text-on-surface-muted mb-md line-clamp-2">{deriveExcerpt(note.content)}</p>
                      <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-2 transition-transform" />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
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
        )}
      </main>
    </div>
  );
}
