import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Printer, BookOpen } from "lucide-react";
import { useContentItem, useContentList } from "@/lib/content";
import { getTotalReadingTime } from "@/lib/readingTime";
import { md } from "@/lib/markdown";
import ContentBlocks from "@/components/ui/ContentBlocks";
import { PrintCoverFront, PrintLessonOpener, PrintCoverBack } from "@/components/print/PrintCovers";
import { artFor } from "@/cover-art";
import type { CourseContent, SeriesContent, BookContent, StoryContent, CollectionCover } from "@/types";

interface CollectionItem {
  title: string;
  storySlug: string;
  description?: string;
}

interface NormalizedCollection {
  typeLabel: string;
  title: string;
  description: string;
  tagline?: string;
  author: { name: string };
  date: string;
  image?: string;
  imageAlt?: string;
  backHref: string;
  slug: string;
  cover?: CollectionCover;
  items: CollectionItem[];
}

export default function CollectionPrintPage({ type }: { type: "course" | "series" | "book" }) {
  const { slug } = useParams<{ slug: string }>();
  const { data: item, loading } = useContentItem<CourseContent | SeriesContent | BookContent>(type, slug);
  const { data: stories } = useContentList<StoryContent>("story");
  const allStories = stories ?? [];

  // Resolve collection based on type and slug
  const collection: NormalizedCollection | null = (() => {
    if (!slug || !item) return null;

    if (type === "course") {
      const course = item as CourseContent;
      if (!course) return null;
      return {
        typeLabel: "COURSE",
        title: course.title,
        description: course.description,
        tagline: course.tagline,
        author: course.author,
        date: course.date,
        image: course.image,
        imageAlt: course.imageAlt,
        backHref: `/courses/${course.slug}`,
        slug: course.slug,
        cover: course.cover,
        items: course.lessons,
      };
    }

    if (type === "series") {
      const series = item as SeriesContent;
      if (!series) return null;
      return {
        typeLabel: "SERIES",
        title: series.title,
        description: series.description,
        tagline: series.tagline,
        author: series.author,
        date: series.date,
        image: series.image,
        imageAlt: series.imageAlt,
        backHref: `/series/${series.slug}`,
        slug: series.slug,
        cover: series.cover,
        items: series.episodes,
      };
    }

    if (type === "book") {
      const book = item as BookContent;
      if (!book) return null;
      return {
        typeLabel: "BOOK",
        title: book.title,
        description: book.description,
        tagline: book.tagline,
        author: book.author,
        date: book.date,
        image: book.image,
        imageAlt: book.imageAlt,
        backHref: `/books/${book.slug}`,
        slug: book.slug,
        cover: book.cover,
        items: book.chapters,
      };
    }

    return null;
  })();

  const totalMinutes = collection
    ? getTotalReadingTime(collection.items.map((it) => it.storySlug), allStories)
    : 0;
  const itemNoun =
    collection?.typeLabel === "COURSE" ? "Lessons" : collection?.typeLabel === "SERIES" ? "Episodes" : "Chapters";
  const frontBlurb =
    collection?.cover?.frontBlurb ?? collection?.tagline ?? collection?.description ?? "";
  const backBlurb = collection?.cover?.backBlurb ?? collection?.description ?? "";

  // Set document title for cleaner PDF naming
  useEffect(() => {
    if (collection) {
      const prevTitle = document.title;
      document.title = `${collection.title} : Soma Print Edition`;
      return () => {
        document.title = prevTitle;
      };
    }
  }, [collection]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-on-surface-muted">Loading print edition…</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="font-sora text-3xl font-bold mb-4">Collection Not Found</h1>
        <p className="text-on-surface-muted mb-8">
          The requested {type} could not be located.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Home
        </Link>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* ── Floating Controls Bar (Hidden during Print) ─────────────── */}
      <aside
        aria-label="Print controls"
        className="print:hidden sticky top-0 z-40 w-full bg-surface-container/90 backdrop-blur-md border-b border-border-default px-4 sm:px-8 py-3.5 shadow-md"
      >
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <Link
            to={collection.backHref}
            className="inline-flex items-center gap-2 text-sm font-sora font-semibold text-on-surface-muted hover:text-on-surface transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {collection.typeLabel.toLowerCase()}</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xs font-sora text-on-surface-muted hidden sm:inline">
              Tip: In print settings, select &ldquo;Margins: Default&rdquo; &amp; &ldquo;Background graphics: On&rdquo;
            </span>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary font-sora text-sm font-bold shadow hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Printable Book Container ─────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-6 sm:px-8 py-12 print:py-0">
        <PrintCoverFront
          typeLabel={collection.typeLabel}
          title={collection.title}
          blurb={frontBlurb}
          authorName={collection.author.name}
          date={collection.date}
          itemCount={collection.items.length}
          itemNoun={itemNoun}
          totalMinutes={totalMinutes}
          slug={collection.slug}
          pattern={collection.cover?.pattern}
          edition={collection.cover?.edition}
          art={artFor(collection.slug)}
        />

        {/* ── Table of Contents ──────────────────────────────────────── */}
        <section className="py-10 print:pt-16 print:pb-8 border-b border-border-default print:border-none">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-sora text-xl font-bold uppercase tracking-wide">
              Table of Contents
            </h2>
            <span className="text-xs font-sora text-on-surface-muted font-normal ml-2">
              ({collection.items.length} {collection.typeLabel === "COURSE" ? "lessons" : collection.typeLabel === "SERIES" ? "episodes" : "chapters"})
            </span>
          </div>

          <div className={collection.items.length > 12 ? "grid grid-cols-2 gap-x-8 gap-y-1" : "divide-y divide-border-default/40"}>
            {collection.items.map((item, index) => {
              const story = allStories.find((s: StoryContent) => s.slug === item.storySlug);
              const num = index + 1;
              const numStr = num < 10 ? `0${num}` : `${num}`;
              return (
                <div
                  key={item.storySlug}
                  className="py-1 flex items-baseline justify-between gap-2.5 text-xs border-b border-border-default/20"
                >
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="font-mono font-bold text-primary tabular-nums shrink-0 w-5">
                      {numStr}
                    </span>
                    <a
                      href={`#lesson-${num}`}
                      className="font-sora font-medium text-on-surface hover:text-primary truncate"
                    >
                      {item.title}
                    </a>
                  </div>
                  {story && (
                    <span className="text-[10px] text-on-surface-muted tabular-nums shrink-0">
                      {story.date}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Sequential Lessons ─────────────────────────────────────── */}
        <div className="space-y-16 print:space-y-0">
          <table className="print-lesson-table">
            <thead className="print-lesson-thead">
              <tr>
                <td className="print-lesson-header-cell">
                  <div className="print-running-header">
                    <span className="font-sora font-bold text-[8pt] tracking-widest uppercase text-on-surface-muted">
                      SOMA // {collection.typeLabel}
                    </span>
                    <span className="font-sora font-medium text-[8pt] text-on-surface-muted truncate max-w-[380px]">
                      {collection.title}
                    </span>
                  </div>
                </td>
              </tr>
            </thead>
            <tfoot className="print-lesson-tfoot">
              <tr>
                <td className="print-lesson-footer-cell">
                  <div className="print-running-footer">
                    <span className="font-sora text-[7.5pt] text-on-surface-muted/60">
                      {collection.title} : Soma Print Edition
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
            <tbody className="print-lesson-tbody">
              <tr>
                <td className="print-lesson-body-cell">
                  {collection.items.map((item, index) => {
                    const story = allStories.find((s: StoryContent) => s.slug === item.storySlug);
                    const lessonNumber = index + 1;

                    return (
                      <article
                        key={item.storySlug}
                        id={`lesson-${lessonNumber}`}
                        className="break-before-page print:pt-8 scroll-mt-24"
                      >
                <PrintLessonOpener
                  kicker={
                    collection.typeLabel === "COURSE"
                      ? `Lesson ${lessonNumber}`
                      : collection.typeLabel === "SERIES"
                      ? `Episode ${lessonNumber}`
                      : `Chapter ${lessonNumber}`
                  }
                  indexLabel={lessonNumber < 10 ? `0${lessonNumber}` : `${lessonNumber}`}
                  title={item.title}
                  standfirst={story?.excerpt}
                  meta={story?.date}
                  goals={story?.sections?.map((s) => s.heading)}
                />

                {/* Lesson Body Content */}
                {story ? (
                  <div className="space-y-8">
                    {/* Intro */}
                    {story.intro && (
                      <div
                        className="font-dm-sans text-base text-on-surface leading-relaxed p-4 bg-surface-container-low border-l-4 border-primary rounded-r-lg"
                        dangerouslySetInnerHTML={{ __html: md(story.intro) }}
                      />
                    )}

                    {/* Paragraphs body */}
                    {story.body && story.body.length > 0 && (
                      <ContentBlocks blocks={story.body} isPrint={true} />
                    )}

                    {/* Structured Sections (labs omitted per markdown copy rules) */}
                    {story.sections &&
                      story.sections.map((section, secIdx) => {
                        const filteredParagraphs = section.paragraphs.filter(
                          (p) => typeof p === "string" || p.type !== "lab"
                        );
                        if (filteredParagraphs.length === 0) return null;
                        return (
                          <section key={secIdx} className="pt-6">
                            <h3 className="font-sora text-2xl font-bold text-on-surface mb-4 pb-2 border-b border-border-default/50 break-after-avoid">
                              {section.heading}
                            </h3>
                            <ContentBlocks blocks={filteredParagraphs} isPrint={true} />
                          </section>
                        );
                      })}

                    {/* References */}
                    {story.references && story.references.length > 0 && (
                      <footer className="mt-12 pt-6 border-t border-border-default avoid-break">
                        <h4 className="font-sora text-sm font-bold uppercase tracking-wider text-on-surface mb-4">
                          References &amp; Further Reading
                        </h4>
                        <ul className="space-y-2">
                          {story.references.map((ref, refIdx) => (
                            <li key={refIdx} className="font-dm-sans text-sm text-on-surface-muted">
                              <span className="font-semibold text-on-surface mr-2">
                                [{refIdx + 1}]
                              </span>
                              <span className="text-primary font-medium">{ref.title}</span>
                              {ref.description && (
                                <span className="ml-2 text-on-surface-muted">
                                  : {ref.description}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </footer>
                    )}
                  </div>
                ) : (
                  <div className="p-8 bg-surface-container-low border border-border-default rounded-xl text-center">
                    <p className="font-dm-sans text-on-surface-muted italic">
                      Lesson content is coming soon or yet to be published.
                    </p>
                  </div>
                )}
                      </article>
                    );
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <PrintCoverBack
          title={collection.title}
          typeLabel={collection.typeLabel}
          blurb={backBlurb}
          livePath={collection.backHref}
          date={collection.date}
          totalMinutes={totalMinutes}
          itemCount={collection.items.length}
          itemNoun={itemNoun}
          highlights={collection.items.slice(0, 6).map((i) => i.title)}
        />
      </main>
    </div>
  );
}
