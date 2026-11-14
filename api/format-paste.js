// Format Paste endpoint — paste URL or markdown and get a formatted Soma manuscript.
// POST /api/format-paste
// Body: { content?: string, url?: string, title?: string, slug?: string, type?: string }
// Returns: { file, slug, title, excerpt, type, blocks, hasSections, wordCount, body, sections, sources }
//
// Requires auth (same as all admin endpoints).

import { requireAuth } from "./_auth.js";
import { markdownToManuscript, manuscriptToSource } from "../server/lib/format-paste.mjs";

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

  const content = (body.content || "").trim();
  const url = (body.url || "").trim();
  const title = (body.title || "").trim() || undefined;
  const slug = (body.slug || "").trim() || undefined;
  const type = (body.type || "").trim() || "story";

  if (!content && !url) {
    res.status(400).json({ error: "Provide content (markdown text) or url (to fetch)." });
    return;
  }

  try {
    let markdown = content;
    let sourceUrl = url;

    // If URL provided, fetch it
    if (url && !content) {
      // Dynamically import extract-html for URL resolution + HTML→markdown
      const { extractMeta, extractPlainText, resolveArxivUrl } = await import("../server/lib/extract-html.mjs");
      const fetchUrl = resolveArxivUrl(url);

      let resp;
      try {
        resp = await fetch(fetchUrl, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
      } catch (fetchErr) {
        const msg = fetchErr?.name === "AbortError"
          ? `Request timed out after 30s: ${fetchUrl}`
          : `Failed to fetch: ${fetchErr?.message || fetchErr}`;
        res.status(502).json({ error: msg });
        return;
      }
      if (!resp.ok) {
        res.status(502).json({ error: `Failed to fetch URL: HTTP ${resp.status}` });
        return;
      }

      const html = await resp.text();
      const meta = extractMeta(html);
      markdown = extractPlainText(html);
      sourceUrl = fetchUrl;

      if (!title && meta.title) {
        body.title = meta.title;
      }
    }

    if (!markdown || !markdown.trim()) {
      res.status(400).json({ error: "No content to format." });
      return;
    }

    const ms = markdownToManuscript(markdown, { title, slug, url: sourceUrl, type });

    // Generate source code for the file
    const source = manuscriptToSource(ms);

    res.json({
      file: `drafts/${type}/${ms.slug}.ts`,
      slug: ms.slug,
      title: ms.title,
      excerpt: ms.excerpt,
      type,
      blocks: (ms.body?.length || 0) + (ms.sections?.reduce((a, s) => a + s.paragraphs.length, 0) || 0),
      hasSections: !!ms.sections,
      wordCount: (ms.body || []).reduce((a, p) => a + p.split(/\s+/).filter(Boolean).length, 0) +
        (ms.sections || []).reduce((a, s) =>
          a + s.paragraphs.reduce((pa, p) =>
            pa + (typeof p === "string" ? p : JSON.stringify(p)).split(/\s+/).filter(Boolean).length, 0
          ), 0
        ) || 0,
      source: source,
      image: ms.image,
      imageAlt: ms.imageAlt,
      body: ms.sections ? undefined : ms.body,
      sections: ms.sections,
      sources: ms.sources,
      sourceUrl: sourceUrl || undefined,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Format failed" });
  }
}