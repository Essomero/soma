// Import endpoint — fetch a URL and extract readable text for content drafting.
// POST /api/import  { url: string, suggestedType?: string }
// Returns JSON: { url, title, description, wordCount, suggestedType, text }
// Requires auth (same as all admin endpoints).

import { requireAuth } from "./_auth.js";

const CONTENT_TYPES = [
  { type: "story", when: "One idea, felt deeply. Opens with something concrete that breaks, earns the principle." },
  { type: "guide", when: "Steps followed in order to end somewhere new. Reordering breaks it." },
  { type: "doc", when: "Lookup answers. Sections stand alone; reordering changes nothing." },
  { type: "course", when: "Ordered lessons where each assumes the previous." },
  { type: "book", when: "One finished work read in chapter order." },
  { type: "series", when: "A log of work released over time." },
  { type: "test", when: "Proof under time pressure with scoring." },
  { type: "featured", when: "A stage, not a topic: any story strong enough for the front page hero." },
  { type: "podcast", when: "Ideas better heard than read." },
  { type: "topic", when: "A shelf, not content: groups everything by interest." },
];

function extractMeta(html) {
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || "";
  const desc =
    (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || [])[1] ||
    (html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) || [])[1] ||
    "";
  return { title: title.trim(), description: desc.trim() };
}

function extractPlainText(html) {
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

function classifyUrl(url, suggestedType) {
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

export default async function handler(req, res) {
  requireAuth(req, res);
  if (res.headersSent) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }

  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch {
    res.status(400).json({ error: "Invalid JSON body." });
    return;
  }

  const url = (body.url || "").trim();
  if (!url) {
    res.status(400).json({ error: "url is required." });
    return;
  }

  const suggestedType = (body.suggestedType || "").trim() || undefined;

  try {
    // 1. Verify reachability
    let resp;
    try {
      resp = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15_000) });
      if ([405, 403, 501].includes(resp.status) || !resp.ok) {
        resp = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch (e) {
      if (e.message && e.message.startsWith("HTTP ")) throw e;
      throw new Error("Cannot reach URL: " + e.message);
    }

    const ctype = (resp.headers.get("content-type") || "").toLowerCase();
    const finalUrl = resp.url;
    const isPdf = ctype.includes("pdf") || finalUrl.toLowerCase().endsWith(".pdf");
    const isVideo = ctype.includes("video/");

    if (isPdf) {
      const suggested = classifyUrl(finalUrl, suggestedType);
      const typeInfo = CONTENT_TYPES.find((t) => t.type === suggested);
      res.status(200).json({
        url: finalUrl,
        title: "",
        description: "PDF content - text extraction not supported in browser. Use a PDF-to-text tool or open the URL manually, then paste the content as source.",
        wordCount: 0,
        suggestedType: suggested,
        suggestedTypeHint: typeInfo ? typeInfo.when : "",
        text: "[PDF binary - text extraction requires an external tool]",
        contentType: ctype,
        note: "PDF text extraction not available. Use a PDF-to-text tool or open the document in a browser.",
      });
      return;
    }

    if (isVideo) {
      const suggested = classifyUrl(finalUrl, suggestedType);
      const typeInfo = CONTENT_TYPES.find((t) => t.type === suggested);
      res.status(200).json({
        url: finalUrl,
        title: "",
        description: "Video content - transcript not available via URL fetch.",
        wordCount: 0,
        suggestedType: suggested,
        suggestedTypeHint: typeInfo ? typeInfo.when : "",
        text: "[Video content - transcript not available via URL fetch. For YouTube, the URL pattern alone is enough to scaffold a story with a youtube embed block.]",
        contentType: ctype,
        note: "Video transcripts require manual transcription or a caption service.",
      });
      return;
    }

    // 2. Fetch full body
    const bodyResp = await fetch(finalUrl || url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
    const html = await bodyResp.text();

    // 3. Extract metadata + text
    const { title, description } = extractMeta(html);
    const text = extractPlainText(html);
    const wordCount = text.split(/\s+/).length;

    // 4. Classify
    const suggested = classifyUrl(finalUrl, suggestedType);
    const typeInfo = CONTENT_TYPES.find((t) => t.type === suggested);

    const maxText = text.slice(0, 80_000);

    res.status(200).json({
      url: finalUrl,
      title,
      description,
      wordCount,
      suggestedType: suggested,
      suggestedTypeHint: typeInfo ? typeInfo.when : "",
      text: maxText || "[no extractable text]",
      contentType: ctype,
    });
  } catch (e) {
    const msg = e && e.message ? e.message : String(e);
    res.status(422).json({ error: msg });
  }
}
