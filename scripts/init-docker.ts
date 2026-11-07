#!/usr/bin/env tsx
/**
 * Auto-seed for Docker file SQLite at /app/data/soma.db
 * Runs on container start if DB empty. Uses positional args only.
 */
import { createClient } from "@libsql/client";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = process.env.SQLITE_PATH || process.env.DATABASE_URL || "./data/soma.db";
const fileUrl = dbPath.startsWith("file:") ? dbPath : `file:${dbPath.replace(/^file:/, "")}`;
const fp = fileUrl.replace(/^file:/, "").split("?")[0];
const abs = fp.startsWith("/") ? fp : join(rootDir, fp);
try { mkdirSync(dirname(abs), { recursive: true }); } catch {}

const CREATE = `CREATE TABLE IF NOT EXISTS content_items (
  slug TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'private',
  title TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  body_json TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  archived_at TEXT
)`;

interface ContentLike {
  slug: string;
  title: string;
  excerpt?: string;
  description?: string;
  meta?: Record<string, unknown>;
}

function countFromRows(rows: readonly unknown[]): number {
  if (!rows.length) return 0;
  const first = rows[0];
  if (!first || typeof first !== "object") return 0;
  if (!("n" in first)) return 0;
  const candidate = (first as Record<string, unknown>).n;
  // Type guard: validate before use (Rule: no inline cast for member access)
  if (typeof candidate === "number") return candidate;
  if (typeof candidate === "string") {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const client = createClient({ url: fileUrl });
await client.execute(CREATE);

const existing = await client.execute("SELECT COUNT(*) as n FROM content_items");
const n = countFromRows(existing.rows);
if (n > 0) {
  const pubRows = await client.execute("SELECT COUNT(*) as n FROM content_items WHERE status='published'");
  if (countFromRows(pubRows.rows) === 0) {
    await client.execute({ sql: "UPDATE content_items SET status=?", args: ["published"] });
    console.log(`[init-docker] Published ${n} existing rows`);
  } else {
    console.log(`[init-docker] DB seeded (${n} rows)`);
  }
  process.exit(0);
}

console.log(`[init-docker] Seeding ${fileUrl}`);

const mods = await Promise.all([
  import("../src/content/stories/index.ts"),
  import("../src/content/guides/index.ts"),
  import("../src/content/docs/index.ts"),
  import("../src/content/courses/index.ts"),
  import("../src/content/books/index.ts"),
  import("../src/content/series/index.ts"),
  import("../src/content/tests/index.ts"),
  import("../src/content/featured/index.ts"),
  import("../src/content/podcast/episodes/index.ts"),
  import("../src/content/topics/index.ts"),
]);

const srcs: Array<[string, ContentLike[]]> = [
  ["story", mods[0].allStories as ContentLike[]],
  ["guide", mods[1].allGuides as ContentLike[]],
  ["doc", mods[2].allDocs as ContentLike[]],
  ["course", mods[3].allCourses as ContentLike[]],
  ["book", mods[4].allBooks as ContentLike[]],
  ["series", mods[5].allSeries as ContentLike[]],
  ["test", mods[6].allTests as ContentLike[]],
  ["featured", mods[7].allFeatured as ContentLike[]],
  ["podcast", mods[8].allEpisodes as ContentLike[]],
  ["topic", mods[9].allTopics as ContentLike[]],
];

let total = 0;
for (const [type, list] of srcs) {
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const record = item as Record<string, unknown>;
    const body: Record<string, unknown> = {};
    for (const k of Object.keys(record)) {
      if (k === "id" || k === "href" || k === "isFeatured") continue;
      body[k] = record[k];
    }
    const title = item.title || "";
    const excerpt = item.excerpt || item.description || "";
    const meta = item.meta || {};
    const now = new Date().toISOString();
    const bodyJson = JSON.stringify(body);
    const metaJson = JSON.stringify(meta);
    try {
      await client.execute({
        sql: "INSERT INTO content_items (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING",
        args: [item.slug, type, "published", title, excerpt, bodyJson, metaJson, i, now],
      });
      await client.execute({
        sql: "UPDATE content_items SET type=?, title=?, excerpt=?, body_json=?, meta_json=?, position=?, updated_at=?, status=? WHERE slug=?",
        args: [type, title, excerpt, bodyJson, metaJson, i, now, "published", item.slug],
      });
      total++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[init-docker] fail ${type}/${item.slug}: ${msg}`);
    }
  }
}
const final = await client.execute("SELECT COUNT(*) as n FROM content_items");
console.log(`[init-docker] Seeded ${total}, total ${countFromRows(final.rows)} (all published)`);
