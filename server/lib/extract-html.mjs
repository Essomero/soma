/**
 * Shared HTML extraction utilities for the Import Anything workflow.
 * Used by both api/import.js and server/mcp-server.mjs.
 */

import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  bulletListMarker: "-",
  hr: "---",
});

export function extractMeta(html) {
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || "";
  const desc =
    (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || [])[1] ||
    (html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) || [])[1] ||
    "";
  return { title: title.trim(), description: desc.trim() };
}

export function extractPlainText(html) {
  // Strip irrelevant sections before conversion
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, " ");

  // Convert HTML to Markdown
  text = turndown.turndown(text);

  // Turndown decodes most HTML entities; clean up what it leaves behind
  text = text.replace(/\u00A0/g, " ");

  // Clean up excessive whitespace
  text = text.replace(/\n{4,}/g, "\n\n\n").replace(/[ \t]+/g, " ").trim();

  return text.slice(0, 150_000);
}

export function classifyUrl(url, suggestedType) {
  if (suggestedType) return suggestedType;
  const u = url.toLowerCase();
  if (u.includes("youtube.com/watch") || u.includes("youtu.be/") || u.includes("youtube.com/embed")) return "story";
  if (u.includes("arxiv.org")) return "doc";
  if (u.endsWith(".pdf")) return "doc";
  if (u.includes("/blog/") || u.includes("/posts/") || u.includes("medium.com") || u.includes("dev.to") || u.includes("substack.com")) return "guide";
  if (u.includes("wikipedia.org")) return "doc";
  if (u.includes("/docs/") || u.includes("documentation")) return "doc";
  if (u.includes("/tutorial") || u.includes("/how-to") || u.includes("learn.")) return "guide";
  if (u.includes("/news") || u.includes("/article")) return "story";
  if (u.includes("/podcast") || u.includes("/episode")) return "podcast";
  return "guide";
}

/**
 * Redirect arXiv abstract URLs to the HTML version for full paper content.
 * Abstract pages only have metadata; the HTML version has all sections.
 */
export function resolveArxivUrl(url) {
  // Match both 2007+ IDs (2309.07544) and pre-2007 IDs (astro-ph/9901001, hep-th/9901001v1)
  const match = url.match(/^https?:\/\/arxiv\.org\/abs\/((?:\d+\.\d+|[a-z-]+\/\d+)(?:v\d+)?)/i);
  if (match) {
    const id = match[1];
    return `https://arxiv.org/html/${id}`;
  }
  return url;
}
