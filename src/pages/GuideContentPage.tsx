import { Link, useParams } from "react-router-dom";
import { useState, useRef } from "react";
import { Minus, Terminal, UserCheck, AlertTriangle, Lightbulb, Shield, Zap, Loader2 } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import Tag from "@/components/ui/Tag";
import PullQuote from "@/components/ui/PullQuote";
import TipCard from "@/components/ui/TipCard";
import ArticleCard from "@/components/cards/ArticleCard";
import BentoCard from "@/components/cards/BentoCard";
import SidebarToc from "@/components/sections/SidebarToc";
import AuthorBio from "@/components/sections/AuthorBio";
import ShareButtons from "@/components/ui/ShareButtons";
import Comments from "@/components/ui/Comments";
import ContentBlocks from "@/components/ui/ContentBlocks";
import InlineHighlights from "@/components/ui/InlineHighlights";
import PrintButton from "@/components/ui/PrintButton";
import SafeImage from "@/components/ui/SafeImage";
import { Edit3 } from "lucide-react";
import { useContentItem, useContentList } from "@/lib/content";
import type { GuideContent } from "@/types";
import { useAuth } from "@/lib/AuthContext";
import { md, mdBlock, contentToMarkdown } from "@/lib/markdown";
import { type HighlightData } from "@/lib/highlights";

import type { BentoCardData, PullQuoteData } from "@/types";
import type { LucideIcon } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

// Icon map for tip cards (matches ship-soma pattern)
const tipIcons: Record<string, LucideIcon> = {
  Minus, Terminal, UserCheck, AlertTriangle, Lightbulb, Shield, Zap,
};


