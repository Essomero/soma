#!/usr/bin/env tsx
/**
 * Format Paste CLI — paste URL or markdown and get a formatted Soma manuscript.
 *
 * Usage:
 *   npx tsx scripts/format-paste.ts --url https://example.com/article
 *   cat article.md | npx tsx scripts/format-paste.ts
 *   npx tsx scripts/format-paste.ts --content "# Hello\n\nWorld" --title "My Article"
 *   npx tsx scripts/format-paste.ts --url ... --slug my-slug --type doc
 *
 * Output: writes to drafts/<type>/<slug>.ts and prints the file path.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { markdownToManuscript, manuscriptToSource } from "../server/lib/format-paste.mjs";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "untitled";
}

async function main() {
  const args = process.argv.slice(2);
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "";
      flags[key] = val;
      if (val) i++;
    }
  }

  let content = flags.content || "";
  const url = flags.url || "";
  const title = flags.title || undefined;
  const slug = flags.slug || undefined;
  const type = flags.type || "story";
  let sourceUrl = url;

  // Read from stdin if no content or url
  if (!content && !url) {
    const { promise: stdinPromise, resolve: stdinResolve } = Promise.withResolvers<string>();
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => { data += chunk; });
    process.stdin.on("end", () => stdinResolve(data));
    const stdin = await stdinPromise;
    content = stdin.trim();
  }

  if (!content && url) {
    // Fetch from URL
    const fetchUrl = url.includes("arxiv.org/abs/")
      ? url.replace(/\/abs\/(.+)/, "/html/$1")
      : url;

    const resp = await fetch(fetchUrl, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
    if (!resp.ok) {
      console.error(`Failed to fetch URL: HTTP ${resp.status}`);
      process.exit(1);
    }

    const { extractPlainText, extractMeta, resolveArxivUrl } = await import("../server/lib/extract-html.mjs");
    const html = await resp.text();
    const meta = extractMeta(html);
    content = extractPlainText(html);
    sourceUrl = resolveArxivUrl(url) || url;

    if (!title && meta.title) {
      flags.title = meta.title;
    }
  }

  if (!content || !content.trim()) {
    console.error("No content to format. Provide --content, --url, or pipe markdown via stdin.");
    process.exit(1);
  }

  const ms = markdownToManuscript(content, { title, slug, url: sourceUrl, type });

  // Ensure unique slug in drafts/
  const draftDir = join(rootDir, "drafts", type);
  if (!existsSync(draftDir)) {
    mkdirSync(draftDir, { recursive: true });
  }

  let finalSlug = ms.slug;
  let filePath = join(draftDir, `${finalSlug}.ts`);
  let counter = 2;
  while (existsSync(filePath)) {
    finalSlug = `${ms.slug}-${counter++}`;
    filePath = join(draftDir, `${finalSlug}.ts`);
  }
  ms.slug = finalSlug;

  // Write the manuscript file
  const source = manuscriptToSource(ms);
  writeFileSync(filePath, `${source}\n`, "utf8");

  const wordCount = ms.body?.reduce((a: number, p: string) => a + p.split(/\s+/).filter(Boolean).length, 0) +
    (ms.sections || []).reduce((a: number, s: { paragraphs: (string | object)[] }) =>
      a + s.paragraphs.reduce((pa: number, p: string | object) =>
        pa + (typeof p === "string" ? p : JSON.stringify(p)).split(/\s+/).filter(Boolean).length, 0
      ), 0
    ) || 0;

  console.log(JSON.stringify({
    file: filePath,
    slug: finalSlug,
    title: ms.title,
    excerpt: ms.excerpt,
    type,
    blocks: (ms.body?.length || 0) + (ms.sections?.reduce((a: number, s: { paragraphs: unknown[] }) => a + s.paragraphs.length, 0) || 0),
    hasSections: !!ms.sections,
    wordCount,
    sourceUrl: sourceUrl || undefined,
  }, null, 2));
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});