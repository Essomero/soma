import { md } from "@/lib/markdown";
import { Link } from "react-router-dom";
import { Archive } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import ArticleCard from "@/components/cards/ArticleCard";
import LoadMore from "@/components/ui/LoadMore";
import NewsletterSignup from "@/components/ui/NewsletterSignup";
import { allStories } from "@/content/registry";
import { useAllReadSlugs } from "@/lib/useProgress";

export default function ArchivePage() {
  const readSlugs = useAllReadSlugs();
  const archived = allStories
    .filter((s) => s.archived)
    .sort((a, b) => { const au = readSlugs.has(a.slug) ? 1 : 0; const bu = readSlugs.has(b.slug) ? 1 : 0; if (au !== bu) return au - bu; return new Date(b.added || b.date).getTime() - new Date(a.added || a.date).getTime(); });

  // Group by year
  const byYear = new Map<string, typeof archived>();
  archived.forEach((s) => {
    const year = new Date(s.date).getFullYear().toString();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(s);
  });

  const years = [...byYear.keys()].sort((a, b) => parseInt(b) - parseInt(a));

  return (
    <div>
      <main className="pt-32 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop">
        <header className="mb-giant">
          <AccentBar variant="small" className="mb-md" />
          <p className="font-sora text-metadata-tag text-primary uppercase tracking-widest mb-sm">
            // ARCHIVE
          </p>
          <h1 className="font-sora text-display-lg-mobile md:text-display-lg max-w-4xl text-on-surface">
            The <span className="text-gradient">back</span> catalog.
          </h1>
          <p className="font-dm-sans text-body-lg text-on-surface-muted mt-lg max-w-2xl">
            Older articles and research, organized by year. Still relevant : just not on the front page.
          </p>
        </header>

        {archived.length === 0 ? (
          <div className="text-center py-xxl border-2 border-dashed border-border-default rounded-xl">
            <Archive className="w-12 h-12 text-on-surface-muted mx-auto mb-md" />
            <p className="font-dm-sans text-body-lg text-on-surface-muted">Nothing archived yet. Stories marked as archived will appear here.</p>
          </div>
        ) : (
          <div className="space-y-xxl">
            {years.map((year) => {
              const yearStories = byYear.get(year)!;
              return (
                <section key={year}>
                  <h2 className="font-sora text-headline-md text-on-surface mb-xl flex items-center gap-sm">
                    <span className="text-primary">{year}</span>
                    <span className="font-dm-sans text-body-base text-on-surface-muted font-normal">
                      ({yearStories.length} {yearStories.length === 1 ? "article" : "articles"})
                    </span>
                  </h2>
                  <LoadMore total={yearStories.length} initialCount={6} increment={6}>
                    {(count) => (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
                        {yearStories.slice(0, count).map((story) => (
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
              );
            })}
          </div>
        )}
      </main>

      <NewsletterSignup variant="subtle" />
    </div>
  );
}
