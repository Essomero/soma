import { useEffect, useRef } from "react";
import { applyHighlights, type HighlightData } from "@/lib/highlights";
import { useInjectCopyButtons } from "@/lib/useInjectCopyButtons";

interface HighlightRendererProps {
  html: string;
  sectionIndex: number;
  paragraphIndex: number;
  highlights: HighlightData[];
  onHighlightClick?: (id: number) => void;
  className?: string;
  containerClassName?: string;
}

export default function HighlightRenderer({
  html,
  sectionIndex,
  paragraphIndex,
  highlights,
  onHighlightClick,
  className,
  containerClassName,
}: HighlightRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useInjectCopyButtons(containerRef, html);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const relevant = highlights.filter(
      (h) => h.sectionIndex === sectionIndex && h.paragraphIndex === paragraphIndex,
    );
    if (!relevant.length) return;

    // Re-render: strip old marks, re-apply
    el.querySelectorAll("mark").forEach((m) => {
      const parent = m.parentNode;
      if (parent) {
        while (m.firstChild) parent.insertBefore(m.firstChild, m);
        parent.removeChild(m);
      }
    });
    el.normalize();

    applyHighlights(el, relevant, onHighlightClick);
  }, [html, highlights, sectionIndex, paragraphIndex, onHighlightClick]);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className={containerClassName}
        data-section-index={sectionIndex}
        data-paragraph-index={paragraphIndex}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
