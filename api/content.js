import { isAuthed, requireAuth } from "./_auth.js";

const DB_URL = (process.env.TURSO_DATABASE_URL || process.env.TURSO_DB || "").replace("libsql://", "https://");
const TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "";

// Table is created idempotently on every request : no manual migration needed.
// body_json holds the full content object as authored (same shape as the
// registry entries, minus computed id/href). Top-level columns exist so
// lists and visibility checks never parse JSON.
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS content_items (
  slug TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  body_json TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
)`;

// Registry route base per content type : mirrors src/content/registry.ts
const ROUTE_BASE = {
  story: "stories",
  guide: "guides",
  doc: "docs",
  course: "courses",
  book: "books",
  series: "series",
  test: "tests",
  featured: "featured",
  podcast: "podcast",
  topic: "topics",
};

const STATUSES = new Set(["draft", "published"]);

// Runtime self-heal: a deployment whose store is empty (fresh database,
// never seeded) fills itself from the build-time corpus snapshot on first
// read. One redeploy picks this up; after that no CLI or rebuild is ever
// needed. Seeded rows honor public_pages, so fresh stores land as drafts.
const CREATE_PUBLIC_PAGES = `CREATE TABLE IF NOT EXISTS public_pages (slug TEXT PRIMARY KEY, "public" INTEGER NOT NULL DEFAULT 0, set_at TEXT)`;
const CREATE_SEED_META = `CREATE TABLE IF NOT EXISTS _seed_meta (key TEXT PRIMARY KEY, done_at TEXT)`;

function toArg(a) {
  if (a === null || a === undefined) return { type: "null" };
  if (typeof a === "number") return { type: "integer", value: String(a) };
  return { type: "text", value: String(a) };
}

async function pipeline(requests) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const r = await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function rowsOf(data, i) {
  try {
    const result = data.results[i].response.result;
    const cols = (result.cols || []).map(function(c) { return c.name || c; });
    return (result.rows || []).map(function(row) {
      const obj = {};
      cols.forEach(function(c, j) {
        const cell = row[j];
        obj[c] = (cell && typeof cell === "object") ? (cell.type === "null" ? null : (cell.value !== undefined ? cell.value : null)) : cell;
      });
      return obj;
    });
  } catch {
    return [];
  }
}

async function loadCorpusRows() {
  try {
    const mod = await import("./_corpus.js");
    const raw = typeof mod.CORPUS_JSON === "string" ? JSON.parse(mod.CORPUS_JSON) : [];
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

// Returns true when it seeded (caller should re-run its query once).
// INSERT OR IGNORE keeps concurrent first requests from duplicating rows.
async function healIfEmptyStore() {
  const check = await pipeline([
    { type: "execute", stmt: { sql: CREATE_TABLE } },
    { type: "execute", stmt: { sql: CREATE_PUBLIC_PAGES } },
    { type: "execute", stmt: { sql: CREATE_SEED_META } },
    { type: "execute", stmt: { sql: "SELECT done_at FROM _seed_meta WHERE key = 'corpus'", args: [] } },
    { type: "execute", stmt: { sql: "SELECT COUNT(*) AS n FROM content_items", args: [] } },
  ]);
  if (!check) return false;
  const flagged = rowsOf(check, 3).length > 0;
  const countRow = rowsOf(check, 4)[0];
  const count = countRow ? Number(countRow.n) || 0 : 0;
  if (flagged || count > 0) return false;

  const corpus = await loadCorpusRows();
  if (!corpus.length) return false;

  const vis = await pipeline([
    { type: "execute", stmt: { sql: 'SELECT slug FROM public_pages WHERE "public" = 1', args: [] } },
  ]);
  const publicSlugs = new Set(rowsOf(vis || { results: [] }, 0).map((r) => r.slug));
  const now = new Date().toISOString();
  const inserts = [];
  for (const e of corpus) {
    if (!e || typeof e.slug !== "string") continue;
    const published = publicSlugs.has(e.slug);
    inserts.push(
      { type: "execute", stmt: { sql: `INSERT OR IGNORE INTO content_items (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [e.slug, e.type || "story", published ? "published" : "draft", e.title || "", e.excerpt || "", JSON.stringify(e.body || {}), JSON.stringify(e.meta || {}), Number(e.position) || 0, now].map(toArg) } },
      { type: "execute", stmt: { sql: `INSERT OR IGNORE INTO public_pages (slug, "public", set_at) VALUES (?, ?, ?)`, args: [e.slug, published ? 1 : 0, now].map(toArg) } },
    );
  }
  if (!inserts.length) return false;
  // Chunked so no single pipeline call grows without bound; the flag lands
  // only after every chunk applies, so a partial failure heals forward.
  for (let i = 0; i < inserts.length; i += 40) {
    const ok = await pipeline(inserts.slice(i, i + 40));
    if (!ok) return false;
  }
  await pipeline([{ type: "execute", stmt: { sql: "INSERT OR IGNORE INTO _seed_meta (key, done_at) VALUES ('corpus', ?)", args: [toArg(now)] } }]);
  return true;
}

