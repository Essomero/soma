/**
 * Format Paste — convert markdown (pasted or fetched from URL) into a Soma
 * manuscript object. Preserves all content; changes only the structural
 * layout to fit Soma's ContentBlock format.
 *
 * Used by: MCP tool, CLI (scripts/format-paste.ts), API (api/format-paste.js),
 * and the admin UI (/admin/new).
 *
 * Dependencies: marked (browser dep, also available in Node), extract-html.mjs.
 */

import { marked } from "marked";

// ── Slugify ────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "untitled";
}

// ── Token → ContentBlock ───────────────────────────────────────────────────

/**
 * Walk a flat list of marked tokens and produce Soma content blocks.
 * Simple prose (paragraphs, headings, lists) becomes paragraph strings.
 * Special blocks (code, image, hr) become typed ContentBlock objects.
 *
 * Returns { hasRichBlocks: boolean, blocks: (string | object)[] }
 */
function tokensToBlocks(tokens) {
  const blocks = [];
  let hasRichBlocks = false;

  for (const token of tokens) {
    switch (token.type) {
      case "paragraph": {
        // Check if this paragraph is a standalone image (single nested image
        // token, no surrounding text). Marked nests standalone images inside
        // paragraph tokens rather than emitting top-level image tokens.
        const inlineTokens = token.tokens || [];
        const isStandaloneImage = inlineTokens.length === 1 && inlineTokens[0].type === "image";
        if (isStandaloneImage) {
          const img = inlineTokens[0];
          hasRichBlocks = true;
          blocks.push({
            type: "image",
            src: img.href || "",
            alt: img.text || img.title || "",
            caption: img.title || undefined,
          });
        } else {
          blocks.push(token.raw.trim());
        }
        break;
      }

      case "heading": {
        // Preserve as markdown heading — renders in Soma via mdBlock()
        blocks.push(token.raw.trim());
        break;
      }

      case "list": {
        for (const item of token.items) {
          const text = item.raw.trim();
          if (text) blocks.push(text);
        }
        break;
      }

      case "code": {
        hasRichBlocks = true;
        blocks.push({
          type: "code",
          code: token.text,
          language: token.lang || undefined,
        });
        break;
      }

      case "blockquote": {
        // Strip leading "> " from each line, keep as a callout
        const text = token.tokens
          ? token.raw.replace(/^[>]\s?/gm, "").trim()
          : token.text;

        // If it's a short quote (≤3 lines), use callout
        const lines = text.split("\n").filter(Boolean);
        if (lines.length <= 3 && text.length < 400) {
          hasRichBlocks = true;
          blocks.push({
            type: "callout",
            variant: "info",
            text,
          });
        } else {
          // Long blockquotes stay as prose paragraph to avoid distorting layout
          blocks.push(text);
        }
        break;
      }

      case "image": {
        hasRichBlocks = true;
        blocks.push({
          type: "image",
          src: token.href,
          alt: token.text || token.title || "",
          caption: token.title || undefined,
        });
        break;
      }

      case "hr": {
        hasRichBlocks = true;
        blocks.push({ type: "horizontalRule" });
        break;
      }

      case "table": {
        // Tables render fine through mdBlock() — keep as raw markdown in a paragraph
        blocks.push(token.raw.trim());
        break;
      }

      case "html": {
        blocks.push(token.raw.trim());
        break;
      }

      // Skip spaces and link definitions
      case "space":
      case "def":
        break;

      default:
        // Unknown tokens fall through as raw text
        if (token.raw?.trim()) {
          blocks.push(token.raw.trim());
        }
    }
  }

  return { hasRichBlocks, blocks };
}

/**
 * Extract the first h1 from a flat token list as the title.
 * Falls back to the first meaningful line of content when no heading exists.
 */
function extractTitleFromTokens(tokens, fallbackContent) {
  // Prefer an explicit h1
  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 1) {
      const text = token.text.trim();
      if (text) return text;
    }
  }

  // Fallback: first non-blank line of the raw content, up to 80 chars
  if (fallbackContent) {
    for (const line of fallbackContent.split("\n")) {
      const trimmed = line.replace(/^[#*>\s]+/, "").trim();
      if (trimmed && trimmed.length > 3) {
        // Strip inline markdown formatting for a clean title
        return trimmed.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "").slice(0, 80).trim();
      }
    }
  }

  return "";
}

/**
 * Extract the first paragraph text (no markdown) as the excerpt.
 */
