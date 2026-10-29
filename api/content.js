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
  status TEXT NOT NULL DEFAULT 'private',
  title TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  body_json TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  archived_at TEXT
)`;

// FTS5 full-text search index over content_items.
// Managed entirely from application code (Turso HTTP doesn't support
// custom SQL functions needed by triggers). Synced on POST / DELETE.
const CREATE_FTS = `CREATE VIRTUAL TABLE IF NOT EXISTS content_fts USING fts5(
  slug UNINDEXED,
  type UNINDEXED,
  title,
  excerpt,
  body,
  tokenize='porter unicode61 remove_diacritics 2'
)`;

// ── Plain-text extraction (JavaScript-side, used for FTS sync) ─────────
// The body_json field is a JSON content block array. We flatten it to
// plain text so FTS5 can index it properly.
function extractPlainText(body) {
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return body; }
  }
  const parts = [];
  if (body.title) parts.push(body.title);
  if (body.excerpt) parts.push(body.excerpt);
  if (body.description) parts.push(body.description);
  if (Array.isArray(body.content)) {
    for (const block of body.content) {
      if (block.text && typeof block.text === "string") parts.push(block.text);
      if (block.caption) parts.push(block.caption);
      if (block.children && Array.isArray(block.children)) {
        for (const child of block.children) {
          if (child.text && typeof child.text === "string") parts.push(child.text);
          if (child.code) parts.push(child.code);
          if (child.children && Array.isArray(child.children)) {
            for (const c of child.children) {
              if (c.text && typeof c.text === "string") parts.push(c.text);
            }
          }
        }
      }
    }
  }
  if (body.tags && Array.isArray(body.tags)) parts.push(body.tags.join(" "));
  if (body.category) parts.push(body.category);
  return parts.join("\n").replace(/\s+/g, " ").trim();
}

/** Convert a user search string into an FTS5 query.
 *  - Quote-wrapped tokens become exact phrase matches.
 *  - Unquoted tokens get a prefix wildcard (for incremental search).
 *  - Terms are AND-ed (implicit in FTS5).
 */
function toFtsQuery(input) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const tokens = [];
  let i = 0;
  while (i < trimmed.length) {
    if (trimmed[i] === '"') {
      const end = trimmed.indexOf('"', i + 1);
      if (end === -1) { tokens.push(`"${trimmed.slice(i + 1)}"`); break; }
      tokens.push(trimmed.slice(i, end + 1));
      i = end + 1;
    } else if (trimmed[i] === " ") {
      i++;
    } else {
      const start = i;
      while (i < trimmed.length && trimmed[i] !== " " && trimmed[i] !== '"') i++;
      const term = trimmed.slice(start, i);
      if (term) tokens.push(term + "*");
    }
  }
  return tokens.join(" ");
}

// ── Pipeline helpers with FTS setup ────────────────────────────────
// FTS setup runs once per process lifetime: CREATE VIRTUAL TABLE is
// idempotent. The backfill is done from JavaScript because Turso's HTTP
// pipeline can't run custom SQL functions that triggers need.

let _ftsInitialized = false;

function arg(a) {
  if (a === null || a === undefined) return { type: "null" };
  if (typeof a === "number") return { type: "integer", value: String(a) };
  return { type: "text", value: String(a) };
}

/** Ensure the FTS table exists and backfill any missing rows. */
async function initFts() {
  if (_ftsInitialized) return;
  // Create the FTS virtual table (idempotent)
  const createRes = await fetch(DB_URL + "/v2/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [
      { type: "execute", stmt: { sql: CREATE_TABLE } },
      { type: "execute", stmt: { sql: CREATE_FTS } },
    ]}),
  });
  const createData = await createRes.json();
  _ftsInitialized = true;
  // Backfill only if FTS table is empty. Use a single batched pipeline.
  try {
    // Quick check: count existing FTS rows
    const countRes = await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [
        { type: "execute", stmt: { sql: "SELECT COUNT(*) AS cnt FROM content_fts" } },
      ]}),
    });
    const countData = await countRes.json();
    const countResult = countData.results?.[0]?.response?.result;
    const existing = countResult?.rows?.[0]?.[0]?.value;
    if (existing && Number(existing) > 0) return; // already backfilled

    // Fetch all content and build a single pipeline with all inserts
    const rows = await query("SELECT slug, type, title, excerpt, body_json FROM content_items", []);
    if (rows.length === 0) return;
    const stmts = rows.map((row) => {
      let body = {};
      try { body = JSON.parse(row.body_json || "{}"); } catch {}
      return { type: "execute", stmt: {
        sql: `INSERT INTO content_fts(slug, type, title, excerpt, body) VALUES (?, ?, ?, ?, ?)`,
        args: [arg(row.slug), arg(row.type), arg(row.title), arg(row.excerpt), arg(extractPlainText(body))],
      }};
    });
    await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: stmts }),
    });
  } catch (e) {
    // Graceful: FTS table exists, content will sync on next edit
    console.error("FTS backfill error:", e.message);
  }
}

/** Run a search query through FTS5. Ensures FTS table exists first. */
async function searchQuery(sql, args) {
  try {
    await initFts();
  } catch {
    // FTS init failed; fall back to empty results
    return [];
  }

  const body = { requests: [
    { type: "execute", stmt: { sql: CREATE_TABLE } },
    { type: "execute", stmt: { sql, args: args.map(arg) } },
  ] };

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
    const lastResult = data.results && data.results[data.results.length - 1];
    const result = lastResult && lastResult.response && lastResult.response.result;
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
    console.error("Search query error:", e.message);
    return [];
  }
}

/** Sync a content item into the FTS index. Called from POST handler. */
async function syncFts(slug, type, title, excerpt, bodyJson) {
  try { await initFts(); } catch { return; }
  const plainBody = extractPlainText(bodyJson);
  try {
    await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [
        { type: "execute", stmt: {
          sql: `INSERT INTO content_fts(slug, type, title, excerpt, body)
                VALUES (?, ?, ?, ?, ?)`,
          args: [arg(slug), arg(type), arg(title), arg(excerpt), arg(plainBody)],
        }},
      ]}),
    });
  } catch (e) {
    console.error("FTS sync error:", e.message);
  }
}

/** Remove a content item from the FTS index. Called from DELETE handler. */
async function deleteFts(slug) {
  try { await initFts(); } catch { return; }
  try {
    await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [
        { type: "execute", stmt: {
          sql: `INSERT INTO content_fts(content_fts, slug, type, title, excerpt, body)
                VALUES ('delete', ?, '', '', '', '')`,
          args: [arg(slug)],
        }},
      ]}),
    });
  } catch (e) {
    console.error("FTS delete error:", e.message);
  }
}

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

const STATUSES = new Set(["private", "published"]);

// No baseline sync: content is published deliberately via npm run publish-all
// or the studio UI. The database is the only source the GET path reads.

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
      const rows = await query("SELECT * FROM content_items WHERE slug = ?", [req.query.slug]);
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
    // With ?q= : FTS5 full-text search over title/excerpt/body, ranked by
    // relevance. Supports ?type=all for cross-type search. Supports
    // ?limit=&offset= for pagination.
    if (req.method === "GET" && req.query.type) {
      const authed = isAuthed(req);
      const statusValue = authed && typeof req.query.status === "string" && STATUSES.has(req.query.status)
        ? req.query.status
        : (authed ? null : "published");
      const statusClause = statusValue ? " AND ci.status = ?" : "";
      const statusArgs = statusValue ? [statusValue] : [];

      const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
      const offset = Math.max(parseInt(req.query.offset) || 0, 0);
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

      // Build type clause: ?type=all searches every type, otherwise filter
      const typeList = req.query.type === "all"
        ? Object.keys(ROUTE_BASE)
        : [req.query.type];
      const typePlaceholders = typeList.map(() => "?").join(",");
      const typeArgs = typeList;
      const typeClause = `ci.type IN (${typePlaceholders})`;

      if (q) {
        const ftsQuery = toFtsQuery(q);
        const sql = `SELECT ci.*, rank
          FROM content_fts fts
          JOIN content_items ci ON ci.slug = fts.slug
          WHERE content_fts MATCH ?
            AND ${typeClause}${statusClause}
          ORDER BY rank
          LIMIT ? OFFSET ?`;
        const rows = await searchQuery(sql, [ftsQuery, ...typeArgs, ...statusArgs, limit, offset]);
        return res.json(rows.map(mapRow));
      }

      const orderBy = "updated_at DESC, position ASC";
      const rows = await query(
        `SELECT * FROM content_items WHERE type = ?${statusValue ? " AND status = ?" : ""} ORDER BY ${orderBy}`,
        statusValue ? [req.query.type, statusValue] : [req.query.type]);
      return res.json(rows.map(mapRow));
    }

    // GET (no params) : full store for the owner (migration/audit tooling).
    if (req.method === "GET") {
      if (!requireAuth(req, res)) return;
      const rows = await query("SELECT * FROM content_items ORDER BY type ASC, position ASC", []);
      return res.json(rows.map(mapRow));
    }

    // POST : create or replace one item (publish script + studio dialog).
    // Editing content never flips visibility by accident: an omitted status
    // keeps the row's current status (new rows default to private).
    if (req.method === "POST") {
      if (!requireAuth(req, res)) return;
      const { slug, type, status, title, excerpt, body, meta, position } = req.body || {};
      if (!slug || !type || !body) {
        return res.status(400).json({ error: "slug, type and body required" });
      }
      if (!ROUTE_BASE[type]) return res.status(400).json({ error: "unknown type: " + type });
      if (status && !STATUSES.has(status)) return res.status(400).json({ error: "status must be private|published" });
      const existing = await query("SELECT status FROM content_items WHERE slug = ?", [slug]);
      const effectiveStatus = status || (existing.length && existing[0].status) || "private";
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
      const row = rows[0];
      if (row) {
        // Keep FTS index in sync
        await syncFts(slug, type, title || row.title || "", excerpt || row.excerpt || "", body);
      }
      return res.status(201).json(mapRow(row));
    }

    // DELETE ?slug= : owner only. Prefer unpublishing (status=private); this is the hard path.
    if (req.method === "DELETE") {
      if (!requireAuth(req, res)) return;
      const slug = (req.body && req.body.slug) || req.query.slug;
      if (!slug) return res.status(400).json({ error: "slug required" });
      await query("DELETE FROM content_items WHERE slug = ?", [slug]);
      await deleteFts(slug);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Content handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
