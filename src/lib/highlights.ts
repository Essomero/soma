import type { HighlightRow } from "@/lib/db";

/** Maximum nesting depth rendered for threaded comments. Bump this to
 *  show deeper reply chains; everything beyond the cap is silently
 *  dropped from the render tree (the underlying data is preserved). */
export const COMMENT_MAX_DEPTH = 20;

/** Collect all text nodes in a DOM subtree */
export function textNodes(root: Node): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    nodes.push(node);
  }
  return nodes;
}

/** Get the rendered text content of a paragraph container */
export function getRenderedText(container: HTMLElement): string {
  return container.textContent || "";
}

/** Build a cumulative offset map from text nodes */
interface TextNodeEntry {
  node: Text;
  start: number;
  end: number;
}

export function buildOffsetMap(nodes: Text[]): TextNodeEntry[] {
  let offset = 0;
  return nodes.map((node) => {
    const len = node.textContent?.length || 0;
    const entry = { node, start: offset, end: offset + len };
    offset += len;
    return entry;
  });
}

/** Find the text node entry containing a given offset */
function findNodeAt(offset: number, map: TextNodeEntry[]): TextNodeEntry | null {
  return map.find((e) => offset >= e.start && offset < e.end) || null;
}

export interface HighlightComment {
  id: number;
  body: string;
  parentId: number | null;
  isAi: boolean;
  aiModel: string | null;
  createdAt: string;
  updatedAt: string | null;
  replies?: HighlightComment[];
}

export interface HighlightData {
  id: number;
  sectionIndex: number;
  paragraphIndex: number;
  startOffset: number;
  endOffset: number;
  color: string;
  /** The exact selected text captured when the highlight was made : used to
   *  re-validate the anchor after article content is edited. */
  selectedText?: string;
  comments?: HighlightComment[];
}

/**
 * Apply highlights to a rendered paragraph container.
 * Wraps highlighted text ranges in <mark> elements.
 * Returns the number of highlights successfully applied.
 */
export function applyHighlights(
  container: HTMLElement,
  highlights: HighlightData[],
  onClick?: (id: number) => void,
): number {
  const nodes = textNodes(container);
  if (!nodes.length) return 0;

  const map = buildOffsetMap(nodes);
  let applied = 0;

  // Sort highlights by start offset (descending) so we can apply them
  // without invalidating earlier offsets
  const sorted = [...highlights].sort((a, b) => b.startOffset - a.startOffset);

  for (const h of sorted) {
    const startEntry = findNodeAt(h.startOffset, map);
    const endEntry = findNodeAt(h.endOffset - 1, map); // -1 because end is exclusive

    if (!startEntry || !endEntry) continue;

    const range = document.createRange();
    range.setStart(startEntry.node, h.startOffset - startEntry.start);
    const endCharOffset = h.endOffset - endEntry.start;
    range.setEnd(endEntry.node, Math.min(endCharOffset, endEntry.node.textContent?.length || 0));

    const isUnderline = h.color === "underline";

    const colors: Record<string, string> = {
      yellow: "rgba(251, 191, 36, 0.4)",
      green: "rgba(52, 211, 153, 0.4)",
      blue: "rgba(56, 189, 248, 0.4)",
      pink: "rgba(244, 114, 182, 0.4)",
    };
    const bgColor = colors[h.color] || colors.yellow;

    const mark = document.createElement("mark");
    if (isUnderline) {
      mark.style.color = "inherit";
      mark.style.backgroundColor = "transparent";
      mark.style.textDecoration = "underline";
      mark.style.textDecorationColor = "rgba(148, 163, 184, 0.7)";
      mark.style.textDecorationStyle = "wavy";
      mark.style.textUnderlineOffset = "3px";
      mark.style.textDecorationThickness = "2px";
      mark.style.borderRadius = "0";
      mark.style.cursor = "pointer";
      mark.style.transition = "text-decoration-color 150ms";
    } else {
      mark.style.backgroundColor = bgColor;
      mark.style.borderRadius = "2px";
      mark.style.cursor = "pointer";
      mark.style.transition = "background-color 150ms";
      mark.addEventListener("mouseenter", () => { mark.style.backgroundColor = bgColor.replace("0.4", "0.6"); });
      mark.addEventListener("mouseleave", () => { mark.style.backgroundColor = bgColor; });
    }
    mark.dataset.highlightId = String(h.id);
    mark.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick?.(h.id);
    });

    try {
      range.surroundContents(mark);
    } catch {
      // Cross-element range : extractContents handles any DOM boundary
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
    }
    applied++;
  }

  // Update the offset map since surroundContents mutated the DOM
  return applied;
}

/**
 * Compute character offsets from a text selection within a container.
 * Offsets are relative to the container's textContent.
 */
export function getSelectionOffsets(
  container: HTMLElement,
  selection: Selection,
): { start: number; end: number; text: string } | null {
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  const containerText = container.textContent || "";

  // Create a range from container start to selection start to measure offset
  const preRange = document.createRange();
  preRange.selectNodeContents(container);
  preRange.setEnd(range.startContainer, range.startOffset);

  const start = preRange.toString().length;
  const selectedText = range.toString();
  const end = start + selectedText.length;

  // Selection is empty or not within this container
  if (!selectedText.trim() || start < 0 || end > containerText.length) return null;

  return { start, end, text: selectedText };
}
