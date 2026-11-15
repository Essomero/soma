#!/usr/bin/env tsx
/**
 * Deduplicate FTS5 indexes after the syncNoteFts bug (pre-fix: every note
 * update appended a row instead of delete-then-insert).
 *
 * Finds all duplicate slugs in note_fts and content_fts, keeps the latest
 * row (highest rowid) per slug, and deletes the older stale copies.
 *
 * Safe to re-run: idempotent, only removes extras when count > 1.
 *
 * Usage:
 *   npx tsx scripts/dedup-fts.ts                   # local SQLite (default)
 *   USE_TURSO=true npx tsx scripts/dedup-fts.ts    # remote Turso
 *   DRY_RUN=1 npx tsx scripts/dedup-fts.ts         # preview only, no deletes
 */
import { getDb, loadEnv, type ContentDatabase } from "./content-db.ts";

interface FtsTable {
  name: string;
  slugCol: string;
  extraCol?: string; // extra identifying column for group dedup
}

const TABLES: FtsTable[] = [
  { name: "note_fts", slugCol: "slug" },
  { name: "content_fts", slugCol: "slug", extraCol: "type" },
];

async function dedupTable(db: ContentDatabase, tbl: FtsTable, dryRun: boolean) {
  const groupCols = tbl.extraCol
    ? `slug, ${tbl.extraCol}`
    : "slug";

  // Count how many stale rows exist per duplicate group
  const staleCount = await db.execute(
    `SELECT COUNT(*) AS total FROM ${tbl.name} WHERE rowid NOT IN (
      SELECT MAX(rowid) FROM ${tbl.name} GROUP BY ${groupCols}
    )`
  );
  const stale = Number(
    (staleCount.rows[0] as Record<string, unknown>)?.total ?? 0
  );
  if (stale === 0) {
    console.log(`  ${tbl.name}: clean — no duplicates`);
    return;
  }

  // Count distinct groups for the report
  const dupes = await db.execute(
    `SELECT ${groupCols}, COUNT(*) AS cnt FROM ${tbl.name} GROUP BY ${groupCols} HAVING cnt > 1`
  );
  const groups = dupes.rows.length;

  console.log(`  ${tbl.name}: ${groups} duplicate group(s), ${stale} stale row(s)`);

  if (!dryRun) {
    await db.execute(
      `DELETE FROM ${tbl.name} WHERE rowid NOT IN (
        SELECT MAX(rowid) FROM ${tbl.name} GROUP BY ${groupCols}
      )`
    );
    console.log(`  → deleted ${stale} stale row(s)`);
  } else {
    console.log(`  → would delete ${stale} stale row(s)`);
  }
}

async function main() {
  loadEnv();
  const dryRun = !!(process.env.DRY_RUN && process.env.DRY_RUN !== "0" && process.env.DRY_RUN.toLowerCase() !== "false");

  console.log(`FTS dedup (${dryRun ? "DRY RUN — no changes" : "live"})`);
  console.log("");

  const db = await getDb();

  // Verify FTS tables exist
  const tables: Array<{ name: string }> = (await db.execute(
    "SELECT name FROM sqlite_master WHERE type='virtual' AND name IN ('note_fts', 'content_fts')"
  )).rows as Array<{ name: string }>;
  const existing = new Set(tables.map((r) => r.name));

  for (const tbl of TABLES) {
    if (!existing.has(tbl.name)) {
      console.log(`  ${tbl.name}: table not found — skipping`);
      continue;
    }
    await dedupTable(db, tbl, dryRun);
  }

  console.log("");
  if (dryRun) {
    console.log("Re-run without DRY_RUN to apply deletions.");
  } else {
    console.log("Done.");
  }
}

main().catch((err) => {
  console.error("FTS dedup failed:", err);
  process.exit(1);
});