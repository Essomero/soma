import { useParams, Link } from "react-router-dom";
import { ArrowRight, Clock, BookOpen, Check, Printer, Loader2 } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import AccentBar from "@/components/ui/AccentBar";
import Tag from "@/components/ui/Tag";
import { useContentItem, useContentList } from "@/lib/content";
import type { BookContent, StoryContent } from "@/types";
import { useProgress } from "@/lib/useProgress";
import { getTotalReadingTime } from "@/lib/readingTime";
import { md } from "@/lib/markdown";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function BookDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: book, loading } = useContentItem<BookContent>("book", slug);
  const { data: stories } = useContentList<StoryContent>("story");
  const allStories = stories ?? [];
  const chapterSlugs = book ? book.chapters.map((ch) => ch.storySlug) : [];
  const { isCompleted, toggle, progress } = useProgress(slug ?? "", chapterSlugs);
  usePageMeta({ title: book?.title, description: book?.description, image: book?.image });
  const totalMinutes = book
    ? getTotalReadingTime(book.chapters.map((ch) => ch.storySlug), allStories)
    : 0;

  if (loading) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-on-surface-muted" />
      </div>
    );
  }


  if (!book) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <h1 className="font-sora text-headline-md text-on-surface mb-md">Book Not Found</h1>
        <Link to="/books" className="text-primary hover:underline font-bold">← Browse all books</Link>
      </div>
    );
  }

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border-default">
        <div className="absolute inset-0 z-0">
          <img alt={book.imageAlt} className="w-full h-full object-cover opacity-30" src={book.image} />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        <div className="relative z-10 max-w-readme mx-auto px-gutter md:px-margin-desktop pt-32 pb-giant">
          <AccentBar variant="editorial" className="mb-md" />
          <Tag variant="primary" className="mb-sm block">BOOK</Tag>
          <h1 className="font-sora text-display-lg-mobile md:text-display-lg text-on-surface mb-lg max-w-4xl">{book.title}</h1>
          <p className="font-sora text-article-title text-on-surface-variant max-w-2xl mb-lg" dangerouslySetInnerHTML={{ __html: md(book.description) }} />
          {book.tagline && <p className="font-dm-sans text-body-lg text-on-surface-muted italic max-w-2xl mb-xl" dangerouslySetInnerHTML={{ __html: md(book.tagline) }} />}
          <div className="flex items-center gap-md font-sora text-metadata-tag text-on-surface-muted">
            <span>{book.author.name}</span>
            <span className="text-secondary">//</span>
            <span>{book.chapters.length} chapters</span>
            <span className="text-secondary">//</span>
            <span>{progress}/{book.chapters.length} read</span>
            <span className="text-secondary">//</span>
            <span>~{totalMinutes} min</span>
          </div>
          <div className="mt-lg w-full max-w-md h-1 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${book.chapters.length > 0 ? (progress / book.chapters.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </section>

      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant">
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-xl">
            <h2 className="font-sora text-headline-md text-on-surface flex items-center gap-sm">
              <BookOpen className="w-6 h-6 text-primary" />
              Chapters
            </h2>
            <Tooltip label="Download entire book as a PDF or printable book">
              <Link
                to={`/books/${book.slug}/print`}
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
            {book.chapters.map((chapter, i) => {
              const story = allStories.find((s) => s.slug === chapter.storySlug);
              return (
                <Link
                  key={chapter.storySlug}
                  to={story ? `/stories/${chapter.storySlug}` : "#"}
                  className="block group p-xl bg-surface-container-low border border-border-default rounded-xl hover:border-primary/50 hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start gap-lg">
                    <Tooltip label={isCompleted(chapter.storySlug) ? "Mark as unread" : "Mark as read"}>
                      <button
                        onClick={(e) => { e.preventDefault(); toggle(chapter.storySlug); }}
                        className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center font-sora text-sm font-bold transition-all ${
                          isCompleted(chapter.storySlug)
                            ? "bg-secondary/20 border-secondary text-secondary"
                            : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                        }`}
                      >
                        {isCompleted(chapter.storySlug) ? <Check className="w-4 h-4" /> : i + 1}
                      </button>
                    </Tooltip>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-sm mb-sm">
                        <span className="font-sora text-metadata-tag text-on-surface-muted uppercase">CHAPTER {i + 1}</span>
                        {story && <span className="flex items-center gap-xs text-on-surface-muted"><Clock className="w-3 h-3" /><span className="font-sora text-[10px] uppercase">{story.date}</span></span>}
                      </div>
                      <h3 className="font-sora text-article-title text-on-surface group-hover:text-primary transition-colors mb-sm">{chapter.title}</h3>
                      {chapter.description && <p className="font-dm-sans text-body-base text-on-surface-muted" dangerouslySetInnerHTML={{ __html: md(chapter.description) }} />}
                      {!story && <p className="font-dm-sans text-sm text-error mt-sm">Chapter not yet published</p>}
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
