import { md } from "@/lib/markdown";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import LoadMore from "@/components/ui/LoadMore";
import { allBooks } from "@/content/registry";

export default function BooksIndexPage() {
  const active = allBooks
    .filter((b) => !b.archived)
    .sort((a, b) => new Date(b.added || b.date).getTime() - new Date(a.added || a.date).getTime());

  return (
    <div>
      <main className="pt-32 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop">
        <header className="mb-giant">
          <AccentBar variant="small" className="mb-md" />
          <p className="font-sora text-metadata-tag text-primary uppercase tracking-widest mb-sm">
            // BOOKS
          </p>
          <h1 className="font-sora text-display-lg-mobile md:text-display-lg max-w-4xl text-on-surface">
            Long-form <span className="text-gradient">reading</span>.
          </h1>
          <p className="font-dm-sans text-body-lg text-on-surface-muted mt-lg max-w-2xl">
            Books organized into chapters. Read cover to cover, or jump to the chapter you need. Each chapter is a full article with all the rich content you'd expect.
          </p>
        </header>

        {active.length === 0 ? (
          <div className="text-center py-xxl border-2 border-dashed border-border-default rounded-xl">
            <BookOpen className="w-12 h-12 text-on-surface-muted mx-auto mb-md" />
            <p className="font-dm-sans text-body-lg text-on-surface-muted">No books yet. Start writing one.</p>
          </div>
        ) : (
          <LoadMore total={active.length} initialCount={4} increment={4}>
            {(count) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                {active.slice(0, count).map((book) => (
                  <Link
                    key={book.slug}
                    to={`/books/${book.slug}`}
                    className="group block bg-surface-container-low border border-border-default rounded-xl overflow-hidden hover:border-primary/50 hover:-translate-y-1 transition-all"
                  >
                    <div className="aspect-video overflow-hidden">
                      <img alt={book.imageAlt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={book.image} />
                    </div>
                    <div className="p-xl">
                      <span className="font-sora text-metadata-tag text-primary uppercase tracking-widest">
                        {book.chapters.length} CHAPTERS
                      </span>
                      <h2 className="font-sora text-article-title text-on-surface group-hover:text-primary transition-colors mt-sm mb-sm">
                        {book.title}
                      </h2>
                      <p className="font-dm-sans text-body-base text-on-surface-muted mb-lg"><span dangerouslySetInnerHTML={{ __html: md(book.description) }} /></p>
                      <span className="inline-flex items-center gap-sm font-sora text-label-caps text-primary uppercase">
                        Start reading <ArrowRight className="w-4 h-4" />
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
