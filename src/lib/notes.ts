import { mdBlock } from "@/lib/markdown";
import { type HighlightData } from "@/lib/highlights";
import { type NoteArticle } from "@/types";

// ── Small helpers ──────────────────────────────────────

/** Plain-text excerpt for cards + search : strips markdown markup. */
export function deriveExcerpt(content: string, max = 180): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? plain.slice(0, max).trimEnd() + "…" : plain;
}

// ── Markdown → stable blocks ───────────────────────────
// A note is stored as ONE markdown document. Before rendering we
// split it into top-level blocks so ContentBlocks can render each block
// independently (that's what gives every block a stable paragraphIndex for
// highlight anchors). The split is deterministic: same document → same
// array, so untouched blocks keep their index across edits.

const FENCE_RE = /^\s*(`{3,}|~{3,})/;
const HEADING_RE = /^#{1,6}\s/;
const HR_RE = /^\s*([-*_])\s*(\1\s*){2,}$/;
const LIST_ITEM_RE = /^\s*(?:[-*+]|\d+[.)])\s+/;
const BLOCKQUOTE_RE = /^\s*>/;

/** A table separator row: contains a `|` and a `-`, otherwise only pipes,
 *  colons, dashes and whitespace. Requiring a pipe keeps `---` as an HR. */
function isTableSeparator(line: string): boolean {
  const t = line.trim();
  return t.includes("|") && t.includes("-") && /^[\s|:-]+$/.test(t);
}

function isBlank(line: string): boolean {
  return line.trim() === "";
}

export function splitMarkdownBlocks(content: string): string[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }
    const trimmed = line.trim();

    // Fenced code : one block, fences included
    const fence = line.match(FENCE_RE);
    if (fence) {
      const opener = fence[1][0];
      const start = i;
      i++;
      while (i < lines.length) {
        const m = lines[i].trim().match(/^(`{3,}|~{3,})/);
        if (m && m[1][0] === opener) { i++; break; }
        i++;
      }
      blocks.push(lines.slice(start, i).join("\n").trim());
      continue;
    }

    // Table : header + separator + contiguous rows
    if (line.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const start = i;
      i += 2;
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes("|")) i++;
      blocks.push(lines.slice(start, i).join("\n").trim());
      continue;
    }

    // List : items plus indented continuations (blank lines preserved lazily)
    if (LIST_ITEM_RE.test(trimmed)) {
      const start = i;
      i++;
      while (i < lines.length) {
        const cur = lines[i];
        if (isBlank(cur)) {
          let j = i + 1;
          while (j < lines.length && isBlank(lines[j])) j++;
          if (j >= lines.length) { i = j; break; }
          const nxt = lines[j].trim();
          const indented = /^[ \t]+\S/.test(lines[j]);
          if (LIST_ITEM_RE.test(nxt) || indented) { i = j; continue; }
          break;
        }
        const t = cur.trim();
        const isContinuation = /^[ \t]/.test(cur) && !HEADING_RE.test(t) && !BLOCKQUOTE_RE.test(t) && !FENCE_RE.test(cur);
        if (LIST_ITEM_RE.test(t) || isContinuation) { i++; continue; }
        break;
      }
      blocks.push(lines.slice(start, i).join("\n").trim());
      continue;
    }

    // Blockquote : consecutive quoted lines
    if (BLOCKQUOTE_RE.test(trimmed)) {
      const start = i;
      i++;
      while (i < lines.length && BLOCKQUOTE_RE.test(lines[i].trim())) i++;
      blocks.push(lines.slice(start, i).join("\n").trim());
      continue;
    }

    // Single-line blocks
    if (HEADING_RE.test(trimmed) || HR_RE.test(trimmed)) {
      blocks.push(trimmed);
      i++;
      continue;
    }

    // Paragraph : consecutive plain lines
    const start = i;
    i++;
    while (i < lines.length) {
      const t = lines[i].trim();
      if (isBlank(lines[i])) break;
      if (HEADING_RE.test(t) || HR_RE.test(t) || BLOCKQUOTE_RE.test(t) || FENCE_RE.test(lines[i]) || LIST_ITEM_RE.test(t)) break;
      if (lines[i].includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) break;
      i++;
    }
    blocks.push(lines.slice(start, i).join("\n").trim());
  }

  return blocks.filter((b) => b.length > 0);
}

// ── Highlight re-anchoring after edits ─────────────────
// Highlights anchor to (sectionIndex, paragraphIndex, startOffset, endOffset)
// into a paragraph's rendered text. When content is edited, offsets drift.
// We re-validate each highlight against the CURRENT rendering of its block:
// if the exact stored selectedText still sits at the stored offsets, the
// highlight maps; otherwise it's orphaned (comments stay visible, no text
// mapping). The text is computed the same way ContentBlocks renders it
// (mdBlock → textContent), so the comparison is exact.

export function validateHighlights(
  highlights: HighlightData[],
  blocks: string[],
): { mapped: HighlightData[]; orphans: HighlightData[] } {
  const mapped: HighlightData[] = [];
  const orphans: HighlightData[] = [];
  // Detached div : never attached to the document, just a text extractor.
  const div = typeof document !== "undefined" ? document.createElement("div") : null;

  for (const h of highlights) {
    if (h.sectionIndex !== 0 || h.paragraphIndex < 0 || h.paragraphIndex >= blocks.length) {
      orphans.push(h);
      continue;
    }
    const block = blocks[h.paragraphIndex];
    let text: string;
    try {
      if (div) {
        div.innerHTML = mdBlock(block);
        text = div.textContent || "";
      } else {
        text = block;
      }
    } catch {
      orphans.push(h);
      continue;
    }
    const inRange = h.startOffset >= 0 && h.endOffset <= text.length && h.startOffset < h.endOffset;
    const matches = inRange && text.slice(h.startOffset, h.endOffset) === h.selectedText;
    if (matches) mapped.push(h);
    else orphans.push(h);
  }
  return { mapped, orphans };
}

// ── API helpers ────────────────────────────────────────

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api/notes${path}`, init);
  if (!r.ok) {
    let detail = `HTTP ${r.status}`;
    try { const d = await r.json(); if (d.error) detail = d.error; } catch {}
    throw new Error(detail);
  }
  return r.json() as Promise<T>;
}

export function fetchNotesList(): Promise<NoteArticle[]> {
  return api("/");
}

/** Search notes via FTS5. Returns ranked results with rank field. */
export function fetchNotesSearch(q: string): Promise<(NoteArticle & { rank?: number })[]> {
  return api(`/?q=${encodeURIComponent(q)}`);
}

export function fetchNote(slug: string): Promise<NoteArticle> {
  return api(`/?slug=${encodeURIComponent(slug)}`);
}

export function createNote(input: { title: string; content: string }): Promise<NoteArticle> {
  return api("/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateNote(slug: string, input: { title: string; content: string }): Promise<NoteArticle> {
  return api("/", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, ...input }),
  });
}

export function deleteNote(slug: string): Promise<{ success: boolean }> {
  return api("/", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
}
