import { useEffect } from "react";
import type { HighlightData } from "@/lib/highlights";

interface StaticHighlightPaintProps {
  /** Article-level container. Highlights anchor to whole-container offsets. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Full highlight list (sectionIndex 0 / paragraphIndex 0 entries paint here). */
  highlights: HighlightData[];
  /** Open the highlight popover (usually highlightClickRef.current). */
  onOpen: (id: number) => void;
}

/**
 * Paints stored highlights as <mark> underlines on pages whose prose is
 * hardcoded JSX rather than ContentBlocks (which paints via `mapped`).
 * Runs on the settled DOM: unwrap previous marks, validate each anchor
 * against live text, wrap matching ranges. Clicks bubble to onOpen.
 */
export default function StaticHighlightPaint({ containerRef, highlights, onOpen }: StaticHighlightPaintProps) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    // Clear previous paint (unwrap marks, merge split text nodes).
    root.querySelectorAll("mark[data-hl]").forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
    });
    root.normalize();

    // Map container text offsets to DOM text nodes in one walk.
    const full = root.textContent || "";
    const nodes: Array<{ node: Text; start: number; end: number }> = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let cursor = 0;
    let current = walker.nextNode() as Text | null;
    while (current) {
      const len = current.textContent?.length ?? 0;
      nodes.push({ node: current, start: cursor, end: cursor + len });
      cursor += len;
      current = walker.nextNode() as Text | null;
    }

    const rangeFor = (start: number, end: number): Range | null => {
      const a = nodes.find((n) => start >= n.start && start < n.end);
      const b = nodes.find((n) => end > n.start && end <= n.end);
      if (!a || !b) return null;
      try {
        const range = document.createRange();
        range.setStart(a.node, start - a.start);
        range.setEnd(b.node, end - b.start);
        return range;
      } catch {
        return null;
      }
    };

    for (const h of highlights) {
      if (h.sectionIndex !== 0 || h.paragraphIndex !== 0) continue;
      if (typeof h.startOffset !== "number" || typeof h.endOffset !== "number") continue;
      if (h.startOffset < 0 || h.endOffset > full.length || h.startOffset >= h.endOffset) continue;
      if (h.selectedText && full.slice(h.startOffset, h.endOffset) !== h.selectedText) continue;
      const range = rangeFor(h.startOffset, h.endOffset);
      if (!range || range.collapsed) continue;
      try {
        const mark = document.createElement("mark");
        mark.setAttribute("data-hl", String(h.id));
        mark.className = "rounded-[3px] px-px";
        mark.style.background = h.color && h.color !== "underline"
          ? "color-mix(in srgb, var(--accent) 25%, transparent)"
          : "transparent";
        mark.style.textDecoration = "underline";
        mark.style.textDecorationThickness = "2px";
        mark.style.textUnderlineOffset = "3px";
        mark.style.cursor = "pointer";
        mark.appendChild(range.extractContents());
        range.insertNode(mark);
      } catch {
        // Skip anchors that no longer map cleanly; comments survive via orphans.
      }
    }

    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest?.("mark[data-hl]");
      if (!t) return;
      e.preventDefault();
      onOpen(Number(t.getAttribute("data-hl")));
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [containerRef, highlights, onOpen]);

  return null;
}
