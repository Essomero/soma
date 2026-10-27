import { useState, useMemo } from "react";
import { Eye, Pencil, X } from "lucide-react";
import { md, mdBlock } from "@/lib/markdown";
import type { ContentBlock } from "@/types";
import type { AIDraft } from "./AIDraftPanel";

// ── Content preview ───────────────────────────────────
// Renders a draft the way the live article pages do: same type hierarchy
// (category → title → excerpt → author meta → intro → body → sections).
// ContentBlocks beyond plain paragraphs are summarized inline instead of
// running the full renderers (charts/3D need lifelike data; this preview
// is about the prose and structure).

interface ContentPreviewProps {
  draft: AIDraft;
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

export default function ContentPreview({ draft }: ContentPreviewProps) {
  const [open, setOpen] = useState(false);

  const body = useMemo(() => {
    const parts = (draft.body ?? []).slice(0, 4);
    return parts.length > 0 ? parts.map((p) => mdBlock(p)).join("") : "";
  }, [draft.body]);

  const sections = useMemo(
    () => (draft.sections ?? []).map((s) => ({
      heading: s.heading,
      html: (s.paragraphs ?? []).map(renderEntry).join(""),
    })),
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
    <div className="space-y-md">
      {/* Toggle buttons: Preview / Back to edit */}
      <div className="flex items-center gap-sm">
        {open ? (
          <button
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-sm px-md py-sm bg-surface border border-border-default text-on-surface font-sora text-xs uppercase tracking-widest hover:border-primary transition-colors"
          >
            <Pencil className="w-4 h-4" /> Back to edit
          </button>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-sm px-xl py-md bg-surface border border-border-default text-on-surface font-sora text-label-caps uppercase tracking-widest hover:border-primary transition-colors"
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
        )}
      </div>

      {open && (
        <div className="border border-border-default bg-surface">
          {/* Slim page chrome so the preview reads as a page, not a form */}
          <div className="flex items-center justify-between px-lg py-sm border-b border-border-default bg-surface-container">
            <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">
              PREVIEW
            </p>
            <button
              onClick={() => setOpen(false)}
              className="p-sm text-on-surface-muted hover:text-on-surface"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-xl md:p-xxl">
            {/* Hero meta */}
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
                {String(draft.body || []).length > 0
                  ? Math.max(1, Math.round(String(draft.body).split(/\s+/).length / 200)) + " min read"
                  : "1 min read"}
              </span>
            </div>

            {/* Intro */}
            {draft.intro && (
              <div
                className="preview-prose font-dm-sans text-body-base text-on-surface-variant mb-lg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: mdBlock(draft.intro) }}
              />
            )}

            {/* Body */}
            {body && (
              <div
                className="preview-prose font-dm-sans text-body-base text-on-surface-variant mb-lg leading-relaxed"
                dangerouslySetInnerHTML={{ __html: body }}
              />
            )}

            {/* Sections */}
            {sections.map((s, i) => (
              <section key={i} className="mb-lg">
                <h2 className="font-sora text-article-title text-on-surface mb-md">
                  {s.heading || `Section ${i + 1}`}
                </h2>
                <div
                  className="preview-prose font-dm-sans text-body-base text-on-surface-variant leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: s.html }}
                />
              </section>
            ))}

            {/* Doc Q&A sections */}
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

            {!draft.intro && !body && sections.length === 0 && docSections.length === 0 && (
              <p className="font-dm-sans text-sm text-on-surface-muted italic">
                Nothing to preview yet — fill in the intro and content above.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}