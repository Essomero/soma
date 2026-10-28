import { useMemo } from "react";
import { Pencil, X } from "lucide-react";
import { md, mdBlock } from "@/lib/markdown";
import type { ContentBlock } from "@/types";
import type { AIDraft } from "./AIDraftPanel";

// ── Content preview ───────────────────────────────────
// Renders a draft the way the live article pages do: same type hierarchy
// (category → title → excerpt → author meta → intro → body → sections).
// ContentBlocks beyond plain paragraphs are summarized inline instead of
// running the full renderers (charts/3D need lifelike data; this preview
// is about the prose and structure). The parent form swaps the editor out
// for this in preview mode.

interface ContentPreviewProps {
  draft: AIDraft;
  onBack?: () => void;
}

function blockSummary(block: ContentBlock): string {
  switch (block.type) {
    case "paragraph": return block.text;
    case "code": return `[code${block.filename ? `: ${block.filename}` : ""}]`;
    case "image": return `[image: ${block.alt || block.src.slice(0, 60)}]`;
    case "callout": return `[callout: ${block.title || block.variant}] ${block.text}`;
    case "math": return `[math: ${block.expression}]`;
    case "mermaid": return "[mermaid diagram]";
    case "youtube": return "[youtube embed]";
    case "horizontalRule": return "---";
    case "videoCallout": return `[video: ${block.title}]`;
    case "chart": return "[chart]";
    case "scene3d": return "[3d scene]";
    case "lab": return `[lab: ${block.title || "untitled"}] ${block.summary || ""}`;
  }
}

function isBlock(v: string | object): v is ContentBlock {
  return typeof v !== "string" && "type" in v;
}

/** Render one mixed paragraph entry to markdown HTML. */
function renderEntry(entry: string | object): string {
  if (typeof entry === "string") return mdBlock(entry);
  if (!isBlock(entry)) return "";
  const text = blockSummary(entry);
  return `<p class="preview-block-label">${text}</p>`;
}