async function query(sql, args) {
  args = args || [];
  const body = {
    requests: [
      { type: "execute", stmt: { sql: CREATE_TABLE } },
      {
        type: "execute",
        stmt: {
          sql: sql,
          args: args.map(a => {
            if (a === null || a === undefined) return { type: "null" };
            if (typeof a === "number") return { type: "integer", value: String(a) };
            return { type: "text", value: String(a) };
          }),
        },
      },
    ],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const r = await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await r.json();

    if (!r.ok) {
      console.error("Turso FAIL:", r.status, JSON.stringify(data).slice(0, 500));
      return [];
    }

    const result = data.results && data.results[1] && data.results[1].response && data.results[1].response.result;
    if (!result) {
      console.error("Unexpected Turso format:", JSON.stringify(data).slice(0, 300));
      return [];
    }

    const cols = (result.cols || []).map(function(c) { return c.name || c; });
    const rows = result.rows || [];
    return rows.map(function(row) {
      const obj = {};
      cols.forEach(function(c, i) {
        const cell = row[i];
        obj[c] = (cell && typeof cell === "object") ? (cell.type === "null" ? null : (cell.value !== undefined ? cell.value : null)) : (cell !== undefined ? cell : null);
      });
      return obj;
    });
  } catch (e) {
    console.error("Query error:", e.message);
    return [];
  }
}

// Shape matches the registry entries pages already read: full authored
// object plus computed id/href, so page flips are mechanical.
function mapRow(r) {
  if (!r) return null;
  let body = {};
  try { body = JSON.parse(r.body_json || "{}"); } catch {}
  let meta = {};
  try { meta = JSON.parse(r.meta_json || "{}"); } catch {}
  const base = ROUTE_BASE[r.type] || r.type;
  return {
    ...body,
    slug: r.slug,
    type: r.type,
    status: r.status,
    title: r.title,
    excerpt: r.excerpt,
    meta,
    // Registry parity: index.ts injected isFeatured on position 0. The seed
    // stores that decision in meta; the API surfaces it as a flat field.
    isFeatured: meta.featured === true,
    position: Number(r.position) || 0,
    updatedAt: r.updated_at,
    id: r.slug,
    href: `/${base}/${r.slug}`,
  };
}

