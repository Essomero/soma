import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";
import { useContentItem } from "@/lib/content";
import { getReadingTime } from "@/lib/readingTime";
import { md } from "@/lib/markdown";
import ContentBlocks from "@/components/ui/ContentBlocks";
import { PrintLessonOpener } from "@/components/print/PrintCovers";
import type {
  StoryContent,
  GuideContent,
  DocContent,
  PodcastEpisodeFull,
} from "@/types";

export type SinglePrintType = "story" | "guide" | "doc" | "episode";

const TYPE_LABEL: Record<SinglePrintType, string> = {
  story: "LESSON",
  guide: "GUIDE",
  doc: "DOC",
  episode: "EPISODE",
};

function plainText(blocks: (string | { type: string })[]): string {
  return blocks.map((b) => (typeof b === "string" ? b : "")).join(" ");
}

function References({ items }: { items?: { title: string; url: string; description?: string }[] }) {
  if (!items || items.length === 0) return null;
  return (
    <footer className="mt-12 pt-6 border-t border-border-default avoid-break">
      <h2 className="font-sora text-sm font-bold uppercase tracking-wider text-on-surface mb-4">
        References &amp; Further Reading
      </h2>
      <ul className="space-y-2">
        {items.map((ref, i) => (
          <li key={i} className="font-dm-sans text-sm text-on-surface-muted">
            <span className="font-semibold text-on-surface mr-2">[{i + 1}]</span>
            <span className="text-primary font-medium">{ref.title}</span>
            <span className="ml-2 break-all">{ref.url}</span>
            {ref.description && <span className="ml-2">: {ref.description}</span>}
          </li>
        ))}
      </ul>
    </footer>
  );
}

