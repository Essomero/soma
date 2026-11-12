/**
 * Shared HTML extraction utilities for the Import Anything workflow.
 * Used by both api/import.js and server/mcp-server.mjs.
 */

export function extractMeta(html) {
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || "";
  const desc =
    (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || [])[1] ||
    (html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) || [])[1] ||
    "";
  return { title: title.trim(), description: desc.trim() };
}

export function extractPlainText(html) {
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, " ");
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ");
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ");
  text = text.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ");
  text = text.replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, " ");
  text = text.replace(/<\/(p|h[1-6]|li|div|blockquote|pre|tr|section|article)>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
  text = text.replace(/\n\s*\n/g, "\n\n").replace(/[ \t]+/g, " ").trim();
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
