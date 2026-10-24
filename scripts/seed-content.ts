#!/usr/bin/env tsx
/**
 * One-time (and re-runnable) migration: registry .ts content -> content_items.
 * - Inserts missing slugs (status from public_pages: public=published, else draft).
 * - Never touches status of existing rows (owner flips are sacred).
 * - Refreshes body/title/excerpt/position/meta on every run.
 * Run: npm run seed
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

const COMPUTED = new Set(["id", "href", "isFeatured"]);

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function stripComputed(item: SeedFields): SeedFields {
  const out: SeedFields = {};
  for (const [k, v] of Object.entries(item)) {
    if (!COMPUTED.has(k)) out[k] = v;
  }
  return out;
}

async function main() {
  const db = await getDb();
  await db.execute(CREATE_CONTENT_ITEMS);

  // public_pages is the current visibility source of truth : honor it.
  const publicSlugs = new Set<string>();
  try {
    const r = await db.execute('SELECT slug FROM public_pages WHERE "public" = 1');
    for (const row of r.rows) {
      const slug = row.slug;
      if (typeof slug === "string") publicSlugs.add(slug);
    }
  } catch {
    console.log("no public_pages table yet : all seed rows land as draft");
  }

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

  const report: Array<{ type: string; published: number; draft: number; drafts: string[] }> = [];

  for (const { type, items } of collections) {
    let published = 0;
    const drafts: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const slug = str(item.slug);
      if (!slug) throw new Error(`${type}[${i}] missing slug`);
      const body = stripComputed(item);
      const title = str(item.title);
      const excerpt = str(item.excerpt) || str(item.description);
      const meta = i === 0 && (type === "story" || type === "guide") ? { featured: true } : {};
      const status = publicSlugs.has(slug) ? "published" : "draft";
      const now = new Date().toISOString();
      await db.execute({
        sql: `INSERT INTO content_items (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING`,
        args: [slug, type, status, title, excerpt, JSON.stringify(body), JSON.stringify(meta), i, now],
      });
      await db.execute({
        sql: `UPDATE content_items SET type = ?, title = ?, excerpt = ?, body_json = ?, meta_json = ?, position = ?, updated_at = ?
              WHERE slug = ?`,
        args: [type, title, excerpt, JSON.stringify(body), JSON.stringify(meta), i, now, slug],
      });
      const cur = await db.execute({ sql: "SELECT status FROM content_items WHERE slug = ?", args: [slug] });
      if (cur.rows[0]?.status === "published") published++;
      else drafts.push(slug);
    }
    report.push({ type, published, draft: drafts.length, drafts });
  }

  console.log("seed complete:");
  for (const r of report) {
    console.log(`  ${r.type}: ${r.published} published, ${r.draft} draft${r.drafts.length ? " (" + r.drafts.join(", ") + ")" : ""}`);
  }
  console.log("Draft rows are invisible until flipped: UPDATE content_items SET status='published' WHERE slug=?");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