export default function GuideContentPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: guide, loading } = useContentItem<GuideContent>("guide", slug);
  const { data: guides } = useContentList<GuideContent>("guide");
  const { isOwner } = useAuth();
  const articleRef = useRef<HTMLElement>(null);
  const [highlights, setHighlights] = useState<HighlightData[]>([]);
  const highlightClickRef = useRef<(id: number) => void>(() => {});
  const content = guide ?? null;
  const otherGuides = (guides ?? []).filter((g) => g.id !== guide?.id).slice(0, 3);
  const storyText = [
    content?.intro || "",
    ...(content?.body || []),
    ...(content?.sections?.flatMap((s) => s.paragraphs.filter((p): p is string => typeof p === "string")) || []),
  ].join(" ");
  usePageMeta({ title: guide?.title, description: guide?.excerpt, image: guide?.image });

  // Extract TOC from ## headings (body) and structured section headings
  const tocBody = (content?.body || [])
    .filter((p) => /^##\s/.test(p.trim()))
    .map((p) => {
      const match = p.trim().match(/^##\s+(.+)$/);
      if (!match) return null;
      const rawTitle = match[1];
      const anchor = rawTitle.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      // Extract section number from "01. Title" pattern
      const numMatch = rawTitle.match(/^(\d{1,2})\.\s+(.+)$/);
      const num = numMatch ? numMatch[1].padStart(2, "0") : "";
      const title = numMatch ? numMatch[2] : rawTitle;
      return { number: num, title, href: `#${anchor}` };
    })
    .filter(Boolean) as { number: string; title: string; href: string }[];
  const tocSections = (content?.sections || []).map((s) => ({
    number: "",
    title: s.heading,
    href: `#${s.heading.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")}`,
  }));
  const tocItems = [...tocSections, ...tocBody];

  if (loading) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-on-surface-muted" />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <h1 className="font-sora text-headline-md text-on-surface mb-md">Guide Not Found</h1>
        <p className="text-on-surface-muted mb-xl">The guide you're looking for doesn't exist yet.</p>
        <Link to="/guides" className="text-primary hover:underline font-bold">
          ← Browse all guides
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-giant">
      <article ref={articleRef} className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
        {/* Hero Header : matches ship-soma layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-end mb-giant">
          <div className="lg:col-span-8">
            <AccentBar variant="small" className="mb-md" />
            <Tag variant="primary" className="mb-sm block">{guide.category}</Tag>
            <h1 className="font-sora text-headline-md text-on-surface mb-md max-w-4xl">
              {guide.title}
            </h1>
            <p className="font-dm-sans text-body-base text-on-surface-variant max-w-2xl text-xl" dangerouslySetInnerHTML={{ __html: md(guide.excerpt) }} />
          </div>
          <div className="lg:col-span-4 pb-sm flex lg:justify-end">
            <div className="flex flex-col gap-xs">
              <span className="font-sora text-metadata-tag uppercase tracking-widest text-on-surface-muted">
                Written By
              </span>
              <span className="font-sora text-label-caps text-on-surface">
                {guide.author?.name || "Soma"}
              </span>
              {guide.author?.title && (
                <span className="font-sora text-metadata-tag text-on-surface-muted">
                  {guide.author.title}
                </span>
              )}
              <div className="mt-sm flex items-center gap-sm">
                <PrintButton to={`/guides/${slug}/print`} compact />
                {isOwner && (
                  <Link
                    to={`/admin/guide/${slug}/edit`}
                    className="print:hidden inline-flex items-center gap-sm font-sora bg-primary text-on-primary border-primary hover:bg-primary-hover transition-all shadow-sm rounded-lg font-semibold px-md py-sm text-xs"
                    title="Edit guide"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Featured Image : wide 21:9, matches ship-soma */}
        <div className="w-full aspect-[21/9] mb-giant overflow-hidden rounded-xl border border-border-default group">
          <SafeImage
            alt={guide.imageAlt}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            src={guide.image}
          />
        </div>

        {/* Content Grid : 12-col with sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          {/* Sidebar : order-2 on mobile, order-1 on desktop */}
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="sticky top-24 space-y-xl">
              {tocItems.length > 0 && <SidebarToc items={tocItems} />}
              {guide.author && <AuthorBio author={guide.author} />}
              <ShareButtons
                variant="row"
                className="px-sm"
                publicToggleSlug={isOwner && slug ? slug : undefined}
                markdownContent={content ? contentToMarkdown({
                  title: guide?.title || "",
                  intro: content.intro,
                  body: content.body,
                  references: content.references,
                }) : ""}
              />
            </div>
          </aside>

          {/* Main Content : order-1 on mobile, order-2 on desktop */}
          <div className="lg:col-span-9 order-1 lg:order-2">
            <div className="prose prose-invert max-w-none">
              {content ? (
                <>
                  {/* Intro */}
                  <div className="mb-giant">
                    <div
                      className="font-dm-sans text-lg lg:text-xl text-on-surface-variant leading-relaxed drop-cap-container space-y-md"
                      dangerouslySetInnerHTML={{ __html: mdBlock(content.intro) }}
                    />
                  </div>

                  {/* Tip Cards : like ship-soma tips section */}
                  {content.tipCards && content.tipCards.length > 0 && (
                    <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-md mb-giant">
                      {content.tipCards.map((tip) => {
                        const Icon = tipIcons[tip.icon];
                        return Icon ? (
                          <TipCard
                            key={tip.title}
                            icon={Icon}
                            title={tip.title}
                            description={tip.description}
                            bgClass={tip.bgClass}
                            iconColorClass={tip.iconColorClass}
                          />
                        ) : null;
                      })}
                    </div>
                  )}

                  {/* Bento Highlights */}
                  {content.bentoHighlights && content.bentoHighlights.length > 0 && (
                    <div className="not-prose grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md my-giant">
                      {content.bentoHighlights.map((card) => (
                        <BentoCard key={card.title} card={card} />
                      ))}
                    </div>
                  )}

                  {/* Body with optional pull quote interleaving */}
                  {content.pullQuotes && content.pullQuotes.length > 0 ? (
                    (() => {
                      const chunks: string[][] = [];
                      const chunkSize = Math.ceil(content.body.length / (content.pullQuotes!.length + 1));
                      for (let i = 0; i < content.body.length; i += chunkSize) {
                        chunks.push(content.body.slice(i, i + chunkSize));
                      }
                      return chunks.map((chunk, i) => (
                        <div key={i}>
                          <ContentBlocks
                            blocks={chunk}
                            sectionIndex={i}
                            highlights={highlights}
                            onHighlightClick={(id) => highlightClickRef.current(id)}
                          />
                          {i < content.pullQuotes!.length && (
                            <PullQuote
                              variant={i === 0 ? "gradient-bar" : "border-left"}
                              quote={content.pullQuotes![i].quote}
                              attribution={content.pullQuotes![i].attribution}
                            />
                          )}
                        </div>
                      ));
                    })()
                  ) : (
                    <ContentBlocks
                      blocks={content.body}
                      highlights={highlights}
                      onHighlightClick={(id) => highlightClickRef.current(id)}
                    />
                  )}

                  {/* Structured sections (AI-authored guides with headings) */}
                  {content.sections && content.sections.length > 0 && (
                    <div className="mt-giant">
                      {content.sections.map((section, i) => {
                        const quoteBefore =
                          content.pullQuotes && i > 0
                            ? content.pullQuotes[i - 1]
                            : null;
                        return (
                          <div
                            key={section.heading}
                            id={section.heading.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")}
                            className="scroll-mt-24"
                          >
                            {quoteBefore && (
                              <PullQuote
                                variant={i === 1 ? "gradient-bar" : "border-left"}
                                quote={quoteBefore.quote}
                                attribution={quoteBefore.attribution}
                              />
                            )}
                            <div>
                              <h2
                                className="font-sora text-article-title text-on-surface pt-lg pb-md"
                                dangerouslySetInnerHTML={{ __html: md(section.heading) }}
                              />
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
                    </div>
                  )}
                </>
              ) : (
                <div className="font-dm-sans text-body-base leading-loose text-on-surface space-y-lg">
                  <p className="text-xl text-on-surface-variant">
                    Full guide content coming soon. This guide covers essential techniques and best practices for modern software development.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* References */}
      {content?.references && content.references.length > 0 && (
        <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant">
          <h2 className="font-sora text-headline-md text-on-surface mb-xl">References</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md max-w-4xl">
            {content.references.map((ref, i) => (
              <a
                key={i}
                id={`ref-${i + 1}`}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-sm p-md bg-surface-container-low border border-border-default rounded-lg hover:border-primary/50 transition-colors group scroll-mt-32"
              >
                <span className="font-sora text-xs text-on-surface-muted flex-shrink-0 mt-0.5">{i + 1}.</span>
                <div>
                  <p className="font-sora text-sm text-on-surface group-hover:text-primary transition-colors">{ref.title}</p>
                  {ref.description && (
                    <p className="font-dm-sans text-xs text-on-surface-muted mt-xs" dangerouslySetInnerHTML={{ __html: md(ref.description) }} />
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Comments */}
      {slug && content && (
        <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant">
          <Comments
            storySlug={slug}
            storyContext={{ title: guide?.title || "", body: content?.intro + "\n\n" + content?.body.join("\n\n") }}
          />
        </section>
      )}

      {/* More Guides */}
      <section className="bg-surface-container-low py-giant border-t border-border-default">
        <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
          <div className="flex justify-between items-end mb-xxl">
            <div>
              <AccentBar variant="small" className="mb-md" />
              <h2 className="font-sora text-headline-md text-on-surface">More Guides</h2>
            </div>
            <Link to="/guides" className="font-sora text-metadata-tag uppercase tracking-widest text-primary hover:underline pb-2">
              View all guides
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {otherGuides.map((g) => (
              <ArticleCard key={g.id} article={g} variant="story" />
            ))}
          </div>
        </div>
      </section>

      {slug && (
        <InlineHighlights
          slug={slug}
          storyText={storyText}
          storyTitle={guide?.title || ""}
          articleRef={articleRef}
          isOwner={isOwner}
          onHighlightsChange={setHighlights}
          highlightClickRef={highlightClickRef}
        />
      )}
    </div>
  );
}
