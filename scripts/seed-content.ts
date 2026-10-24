#!/usr/bin/env tsx
/**
 * One-time (and re-runnable) migration: seed corpus .ts files -> content_items.
 * - Inserts missing slugs (status from public_pages: public=published, else private).
 * - Never touches status of existing rows (owner flips are sacred).
 * - Refreshes body/title/excerpt/position/meta on every run.
 * Run: npm run seed (manual refresh) — builds use --if-empty (fresh DBs only).
 */
import { getDb, CREATE_CONTENT_ITEMS } from "./content-db.ts";
import { loadCorpus } from "./corpus.ts";

async function main() {
  const ifEmpty = process.argv.includes("--if-empty");
  let db;
  try {
    db = await getDb();
  } catch (e) {
    // Local builds without Turso configured must keep working.
    if (e instanceof Error && /Missing TURSO/.test(e.message)) {
      console.log("seed: no database credentials, skipping");
      return;
    }
    throw e;
  }
  await db.execute(CREATE_CONTENT_ITEMS);

  // Build-time mode backfills only what's missing (fast path for populated
  // stores); manual runs refresh every row. Status is never touched.
  let present = new Set<string>();
  if (ifEmpty) {
    const existing = await db.execute("SELECT slug, status FROM content_items");
    for (const row of existing.rows) {
      if (typeof row.slug === "string") present.add(row.slug);
    }
    if (present.size === 0) console.log("seed: empty store, importing full corpus");
  }

  // public_pages is the current visibility source of truth : honor it.
  const publicSlugs = new Set<string>();
  try {
    const r = await db.execute('SELECT slug FROM public_pages WHERE "public" = 1');
    for (const row of r.rows) {
      if (typeof row.slug === "string") publicSlugs.add(row.slug);
    }
  } catch {
    console.log("no public_pages table yet : all seed rows land as private");
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
      // Build-time mode inserts only what's missing; manual runs refresh all.
      if (ifEmpty && present.has(e.slug)) continue;
      const status = publicSlugs.has(e.slug) ? "published" : "private";
      const now = new Date().toISOString();
      await db.execute({
        sql: `INSERT INTO content_items (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING`,
        args: [e.slug, type, status, e.title, e.excerpt, JSON.stringify(e.body), JSON.stringify(e.meta), e.position, now],
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
    console.log(`seed: store already complete (${present.size} rows present, ${inserted} inserted)`);
    return;
  }
  console.log("seed complete:");
  for (const r of report) {
    console.log(`  ${r.type}: ${r.published} published, ${r.private} private${r.privateSlugs.length ? " (" + r.privateSlugs.join(", ") + ")" : ""}`);
  }
  console.log("Private rows are invisible until flipped: UPDATE content_items SET status='published' WHERE slug=?");
}

main().catch((e: unknown) => {
  // Build-time mode must never break the deploy on a transient database
  // error: the runtime healer in api/content.js covers the same ground on
  // first request. Real code bugs still fail loudly via export-corpus and
  // validate-content, which run on the same corpus without a safety net.
  if (process.argv.includes("--if-empty")) {
    console.log(`seed: skipped during build (${e instanceof Error ? e.message : e})`);
    process.exit(0);
  }
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
