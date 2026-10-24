import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import katex from "katex";
import hljs from "highlight.js";
import type { ContentBlock } from "@/types";
import { mdBlock } from "@/lib/markdown";
import { useScrollLock } from "@/lib/useScrollLock";
import HighlightRenderer from "@/components/ui/HighlightRenderer";
import MarkdownHtml from "@/components/ui/MarkdownHtml";
import ChartBlock from "@/components/ui/ChartBlock";
import Scene3DBlock from "@/components/ui/Scene3DBlock";
import LabBlock from "@/components/ui/LabBlock";
import type { HighlightData } from "@/lib/highlights";
import Tooltip from "@/components/ui/Tooltip";
import { PracticeHintBlock, PracticeSolutionBlock, parsePracticeBlock } from "@/components/ui/PracticeBlocks";
import type { LessonLinks } from "@/lib/storyLinks";
import { useTheme } from "@/lib/ThemeContext";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";
interface ContentBlocksProps {
  blocks: (string | ContentBlock)[];
  firstDropCap?: boolean;
  sectionIndex?: number;
  highlights?: HighlightData[];
  onHighlightClick?: (id: number) => void;
  isPractice?: boolean;
  isPrint?: boolean;
  /** Section number → anchor id, forwarded so hints can link their references. */
  sectionRefs?: Map<string, string>;
  /** Lessons the story can point at, forwarded to hints. */
  lessonLinks?: LessonLinks;
}

function isContentBlock(item: string | ContentBlock): item is ContentBlock {
  return typeof item !== "string";
}

// ── Copy-to-clipboard button for code blocks ────────────
function CopyCodeButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API unavailable : silently ignore
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="text-on-surface-muted hover:text-on-surface transition-colors p-xs rounded"
      aria-label="Copy code"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