export default function SinglePrintPage({ type, base }: { type: SinglePrintType; base: string }) {
  const { slug } = useParams<{ slug: string }>();
  const typeLabel = TYPE_LABEL[type];
  const backHref = slug ? `/${base}/${slug}` : `/${base}`;
  const apiType = type === "episode" ? "podcast" : type;

  const { data: item, loading } = useContentItem<StoryContent | GuideContent | DocContent | PodcastEpisodeFull>(apiType, slug);
  const story: StoryContent | undefined =
    type === "story" && item ? (item as StoryContent) : undefined;
  const guide: GuideContent | undefined =
    type === "guide" && item ? (item as GuideContent) : undefined;
  const doc: DocContent | undefined =
    type === "doc" && item ? (item as DocContent) : undefined;
  const episode: PodcastEpisodeFull | undefined =
    type === "episode" && item ? (item as PodcastEpisodeFull) : undefined;

  const found = story ?? guide ?? doc ?? episode ?? null;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-on-surface-muted">Loading print edition…</p>
      </div>
    );
  }


  const title = story?.title ?? guide?.title ?? doc?.title ?? episode?.title ?? "";
  const description =
    story?.excerpt ?? guide?.excerpt ?? doc?.description ?? episode?.description ?? "";
  const authorName =
    (story as { author?: { name: string } } | undefined)?.author?.name ??
    guide?.author?.name ??
    doc?.author?.name ??
    "Soma";
  const date =
    (story as { date?: string } | undefined)?.date ??
    guide?.date ??
    doc?.date ??
    episode?.date ??
    "";
  const minutes = (() => {
    if (story) {
      const text = [
        story.intro || "",
        ...plainText(story.body || []),
        ...(story.sections?.flatMap((s) =>
          s.paragraphs.filter((p): p is string => typeof p === "string")
        ) || []),
      ].join(" ");
      return getReadingTime(text);
    }
    if (guide) return getReadingTime([guide.intro || "", ...plainText(guide.body || [])].join(" "));
    if (doc) {
      const text = doc.sections
        .flatMap((s) => [
          s.intro || "",
          ...s.items.flatMap((it) => [it.question, ...plainText(it.answer)]),
        ])
        .join(" ");
      return getReadingTime(text);
    }
    if (episode) {
      const text = [
        episode.summary || "",
        ...(episode.transcript?.map((l) => l.text) || []),
      ].join(" ");
      return getReadingTime(text);
    }
    return 0;
  })();

  useEffect(() => {
    if (title) {
      const prev = document.title;
      document.title = `${title} : Soma Print Edition`;
      return () => {
        document.title = prev;
      };
    }
  }, [title]);

  if (!found) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="font-sora text-3xl font-bold mb-4">Content Not Found</h1>
        <p className="text-on-surface-muted mb-8">
          The requested {typeLabel.toLowerCase()} could not be located.
        </p>
        <Link
          to={backHref}
          className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Go back
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Controls bar : hidden in print (print:hidden) so the action never
          appears in the printed document or saved PDF. */}
      <aside
        aria-label="Print controls"
        className="print:hidden sticky top-0 z-40 w-full bg-surface-container/90 backdrop-blur-md border-b border-border-default px-4 sm:px-8 py-3.5 shadow-md"
      >
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <Link
            to={backHref}
            className="inline-flex items-center gap-2 text-sm font-sora font-semibold text-on-surface-muted hover:text-on-surface transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {typeLabel.toLowerCase()}</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs font-sora text-on-surface-muted hidden sm:inline">
              Tip: In print settings, select &ldquo;Margins: Default&rdquo; &amp;
              &ldquo;Background graphics: On&rdquo;
            </span>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary font-sora text-sm font-bold shadow hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="max-w-3xl mx-auto px-6 sm:px-8 py-12">
        <PrintLessonOpener
          kicker={typeLabel}
          title={title}
          standfirst={description || undefined}
          meta={[authorName, date, minutes > 0 ? `~${minutes} min read` : ""].filter(Boolean).join(" • ")}
          goals={
            story?.sections?.map((s) => s.heading) ??
            doc?.sections.map((s) => s.heading) ??
            episode?.segments?.map((s) => s.title)
          }
        />

        {/* Body */}
        <div className="pt-10 print:pt-8">
          {story && (
            <div className="space-y-8">
              {story.intro && (
                <div
                  className="font-dm-sans text-base text-on-surface leading-relaxed p-4 bg-surface-container-low border-l-4 border-primary rounded-r-lg"
                  dangerouslySetInnerHTML={{ __html: md(story.intro) }}
                />
              )}
              {story.body && story.body.length > 0 && (
                <ContentBlocks blocks={story.body} isPrint={true} />
              )}
              {story.sections?.map((section, i) => {
                const filtered = section.paragraphs.filter(
                  (p) => typeof p === "string" || p.type !== "lab"
                );
                if (filtered.length === 0) return null;
                return (
                  <section key={i} className="pt-6">
                    <h2 className="font-sora text-2xl font-bold text-on-surface mb-4 pb-2 border-b border-border-default/50 break-after-avoid">
                      {section.heading}
                    </h2>
                    <ContentBlocks blocks={filtered} isPrint={true} />
                  </section>
                );
              })}
              <References items={story.references} />
            </div>
          )}

          {guide && (
            <div className="space-y-8">
              {guide.intro && (
                <div
                  className="font-dm-sans text-base text-on-surface leading-relaxed p-4 bg-surface-container-low border-l-4 border-primary rounded-r-lg"
                  dangerouslySetInnerHTML={{ __html: md(guide.intro) }}
                />
              )}
              {guide.body && guide.body.length > 0 && (
                <ContentBlocks blocks={guide.body} isPrint={true} />
              )}
              <References items={guide.references} />
            </div>
          )}

          {doc && (
            <div className="space-y-12">
              {doc.sections.map((section) => (
                <section key={section.anchor}>
                  <h2 className="font-sora text-2xl font-bold text-on-surface mb-4 pb-2 border-b border-border-default/50 break-after-avoid">
                    {section.number !== "·" && (
                      <span className="text-primary mr-3">{section.number}</span>
                    )}
                    {section.heading}
                  </h2>
                  {section.intro && (
                    <p
                      className="font-dm-sans text-base text-on-surface-variant leading-relaxed mb-6"
                      dangerouslySetInnerHTML={{ __html: md(section.intro) }}
                    />
                  )}
                  <div className="space-y-8">
                    {section.items.map((item) => (
                      <div key={item.question} className="avoid-break">
                        <h3 className="font-sora text-lg font-bold text-on-surface mb-3">
                          {item.question}
                        </h3>
                        <div className="border-l-2 border-border-default pl-4">
                          <ContentBlocks blocks={item.answer} isPrint={true} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {section.callout && (
                    <div className="mt-6 bg-surface-container-low border border-border-default border-l-2 border-l-primary rounded-r-lg p-4 avoid-break">
                      <p className="font-sora text-xs font-bold uppercase tracking-widest text-primary mb-2">
                        {section.callout.label}
                      </p>
                      <p className="font-dm-sans text-sm text-on-surface-variant">
                        {section.callout.text}
                      </p>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}

          {episode && (
            <div className="space-y-10">
              {episode.summary && (
                <div
                  className="font-dm-sans text-base text-on-surface leading-relaxed p-4 bg-surface-container-low border-l-4 border-primary rounded-r-lg"
                  dangerouslySetInnerHTML={{ __html: md(episode.summary) }}
                />
              )}
              {episode.segments && episode.segments.length > 0 && (
                <section>
                  <h2 className="font-sora text-2xl font-bold text-on-surface mb-4 pb-2 border-b border-border-default/50 break-after-avoid">
                    Segments
                  </h2>
                  <ul className="space-y-3">
                    {episode.segments.map((seg) => (
                      <li key={seg.time} className="flex gap-4 avoid-break">
                        <span className="font-sora text-sm font-bold text-primary shrink-0">
                          {seg.time}
                        </span>
                        <div>
                          <p className="font-dm-sans font-bold text-on-surface">{seg.title}</p>
                          <p className="font-dm-sans text-sm text-on-surface-muted">
                            {seg.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {episode.transcript && episode.transcript.length > 0 && (
                <section>
                  <h2 className="font-sora text-2xl font-bold text-on-surface mb-4 pb-2 border-b border-border-default/50 break-after-avoid">
                    Full Transcript
                  </h2>
                  <div className="space-y-4 font-dm-sans text-sm text-on-surface-variant leading-relaxed">
                    {episode.transcript.map((line, i) => (
                      <div key={i} className="avoid-break">
                        <p className="font-bold text-on-surface text-xs uppercase tracking-wider mb-1">
                          {line.speaker}:
                        </p>
                        <p>{line.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {episode.guests && episode.guests.length > 0 && (
                <section className="avoid-break">
                  <h2 className="font-sora text-2xl font-bold text-on-surface mb-4 pb-2 border-b border-border-default/50 break-after-avoid">
                    Guests
                  </h2>
                  <ul className="space-y-3">
                    {episode.guests.map((guest) => (
                      <li key={guest.name} className="font-dm-sans text-sm">
                        <span className="font-bold text-on-surface">{guest.name}</span>
                        <span className="text-on-surface-muted"> : {guest.role}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
