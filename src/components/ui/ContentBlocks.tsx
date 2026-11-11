import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import hljs from "highlight.js";
import katex from "katex";
import { X } from "lucide-react";
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
  lessonLinks?: LessonLinks;
}

// ── Mermaid diagram renderer — full viewport modal, original blur background kept ─────
function MermaidBlock({ diagram, caption }: { diagram: string; caption?: string }) {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useScrollLock(expanded);

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [expanded]);

  useEffect(() => {
    if (!expanded || !ref.current || !overlayRef.current) return;
    overlayRef.current.innerHTML = ref.current.innerHTML;
    const svg = overlayRef.current.querySelector("svg") as SVGElement | null;
    if (svg) {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.maxWidth = "98vw";
      svg.style.maxHeight = "98vh";
    }
  }, [expanded]);

  useEffect(() => {
    let cancelled = false;
    import("mermaid").then((mermaid) => {
      if (cancelled || !ref.current) return;
      const isDark = theme === "dark";
      mermaid.default.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        theme: isDark ? "dark" : "base",
        themeVariables: isDark
          ? {
              darkMode: true,
              background: "#151b23",
              primaryColor: "#1e293b",
              primaryBorderColor: "#475569",
              primaryTextColor: "#f1f5f9",
              secondaryColor: "#233044",
              secondaryBorderColor: "#475569",
              secondaryTextColor: "#f1f5f9",
              tertiaryColor: "#334155",
              tertiaryBorderColor: "#64748b",
              tertiaryTextColor: "#f1f5f9",
              lineColor: "#94a3b8",
              textColor: "#f1f5f9",
              mainBkg: "#1e293b",
              nodeBorder: "#475569",
              clusterBkg: "#0f172a",
              clusterBorder: "#334155",
              titleColor: "#f1f5f9",
              edgeLabelBackground: "#151b23",
              nodeTextColor: "#f1f5f9",
              labelTextColor: "#f1f5f9",
            }
          : {
              darkMode: false,
              background: "#ffffff",
              primaryColor: "#f8fafc",
              primaryBorderColor: "#94a3b8",
              primaryTextColor: "#0f172a",
              secondaryColor: "#f1f5f9",
              tertiaryColor: "#e2e8f0",
              lineColor: "#475569",
              textColor: "#0f172a",
              mainBkg: "#ffffff",
              nodeBorder: "#94a3b8",
              clusterBkg: "#f8fafc",
              clusterBorder: "#cbd5e1",
              nodeTextColor: "#0f172a",
              labelTextColor: "#0f172a",
            },
        flowchart: { htmlLabels: true, curve: "basis", padding: 12 },
      });
      const renderId = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      mermaid.default
        .render(renderId, diagram)
        .then(({ svg }) => {
          if (!ref.current || cancelled) return;
          ref.current.innerHTML = svg;
          const root = ref.current;
          const labelColor = isDark ? "#f1f5f9" : "#0f172a";
          root.querySelectorAll("foreignObject div, foreignObject span, .nodeLabel, .edgeLabel, .label, .cluster-label div, .node div").forEach((el) => {
            (el as HTMLElement).style.color = labelColor;
            (el as HTMLElement).style.fontFamily = "DM Sans, sans-serif";
            (el as HTMLElement).style.fontSize = "13px";
            (el as HTMLElement).style.lineHeight = "1.3";
            (el as HTMLElement).style.opacity = "1";
            (el as HTMLElement).style.visibility = "visible";
          });
          root.querySelectorAll("g.label text, g.nodeLabel text, g.cluster-label text, text").forEach((el) => {
            (el as SVGTextElement).style.fill = labelColor;
            try {
              (el as SVGTextElement).setAttribute("fill", labelColor);
            } catch {}
          });
          if (overlayRef.current) overlayRef.current.innerHTML = root.innerHTML;
        })
        .catch(() => {
          if (ref.current && !cancelled) {
            ref.current.innerHTML = `<pre class="text-error text-sm">Failed to render diagram</pre>`;
          }
        });
    });
    return () => {
      cancelled = true;
    };
  }, [diagram, theme]);

  return (
    <>
      <figure className="my-xxl">
        <Tooltip label="Click to expand">
          <div ref={ref} onClick={() => setExpanded(true)} className="flex justify-center p-xl bg-surface-container-low rounded-lg border border-border-default overflow-x-auto cursor-zoom-in hover:border-primary/50 transition-colors min-h-[180px]" />
        </Tooltip>
        {caption && <figcaption className="mt-md font-dm-sans text-sm text-on-surface-muted italic text-center">{caption}</figcaption>}
      </figure>

      {expanded && createPortal(
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center cursor-zoom-out" onClick={() => setExpanded(false)}>
          <button type="button" aria-label="Close" className="absolute top-4 right-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface text-on-surface-muted hover:text-on-surface border border-border-default hover:border-primary/50 transition-colors z-[110]" onClick={() => setExpanded(false)}>
            <X size={20} strokeWidth={2} />
          </button>
          <div className="w-full h-full flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            <div ref={overlayRef} className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-[98vw] [&>svg]:max-h-[98vh]" />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Image renderer ───────────────
function ImageBlock({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  const [expanded, setExpanded] = useState(false);
  useScrollLock(expanded);
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
      <figure className="my-xxl rounded-lg overflow-hidden border border-border-default">
        <Tooltip label="Click to expand">
          <img src={src} alt={alt} onClick={() => setExpanded(true)} className="w-full cursor-zoom-in hover:opacity-95 transition-opacity" />
        </Tooltip>
        {caption && <figcaption className="px-xl py-md font-dm-sans text-sm text-on-surface-muted italic bg-surface-container-low border-t border-border-default">{caption}</figcaption>}
      </figure>

      {expanded && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center cursor-zoom-out p-2" onClick={() => setExpanded(false)}>
          <button type="button" aria-label="Close" className="absolute top-4 right-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface text-on-surface-muted hover:text-on-surface border border-border-default hover:border-primary/50 transition-colors z-[110]" onClick={() => setExpanded(false)}>
            <X size={20} strokeWidth={2} />
          </button>
          <img src={src} alt={alt} className="max-w-[98vw] max-h-[98vh] w-auto h-auto object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}

// ── Math renderer (KaTeX) ──────────────────────────────
function MathBlockSync({ expression, display }: { expression: string; display?: boolean }) {
  return (
    <div
      className={display ? "my-xxl flex justify-center overflow-x-auto" : "inline"}
      dangerouslySetInnerHTML={{
        __html: (() => {
          try {
            return katex.renderToString(expression, { displayMode: !!display, throwOnError: false });
          } catch {
            return `<span>${expression}</span>`;
          }
        })(),
      }}
    />
  );
}

// ── YouTube embed ──────────────────────────────────────
function YouTubeBlock({ videoId, caption }: { videoId: string; caption?: string }) {
  return (
    <figure className="my-xxl">
      <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border-default bg-surface-container-low">
        <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`} title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
      </div>
      {caption && <figcaption className="mt-md font-dm-sans text-sm text-on-surface-muted italic text-center">{caption}</figcaption>}
    </figure>
  );
}

// ── Main renderer ──────────────────────────────────────
export default function ContentBlocks({ blocks, firstDropCap, sectionIndex = 0, highlights, onHighlightClick, isPractice, isPrint, sectionRefs, lessonLinks }: ContentBlocksProps) {
  const firstTextIndex = firstDropCap ? 0 : -1;

  const renderBlock = (block: ContentBlock | string, idx: number) => {
    const isFirstText = typeof block === "string" && idx === firstTextIndex && !isPractice && !isPrint;

    if (typeof block === "string") {
      const relevantHighlights = (highlights ?? []).filter((h) => h.sectionIndex === sectionIndex && h.paragraphIndex === idx);
      if (isPractice && relevantHighlights.length === 0) {
        const practice = parsePracticeBlock(block);
        if (practice) {
          return (
            <div key={idx} data-section-index={sectionIndex} data-paragraph-index={idx} className="space-y-sm">
              {practice.question && <MarkdownHtml html={mdBlock(practice.question)} />}
              {practice.hint && <PracticeHintBlock hint={practice.hint} sectionRefs={sectionRefs} lessonLinks={lessonLinks} />}
              {practice.solution && <PracticeSolutionBlock label={practice.solLabel} solution={practice.solution} />}
            </div>
          );
        }
      }
      const html = mdBlock(block);
      return (
        <div key={idx} data-section-index={sectionIndex} data-paragraph-index={idx} className={`font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl space-y-md ${isFirstText ? "drop-cap" : ""}`}>
          {relevantHighlights.length > 0 ? (
            <HighlightRenderer html={html} sectionIndex={sectionIndex} paragraphIndex={idx} highlights={relevantHighlights} onHighlightClick={onHighlightClick} />
          ) : (
            <MarkdownHtml html={html} />
          )}
        </div>
      );
    }

    switch (block.type) {
      case "paragraph": {
        const relevantHighlights = (highlights ?? []).filter((h) => h.sectionIndex === sectionIndex && h.paragraphIndex === idx);
        if (isPractice && block.text && relevantHighlights.length === 0) {
          const practice = parsePracticeBlock(block.text);
          if (practice) {
            return (
              <div key={idx} data-section-index={sectionIndex} data-paragraph-index={idx} className="space-y-sm">
                {practice.question && <MarkdownHtml html={mdBlock(practice.question)} />}
                {practice.hint && <PracticeHintBlock hint={practice.hint} sectionRefs={sectionRefs} lessonLinks={lessonLinks} />}
                {practice.solution && <PracticeSolutionBlock label={practice.solLabel} solution={practice.solution} />}
              </div>
            );
          }
        }
        const html = mdBlock(block.text);
        return (
          <div key={idx} data-section-index={sectionIndex} data-paragraph-index={idx} className="font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl space-y-md">
            {relevantHighlights.length > 0 ? (
              <HighlightRenderer html={html} sectionIndex={sectionIndex} paragraphIndex={idx} highlights={relevantHighlights} onHighlightClick={onHighlightClick} />
            ) : (
              <MarkdownHtml html={html} />
            )}
          </div>
        );
      }
      case "image":
        return <ImageBlock key={idx} src={block.src} alt={block.alt} caption={block.caption} />;
      case "horizontalRule":
        return <hr key={idx} className="my-xxl border-0 h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />;
      case "code": {
        const lang = (block.language || "plaintext").toLowerCase();
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
          <div key={idx} className="my-xxl rounded-lg overflow-hidden border border-border-default bg-surface-container-high">
            <div className="flex items-center gap-sm px-xl py-sm bg-surface-container-high border-b border-border-default">
              <div className="flex gap-xs">
                <div className="w-3 h-3 rounded-full bg-error/50" />
                <div className="w-3 h-3 rounded-full bg-accent-orange/50" />
                <div className="w-3 h-3 rounded-full bg-secondary/50" />
              </div>
              {block.filename && <span className="ml-md font-sora text-xs text-on-surface-muted">{block.filename}</span>}
              {block.language && <span className="ml-auto font-sora text-xs text-on-surface-muted">{block.language}</span>}
            </div>
            <div className="relative">
              <pre className="overflow-x-auto p-xl text-sm leading-relaxed">
                <code className={`hljs language-${lang}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
              </pre>
            </div>
          </div>
        );
      }
      case "math":
        return <MathBlockSync key={idx} expression={block.expression} display={block.display} />;
      case "mermaid":
        return <MermaidBlock key={idx} diagram={block.diagram} caption={block.caption} />;
      case "youtube":
        return <YouTubeBlock key={idx} videoId={block.videoId} caption={block.caption} />;
      case "videoCallout":
        return (
          <div key={idx} className="my-xxl rounded-lg border border-border-default bg-surface-container-low p-xl">
            <p className="font-sora text-sm font-bold text-on-surface uppercase tracking-widest mb-md">{block.title}</p>
            <div className="flex flex-wrap gap-sm">
              {block.links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-xs px-md py-sm rounded-full border border-border-default bg-surface text-sm font-sora text-on-surface-muted hover:text-on-surface hover:border-primary/40 transition-colors">
                  {l.label}
                  <span className="text-primary">→</span>
                </a>
              ))}
            </div>
          </div>
        );
      case "callout":
        return (
          <div key={idx} className={`my-xxl rounded-lg border p-xl ${block.variant === "success" ? "border-secondary/20 bg-secondary/5" : block.variant === "danger" ? "border-error/20 bg-error/5" : block.variant === "warning" ? "border-accent-orange/20 bg-accent-orange/5" : "border-primary/20 bg-primary/5"}`}>
            {block.title && <p className={`font-sora text-sm font-bold uppercase tracking-widest mb-sm ${block.variant === "success" ? "text-secondary" : block.variant === "danger" ? "text-error" : block.variant === "warning" ? "text-accent-orange" : "text-primary"}`}>{block.title}</p>}
            <div className="font-dm-sans text-sm text-on-surface leading-relaxed">
              <MarkdownHtml html={mdBlock(block.text)} />
            </div>
          </div>
        );
      case "chart":
        return <ChartBlock key={idx} block={block} />;
      case "scene3d":
        return <Scene3DBlock key={idx} block={block} />;
      case "lab":
        return <LabBlock key={idx} block={block} />;
      default:
        return null;
    }
  };

  return <div className="space-y-xl">{blocks.map(renderBlock)}</div>;
}
