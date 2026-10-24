#!/usr/bin/env node
/**
 * Content integrity guard: every slug referenced anywhere must resolve,
 * and every card-rendered item must carry the fields pages read.
 * Run: npx tsx scripts/validate-content.ts (exit 1 on any dangling ref)
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { allStories } from "../src/content/stories/index.ts";
import { allCourses } from "../src/content/courses/index.ts";
import { allFeatured } from "../src/content/featured/index.ts";
import { allGuides } from "../src/content/guides/index.ts";
import { allBooks } from "../src/content/books/index.ts";
import { allSeries } from "../src/content/series/index.ts";
import { allDocs } from "../src/content/docs/index.ts";
import { allTests } from "../src/content/tests/index.ts";
import { allEpisodes } from "../src/content/podcast/episodes/index.ts";

let failures = 0;
function fail(msg) {
  failures++;
  console.error("  FAIL: " + msg);
}

const storySlugs = new Set(allStories.map((s) => s.slug));

// 1. Every card-rendered story needs the fields pages read unconditionally.
for (const s of allStories) {
  for (const f of ["slug", "title", "image", "imageAlt", "author", "date"]) {
    if (s[f] == null || s[f] === "") fail(`story ${s.slug} missing ${f}`);
  }
}

// 2. Every lesson/episode/chapter pointer must resolve.
for (const c of allCourses) {
  for (const l of c.lessons || []) {
    if (!storySlugs.has(l.storySlug)) fail(`course ${c.slug} lesson -> missing story ${l.storySlug}`);
  }
}
for (const s of allSeries) {
  for (const e of s.episodes || []) {
    if (!storySlugs.has(e.storySlug)) fail(`series ${s.slug} episode -> missing story ${e.storySlug}`);
  }
}
for (const b of allBooks) {
  for (const ch of b.chapters || []) {
    if (!storySlugs.has(ch.storySlug)) fail(`book ${b.slug} chapter -> missing story ${ch.storySlug}`);
  }
}
for (const t of allTests) {
  for (const src of t.sources || []) {
    if (src.type === "story" && !storySlugs.has(src.storySlug)) {
      fail(`test ${t.slug} source -> missing story ${src.storySlug}`);
    }
  }
}

// 3. Route-level lookups used with `!` or direct property reads.
for (const g of allGuides) {
  if (!g.slug || !g.title) fail(`guide missing slug/title`);
}

// 4. Static in-app hrefs must resolve (catches hardcoded links to pruned slugs).
// Only matches route-shaped strings opened by a quote or paren, so external
// URLs (https://...) and module import paths (./...) never match.
const hrefHits = [];
function scanDir(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { scanDir(p); continue; }
    if (!/\.(tsx?|md)$/.test(p)) continue;
    const text = readFileSync(p, "utf8");
    const re = /(?<=["'(])\/(stories|guides|featured|courses|books|series|docs|tests|podcast)\/[a-z0-9-]+/g;
    let m;
    while ((m = re.exec(text))) hrefHits.push(m[0]);
  }
}
scanDir(new URL("../src", import.meta.url).pathname);
const known = {
  stories: storySlugs,
  guides: new Set(allGuides.map((g) => g.slug)),
  featured: new Set(allFeatured.map((f) => f.slug)),
  courses: new Set(allCourses.map((c) => c.slug)),
  books: new Set(allBooks.map((b) => b.slug)),
  series: new Set(allSeries.map((s) => s.slug)),
  docs: new Set(allDocs.map((d) => d.slug)),
  tests: new Set(allTests.map((t) => t.slug)),
  podcast: new Set(allEpisodes.map((e) => e.slug)),
};
for (const h of hrefHits) {
  const [, type, slug] = h.split("/");
  if (known[type] && !known[type].has(slug)) fail(`static href ${h} points at missing ${type} ${slug}`);
}

console.log(failures === 0 ? "content OK" : `${failures} dangling reference(s)`);
process.exit(failures ? 1 : 0);