function extractExcerptFromTokens(tokens) {
  for (const token of tokens) {
    if (token.type === "paragraph") {
      // Strip markdown: grab the plain text from inline tokens
      const text = extractInlineText(token.tokens || []);
      return text.slice(0, 300);
    }
    if (token.type === "blockquote") {
      const text = (token.tokens ? extractInlineText(token.tokens) : token.text || "").trim();
      if (text) return text.slice(0, 300);
    }
  }
  return "";
}

function extractInlineText(tokens) {
  let out = "";
  for (const t of tokens) {
    switch (t.type) {
      case "text":
      case "strong":
      case "em":
      case "del":
        out += (t.tokens ? extractInlineText(t.tokens) : t.text || "") + " ";
        break;
      case "codespan":
        out += (t.text || "") + " ";
        break;
      case "link":
        out += (t.tokens ? extractInlineText(t.tokens) : t.text || "") + " ";
        break;
      case "image":
        out += (t.text || t.title || "") + " ";
        break;
      case "br":
        out += "\n";
        break;
    }
  }
  return out.trim();
}

/**
 * Extract the first image in the tokens as the cover image.
 */
function extractCoverFromTokens(tokens) {
  for (const token of tokens) {
    // Direct image token
    if (token.type === "image" && token.href) {
      return { url: token.href, alt: token.text || token.title || "" };
    }
    // Image inside a paragraph's inline tokens
    if (token.type === "paragraph" && token.tokens) {
      for (const t of token.tokens) {
        if (t.type === "image" && t.href) {
          return { url: t.href, alt: t.text || t.title || "" };
        }
      }
    }
  }
  return null;
}

// ── Main conversion ────────────────────────────────────────────────────────

/**
 * Convert markdown text to a Soma manuscript-compatible object.
 *
 * @param {string} markdown — raw markdown text
 * @param {object} [opts]
 * @param {string} [opts.title] — override auto-detected title
 * @param {string} [opts.slug] — override auto-generated slug
 * @param {"story"|"guide"|"doc"} [opts.type="story"] — content type
 * @param {string} [opts.url] — source URL (for attribution)
 * @returns {{ slug: string, title: string, excerpt: string, type: string, body: string[], sections?: object[], intro: string, image?: string, imageAlt?: string, sources?: object[], tags: string[], topics: string[] }}
 */

/**
 * Remove the first h1 heading token from a token list (it's already
 * captured as the title and would duplicate in the body).
 */
function stripFirstHeading(tokens) {
  const idx = tokens.findIndex((t) => t.type === "heading" && t.depth === 1);
  if (idx === -1) return tokens;
  return [...tokens.slice(0, idx), ...tokens.slice(idx + 1)];
}

/**
 * Resolve a relative image URL against a base URL.
 * Returns null if resolution fails or the URL is already absolute.
 */