export default async function handler(req, res) {
  try {
    // GET ?slug= : single item. Unauthenticated callers see it only when published.
    // When ?type= is also given, the row must match it (slugs are unique per
    // type, not globally).
    if (req.method === "GET" && req.query.slug) {
      let rows = await query("SELECT * FROM content_items WHERE slug = ?", [req.query.slug]);
      if (!rows[0] && await healIfEmptyStore()) {
        rows = await query("SELECT * FROM content_items WHERE slug = ?", [req.query.slug]);
      }
      const row = rows[0];
      if (!row) return res.status(404).json({ error: "Not found" });
      if (req.query.type && row.type !== req.query.type) {
        return res.status(404).json({ error: "Not found" });
      }
      if (row.status !== "published" && !isAuthed(req)) {
        return res.status(404).json({ error: "Not found" });
      }
      return res.json(mapRow(row));
    }

    // GET ?type= : ordered list. Unauthenticated callers see published only.
    // With ?q= : substring search over title/excerpt/body, same visibility
    // rules, so anonymous search can never surface drafts.
    if (req.method === "GET" && req.query.type) {
      const authed = isAuthed(req);
      const statusFilter = authed && req.query.status && STATUSES.has(req.query.status)
        ? " AND status = '" + req.query.status + "'"
        : (authed ? "" : " AND status = 'published'");
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (q) {
        const like = "%" + q.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
        let rows = await query(
          `SELECT * FROM content_items WHERE type = ?${statusFilter}
           AND (title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\' OR body_json LIKE ? ESCAPE '\\')
           ORDER BY position ASC`,
          [req.query.type, like, like, like]);
        if (!rows.length && await healIfEmptyStore()) {
          rows = await query(
            `SELECT * FROM content_items WHERE type = ?${statusFilter}
             AND (title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\' OR body_json LIKE ? ESCAPE '\\')
             ORDER BY position ASC`,
            [req.query.type, like, like, like]);
        }
        return res.json(rows.map(mapRow));
      }
      let rows = await query(
        `SELECT * FROM content_items WHERE type = ?${statusFilter} ORDER BY position ASC`
        , [req.query.type]);
      if (!rows.length && await healIfEmptyStore()) {
        rows = await query(
          `SELECT * FROM content_items WHERE type = ?${statusFilter} ORDER BY position ASC`
          , [req.query.type]);
      }
      return res.json(rows.map(mapRow));
    }

    // GET (no params) : full store for the owner (migration/audit tooling).
    if (req.method === "GET") {
      if (!requireAuth(req, res)) return;
      let rows = await query("SELECT * FROM content_items ORDER BY type ASC, position ASC", []);
      if (!rows.length && await healIfEmptyStore()) {
        rows = await query("SELECT * FROM content_items ORDER BY type ASC, position ASC", []);
      }
      return res.json(rows.map(mapRow));
    }

    // POST : create or replace one item (publish script + studio dialog).
    // Editing content never flips visibility by accident: an omitted status
    // keeps the row's current status (new rows default to draft).
    if (req.method === "POST") {
      if (!requireAuth(req, res)) return;
      const { slug, type, status, title, excerpt, body, meta, position } = req.body || {};
      if (!slug || !type || !body) {
        return res.status(400).json({ error: "slug, type and body required" });
      }
      if (!ROUTE_BASE[type]) return res.status(400).json({ error: "unknown type: " + type });
      if (status && !STATUSES.has(status)) return res.status(400).json({ error: "status must be draft|published" });
      const existing = await query("SELECT status FROM content_items WHERE slug = ?", [slug]);
      const effectiveStatus = status || (existing.length && existing[0].status) || "draft";
      const now = new Date().toISOString();
      const rows = await query(
        `INSERT INTO content_items (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET type = excluded.type, status = excluded.status,
           title = excluded.title, excerpt = excluded.excerpt, body_json = excluded.body_json,
           meta_json = excluded.meta_json, position = excluded.position, updated_at = excluded.updated_at
         RETURNING *`,
        [slug, type, effectiveStatus,
          title || body.title || "", excerpt || body.excerpt || body.description || "",
          JSON.stringify(body), JSON.stringify(meta || {}),
          Number.isFinite(Number(position)) ? Number(position) : 0, now]
      );
      return res.status(201).json(mapRow(rows[0]));
    }

    // DELETE ?slug= : owner only. Prefer unpublishing (status=draft); this is the hard path.
    if (req.method === "DELETE") {
      if (!requireAuth(req, res)) return;
      const slug = (req.body && req.body.slug) || req.query.slug;
      if (!slug) return res.status(400).json({ error: "slug required" });
      await query("DELETE FROM content_items WHERE slug = ?", [slug]);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Content handler error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
