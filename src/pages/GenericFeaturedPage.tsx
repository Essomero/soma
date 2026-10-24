import { useParams, Link } from "react-router-dom";
import { useState, useRef } from "react";
import ImmersiveHero from "@/components/sections/ImmersiveHero";
import SidebarAbout from "@/components/sections/SidebarAbout";
import ShareButtons from "@/components/ui/ShareButtons";
import BentoCard from "@/components/cards/BentoCard";
import PullQuote from "@/components/ui/PullQuote";
import ArticleCard from "@/components/cards/ArticleCard";
import AccentBar from "@/components/ui/AccentBar";
import ContentBlocks from "@/components/ui/ContentBlocks";
import InlineHighlights from "@/components/ui/InlineHighlights";
import { allFeatured } from "@/content/registry";
import { type HighlightData } from "@/lib/highlights";
import { md, contentToMarkdown } from "@/lib/markdown";

export default function GenericFeaturedPage() {
  const { slug } = useParams<{ slug: string }>();
  const article = allFeatured.find((f) => f.slug === slug);
  const articleRef = useRef<HTMLElement>(null);
  const [highlights, setHighlights] = useState<HighlightData[]>([]);
  const highlightClickRef = useRef<(id: number) => void>(() => {});
  const storyText = [article?.description || "", article?.tagline || "", ...(article?.sections?.flatMap(s => s.paragraphs.filter((p): p is string => typeof p === "string")) || [])].join(" ");

  if (!article) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <h1 className="font-sora text-headline-md text-on-surface mb-md">
          Article Not Found
        </h1>
        <p className="font-dm-sans text-body-base text-on-surface-muted mb-xl">
          The featured article "{slug}" doesn't exist.
        </p>
        <Link
          to="/"
          className="font-sora text-metadata-tag text-primary hover:underline"
        >
          ← BACK TO HOME
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Immersive Hero */}
      <ImmersiveHero
        tag={article.tag}
        title={article.title}
        description={article.description}
        author={article.author}
        date={article.date}
        image={article.image}
        imageAlt={article.imageAlt}
      />

      {/* Article Content */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant grid grid-cols-1 md:grid-cols-12 gap-giant">
        {/* Sidebar */}
        <aside className="md:col-span-3 space-y-xl border-t border-border-default pt-xl md:border-t-0 md:pt-0">
          <SidebarAbout />
          <div className="hidden md:block">
            <ShareButtons variant="column" markdownContent={contentToMarkdown({ title: article.title, intro: [article.tagline, article.description].filter(Boolean).join("\n\n"), sections: article.sections })} />
          </div>
        </aside>

        {/* Main Body */}
        <article ref={articleRef} className="md:col-span-8 space-y-xl">
          {/* Tagline */}
          {article.tagline && (
            <p className="font-dm-sans text-body-lg text-on-surface-variant italic max-w-3xl" dangerouslySetInnerHTML={{ __html: md(article.tagline) }} />
          )}

          {/* Bento Highlights */}
          {article.bentoHighlights && article.bentoHighlights.length > 0 && (
            <div
              className={`grid ${
                article.bentoHighlights.length === 4 || article.bentoHighlights.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              } gap-md my-giant`}
            >
              {article.bentoHighlights.map((card) => (
                <BentoCard key={card.title} card={card} />
              ))}
            </div>
          )}

          {/* Sections with interspersed pull quotes */}
          {article.sections?.map((section, i) => {
            // Determine which pull quote (if any) to show before this section
            const quoteBefore =
              article.pullQuotes && i > 0
                ? article.pullQuotes[i - 1]
                : null;

            return (
              <div key={section.heading}>
                {/* Pull quote before section (skip first section) */}
                {quoteBefore && (
                  <PullQuote
                    variant={i === 1 ? "gradient-bar" : "border-left"}
                    quote={quoteBefore.quote}
                    attribution={quoteBefore.attribution}
                  />
                )}

                <div>
                  <h2 className="font-sora text-article-title text-on-surface pt-lg pb-md" dangerouslySetInnerHTML={{ __html: md(section.heading) }} />
                  <ContentBlocks
                    blocks={section.paragraphs}
                    firstDropCap={i === 0}
                    sectionIndex={i}
                    isPractice={/practice/i.test(section.heading)}
                    highlights={highlights}
                    onHighlightClick={(id) => highlightClickRef.current(id)}
                  />
                </div>
              </div>
            );
          })}

          {/* Remaining pull quotes after last section */}
          {article.pullQuotes &&
            article.sections &&
            article.pullQuotes.length > article.sections.length - 1 && (
              <PullQuote
                variant="border-left"
                quote={
                  article.pullQuotes[article.pullQuotes.length - 1].quote
                }
                attribution={
                  article.pullQuotes[article.pullQuotes.length - 1]
                    .attribution
                }
              />
            )}
        </article>
      </section>

      {/* More Featured Articles */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant">
        <div className="flex justify-between items-end mb-xl">
          <div>
            <AccentBar variant="editorial" className="mb-md" />
            <h2 className="font-sora text-headline-md text-on-surface">
              More Featured
            </h2>
          </div>
          <Link
            to="/stories"
            className="font-sora text-metadata-tag text-primary hover:underline"
          >
            VIEW ALL STORIES
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {allFeatured
            .filter((f) => f.slug !== slug)
            .map((f) => (
              <ArticleCard
                key={f.slug}
                article={{
                  id: f.slug,
                  category: f.tag,
                  title: f.title,
                  excerpt: f.description,
                  image: f.image,
                  imageAlt: f.imageAlt,
                  href: `/featured/${f.slug}`,
                }}
              />
            ))}
        </div>
      </section>

      {slug && (
        <InlineHighlights
          slug={slug}
          storyText={storyText}
          storyTitle={article?.title || ""}
          articleRef={articleRef}
          isOwner={false}
          onHighlightsChange={setHighlights}
          highlightClickRef={highlightClickRef}
        />
      )}
    </div>
  );
}
