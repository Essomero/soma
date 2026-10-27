#!/usr/bin/env tsx
/**
 * Agent publishing path: .ts manuscript -> content_items row (always private).
 *   npm run publish -- [--type story] [--featured] <file...>
 * Publishing validates schema and cross-file references, then upserts.
 * Publishing never touches visibility: new rows land private, existing rows
 * keep their status. Going public is a human toggle flip, never a CLI flag.
 */
import { pathToFileURL } from "url";
import { basename, dirname, resolve } from "path";
import { getDb, CREATE_CONTENT_ITEMS } from "./content-db.ts";

type Fields = Record<string, unknown>;

const TYPES = new Set(["story", "guide", "doc", "course", "book", "series", "test", "featured", "podcast", "topic"]);

// Minimal per-type required fields : shape depth is enforced by tsc on the manuscript.
const REQUIRED: Record<string, string[]> = {
  story: ["slug", "title"],
  guide: ["slug", "title"],
  doc: ["slug", "title"],
  course: ["slug", "title", "lessons"],
  book: ["slug", "title", "chapters"],
  series: ["slug", "title", "episodes"],
  test: ["slug", "title", "questions"],
  featured: ["slug", "title"],
  podcast: ["slug", "title"],
  topic: ["slug", "title"],
};

// Fields holding slug pointers to other rows, checked against DB + batch.
const REF_FIELDS: Record<string, string> = {
  course: "lessons",
  book: "chapters",
  series: "episodes",
};

function refsOf(type: string, body: Fields): string[] {
  const out: string[] = [];
  if (type === "test") {
    const src = body.source;
    if (src && typeof src === "object" && "slug" in src && typeof src.slug === "string") out.push(src.slug);
    const lessons = body.lessons;
    if (Array.isArray(lessons)) {
      for (const l of lessons) {
        if (l && typeof l === "object" && "storySlug" in l && typeof l.storySlug === "string") out.push(l.storySlug);
      }
    }
    return out;
  }
  const field = REF_FIELDS[type];
  if (!field) return out;
  const list = body[field];
  if (!Array.isArray(list)) return out;
  for (const entry of list) {
    if (entry && typeof entry === "object") {
      const cand = ("storySlug" in entry ? entry.storySlug : ("slug" in entry ? entry.slug : undefined));
      if (typeof cand === "string") out.push(cand);
    }
  }
  return out;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  let typeOverride = "";
  let featured = false;
  const files: string[] = [];
  for (let i = 0; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a === "--type") typeOverride = rawArgs[++i] || typeOverride;
    else if (a === "--featured") featured = true;
    else if (a.startsWith("--")) throw new Error(`unknown flag ${a}`);
    else files.push(a);
  }
  if (!files.length) throw new Error("usage: npm run publish -- [--type story] [--featured] <file...>");

  const db = await getDb();
  await db.execute(CREATE_CONTENT_ITEMS);

  // Load batch first so cross-file refs resolve within one publish.
  const batch: Array<{ type: string; slug: string; body: Fields; file: string }> = [];
  for (const f of files) {
    const full = resolve(f);
    const mod = await import(pathToFileURL(full).href);
    const values = Object.values(mod).filter((v) => v && typeof v === "object" && "slug" in (v as object));
    if (values.length !== 1) throw new Error(`${f}: expected exactly one slug-bearing export, found ${values.length}`);
    const body = values[0] as Fields;
    const slug = body.slug;
    if (typeof slug !== "string" || !slug) throw new Error(`${f}: export has no usable slug`);
    const dirType = basename(dirname(full));
    // Per-file inference wins: `drafts/<type>/<slug>.ts` batches mix types
    // freely. --type is the fallback for files outside a typed dir.
    const type = TYPES.has(dirType) ? dirType : typeOverride;
    if (!type) throw new Error(`${f}: cannot infer type from dir '${dirType}', pass --type`);
    if (!TYPES.has(type)) throw new Error(`${f}: unknown type ${type}`);
    for (const field of REQUIRED[type] || ["slug", "title"]) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        throw new Error(`${f}: ${type} missing required field '${field}'`);
      }
    }
    batch.push({ type, slug, body, file: f });
  }

  // Slug uniqueness : collision with a *different* batch entry is an error.
  const seen = new Map<string, string>();
  for (const b of batch) {
    if (seen.has(b.slug) && seen.get(b.slug) !== b.file) throw new Error(`duplicate slug ${b.slug} in batch`);
    seen.set(b.slug, b.file);
  }

  // Reference integrity against DB + batch.
  const batchSlugs = new Set(batch.map((b) => b.slug));
  for (const b of batch) {
    for (const ref of refsOf(b.type, b.body)) {
      if (batchSlugs.has(ref)) continue;
      const hit = await db.execute({ sql: "SELECT slug FROM content_items WHERE slug = ?", args: [ref] });
      if (!hit.rows.length) throw new Error(`${b.file}: ${b.type} references unknown slug '${ref}'`);
    }
  }

  // Single visibility gate: content_items.status controls public access.
  const now = new Date().toISOString();
  for (const b of batch) {
    const title = typeof b.body.title === "string" ? b.body.title : "";
    const desc = b.body.excerpt ?? b.body.description;
    const excerpt = typeof desc === "string" ? desc : "";
    const posRow = await db.execute({ sql: "SELECT COALESCE(MAX(position), -1) AS m FROM content_items WHERE type = ?", args: [b.type] });
    const existing = await db.execute({ sql: "SELECT position, status FROM content_items WHERE slug = ?", args: [b.slug] });
    const rawMax = posRow.rows[0]?.m;
    const existingStatus = existing.rows.length && typeof existing.rows[0]?.status === "string" ? existing.rows[0].status : "";
    const effectiveStatus = existingStatus === "published" ? "published" : "private";
    const meta = featured ? { featured: true } : {};
    const position = existing.rows.length
      ? (typeof existing.rows[0]?.position === "number" ? (existing.rows[0]?.position as number) : 0)
      : (typeof rawMax === "number" ? rawMax + 1 : 0);
    if (featured) {
      await db.execute({ sql: "UPDATE content_items SET meta_json = '{}' WHERE type = ?", args: [b.type] });
    }
    await db.execute({
      sql: `INSERT INTO content_items (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(slug) DO UPDATE SET type = excluded.type, status = excluded.status,
              title = excluded.title, excerpt = excluded.excerpt, body_json = excluded.body_json,
              meta_json = excluded.meta_json, position = excluded.position, updated_at = excluded.updated_at`,
      args: [b.slug, b.type, effectiveStatus, title, excerpt, JSON.stringify(b.body), JSON.stringify(meta), position, now],
    });
    console.log(`published ${b.type} ${b.slug} <- ${b.file} [${effectiveStatus}]`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