export default function ContentPreview({ draft, onBack }: ContentPreviewProps) {
  const body = useMemo(() => {
    const parts = (draft.body ?? []).slice(0, 4);
    return parts.length > 0 ? parts.map((p) => mdBlock(p)).join('<div class="h-4"></div>') : "";
  }, [draft.body]);

  const sections = useMemo(
    () => (draft.sections ?? []).slice(0, 20).map((s) => {
      // Batch all paragraphs into one mdBlock call instead of per-paragraph,
      // which avoids hundreds of marked.parse + hljs invocations in large content.
      const combined = (s.paragraphs ?? [])
        .map((p) => (typeof p === "string" ? p : ""))
        .filter(Boolean)
        .join("\n\n");
      return {
        heading: s.heading,
        html: combined ? mdBlock(combined) : "",
      };
    }),
    [draft.sections],
  );

  const docSections = useMemo(
    () => (draft.docSections ?? []).map((s) => ({
      heading: s.heading,
      items: (s.items ?? []).map((item) => ({
        question: item.question,
        html: (item.answer ?? []).map(renderEntry).join(""),
      })),
    })),
    [draft.docSections],
  );

  return (
    <div className="border border-border-default bg-surface">
      {/* Page chrome */}
      <div className="flex items-center justify-between px-lg py-sm border-b border-border-default bg-surface-container">
        <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">
          PREVIEW
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-sm font-sora text-xs text-on-surface-muted hover:text-on-surface transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Back to edit
          </button>
        )}
      </div>

      {/* Page body — no inner scroll container: page scrolls naturally */}
      <div className="p-xl md:p-xxl">
        <div className="w-full h-1 bg-gradient-to-r from-primary to-secondary mb-lg" />
        <p className="font-sora text-metadata-tag text-secondary uppercase tracking-widest mb-sm">
          {draft.category || "CATEGORY"}
        </p>
        <h1 className="font-sora text-3xl md:text-headline-md mb-md leading-tight text-on-surface">
          {draft.title}
        </h1>
        <p
          className="font-sora text-article-title text-on-surface-variant mb-lg"
          dangerouslySetInnerHTML={{ __html: md(draft.excerpt || "") }}
        />
        <div className="flex flex-wrap items-center gap-sm font-sora text-metadata-tag text-primary uppercase tracking-widest mb-lg">
          <span>{draft.author?.name || "Author"}</span>
          {draft.date && (
            <>
              <span className="text-on-surface-muted">//</span>
              <span className="text-on-surface-muted">{draft.date}</span>
            </>
          )}
          <span className="text-on-surface-muted">//</span>
          <span className="text-on-surface-muted">
            {Math.max(1, Math.round(String(draft.body || []).split(/\s+/).length / 200)) + " min read"}
          </span>
        </div>

        {/* Intro (simple layout only — rich layout renders sections instead) */}
        {draft.intro && sections.length === 0 && (
          <div
            className="preview-prose font-dm-sans text-body-base text-on-surface-variant mb-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: mdBlock(draft.intro) }}
          />
        )}

        {/* Body (simple layout only) — in rich layout, body is replaced by sections */}
        {body && sections.length === 0 && (
          <div
            className="preview-prose font-dm-sans text-body-base text-on-surface-variant mb-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        )}

        {/* Bento highlights — rendered first in rich layout (matches StoryPage) */}
        {sections.length > 0 && (draft.bentoHighlights ?? []).length > 0 && (
          <div className="mb-lg grid grid-cols-1 sm:grid-cols-3 gap-md">
            {(draft.bentoHighlights ?? []).map((b, i) => (
              <div key={i} className="p-md bg-surface-container-low border border-border-default rounded-lg">
                <p className="font-sora text-[10px] font-bold text-primary uppercase tracking-widest mb-xs">{b.label}</p>
                <p className="font-sora text-sm font-semibold text-on-surface mb-xs">{b.title}</p>
                <p className="font-dm-sans text-xs text-on-surface-variant">{b.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Sections with interspersed pull quotes (quote i-1 before section i) */}
        {sections.length > 0 && (
          <>
            {sections.map((s, i) => {
              const quoteBefore =
                (draft.pullQuotes ?? []).length > 0 && i > 0
                  ? draft.pullQuotes[i - 1]
                  : null;

              return (
                <section key={i} className="mb-lg">
                  {quoteBefore && (
                    <blockquote className="border-l-4 border-primary pl-md italic font-dm-sans text-body-base text-on-surface-variant mb-lg">
                      <p>{quoteBefore.quote}</p>
                      {quoteBefore.attribution && (
                        <footer className="font-sora text-xs text-on-surface-muted mt-xs">— {quoteBefore.attribution}</footer>
                      )}
                    </blockquote>
                  )}
                  <h2 className="font-sora text-article-title text-on-surface mb-md">
                    {s.heading || `Section ${i + 1}`}
                  </h2>
                  <div
                    className="preview-prose font-dm-sans text-body-base text-on-surface-variant leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: s.html }}
                  />
                </section>
              );
            })}

            {/* Remaining pull quotes after last section */}
            {(draft.pullQuotes ?? []).length > sections.length - 1 && (
              <div className="space-y-md">
                {(draft.pullQuotes ?? []).slice(sections.length - 1).map((q, i) => (
                  <blockquote key={i} className="border-l-4 border-primary pl-md italic font-dm-sans text-body-base text-on-surface-variant">
                    <p>{q.quote}</p>
                    {q.attribution && (
                      <footer className="font-sora text-xs text-on-surface-muted mt-xs">— {q.attribution}</footer>
                    )}
                  </blockquote>
                ))}
              </div>
            )}
          </>
        )}

        {/* Doc Q&A sections — only when no story sections (docs page) */}
        {docSections.map((s, i) => (
          <section key={i} className="mb-lg">
            <h2 className="font-sora text-article-title text-on-surface mb-md">
              {s.heading || `Section ${i + 1}`}
            </h2>
            {s.items.map((item, j) => (
              <div key={j} className="mb-md">
                <p className="font-sora text-sm font-semibold text-on-surface mb-xs">{item.question}</p>
                <div
                  className="preview-prose font-dm-sans text-body-base text-on-surface-variant leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: item.html }}
                />
              </div>
            ))}
          </section>
        ))}

        {!draft.intro && !body && sections.length === 0 && docSections.length === 0 && (draft.pullQuotes ?? []).length === 0 && (draft.bentoHighlights ?? []).length === 0 && (draft.tipCards ?? []).length === 0 && (draft.references ?? []).length === 0 && (draft.tagline ?? "") === "" && (
          <p className="font-dm-sans text-sm text-on-surface-muted italic">
            Nothing to preview yet — fill in the intro and content above.
          </p>
        )}
      </div>

      {onBack && (
        <div className="px-lg py-sm border-t border-border-default bg-surface-container">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-sm px-md py-sm border border-border-default text-on-surface font-sora text-xs uppercase tracking-widest hover:border-primary transition-colors"
          >
            <X className="w-4 h-4" />
            Back to edit
          </button>
        </div>
      )}
    </div>
  );
}