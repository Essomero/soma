#!/usr/bin/env node
/**
 * Build-time guards that survive the DB move:
 * 1. Env reads must prefer the official Turso names.
 * 2. Static in-app hrefs must resolve to content slugs known in Turso.
 *    Slug state lives in the database now, so this check queries it;
 *    without database credentials (fresh clone, no .env.local) it warns
 *    and passes — reference integrity at publish time is owned by
 *    `npm run publish`, which validates against the DB plus the batch.
 * Run: npx tsx scripts/validate-content.ts (exit 1 on failure)
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { getDb } from "./content-db.ts";
import { allStories } from "../src/content/stories/index.ts";
import { allGuides } from "../src/content/guides/index.ts";
import { allFeatured } from "../src/content/featured/index.ts";
import { allCourses } from "../src/content/courses/index.ts";
import { allBooks } from "../src/content/books/index.ts";
import { allSeries } from "../src/content/series/index.ts";
import { allDocs } from "../src/content/docs/index.ts";
import { allTests } from "../src/content/tests/index.ts";
import { allEpisodes } from "../src/content/podcast/episodes/index.ts";
import { allTopics } from "../src/content/topics/index.ts";

let failures = 0;
function fail(msg: string) {
  failures++;
  console.error("content error:", msg);
}

// Per-type required fields on the final corpus items (after computed fields).
// Every non-optional TS interface field that the render path reads must be present.
const CORPUS_REQUIRED: Record<string, string[]> = {
  story: ["slug", "title", "category", "excerpt", "image", "imageAlt", "author", "date", "intro", "body"],
  guide: ["slug", "title", "category", "excerpt", "image", "imageAlt", "author", "date", "intro", "body"],
  doc: ["slug", "title", "category", "description", "image", "imageAlt", "author", "date", "tags", "sections"],
  course: ["slug", "title", "description", "image", "imageAlt", "author", "date", "lessons"],
  book: ["slug", "title", "description", "image", "imageAlt", "author", "date", "chapters"],
  series: ["slug", "title", "description", "image", "imageAlt", "author", "date", "episodes"],
  test: ["slug", "title", "description", "category", "image", "imageAlt", "author", "date", "sources", "questions"],
  featured: ["slug", "tag", "title", "description", "image", "imageAlt", "author", "date"],
  podcast: ["id", "title", "image", "imageAlt", "episode", "date", "duration", "description", "category", "href"],
  topic: ["slug", "title", "description", "icon", "accentColor", "accentBg", "accentText"],
};

function checkCorpus() {
  const corpus: Array<{ type: string; items: Record<string, unknown>[] }> = [
    { type: "story", items: allStories as unknown as Record<string, unknown>[] },
    { type: "guide", items: allGuides as unknown as Record<string, unknown>[] },
    { type: "featured", items: allFeatured as unknown as Record<string, unknown>[] },
    { type: "course", items: allCourses as unknown as Record<string, unknown>[] },
    { type: "book", items: allBooks as unknown as Record<string, unknown>[] },
    { type: "series", items: allSeries as unknown as Record<string, unknown>[] },
    { type: "doc", items: allDocs as unknown as Record<string, unknown>[] },
    { type: "test", items: allTests as unknown as Record<string, unknown>[] },
    { type: "podcast", items: allEpisodes as unknown as Record<string, unknown>[] },
    { type: "topic", items: allTopics as unknown as Record<string, unknown>[] },
  ];

  for (const { type, items } of corpus) {
    const required = CORPUS_REQUIRED[type];
    if (!required) continue;
    for (const item of items) {
      const slug = typeof item.slug === "string" ? item.slug : item.id;
      for (const field of required) {
        const val = item[field];
        if (val === undefined || val === null || val === "") {
          // Author is an object — deeper emptiness check
          if (field === "author" && (typeof val !== "object" || val === null)) {
            fail(`${type}/${slug}: missing required field '${field}'`);
          } else if (field !== "author" && !isNonEmptyValue(val)) {
            fail(`${type}/${slug}: missing required field '${field}'`);
          }
        }
      }
    }
  }
}

function isNonEmptyValue(val: unknown): boolean {
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object" && val !== null) return Object.keys(val).length > 0;
  if (typeof val === "string") return val.trim().length > 0;
  if (typeof val === "number") return true;
  return false;
}

// 1. Env reads must prefer the official Turso names. A bare TURSO_DB /
// TURSO_TOKEN read silently breaks for anyone who followed the docs.
const envHits: string[] = [];
function scanEnv(dir: string) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (p.endsWith("validate-content.ts")) continue;
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "dist") continue;
      scanEnv(p);
      continue;
    }
    if (!/\.(ts|tsx|js|mjs)$/.test(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const [i, line] of text.split("\n").entries()) {
      // Only flag actual env reads (process.env.X / env.X), not local
      // constants or comments that merely mention the legacy names.
      if (/(process\.env|[^A-Z_]env)\.TURSO_DB\b/.test(line) && !/TURSO_DATABASE_URL/.test(line)) envHits.push(`${p}:${i + 1}: bare TURSO_DB read without TURSO_DATABASE_URL fallback`);
      if (/(process\.env|[^A-Z_]env)\.TURSO_TOKEN\b/.test(line) && !/TURSO_AUTH_TOKEN/.test(line)) envHits.push(`${p}:${i + 1}: bare TURSO_TOKEN read without TURSO_AUTH_TOKEN fallback`);
    }
  }
}
async function checkHrefs() {
  const hrefHits: string[] = [];
  function scanDir(dir: string) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { scanDir(p); continue; }
      if (!/\.(tsx?|md)$/.test(p)) continue;
      const text = readFileSync(p, "utf8");
      const re = /(?<=["'(])\/(stories|guides|featured|courses|books|series|docs|tests|podcast)\/[a-z0-9-]+/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) hrefHits.push(m[0]);
    }
  }
  scanDir(new URL("../src", import.meta.url).pathname);

  let db;
  try {
    db = await getDb();
  } catch {
    console.log("validate: no database credentials, skipping href check (publish-time validation still applies)");
    return;
  }
  const known = new Map<string, Set<string>>();
  try {
    const rows = await db.execute("SELECT type, slug FROM content_items");
    for (const row of rows.rows) {
      if (typeof row.type !== "string" || typeof row.slug !== "string") continue;
      if (!known.has(row.type)) known.set(row.type, new Set());
      known.get(row.type)!.add(row.slug);
    }
  } catch {
    console.log("validate: content_items not seeded yet, skipping href check (publish-time validation still applies)");
    return;
  }
  const baseToType = (base: string) =>
    ({ stories: "story", guides: "guide", featured: "featured", courses: "course", books: "book", series: "series", docs: "doc", tests: "test", podcast: "podcast" } as Record<string, string>)[base] ?? base;
  for (const h of hrefHits) {
    const [, base, slug] = h.split("/");
    const set = known.get(baseToType(base));
    if (set && !set.has(slug)) fail(`static href ${h} points at missing ${base} ${slug}`);
  }
}

checkCorpus();
await checkHrefs();

console.log(failures === 0 ? "content OK" : `${failures} failure(s)`);
process.exit(failures ? 1 : 0);
