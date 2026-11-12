// Import endpoint — fetch a URL and extract readable text for content drafting.
// POST /api/import  { url: string, suggestedType?: string }
// Returns JSON: { url, title, description, wordCount, suggestedType, text }
// Requires auth (same as all admin endpoints).

import { requireAuth } from "./_auth.js";
import { extractMeta, extractPlainText, classifyUrl } from "../server/lib/extract-html.mjs";

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
