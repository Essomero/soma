import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowRight, Loader2 } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import LoadMore from "@/components/ui/LoadMore";
import { useContentList, sortContent } from "@/lib/content";
import type { SortKey } from "@/lib/content";
import SortControl from "@/components/ui/SortControl";
import type { DocContent } from "@/types";
import { usePageMeta } from "@/hooks/usePageMeta";
import { coverUrl } from "@/lib/utils";

export default function DocsIndexPage() {
  const { data: docs, loading } = useContentList<DocContent>("doc");
  const [sort, setSort] = useState<SortKey>("newest");
  usePageMeta({ title: "Docs", description: "Lookup answers: setup references and infrastructure notes. Jump in anywhere." });
  if (loading) {
    return (
      <div className="pt-32 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-on-surface-muted" />
      </div>
    );
  }
  const active = sortContent((docs ?? []).filter((d) => !d.archived), sort);

  return (
    <div>
      <main className="pt-32 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop">
        <header className="mb-giant">
          <AccentBar variant="small" className="mb-md" />
          <p className="font-sora text-metadata-tag text-primary uppercase tracking-widest mb-sm">
            // DOCS
          </p>
          <h1 className="font-sora text-display-lg-mobile md:text-display-lg max-w-4xl text-on-surface">
            Reference <span className="text-gradient">material</span>.
          </h1>
          <p className="font-dm-sans text-body-lg text-on-surface-muted mt-lg max-w-2xl">
            Compressed Q&amp;A, snippets and tables. Written to be scanned and re-read : jump straight to the section you need.
          </p>
        </header>

        {active.length > 1 && (
          <div className="flex justify-end mb-lg">
            <SortControl value={sort} onChange={(v) => setSort(v as SortKey)} />
          </div>
        )}

        {active.length === 0 ? (
          <div className="text-center py-xxl border-2 border-dashed border-border-default rounded-xl">
            <FileText className="w-12 h-12 text-on-surface-muted mx-auto mb-md" />
            <p className="font-dm-sans text-body-lg text-on-surface-muted">No docs yet. Check back soon.</p>
          </div>
        ) : (
          <LoadMore total={active.length} initialCount={4} increment={4}>
            {(count) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                {active.slice(0, count).map((doc) => (
                  <Link
                    key={doc.slug}
                    to={`/docs/${doc.slug}`}
                    className="group block bg-surface-container-low border border-border-default rounded-xl overflow-hidden hover:border-primary/50 hover:-translate-y-1 transition-all"
                  >
                    <div className="aspect-video overflow-hidden">
                      <img
                        alt={doc.imageAlt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        src={coverUrl(doc?.image)}
                      />
                    </div>
                    <div className="p-xl">
                      <span className="font-sora text-metadata-tag text-primary uppercase tracking-widest">
                        {doc.sections.length} SECTIONS · {doc.date}
                      </span>
                      <h2 className="font-sora text-article-title text-on-surface group-hover:text-primary transition-colors mt-sm mb-sm">
                        {doc.title}
                      </h2>
                      <p className="font-dm-sans text-body-base text-on-surface-muted mb-lg">
                        {doc.description}
                      </p>
                      <span className="inline-flex items-center gap-sm font-sora text-label-caps text-primary uppercase">
                        Open doc <ArrowRight className="w-4 h-4" />
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
