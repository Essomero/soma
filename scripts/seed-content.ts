#!/usr/bin/env tsx
/**
 * One-time (and re-runnable) migration: seed corpus .ts files -> content_items.
 * - Inserts missing slugs (status from public_pages: public=published, else draft).
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

  // Build-time mode: fill fresh databases only. Manual runs always refresh.
  if (ifEmpty) {
    const count = await db.execute("SELECT COUNT(*) AS n FROM content_items");
    if (Number(count.rows[0]?.n) > 0) {
      console.log("seed: content_items already populated, skipping");
      return;
    }
  }

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

  const corpus = loadCorpus();
  const byType = new Map<string, typeof corpus>();
  for (const entry of corpus) {
    if (!byType.has(entry.type)) byType.set(entry.type, []);
    byType.get(entry.type)!.push(entry);
  }

  const report: Array<{ type: string; published: number; draft: number; drafts: string[] }> = [];
  for (const [type, entries] of byType) {
    let published = 0;
    const drafts: string[] = [];
    for (const e of entries) {
      const status = publicSlugs.has(e.slug) ? "published" : "draft";
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
      else drafts.push(e.slug);
    }
    report.push({ type, published, draft: drafts.length, drafts });
  }

  console.log("seed complete:");
  for (const r of report) {
    console.log(`  ${r.type}: ${r.published} published, ${r.draft} draft${r.drafts.length ? " (" + r.drafts.join(", ") + ")" : ""}`);
  }
  console.log("Draft rows are invisible until flipped: UPDATE content_items SET status='published' WHERE slug=?");
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
