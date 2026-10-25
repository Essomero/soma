import { md } from "@/lib/markdown";
import { Link } from "react-router-dom";
import { Layers, ArrowRight, Loader2 } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import LoadMore from "@/components/ui/LoadMore";
import { useContentList } from "@/lib/content";
import type { SeriesContent } from "@/types";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function SeriesIndexPage() {
  const { data: series, loading } = useContentList<SeriesContent>("series");
  usePageMeta({ title: "Series", description: "Build logs released over time: episodes that stand alone but gain meaning in sequence." });
  if (loading) {
    return (
      <div className="pt-32 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-on-surface-muted" />
      </div>
    );
  }
  const active = (series ?? [])
    .filter((s) => !s.archived)
    .sort((a, b) => new Date(b.added || b.date).getTime() - new Date(a.added || a.date).getTime());

  return (
    <div>
      <main className="pt-32 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop">
        <header className="mb-giant">
          <AccentBar variant="small" className="mb-md" />
          <p className="font-sora text-metadata-tag text-primary uppercase tracking-widest mb-sm">
            // SERIES
          </p>
          <h1 className="font-sora text-display-lg-mobile md:text-display-lg max-w-4xl text-on-surface">
            Multi-part <span className="text-gradient">explorations</span>.
          </h1>
          <p className="font-dm-sans text-body-lg text-on-surface-muted mt-lg max-w-2xl">
            Deep dives that unfold across multiple articles. Each episode builds on the last : read in sequence or jump to what interests you.
          </p>
        </header>

        {active.length === 0 ? (
          <div className="text-center py-xxl border-2 border-dashed border-border-default rounded-xl">
            <Layers className="w-12 h-12 text-on-surface-muted mx-auto mb-md" />
            <p className="font-dm-sans text-body-lg text-on-surface-muted">No series yet. Check back soon.</p>
          </div>
        ) : (
          <LoadMore total={active.length} initialCount={4} increment={4}>
            {(count) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                {active.slice(0, count).map((series) => (
                  <Link
                    key={series.slug}
                    to={`/series/${series.slug}`}
                    className="group block bg-surface-container-low border border-border-default rounded-xl overflow-hidden hover:border-primary/50 hover:-translate-y-1 transition-all"
                  >
                    <div className="aspect-video overflow-hidden">
                      <img
                        alt={series.imageAlt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        src={series.image}
                      />
                    </div>
                    <div className="p-xl">
                      <span className="font-sora text-metadata-tag text-primary uppercase tracking-widest">
                        {series.episodes.length} EPISODES
                      </span>
                      <h2 className="font-sora text-article-title text-on-surface group-hover:text-primary transition-colors mt-sm mb-sm">
                        {series.title}
                      </h2>
                      <p className="font-dm-sans text-body-base text-on-surface-muted mb-lg">
                        <span dangerouslySetInnerHTML={{ __html: md(series.description) }} />
                      </p>
                      <span className="inline-flex items-center gap-sm font-sora text-label-caps text-primary uppercase">
                        Explore series <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </LoadMore>
        )}
      </main>

    </div>
  );
}