// ── Mermaid diagram renderer (expandable on click) ─────
function MermaidBlock({ diagram, caption }: { diagram: string; caption?: string }) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<string>("");
  // When overlay opens, strip fixed dimensions from the SVG so it scales to fill
  useEffect(() => {
    if (expanded && overlayRef.current) {
      const svg = overlayRef.current.querySelector("svg");
      if (svg) {
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.maxWidth = "90vw";
        svg.style.maxHeight = "85vh";
      }
    }
  }, [expanded]);

  // Freeze page scroll behind the zoom overlay
  useScrollLock(expanded);

  // Esc to close the zoom overlay
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded]);

  useEffect(() => {
    let cancelled = false;
    import("mermaid").then((mermaid) => {
      if (cancelled || !ref.current) return;
      const isDark = theme === "dark";
      mermaid.default.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "neutral",
        themeVariables: isDark
          ? {
              darkMode: true,
              background: "#181c22",
            }
          : {
              darkMode: false,
              background: "#ffffff",
              primaryColor: "#f1f5f9",
              primaryTextColor: "#0f172a",
              primaryBorderColor: "#cbd5e1",
              lineColor: "#64748b",
              secondaryColor: "#f8fafc",
              tertiaryColor: "#ffffff",
            },
      });
      const renderId = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      mermaid.default
        .render(renderId, diagram)
        .then(({ svg }) => {
          if (ref.current && !cancelled) {
            svgRef.current = svg;
            ref.current.innerHTML = svg;
          }
        })
        .catch(() => {
          if (ref.current && !cancelled) {
            ref.current.innerHTML = `<pre class="text-error text-sm">Failed to render diagram</pre>`;
          }
        });
    });
    return () => { cancelled = true; };
  }, [diagram, theme]);

  return (
    <>
      <figure className="my-xxl">
        <Tooltip label="Click to expand">
          <div
            ref={ref}
            onClick={() => setExpanded(true)}
            className="flex justify-center p-xl bg-surface-container-low rounded-lg border border-border-default overflow-x-auto cursor-zoom-in hover:border-primary/50 transition-colors"
          >
            <div className="w-full flex justify-center" />
          </div>
        </Tooltip>
        {caption && (
          <figcaption className="mt-md font-dm-sans text-sm text-on-surface-muted italic text-center">
            {caption}
          </figcaption>
        )}
      </figure>

      {/* Expanded overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-xl cursor-zoom-out"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute top-md right-md inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface text-on-surface-muted hover:text-on-surface border border-border-default hover:border-primary/50 transition-colors z-10"
            onClick={() => setExpanded(false)}
          >
            <X size={18} strokeWidth={2} />
          </button>
          <div
            className="w-full h-full flex items-center justify-center p-xxl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              ref={overlayRef}
              className="w-full h-full flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: svgRef.current }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ── Image renderer (expandable on click) ───────────────
function ImageBlock({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  const [expanded, setExpanded] = useState(false);

  // Freeze page scroll behind the zoom overlay
  useScrollLock(expanded);

  // Esc to close the zoom overlay
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded]);

  return (
    <>
      <figure className="my-xxl">
        <Tooltip label="Click to zoom">
          <img
            src={src}
            alt={alt}
            onClick={() => setExpanded(true)}
            className="w-full h-auto rounded-lg border border-border-default cursor-zoom-in hover:border-primary/50 transition-colors"
          />
        </Tooltip>
        {caption && (
          <figcaption className="mt-md font-dm-sans text-sm text-on-surface-muted italic text-center">
            {caption}
          </figcaption>
        )}
      </figure>

      {/* Expanded overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-xl cursor-zoom-out"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute top-md right-md inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface text-on-surface-muted hover:text-on-surface border border-border-default hover:border-primary/50 transition-colors z-10"
            onClick={() => setExpanded(false)}
          >
            <X size={18} strokeWidth={2} />
          </button>
          <div
            className="w-full h-full flex items-center justify-center p-xxl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}

// ── Math renderer (KaTeX) ──────────────────────────────
function MathBlock({ expression, display }: { expression: string; display?: boolean }) {
  const html = katex.renderToString(expression, {
    displayMode: display ?? true,
    throwOnError: false,
  });

  if (display ?? true) {
    return (
      <div
        className="my-xl py-md text-center overflow-x-auto text-on-surface"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className="text-on-surface"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ── YouTube embed ──────────────────────────────────────
function YouTubeBlock({ videoId, caption }: { videoId: string; caption?: string }) {
  return (
    <figure className="my-xxl">
      <div className="relative w-full overflow-hidden rounded-lg border border-border-default bg-surface-lowest">
        <div style={{ paddingBottom: "56.25%" }} className="relative">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
      {caption && (
        <figcaption className="mt-md font-dm-sans text-sm text-on-surface-muted italic text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

// ── Main renderer ──────────────────────────────────────
export default function ContentBlocks({ blocks, firstDropCap, sectionIndex = 0, highlights, onHighlightClick, isPractice, isPrint, sectionRefs, lessonLinks }: ContentBlocksProps) {
  let isFirstText = firstDropCap ?? false;
  const hasHighlights = highlights && highlights.length > 0;
  return (
    <div className={`story-prose font-dm-sans text-body-base text-on-surface leading-relaxed ${isPrint ? "w-full max-w-none" : "max-w-3xl"} space-y-md`}>
      {blocks.map((block, i) => {
        if (!isContentBlock(block)) {
          const hasRelevantHighlights = hasHighlights && highlights!.some(
            (h) => h.sectionIndex === sectionIndex && h.paragraphIndex === i,
          );

          if (isPractice && typeof block === "string") {
            const parsed = parsePracticeBlock(block);
            if (parsed && !hasRelevantHighlights) {
              const p = (
                <div
                  key={i}
                  className="space-y-sm"
                  data-section-index={sectionIndex}
                  data-paragraph-index={i}
                >
                  {parsed.question ? (
                    <MarkdownHtml
                      html={mdBlock(parsed.question)}
                      className={isFirstText ? "drop-cap-container" : ""}
                    />
                  ) : null}
                  {parsed.hint ? (
                    <PracticeHintBlock hint={parsed.hint} sectionRefs={sectionRefs} lessonLinks={lessonLinks} />
                  ) : null}
                  {parsed.solution ? (
                    <PracticeSolutionBlock label={parsed.solLabel} solution={parsed.solution} />
                  ) : null}
                </div>
              );
              isFirstText = false;
              return p;
            }
          }

          // Plain string : parse as full block markdown (handles tables, lists, code, etc.)
          const html = mdBlock(block);
          if (hasRelevantHighlights) {
            const containerClass = isFirstText ? "drop-cap-container" : "";
            const p = (
              <HighlightRenderer
                key={i}
                html={html}
                sectionIndex={sectionIndex}
                paragraphIndex={i}
                highlights={highlights!}
                onHighlightClick={onHighlightClick}
                className={containerClass}
                containerClassName="paragraph-container"
              />
            );
            isFirstText = false;
            return p;
          }

          const containerClass = isFirstText ? "drop-cap-container" : "";
          const p = (
            <MarkdownHtml
              key={i}
              html={html}
              className={containerClass}
              data-section-index={sectionIndex}
              data-paragraph-index={i}
            />
          );
          isFirstText = false;
          return p;
        }

        switch (block.type) {
          case "paragraph": {
            const hasRelevantHighlights = hasHighlights && highlights!.some(
              (h) => h.sectionIndex === sectionIndex && h.paragraphIndex === i,
            );

            if (isPractice && block.text) {
              const parsed = parsePracticeBlock(block.text);
              if (parsed && !hasRelevantHighlights) {
                const p = (
                  <div
                    key={i}
                    className="space-y-sm"
                    data-section-index={sectionIndex}
                    data-paragraph-index={i}
                  >
                    {parsed.question ? (
                      <MarkdownHtml
                        html={mdBlock(parsed.question)}
                        className={isFirstText ? "drop-cap-container" : ""}
                      />
                    ) : null}
                    {parsed.hint ? (
                      <PracticeHintBlock hint={parsed.hint} sectionRefs={sectionRefs} lessonLinks={lessonLinks} />
                    ) : null}
                    {parsed.solution ? (
                      <PracticeSolutionBlock label={parsed.solLabel} solution={parsed.solution} />
                    ) : null}
                  </div>
                );
                isFirstText = false;
                return p;
              }
            }

            const html = mdBlock(block.text);
            if (hasRelevantHighlights) {
              const containerClass = isFirstText ? "drop-cap-container" : "";
              const p = (
                <HighlightRenderer
                  key={i}
                  html={html}
                  sectionIndex={sectionIndex}
                  paragraphIndex={i}
                  highlights={highlights!}
                  onHighlightClick={onHighlightClick}
                  className={containerClass}
                  containerClassName="paragraph-container"
                />
              );
              isFirstText = false;
              return p;
            }

            const containerClass = isFirstText ? "drop-cap-container" : "";
            const p = (
              <MarkdownHtml
                key={i}
                html={html}
                className={containerClass}
                data-section-index={sectionIndex}
                data-paragraph-index={i}
              />
            );
            isFirstText = false;
            return p;
          }

          case "image":
            return <ImageBlock key={i} src={block.src} alt={block.alt} caption={block.caption} />;

          case "horizontalRule":
            return (
              <hr key={i} className="my-xxl border-0 h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />
            );

          case "videoCallout":
            return (
              <div key={i} className="my-xl p-xl bg-surface-container-low border border-border-default rounded-lg">
                <p className="font-sora text-label-caps text-primary uppercase mb-md">
                  {block.title}
                </p>
                <ul className="space-y-sm">
                  {block.links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-dm-sans"
                      >
                        {link.label} →
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );

          case "callout": {
            const variants = {
              success: { Icon: CheckCircle2, edge: "border-l-secondary", surface: "bg-secondary/[0.07]", accent: "text-secondary" },
              danger: { Icon: XCircle, edge: "border-l-error", surface: "bg-error/[0.07]", accent: "text-error" },
              warning: { Icon: AlertTriangle, edge: "border-l-accent-orange", surface: "bg-accent-orange/[0.07]", accent: "text-accent-orange" },
              info: { Icon: Info, edge: "border-l-primary", surface: "bg-primary/[0.07]", accent: "text-primary" },
            } as const;
            const v = variants[block.variant];
            return (
              <aside
                key={i}
                className={`my-xl border border-border-default border-l-4 ${v.edge} ${v.surface} rounded-r-lg rounded-l-sm px-lg py-md`}
              >
                {block.title && (
                  <p className={`flex items-center gap-sm font-sora text-label-caps uppercase mb-sm ${v.accent}`}>
                    <v.Icon size={14} aria-hidden="true" />
                    {block.title}
                  </p>
                )}
                <MarkdownHtml html={mdBlock(block.text)} className="[&_p:first-child]:mt-0 [&_p:last-child]:mb-0" />
              </aside>
            );
          }

          case "code": {
            const lang = block.language?.toLowerCase() ?? "";
            const highlighted = (() => {
              try {
                if (lang && hljs.getLanguage(lang)) {
                  return hljs.highlight(block.code, { language: lang }).value;
                }
                return hljs.highlightAuto(block.code).value;
              } catch {
                return block.code.replace(/</g, "&lt;").replace(/>/g, "&gt;");
              }
            })();
            return (
              <div key={i} className="my-lg bg-surface-lowest border border-border-default rounded-xl overflow-hidden avoid-break">
                {(block.filename || block.language) && (
                  <div className="flex items-center justify-between px-md py-sm bg-surface-container border-b border-border-default">
                    {isPrint ? (
                      <span className="font-mono text-xs font-semibold text-on-surface">
                        {block.filename || block.language}
                      </span>
                    ) : (
                      <div className="flex gap-xs">
                        <div className="w-3 h-3 rounded-full bg-error/40" />
                        <div className="w-3 h-3 rounded-full bg-accent-orange/40" />
                        <div className="w-3 h-3 rounded-full bg-secondary/40" />
                      </div>
                    )}
                    <div className="flex items-center gap-lg">
                      {!isPrint && <CopyCodeButton text={block.code} />}
                      {!isPrint && (
                        <span className="font-sora text-[10px] uppercase text-on-surface-muted">
                          {block.filename || block.language || ""}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <pre className={`${isPrint ? "p-md text-xs" : "p-lg text-sm"} font-mono leading-relaxed overflow-x-auto`}>
                  <code className={`hljs language-${lang}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
                </pre>
              </div>
            );
          }

          case "math":
            return <MathBlock key={i} expression={block.expression} display={block.display} />;

          case "mermaid":
            return <MermaidBlock key={i} diagram={block.diagram} caption={block.caption} />;

          case "youtube":
            if (isPrint) {
              return block.caption ? (
                <p key={i} className="my-md text-sm italic text-center text-on-surface-muted avoid-break">
                  [Video: {block.caption}]
                </p>
              ) : null;
            }
            return <YouTubeBlock key={i} videoId={block.videoId} caption={block.caption} />;

          case "chart":
            return <ChartBlock key={i} block={block} />;

          case "scene3d":
            if (isPrint) {
              return block.caption ? (
                <p key={i} className="my-md text-sm italic text-center text-on-surface-muted avoid-break">
                  [Figure: {block.caption}]
                </p>
              ) : null;
            }
            return <Scene3DBlock key={i} block={block} />;

          case "lab":
            if (isPrint) return null;
            return <LabBlock key={i} block={block} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
