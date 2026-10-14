import { useState, useEffect, useCallback, useRef } from "react";
import { getSelectionOffsets } from "@/lib/highlights";

export interface SelectionState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  container: HTMLElement | null;
  sectionIndex: number;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  textHash: string;
}

const EMPTY: SelectionState = {
  visible: false, x: 0, y: 0, selectedText: "", container: null,
  sectionIndex: 0, paragraphIndex: 0, startOffset: 0, endOffset: 0, textHash: "",
};

export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const [selection, setSelection] = useState<SelectionState>(EMPTY);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setSelection(EMPTY);
  }, []);

  // Store the selection range so we can re-position on scroll
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) return;

        const range = sel.getRangeAt(0);
        const text = range.toString().trim();
        if (!text) return;

        // Find the paragraph container by walking up from the selection
        let el = range.commonAncestorContainer as Node;
        if (el.nodeType === Node.TEXT_NODE && el.parentElement) {
          el = el.parentElement;
        }

        let para: HTMLElement | null = el as HTMLElement;
        while (para && para !== document.body) {
          if (para.dataset && para.dataset.paragraphIndex !== undefined) break;
          para = para.parentElement;
        }
        if (!para || para === document.body) return;
        if (containerRef.current && !containerRef.current.contains(para)) return;

        // Compute offsets NOW while the selection is still live
        const offsets = getSelectionOffsets(para, sel);
        if (!offsets) return;

        const rect = range.getBoundingClientRect();

        // Save the range clone for scroll repositioning
        savedRange.current = range.cloneRange();

        setSelection({
          visible: true,
          x: Math.max(8, rect.left + rect.width / 2 - 100),
          y: rect.top,
          selectedText: offsets.text,
          container: para,
          sectionIndex: parseInt(para.dataset.sectionIndex || "0", 10),
          paragraphIndex: parseInt(para.dataset.paragraphIndex || "0", 10),
          startOffset: offsets.start,
          endOffset: offsets.end,
          textHash: offsets.text.slice(0, 20),
        });
      }, 10);
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keyup", (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    });
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [containerRef, clearSelection]);

  // Reposition the toolbar on scroll/resize so it tracks the selected text
  useEffect(() => {
    if (!selection.visible) return;

    const reposition = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        clearSelection();
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.top === 0 && rect.left === 0 && rect.width === 0 && rect.height === 0) {
        // Selection rect is collapsed/offscreen : dismiss
        clearSelection();
        return;
      }
      setSelection((prev) => ({
        ...prev,
        x: Math.max(8, rect.left + rect.width / 2 - 100),
        y: rect.top,
      }));
    };

    window.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [selection.visible, clearSelection]);

  return { selection, clearSelection };
}
