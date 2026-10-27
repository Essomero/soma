#!/usr/bin/env tsx
/**
 * Publish all content: imports every .ts content source and writes it to Turso.
 *   npm run publish-all           # refresh all rows (body/excerpt/position/meta)
 *   npm run publish-all --if-empty  # insert only missing slugs (build-time fast path)
 *
 * Status is never touched: existing published rows stay published, new rows
 * land as private. Going public is a human toggle flip, never a CLI flag.
 */
import { getDb, CREATE_CONTENT_ITEMS } from "./content-db.ts";
import { allStories } from "../src/content/stories/index.ts";
import { allGuides } from "../src/content/guides/index.ts";
import { allDocs } from "../src/content/docs/index.ts";
import { allCourses } from "../src/content/courses/index.ts";
import { allBooks } from "../src/content/books/index.ts";
import { allSeries } from "../src/content/series/index.ts";
import { allTests } from "../src/content/tests/index.ts";
import { allFeatured } from "../src/content/featured/index.ts";
import { allEpisodes } from "../src/content/podcast/episodes/index.ts";
import { allTopics } from "../src/content/topics/index.ts";

type SeedFields = Record<string, unknown>;

interface CorpusEntry {
  type: string;
  slug: string;
  title: string;
  excerpt: string;
  body: SeedFields;
  meta: Record<string, unknown>;
  position: number;
}

const COMPUTED: Record<string, true> = { id: true, href: true, isFeatured: true };

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function stripComputed(item: SeedFields): SeedFields {
  const out: SeedFields = {};
  for (const [k, v] of Object.entries(item)) {
    if (!(k in COMPUTED)) out[k] = v;
  }
  return out;
}

function loadCorpus(): CorpusEntry[] {
  const collections: Array<{ type: string; items: SeedFields[] }> = [
    { type: "story", items: allStories },
    { type: "guide", items: allGuides },
    { type: "doc", items: allDocs },
    { type: "course", items: allCourses },
    { type: "book", items: allBooks },
    { type: "series", items: allSeries },
    { type: "test", items: allTests },
    { type: "featured", items: allFeatured },
    { type: "podcast", items: allEpisodes },
    { type: "topic", items: allTopics },
  ];
  const out: CorpusEntry[] = [];
  for (const { type, items } of collections) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const slug = str(item.slug);
      if (!slug) throw new Error(`${type}[${i}] missing slug`);
      const body = stripComputed(item);
      const title = str(item.title);
      const excerpt = str(item.excerpt) || str(item.description);
      const meta = i === 0 && (type === "story" || type === "guide") ? { featured: true } : {};
      out.push({ type, slug, title, excerpt, body, meta, position: i });
    }
  }
  return out;
}

async function main() {
  const ifEmpty = process.argv.includes("--if-empty");
  let db;
  try {
    db = await getDb();
  } catch (e) {
    if (e instanceof Error && /Missing TURSO/.test(e.message)) {
      console.log("publish-all: no database credentials, skipping");
      return;
    }
    throw e;
  }
  await db.execute(CREATE_CONTENT_ITEMS);

  // Build-time mode: backfill only what's missing (fast path for populated stores).
  // Manual runs: refresh every row. Status is never touched.
  let present = new Set<string>();
  if (ifEmpty) {
    const existing = await db.execute("SELECT slug FROM content_items");
    for (const row of existing.rows) {
      if (typeof row.slug === "string") present.add(row.slug);
    }
    if (present.size === 0) console.log("publish-all: empty store, importing full corpus");
  }

  const corpus = loadCorpus();
  const byType = new Map<string, typeof corpus>();
  for (const entry of corpus) {
    if (!byType.has(entry.type)) byType.set(entry.type, []);
    byType.get(entry.type)!.push(entry);
  }

  const report: Array<{ type: string; published: number; private: number; privateSlugs: string[] }> = [];
  for (const [type, entries] of byType) {
    let published = 0;
    const privateSlugs: string[] = [];
    for (const e of entries) {
      if (ifEmpty && present.has(e.slug)) continue;
      const now = new Date().toISOString();
      // Insert if missing (never overwrite status), then always update fields.
      await db.execute({
        sql: `INSERT INTO content_items (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at)
              VALUES (?, ?, 'private', ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING`,
        args: [e.slug, type, e.title, e.excerpt, JSON.stringify(e.body), JSON.stringify(e.meta), e.position, now],
      });
      await db.execute({
        sql: `UPDATE content_items SET type = ?, title = ?, excerpt = ?, body_json = ?, meta_json = ?, position = ?, updated_at = ?
              WHERE slug = ?`,
        args: [type, e.title, e.excerpt, JSON.stringify(e.body), JSON.stringify(e.meta), e.position, now, e.slug],
      });
      const cur = await db.execute({ sql: "SELECT status FROM content_items WHERE slug = ?", args: [e.slug] });
      if (cur.rows[0]?.status === "published") published++;
      else privateSlugs.push(e.slug);
    }
    report.push({ type, published, private: privateSlugs.length, privateSlugs });
  }

  if (ifEmpty) {
    const inserted = report.reduce((n, r) => n + r.published + r.private, 0);
    console.log(`publish-all: store already complete (${present.size} rows present, ${inserted} inserted)`);
    return;
  }
  console.log("publish-all complete:");
  for (const r of report) {
    console.log(`  ${r.type}: ${r.published} published, ${r.private} private${r.privateSlugs.length ? " (" + r.privateSlugs.join(", ") + ")" : ""}`);
  }
  console.log("Private rows are invisible until flipped: UPDATE content_items SET status='published' WHERE slug=?");
}

main().catch((e: unknown) => {
  // Build-time mode must never break the deploy on a transient database
  // error: the runtime path (api/content.js GET) no longer does any seeding,
  // so a failure here means the DB is truly unreachable for this deploy cycle.
  // But a deploy without a database is still deployable: the content API
  // returns empty, which is valid for a new environment before the first run.
  if (process.argv.includes("--if-empty")) {
    console.log(`publish-all: skipped during build (${e instanceof Error ? e.message : e})`);
    process.exit(0);
  }
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
