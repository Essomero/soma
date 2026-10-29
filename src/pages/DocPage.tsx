import { Link, useParams } from "react-router-dom";
import { formatDate } from "@/lib/format-date";
import AccentBar from "@/components/ui/AccentBar";
import Tag from "@/components/ui/Tag";
import SidebarToc from "@/components/sections/SidebarToc";
import ContentBlocks from "@/components/ui/ContentBlocks";
import ShareButtons from "@/components/ui/ShareButtons";
import PrintButton from "@/components/ui/PrintButton";
import { SkeletonDocLayout } from "@/components/ui/Skeleton";
import { Edit3 } from "lucide-react";
import { useContentItem } from "@/lib/content";
import type { DocContent, TocItem } from "@/types";
import { md, contentToMarkdown } from "@/lib/markdown";
import { useAuth } from "@/lib/AuthContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import SafeImage from "@/components/ui/SafeImage";

export default function DocPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: doc, loading } = useContentItem<DocContent>("doc", slug);
  const { isOwner } = useAuth();
  usePageMeta({ title: doc?.title, description: doc?.description, image: doc?.image });

  if (loading) {
    return (
      <SkeletonDocLayout />
    );
  }


  if (!doc) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <h1 className="font-sora text-headline-md text-on-surface mb-md">Doc Not Found</h1>
        <p className="text-on-surface-muted mb-xl">The doc you're looking for doesn't exist yet.</p>
        <Link to="/docs" className="text-primary hover:underline font-bold">
          ← Browse all docs
        </Link>
      </div>
    );
  }

  // Anchors are declared on the content, not derived from heading text : the
  // TOC points at exactly the ids DocPage renders below.
  const tocItems: TocItem[] = doc.sections.map((s) => ({
    number: s.number,
    title: s.heading,
    href: `#${s.anchor}`,
  }));

  return (
    <div className="pt-32 pb-giant">
      <article className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
        {/* Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-end mb-giant">
          <div className="lg:col-span-8">
            <AccentBar variant="small" className="mb-md" />
            <Tag variant="primary" className="mb-sm block">{doc.category}</Tag>
            <h1 className="font-sora text-headline-md text-on-surface mb-md max-w-4xl">
              {doc.title}
            </h1>
            <p className="font-dm-sans text-body-base text-on-surface-variant max-w-2xl text-xl">
              {doc.description}
            </p>
          </div>
          <div className="lg:col-span-4 pb-sm flex lg:justify-end">
            <div className="flex flex-col gap-xs lg:text-right">
              <span className="font-sora text-metadata-tag uppercase tracking-widest text-on-surface-muted">
                Compiled By
              </span>
              <span className="font-sora text-label-caps text-on-surface">{doc.author.name}</span>
              <span className="font-sora text-metadata-tag text-on-surface-muted">{formatDate(doc.publishedAt)}</span>
              <div className="mt-sm flex lg:justify-end">
                <div className="flex items-center gap-sm">
                  <PrintButton to={`/docs/${slug}/print`} compact />
                  {isOwner && (
                    <Link to={`/admin/doc/${slug}/edit`}
                      className="print:hidden inline-flex items-center gap-sm font-sora bg-primary text-on-primary border-primary hover:bg-primary-hover transition-all shadow-sm rounded-lg font-semibold px-md py-sm text-xs"
                      title="Edit doc"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full aspect-[21/9] mb-giant overflow-hidden rounded-xl border border-border-default group">
          <SafeImage alt={doc.imageAlt}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            src={doc?.image}
          />
        </div>

        {/* Fill markers : the doc's own unfinished-work list */}
        {doc.fillMarkers && doc.fillMarkers.length > 0 && (
          <section className="mb-giant border border-accent-orange/40 bg-accent-orange/[0.06] rounded-xl p-xl">
            <div className="flex items-center gap-sm mb-md">
              <span className="w-2 h-2 rounded-full bg-accent-orange" />
              <h2 className="font-sora text-label-caps uppercase tracking-widest text-accent-orange">
                Fill before this doc is useful
              </h2>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-sm">
              {doc.fillMarkers.map((marker) => (
                <li key={marker} className="flex gap-sm font-dm-sans text-sm text-on-surface-variant">
                  <span className="text-accent-orange select-none">◆</span>
                  <span>{marker}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Content grid : 12-col with sticky TOC */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="sticky top-24 space-y-xl">
              {tocItems.length > 0 && <SidebarToc items={tocItems} label="In this Doc" />}
              <ShareButtons
                variant="row"
                publicToggleSlug={isOwner ? doc.slug : undefined}
                markdownContent={contentToMarkdown({
                  title: doc.title,
                  intro: doc.description,
                  sections: doc.sections.map((s) => ({
                    heading: s.number !== "·" ? `${s.number} ${s.heading}` : s.heading,
                    paragraphs: [
                      ...(s.intro ? [s.intro] : []),
                      ...s.items.flatMap((item) => [`Q: ${item.question}`, ...item.answer]),
                    ],
                  })),
                })}
              />
            </div>
          </aside>

          <div className="lg:col-span-9 order-1 lg:order-2">
            {doc.sections.map((section) => (
              <section key={section.anchor} className="mb-giant" id={section.anchor}>
                <div className="flex items-baseline gap-md mb-xl border-b border-border-default pb-md">
                  {section.number !== "·" && (
                    <span className="font-sora text-[40px] leading-none font-extrabold text-border-default shrink-0">
                      {section.number}
                    </span>
                  )}
                  <h2 className="font-sora text-article-title text-on-surface">{section.heading}</h2>
                </div>

                {section.intro && (
                  <p
                    className="font-dm-sans text-lg text-on-surface-variant leading-relaxed mb-xl max-w-3xl"
                    dangerouslySetInnerHTML={{ __html: md(section.intro) }}
                  />
                )}

                <div className="space-y-xxl">
                  {section.items.map((item) => (
                    <div key={item.question}>
                      <div className="flex gap-md items-start mb-md">
                        <span className="font-sora text-[11px] font-bold leading-none text-secondary border border-secondary/40 rounded px-sm py-xs shrink-0 mt-1">
                          Q
                        </span>
                        <h3 className="font-sora text-lg text-on-surface max-w-3xl">{item.question}</h3>
                      </div>
                      <div className="border-l-2 border-border-default pl-lg ml-xs">
                        <ContentBlocks blocks={item.answer} />
                      </div>
                    </div>
                  ))}
                </div>

                {section.callout && (
                  <div className="mt-xxl bg-surface-container-low border border-border-default border-l-2 border-l-primary rounded-r-lg p-lg">
                    <p className="font-sora text-label-caps uppercase tracking-widest text-primary mb-sm">
                      {section.callout.label}
                    </p>
                    <p className="font-dm-sans text-body-base text-on-surface-variant">
                      {section.callout.text}
                    </p>
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
