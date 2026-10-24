import { useEffect } from "react";
import { applyHighlights, type HighlightData } from "@/lib/highlights";

interface StaticHighlightPaintProps {
  /** Article-level container. Selections anchor to the whole container. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Highlights with sectionIndex 0 / paragraphIndex 0 paint here. */
  highlights: HighlightData[];
  /** Open the highlight popover (usually highlightClickRef.current). */
  onOpen: (id: number) => void;
}

/**
 * Paints stored highlights on pages whose prose is hardcoded JSX rather
 * than ContentBlocks (which paints via `mapped` + HighlightRenderer).
 * Reuses the same applyHighlights painter, so marks look identical.
 * Only anchors that still match the live text are painted; the rest stay
 * reachable through comments and the unmapped-notes drawer.
 */
export default function StaticHighlightPaint({ containerRef, highlights, onOpen }: StaticHighlightPaintProps) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // Re-render: strip old marks, re-apply (mirrors HighlightRenderer).
    root.querySelectorAll("mark[data-highlight-id]").forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    root.normalize();

    const relevant = highlights.filter(
      (h) => h.sectionIndex === 0 && h.paragraphIndex === 0 && typeof h.startOffset === "number" && typeof h.endOffset === "number",
    );
    if (!relevant.length) return;

    // Only paint anchors whose stored text still sits at the stored offsets.
    const full = root.textContent || "";
    const verified = relevant.filter((h) => {
      if (h.startOffset < 0 || h.endOffset > full.length || h.startOffset >= h.endOffset) return false;
      return !h.selectedText || full.slice(h.startOffset, h.endOffset) === h.selectedText;
    });
    if (!verified.length) return;

    applyHighlights(root, verified, onOpen);
  }, [containerRef, highlights, onOpen]);

  return null;
}
