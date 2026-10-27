import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import ArticleCard from "@/components/cards/ArticleCard";
import LoadMore from "@/components/ui/LoadMore";
import { allTopics } from "@/content/registry";
import { useContentList, sortContent } from "@/lib/content";
import type { SortKey } from "@/lib/content";
import SortControl from "@/components/ui/SortControl";
import type { StoryContent } from "@/types";
import { useAllReadSlugs } from "@/lib/useProgress";
import { md } from "@/lib/markdown";
import { usePageMeta } from "@/hooks/usePageMeta";
import SafeImage from "@/components/ui/SafeImage";

const trendingItems = [
  { label: "01 // RECENT", title: "Why Does This Type Error?", href: "/stories/fs-1-why-this-type-error" },
  { label: "02 // POPULAR", title: "Generics as Relationships", href: "/stories/fs-2-generics" },
];

function wordCount(s: StoryContent): number {
  return [
    s.intro || "",
    ...(s.body || []),
    ...(s.sections?.flatMap((sec) => sec.paragraphs.filter((p): p is string => typeof p === "string")) || []),
  ].join(" ").trim().split(/\s+/).length;
}

export default function StoriesIndexPage() {
  const readSlugs = useAllReadSlugs();
  const { data: stories, loading } = useContentList<StoryContent>("story");
  const [sort, setSort] = useState<SortKey>("newest");
  usePageMeta({ title: "Stories", description: "One idea per story, felt deeply: engineering, craft, and the systems underneath." });
  if (loading) {
    return (
      <div className="pt-32 pb-xxl max-w-readme mx-auto px-gutter md:px-margin-desktop text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-on-surface-muted" />
      </div>
    );
  }
  const active = (stories ?? []).filter((s) => !s.archived && s.listed !== false);

  // Sort: unread first, then newest first
  const sortUnreadFirst = (a: StoryContent, b: StoryContent) => {
    const aUnread = readSlugs.has(a.slug) ? 1 : 0;
    const bUnread = readSlugs.has(b.slug) ? 1 : 0;
    if (aUnread !== bUnread) return aUnread - bUnread;
    return new Date(b.added || b.date).getTime() - new Date(a.added || a.date).getTime();
  };

  const sorted = [...active].sort(sortUnreadFirst);
  const featured = sorted.find((s) => s.isFeatured) || sorted[0];
  const gridStory2 = sorted[1];
  const longRead = sorted.filter((s) => s.slug !== featured?.slug && s.slug !== gridStory2?.slug).sort((a, b) => wordCount(b) - wordCount(a))[0];
  const editorialSlugs = new Set([featured?.slug, gridStory2?.slug, longRead?.slug].filter(Boolean));
  // More Stories follows the sort control; the editorial top never moves.
  const moreStories = sortContent(
    sorted.filter((s) => !editorialSlugs.has(s.slug)),
    sort,
  );

  return (
    <div>
      <main className="pt-32 pb-xxl max-w-readme mx-auto px-gutter md:px-margin-desktop">
        {/* Hero */}
        <header className="mb-giant">
          <AccentBar variant="small" className="mb-md" />
          <p className="font-sora text-metadata-tag text-primary uppercase tracking-widest mb-sm">
            // STORIES
          </p>
          <h1 className="font-sora text-display-lg-mobile md:text-display-lg max-w-4xl text-on-surface">
            Deep dives on <span className="text-gradient">ideas</span> that matter.
          </h1>
        </header>

        {/* Staggered Editorial Grid */}
        {sorted.length === 0 ? (
          <div className="py-xxl text-center border border-dashed border-border-default rounded-none">
            <p className="font-dm-sans text-sm text-on-surface-muted mb-md">
              No stories yet. Publish your first private piece to see it here.
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-12 gap-lg md:gap-xxl">
          {/* Featured Card 1 - Large */}
          <article className="col-span-12 md:col-span-8 group cursor-pointer">
            <Link to={featured?.href ?? "#"} className="block">
              <div className="relative overflow-hidden border border-border-default bg-surface hover:border-outline hover:-translate-y-1 transition-all duration-300">
                <div className="aspect-video w-full overflow-hidden">
                  <SafeImage alt={featured?.imageAlt ?? ""}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src={featured?.image}
                  />
                </div>
                <div className="p-lg md:p-xl">
                  <div className="flex items-center gap-xs mb-md">
                    <span className="font-sora text-metadata-tag text-on-surface-muted uppercase tracking-widest">
                      STORY
                    </span>
                    <span className="text-on-surface-muted">//</span>
                    <span className="font-sora text-metadata-tag text-secondary uppercase tracking-widest">
                      AI &amp; FUTURE
                    </span>
                  </div>
                  <h2 className="font-sora text-article-title mb-md max-w-2xl group-hover:text-primary transition-colors text-on-surface">
                    {featured?.title}
                  </h2>
                  <p className="font-dm-sans text-body-base text-on-surface-variant mb-lg max-w-xl" dangerouslySetInnerHTML={{ __html: md(featured?.excerpt || "") }} />
                  <span className="inline-flex items-center gap-sm font-sora text-metadata-tag text-primary uppercase tracking-widest">
                    Read Story
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </Link>
          </article>

          {/* Sidebar */}
          <aside className="col-span-12 md:col-span-4 flex flex-col gap-lg">
            {/* About */}
            <div className="p-lg border-t-4 border-secondary bg-surface-lowest">
              <p className="font-sora text-metadata-tag text-secondary uppercase mb-xs">ABOUT</p>
              <h3 className="font-sora text-label-caps text-on-surface mb-sm">Soma</h3>
              <p className="font-dm-sans text-sm text-on-surface-muted">A personal library of deep research, curated reading, and ideas that matter. Private by default, public when you choose.</p>
              <Link
                to="/docs/lab-setup"
                className="inline-block font-sora text-xs text-primary uppercase mt-md hover:underline"
              >
                How it works
              </Link>
            </div>

            {/* Trending */}
            <div className="p-lg border-t-4 border-primary bg-surface-lowest">
              <p className="font-sora text-metadata-tag text-primary uppercase mb-xs">POPULAR NOW</p>
              <h3 className="font-sora text-label-caps text-on-surface mb-md">LATEST CONTRIBUTIONS</h3>
              <ul className="space-y-md">
                {trendingItems.map((item) => (
                  <li key={item.label} className="group">
                    <Link to={item.href} className="block">
                      <span className="font-sora text-xs text-on-surface-muted">{item.label}</span>
                      <p className="font-dm-sans text-sm text-on-surface group-hover:text-primary transition-colors mt-1">
                        {item.title}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {/* Image with overlay: second featured story */}
            <Link to={gridStory2?.href ?? "#"} className="relative aspect-square border border-border-default bg-surface-container overflow-hidden group">
              <img
                alt={gridStory2?.imageAlt ?? "Featured"}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 grayscale group-hover:grayscale-0"
                src={gridStory2?.image || "https://pbs.twimg.com/media/G-efypCbQAEEi8a.jpg"}
              />
              <div className="absolute bottom-0 left-0 right-0 p-lg bg-gradient-to-t from-background to-transparent">
                <p className="font-sora text-metadata-tag text-accent-orange uppercase tracking-widest mb-xs">
                  LATEST
                </p>
                <h4 className="font-sora text-xl text-on-surface">{gridStory2?.title}</h4>
              </div>
            </Link>
          </aside>

          {/* Start here: featured course */}
          <article className="col-span-12 md:col-span-5 order-2 md:order-1 group cursor-pointer">
            <Link to="/courses/typescript-interview-fast-track" className="block h-full">
              <div className="h-full flex flex-col border border-border-default bg-surface hover:border-outline hover:-translate-y-1 transition-all duration-300">
                <div className="aspect-[4/5] w-full overflow-hidden">
                  <img
                    alt="TypeScript course cover"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=750&fit=crop"
                  />
                </div>
                <div className="p-lg flex-1 flex flex-col">
                  <div className="flex items-center gap-xs mb-md">
                    <span className="font-sora text-metadata-tag text-on-surface-muted uppercase tracking-widest">COURSE</span>
                    <span className="text-on-surface-muted">//</span>
                    <span className="font-sora text-metadata-tag text-accent-blue-neon uppercase tracking-widest">START HERE</span>
                  </div>
                  <h2 className="font-sora text-2xl md:text-article-title mb-md group-hover:text-primary transition-colors text-on-surface">
                    TypeScript Fast Track
                  </h2>
                  <p className="font-dm-sans text-body-base text-on-surface-variant mt-auto">
                    Five visual lessons that make the type system click: shapes over names, generics as relationships, and boundaries you can trust.
                  </p>
                </div>
              </div>
            </Link>
          </article>

          {/* Featured Card 3: long read (third newest) */}
          <article className="col-span-12 md:col-span-7 order-1 md:order-2 group cursor-pointer">
            <Link to={longRead?.href ?? "#"} className="block h-full">
              <div className="h-full border border-border-default bg-surface hover:border-outline hover:-translate-y-1 transition-all duration-300 flex flex-col justify-center p-xl md:p-xxl bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-surface-container-high/50 to-surface">
                <div className="w-12 h-1 bg-gradient-to-r from-primary to-secondary mb-4" />
                <div className="flex items-center gap-xs mb-md">
                  <span className="font-sora text-metadata-tag text-on-surface-muted uppercase tracking-widest">LONG READ</span>
                  <span className="text-on-surface-muted">//</span>
                  <span className="font-sora text-metadata-tag text-tertiary uppercase tracking-widest">{longRead?.category || ""}</span>
                </div>
                <h2 className="font-sora text-3xl md:text-headline-md mb-lg leading-tight group-hover:text-primary transition-colors text-on-surface">
                  {longRead?.title}
                </h2>
                <p className="font-dm-sans text-lg text-on-surface-variant mb-xl leading-relaxed" dangerouslySetInnerHTML={{ __html: md(longRead?.excerpt || "") }} />
                {longRead?.author && (
                  <div className="flex items-center gap-md">
                    <div className="h-12 w-12 rounded-full border border-border-default overflow-hidden flex items-center justify-center bg-surface-container-highest">
                      <span className="font-sora text-lg text-primary font-bold">
                        {longRead.author.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-sora text-sm text-on-surface">{longRead.author.name}</p>
                      <p className="font-sora text-xs text-on-surface-muted">{longRead.author.handle || longRead.category}</p>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          </article>
        </div>
        )}

        {/* Topics Grid */}
        <section className="mt-giant pt-giant border-t border-border-default">
          <h2 className="font-sora text-article-title mb-xl text-on-surface">Explore by topic</h2>
          <div className="flex flex-wrap gap-md">
            {allTopics.map((topic) => (
              <Link
                key={topic.slug}
                to={`/topics/${topic.slug}`}
                className="px-xl py-md bg-surface border border-border-default hover:bg-surface-container transition-colors font-sora text-label-caps text-on-surface"
              >
                {topic.title}
              </Link>
            ))}
          </div>
        </section>

        {/* More Stories: paginated grid, newest first */}
        {moreStories.length > 0 && (
          <section className="mt-giant pt-giant border-t border-border-default">
            <div className="flex justify-between items-center mb-xl gap-lg">
              <h2 className="font-sora text-article-title text-on-surface">More Stories</h2>
              {moreStories.length > 1 && (
                <SortControl value={sort} onChange={(v) => setSort(v as SortKey)} />
              )}
            </div>
            <LoadMore total={moreStories.length} initialCount={6} increment={6}>
              {(count) => (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
                  {moreStories.slice(0, count).map((story) => (
                    <ArticleCard
                      key={story.id}
                      article={{
                        id: story.id,
                        category: story.category,
                        title: story.title,
                        excerpt: story.excerpt,
                        image: story.image,
                        imageAlt: story.imageAlt,
                        href: story.href,
                        author: story.author,
                        date: story.date,
                        tags: story.tags,
                      }}
                    />
                  ))}
                </div>
              )}
            </LoadMore>
          </section>
        )}
      </main>
    </div>
  );
}