function resolveUrl(src, baseUrl) {
  if (!baseUrl) return null;
  if (/^https?:\/\//i.test(src)) return src; // already absolute
  try {
    return new URL(src, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Clean markdown footnote artifacts that Turndown produces from HTML
 * footnote references (e.g. danluu.com articles). These include:
 * - Footnote definitions: [^id]: text
 * - Broken link syntax: orphaned [ and ](#fnref:...)
 * - Isolated footnote keywords like "return" (from return links)
 *
 * @param {string} md - raw markdown text
 * @param {string} [baseUrl] - source page URL, used to resolve relative image paths
 */
function cleanMarkdown(md, baseUrl) {
  let result = md
    // Strip footnote definition lines: [^id]: text
    .replace(/^\[\^[\w-]+\]:\s*.*$/gm, "")
    // Strip ALL markdown links pointing to #fn: or #fnref: (footnote references).
    // Turndown converts <a href="#fn:1">[1]</a> to [\[1\]](#fn:1)
    // and <a href="#fnref:1">[return]</a> to [\[return\]](#fnref:1).
    // PageMarkdown outputs full URLs: [1](https://danluu.com/testing/#fn:S)
    // and nested brackets: [[return]](https://danluu.com/testing/#fnref:S)
    .replace(/\[\[.*?\]\]\([^)]*#fn(?:ref)?:[\w-]+[^)]*\)/g, "")
    .replace(/\[.*?\]\([^)]*#fn(?:ref)?:[\w-]+[^)]*\)/g, "")
    // Strip orphaned ](...#fn:...) or ](...#fnref:...) fragments (also full URLs)
    .replace(/\]\([^)]*#fn(?:ref)?:[\w-]+[^)]*\)/g, "")
    // Strip orphaned [ near end of line
    .replace(/\[\s*$/gm, "")
    // Merge emphasis-only lines back into adjacent paragraphs.
    // PageMarkdown and similar tools may output *word* or _word_ on their own
    // line (with or without blank line separators), which marked renders as
    // <p><em>word</em></p> — isolated & italic.
    .replace(/(\S[^\n]*)\n\s*(\*[^*]+\*)\s*\n(\S[^\n]*)/g, "$1 $2 $3")
    .replace(/(\S[^\n]*)\n\s*(_[^_]+_)\s*\n(\S[^\n]*)/g, "$1 $2 $3")
    // Collapse runs of 3+ newlines to 2
    .replace(/\n{3,}/g, "\n\n");

  // Resolve relative image URLs against the source page, or strip if no baseUrl
  if (baseUrl) {
    result = result.replace(/!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g, (_m, alt, url) => {
      const resolved = resolveUrl(url, baseUrl);
      return resolved ? `![${alt}](${resolved})` : alt || "";
    });
  } else {
    result = result.replace(/!\[([^\]]*)\]\((?!https?:\/\/)[^)]+\)/g, (_m, alt) => alt || "");
  }

  // Strip linked images: [![alt](img_url)](page_url)  — keep the page URL as a text link
  result = result.replace(/\[!\[([^\]]*)\]\([^)]+\)\]\(([^)]+)\)/g, (_m, alt, url) => `[${alt || "image"}](${url})`);

  return result;
}

export function markdownToManuscript(markdown, opts = {}) {
  const cleaned = cleanMarkdown(markdown, opts.url);
  const tokens = marked.lexer(cleaned);

  // Extract metadata
  const autoTitle = extractTitleFromTokens(tokens, markdown);
  const title = opts.title || autoTitle || "Untitled";
  const slug = opts.slug || slugify(title);
  const excerpt = extractExcerptFromTokens(tokens);

  // Strip the first h1 from tokens — it's the title and would duplicate in the body
  const bodyTokens = autoTitle ? stripFirstHeading(tokens) : tokens;

  // Convert to blocks
  const { hasRichBlocks, blocks } = tokensToBlocks(bodyTokens);

  // Build the output — use fallback cover image, never promote content images.
  // Content images (diagrams, screenshots) don't work as hero banners.
  const result = {
    slug,
    category: "Imported",
    title,
    excerpt,
    image: "https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=1200&h=675&fit=crop",
    imageAlt: "Reading content on Soma",
    author: { name: "Imported" },
    publishedAt: new Date().toISOString(),
    tags: ["Imported"],
    topics: [],
    intro: "",
    sources: opts.url ? [{ name: "Imported", url: opts.url }] : [],
    type: opts.type || "story",
  };

  if (hasRichBlocks) {
    // Mixed content: use sections format
    result.sections = [{ heading: "", paragraphs: blocks }];
  } else {
    // Pure prose: use body format (string[])
    result.body = blocks.filter((b) => typeof b === "string");
  }

  return result;
}

/**
 * Build the TypeScript manuscript source code text for a story manuscript.
 */
export function manuscriptToSource(ms) {
  const type = ms.type || "story";

  // Build the body or sections field
  let bodyField = "";
  if (ms.sections) {
    bodyField = `  sections: ${JSON.stringify(ms.sections, null, 2)
      .split("\n")
      .map((l, i) => (i === 0 ? l : `  ${l}`))
      .join("\n")
      .trimEnd()},`;
  } else if (ms.body) {
    const bodyStr = JSON.stringify(ms.body, null, 2);
    bodyField = `  body: ${bodyStr},`;
  }

  // Format the TypeScript source
  return `export const ${ms.slug.replace(/-/g, "")} = {
  slug: ${JSON.stringify(ms.slug)},
  category: ${JSON.stringify(ms.category || "Imported")},
  title: ${JSON.stringify(ms.title)},
  excerpt: ${JSON.stringify(ms.excerpt)},
  image: ${JSON.stringify(ms.image)},
  imageAlt: ${JSON.stringify(ms.imageAlt)},
  author: { name: ${JSON.stringify(ms.author?.name || "Imported")} },
  publishedAt: ${JSON.stringify(ms.publishedAt || new Date().toISOString())},
  tags: ${JSON.stringify(ms.tags || ["Imported"])},
  topics: ${JSON.stringify(ms.topics || [])},
  intro: ${JSON.stringify(ms.intro || "")},
${bodyField}
  ${ms.sources?.length ? `sources: ${JSON.stringify(ms.sources, null, 2).replace(/\n/g, "\n  ")},` : "sources: [],"}
};`;
}