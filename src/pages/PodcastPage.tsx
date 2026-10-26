import { useState } from "react";
import { Link } from "react-router-dom";
import { Play, ArrowRight, Podcast, Radio, Rss, Share2, Loader2 } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import { useContentList, sortContent } from "@/lib/content";
import type { SortKey } from "@/lib/content";
import SortControl from "@/components/ui/SortControl";

// Topic chips for the podcast page (page config, not content).
const podcastTopics = [
  "Open Source", "Software Engineering", "Systems Architecture", "Community",
];
import type { PodcastEpisodeFull } from "@/types";
import { md } from "@/lib/markdown";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function PodcastPage() {
  const { data: episodes, loading } = useContentList<PodcastEpisodeFull>("podcast");
  const [sort, setSort] = useState<SortKey>("newest");
  usePageMeta({ title: "Podcast", description: "Ideas better heard than read: deep dives into technology, economics, and philosophy." });
  if (loading) {
    return (
      <div className="mt-16 py-giant text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-on-surface-muted" />
      </div>
    );
  }
  const allEpisodes = episodes ?? [];
  const ordered = sortContent(allEpisodes, sort);
  const featured = ordered[0];

  const featuredEpisode = {
    title: featured?.title || "Bridging code and community",
    episode: `Featured Episode // ${featured?.number || featured?.episode || ""}`,
    quote:
      "The community isn't just people using the software, it's people who care about where the software goes and why it exists.",
    image: featured?.image || "",
    imageAlt: featured?.imageAlt || "Podcast cover art",
    href: featured?.href || "/podcast",
  };
  return (
    <div>
      <main className="mt-16">
        {/* Hero: Featured Episode */}
        <section className="relative w-full overflow-hidden min-h-[70vh] flex items-center bg-surface-lowest">
          <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop w-full grid grid-cols-1 lg:grid-cols-12 gap-xxl py-giant items-center">
            {/* Left: Content */}
            <div className="lg:col-span-7 space-y-lg z-10">
              <AccentBar variant="small" className="mb-sm" />
              <p className="font-sora text-metadata-tag uppercase tracking-widest text-primary">
                {featuredEpisode.episode}
              </p>
              <h1 className="font-sora text-display-lg-mobile md:text-display-lg text-on-surface">
                {featuredEpisode.title}
              </h1>
              <div className="max-w-2xl">
                <blockquote className="font-sora text-article-title italic text-on-surface-variant mb-xl leading-relaxed">
                  &ldquo;{featuredEpisode.quote}&rdquo;
                </blockquote>
                <div className="flex flex-wrap gap-md items-center">
                  <Link
                    to={featuredEpisode.href}
                    className="bg-primary text-on-primary font-sora text-metadata-tag uppercase tracking-widest py-md px-xl rounded-lg hover:brightness-110 transition-all flex items-center gap-sm inline-flex"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Listen now
                  </Link>
                  <Link
                    to={featuredEpisode.href}
                    className="border border-border-default text-on-surface font-sora text-metadata-tag uppercase tracking-widest py-md px-xl rounded-lg hover:bg-surface-container-high transition-all inline-flex"
                  >
                    View Show Notes
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: Visual */}
            <div className="lg:col-span-5 relative group">
              <div className="absolute inset-0 bg-primary/10 rounded-xl -rotate-3 scale-105 group-hover:rotate-0 transition-transform duration-500" />
              <img
                alt={featuredEpisode.imageAlt}
                className="relative rounded-xl w-full aspect-[1.67] object-cover shadow-2xl"
                src={featuredEpisode.image}
              />
              <div className="absolute -bottom-4 -right-4 bg-secondary-container text-on-secondary-container p-sm px-md rounded-lg font-sora text-label-caps uppercase shadow-lg">
                Trending
              </div>
            </div>
          </div>
          <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none" />
        </section>

        {/* Recent Episodes */}
        <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant">
          <div className="flex justify-between items-end mb-xxl border-b border-border-default pb-lg">
            <div>
              <h2 className="font-sora text-headline-md mb-xs text-on-surface">Recent Episodes</h2>
              <p className="font-dm-sans text-body-base text-on-surface-muted">
                Stories from the people behind the code.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-md">
              {ordered.length > 1 && (
                <SortControl value={sort} onChange={(v) => setSort(v as SortKey)} />
              )}
              <button className="flex items-center gap-xs font-sora text-metadata-tag uppercase tracking-widest text-primary hover:underline">
                View all episodes <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-xl">
            {ordered.map((ep) => (
              <Link
                key={ep.id}
                to={ep.href}
                className="group border border-border-default bg-surface rounded-lg overflow-hidden hover:border-primary transition-all duration-300 hover:-translate-y-1 block"
              >
                <div className="relative overflow-hidden aspect-square">
                  <img
                    alt={ep.imageAlt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    src={ep.image}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-16 h-16 text-white fill-current" />
                  </div>
                </div>
                <div className="p-lg space-y-md">
                  <p className="font-sora text-metadata-tag text-on-surface-muted">{ep.episode}</p>
                  <h3 className="font-sora text-article-title group-hover:text-primary transition-colors text-on-surface">
                    {ep.title}
                  </h3>
                  <p className="font-dm-sans text-body-base text-on-surface-variant line-clamp-2" dangerouslySetInnerHTML={{ __html: md(ep.description) }} />
                  <div className="pt-sm flex gap-sm flex-wrap">
                    <span className="bg-surface-container-high px-sm py-xs rounded font-sora text-label-caps text-on-surface-muted">
                      {ep.duration}
                    </span>
                    <span className="bg-surface-container-high px-sm py-xs rounded font-sora text-label-caps text-on-surface-muted">
                      {ep.category}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Platform Links */}
        <section className="bg-surface-container py-giant border-y border-border-default">
          <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop grid grid-cols-1 gap-xxl items-center">
            <div className="grid grid-cols-2 gap-md">
              <div className="p-lg border border-border-default rounded-lg bg-surface flex flex-col items-center text-center space-y-sm hover:bg-surface-container-high transition-colors cursor-pointer">
                <Podcast className="w-8 h-8 text-primary" />
                <span className="font-sora text-label-caps uppercase text-on-surface">Apple Podcasts</span>
              </div>
              <div className="p-lg border border-border-default rounded-lg bg-surface flex flex-col items-center text-center space-y-sm hover:bg-surface-container-high transition-colors cursor-pointer">
                <Radio className="w-8 h-8 text-secondary" />
                <span className="font-sora text-label-caps uppercase text-on-surface">Spotify</span>
              </div>
              <a href="/podcast.xml" className="p-lg border border-border-default rounded-lg bg-surface flex flex-col items-center text-center space-y-sm hover:bg-surface-container-high transition-colors cursor-pointer">
                <Rss className="w-8 h-8 text-accent-orange" />
                <span className="font-sora text-label-caps uppercase text-on-surface">RSS Feed</span>
              </a>
              <div className="p-lg border border-border-default rounded-lg bg-surface flex flex-col items-center text-center space-y-sm hover:bg-surface-container-high transition-colors cursor-pointer">
                <Share2 className="w-8 h-8 text-primary-container" />
                <span className="font-sora text-label-caps uppercase text-on-surface">Overcast</span>
              </div>
            </div>
          </div>
        </section>

        {/* Topics Cloud */}
        <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
          <p className="font-sora text-metadata-tag uppercase tracking-widest text-on-surface-muted mb-lg">
            Explore Topics
          </p>
          <div className="flex flex-wrap justify-center gap-sm max-w-4xl mx-auto">
            {podcastTopics.map((topic) => (
              <span
                key={topic}
                className="px-md py-xs bg-surface-container border border-border-default rounded-full font-sora text-label-caps hover:bg-primary hover:text-on-primary transition-all cursor-pointer text-on-surface-muted"
              >
                {topic}
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
