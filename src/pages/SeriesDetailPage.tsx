import { useParams, Link } from "react-router-dom";
import { ArrowRight, Clock, Layers, Check, Printer } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import AccentBar from "@/components/ui/AccentBar";
import Tag from "@/components/ui/Tag";
import { allSeries, allStories } from "@/content/registry";
import { useProgress } from "@/lib/useProgress";
import { getTotalReadingTime } from "@/lib/readingTime";
import { PublicToggleInline, useCollectionPublicState } from "@/components/ui/PublicToggle";
import { md } from "@/lib/markdown";

export default function SeriesDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const series = allSeries.find((s) => s.slug === (slug ?? ""));
  const episodeSlugs = series ? series.episodes.map((e) => e.storySlug) : [];
  const { isCompleted, toggle, progress } = useProgress(slug ?? "", episodeSlugs);
  const totalMinutes = series
    ? getTotalReadingTime(series.episodes.map((e) => e.storySlug), allStories)
    : 0;

  if (!series) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <h1 className="font-sora text-headline-md text-on-surface mb-md">Series Not Found</h1>
        <Link to="/series" className="text-primary hover:underline font-bold">
          ← Browse all series
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border-default">
        <div className="absolute inset-0 z-0">
          <img
            alt={series.imageAlt}
            className="w-full h-full object-cover opacity-30"
            src={series.image}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        <div className="relative z-10 max-w-readme mx-auto px-gutter md:px-margin-desktop pt-32 pb-giant">
          <AccentBar variant="editorial" className="mb-md" />
          <Tag variant="primary" className="mb-sm block">SERIES</Tag>
          <h1 className="font-sora text-display-lg-mobile md:text-display-lg text-on-surface mb-lg max-w-4xl">
            {series.title}
          </h1>
          <p className="font-sora text-article-title text-on-surface-variant max-w-2xl mb-lg" dangerouslySetInnerHTML={{ __html: md(series.description) }} />
          {series.tagline && (
            <p className="font-dm-sans text-body-lg text-on-surface-muted italic max-w-2xl mb-xl" dangerouslySetInnerHTML={{ __html: md(series.tagline) }} />
          )}
          <div className="flex items-center gap-md font-sora text-metadata-tag text-on-surface-muted">
            <span>{series.author.name}</span>
            <span className="text-secondary">//</span>
            <span>{series.episodes.length} episodes</span>
            <span className="text-secondary">//</span>
            <span>{progress}/{series.episodes.length} completed</span>
            <span className="text-secondary">//</span>
            <span>~{totalMinutes} min</span>
          </div>
          <div className="mt-lg w-full max-w-md h-1 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${series.episodes.length > 0 ? (progress / series.episodes.length) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-lg">
            <SeriesCollectionToggle slug={series.slug} episodeSlugs={series.episodes.map((e) => e.storySlug)} />
          </div>
        </div>
      </section>

      {/* Episodes */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant">
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-xl">
            <h2 className="font-sora text-headline-md text-on-surface flex items-center gap-sm">
              <Layers className="w-6 h-6 text-primary" />
              Episodes
            </h2>
            <Tooltip label="Download entire series as a PDF or printable book">
              <Link
                to={`/series/${series.slug}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-sm px-xl py-md rounded-lg font-sora text-sm font-semibold bg-surface-container-low border border-border-default text-on-surface hover:border-primary/50 hover:text-primary transition-all shadow-sm print:hidden"
              >
                <Printer className="w-4 h-4 text-primary" />
                <span>Download PDF</span>
              </Link>
            </Tooltip>
          </div>
          <div className="space-y-md">
            {series.episodes.map((episode, i) => {
              const story = allStories.find((s) => s.slug === episode.storySlug);
              return (
                <Link
                  key={episode.storySlug}
                  to={story ? `/stories/${episode.storySlug}` : "#"}
                  className="block group p-xl bg-surface-container-low border border-border-default rounded-xl hover:border-primary/50 hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start gap-lg">
                    <Tooltip label={isCompleted(episode.storySlug) ? "Mark as unread" : "Mark as completed"}>
                      <button
                        onClick={(e) => { e.preventDefault(); toggle(episode.storySlug); }}
                        className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center font-sora text-sm font-bold transition-all ${
                          isCompleted(episode.storySlug)
                            ? "bg-secondary/20 border-secondary text-secondary"
                            : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                        }`}
                      >
                        {isCompleted(episode.storySlug) ? <Check className="w-4 h-4" /> : i + 1}
                      </button>
                    </Tooltip>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-sm mb-sm">
                        <span className="font-sora text-metadata-tag text-on-surface-muted uppercase">
                          EPISODE {i + 1}
                        </span>
                        {story && (
                          <span className="flex items-center gap-xs text-on-surface-muted">
                            <Clock className="w-3 h-3" />
                            <span className="font-sora text-[10px] uppercase">{story.date}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="font-sora text-article-title text-on-surface group-hover:text-primary transition-colors mb-sm">
                        {episode.title}
                      </h3>
                      {episode.description && (
                        <p className="font-dm-sans text-body-base text-on-surface-muted" dangerouslySetInnerHTML={{ __html: md(episode.description) }} />
                      )}
                      {!story && (
                        <p className="font-dm-sans text-sm text-error mt-sm">Episode not yet published</p>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-on-surface-muted group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}

/** Inline toggle for the collection hero : makes all episodes public/private at once. */
function SeriesCollectionToggle({ slug, episodeSlugs }: { slug: string; episodeSlugs: string[] }) {
  const { isPublic, toggle } = useCollectionPublicState(slug, episodeSlugs);
  return <PublicToggleInline isPublic={isPublic} onToggle={toggle} label="Series" />;
}
