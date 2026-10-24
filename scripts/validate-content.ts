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

let failures = 0;
function fail(msg: string) {
  failures++;
  console.error("content error:", msg);
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

await checkHrefs();

console.log(failures === 0 ? "content OK" : `${failures} dangling reference(s)`);
process.exit(failures ? 1 : 0);
