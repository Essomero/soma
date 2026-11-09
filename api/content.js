import { isAuthed, requireAuth } from "./_auth.js";
import { query as dbQuery, runPipeline, arg, isTursoConfigured } from "./_db.js";

// Composite PK (type, slug) so story+featured can share the same slug for the hero stage.
// Table is created idempotently; legacy single-PK tables are migrated on first hit.
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS content_items (
  slug TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'private',
  title TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  body_json TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  archived_at TEXT,
  PRIMARY KEY (type, slug)
)`;

const CREATE_FTS = `CREATE VIRTUAL TABLE IF NOT EXISTS content_fts USING fts5(
  slug UNINDEXED,
  type UNINDEXED,
  title,
  excerpt,
  body,
  tokenize='porter unicode61 remove_diacritics 2'
)`;

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

let _ftsInitialized = false;
let _tablesReady = false;

async function migrateIfNeeded() {
  try {
    const rows = await dbQuery("SELECT sql FROM sqlite_master WHERE type='table' AND name='content_items'", []);
    const createSql = rows && rows[0] && (rows[0].sql || rows[0].SQL || "");
    if (!createSql) return;
    const upper = String(createSql).toUpperCase();
    const isLegacy = upper.includes("SLUG TEXT PRIMARY KEY") || !upper.includes("PRIMARY KEY (TYPE, SLUG)");
    if (!isLegacy) return;
    console.log("[content_items] migrating from slug PRIMARY KEY to composite (type, slug)");
    await dbQuery(`CREATE TABLE IF NOT EXISTS content_items_new (
      slug TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'private',
      title TEXT NOT NULL DEFAULT '',
      excerpt TEXT NOT NULL DEFAULT '',
      body_json TEXT NOT NULL,
      meta_json TEXT NOT NULL DEFAULT '{}',
      position INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      archived_at TEXT,
      PRIMARY KEY (type, slug)
    )`, []);
    // copy deduplicating on (type,slug) last wins
    await dbQuery(`INSERT OR REPLACE INTO content_items_new (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at, archived_at)
      SELECT slug, type, status, title, excerpt, body_json, meta_json, position, updated_at, archived_at FROM content_items`, []);
    await dbQuery("DROP TABLE content_items", []);
    await dbQuery("ALTER TABLE content_items_new RENAME TO content_items", []);
    try { await dbQuery("DROP TABLE IF EXISTS content_fts", []); } catch {}
  } catch (e) {
    console.error("[content_items] migration check failed:", e && e.message);
  }
}

async function ensureTables() {
  if (_tablesReady) return;
  try { await dbQuery(CREATE_TABLE); } catch {}
  await migrateIfNeeded();
  try { await dbQuery(CREATE_TABLE); } catch {}
  _tablesReady = true;
}

async function query(sql, args) {
  await ensureTables();
  return dbQuery(sql, args);
}

async function initFts() {
  if (_ftsInitialized) return;
  await ensureTables();
  try { await dbQuery(CREATE_FTS); } catch (e) {
    console.error("FTS create error:", e && e.message);
  }
  _ftsInitialized = true;
  try {
    const countRows = await dbQuery("SELECT COUNT(*) AS cnt FROM content_fts", []);
    const existing = countRows && countRows[0] && (countRows[0].cnt ?? countRows[0]["COUNT(*)"] ?? 0);
    if (existing && Number(existing) > 0) return;
    const rows = await dbQuery("SELECT slug, type, title, excerpt, body_json FROM content_items", []);
    if (!rows || rows.length === 0) return;
    const stmts = rows.map((row) => {
      let body = {};
      try { body = JSON.parse(row.body_json || "{}"); } catch {}
      return {
        type: "execute",
        stmt: {
          sql: `INSERT INTO content_fts(slug, type, title, excerpt, body) VALUES (?, ?, ?, ?, ?)`,
          args: [arg(row.slug), arg(row.type), arg(row.title), arg(row.excerpt), arg(extractPlainText(body))],
        },
      };
    });
    await runPipeline(stmts);
  } catch (e) {
    console.error("FTS backfill error:", e && e.message);
  }
}

async function searchQuery(sql, args) {
  try { await initFts(); } catch { return []; }
  try {
    const rows = await dbQuery(sql, args);
    return rows || [];
  } catch (e) {
    console.error("Search query error:", e && e.message);
    return [];
  }
}

async function syncFts(slug, type, title, excerpt, bodyJson) {
  try { await initFts(); } catch { return; }
  const plainBody = extractPlainText(bodyJson);
  try {
    await runPipeline([
      {
        type: "execute",
        stmt: {
          sql: `DELETE FROM content_fts WHERE slug = ? AND type = ?`,
          args: [arg(slug), arg(type)],
        },
      },
      {
        type: "execute",
        stmt: {
          sql: `INSERT INTO content_fts(slug, type, title, excerpt, body) VALUES (?, ?, ?, ?, ?)`,
          args: [arg(slug), arg(type), arg(title), arg(excerpt), arg(plainBody)],
        },
      },
    ]);
  } catch (e) {
    console.error("FTS sync error:", e && e.message);
  }
}

async function deleteFts(slug, type) {
  try { await initFts(); } catch { return; }
  try {
    if (type) {
      await runPipeline([
        {
          type: "execute",
          stmt: {
            sql: `DELETE FROM content_fts WHERE slug = ? AND type = ?`,
            args: [arg(slug), arg(type)],
          },
        },
      ]);
    } else {
      await runPipeline([
        {
          type: "execute",
          stmt: {
            sql: `DELETE FROM content_fts WHERE slug = ?`,
            args: [arg(slug)],
          },
        },
      ]);
    }
  } catch (e) {
    console.error("FTS delete error:", e && e.message);
  }
}

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
    isFeatured: meta.featured === true,
    position: Number(r.position) || 0,
    updatedAt: r.updated_at,
    id: r.slug,
    href: `/${base}/${r.slug}`,
  };
}

export default async function handler(req, res) {
  try {
    // GET ?type=&slug= : single item by composite key. Legacy ?slug= alone still works.
    if (req.method === "GET" && req.query.slug) {
      const slug = req.query.slug;
      const wantedType = req.query.type;
      let rows;
      if (wantedType) {
        rows = await query("SELECT * FROM content_items WHERE type = ? AND slug = ?", [wantedType, slug]);
      } else {
        rows = await query("SELECT * FROM content_items WHERE slug = ? ORDER BY CASE type WHEN 'featured' THEN 0 ELSE 1 END LIMIT 1", [slug]);
      }
      const row = rows[0];
      if (!row) return res.status(404).json({ error: "Not found" });
      if (wantedType && row.type !== wantedType) {
        return res.status(404).json({ error: "Not found" });
      }
      if (row.status !== "published" && !isAuthed(req)) {
        return res.status(404).json({ error: "Not found" });
      }
      return res.json(mapRow(row));
    }

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
          JOIN content_items ci ON ci.type = fts.type AND ci.slug = fts.slug
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

    if (req.method === "GET") {
      if (!requireAuth(req, res)) return;
      const rows = await query("SELECT * FROM content_items ORDER BY type ASC, position ASC", []);
      return res.json(rows.map(mapRow));
    }

    if (req.method === "POST") {
      if (!requireAuth(req, res)) return;
      const { slug, type, status, title, excerpt, body, meta, position, updatedAt } = req.body || {};
      if (!slug || !type || !body) {
        return res.status(400).json({ error: "slug, type and body required" });
      }
      if (!ROUTE_BASE[type]) return res.status(400).json({ error: "unknown type: " + type });
      if (status && !STATUSES.has(status)) return res.status(400).json({ error: "status must be private|published" });
      const existing = await query("SELECT status FROM content_items WHERE type = ? AND slug = ?", [type, slug]);
      const effectiveStatus = status || (existing.length && existing[0].status) || "private";
      const now = updatedAt && typeof updatedAt === "string" ? updatedAt : new Date().toISOString();
      const rows = await query(
        `INSERT INTO content_items (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(type, slug) DO UPDATE SET status = excluded.status,
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
        await syncFts(slug, type, title || row.title || "", excerpt || row.excerpt || "", body);
      }
      return res.status(201).json(mapRow(row));
    }

    if (req.method === "DELETE") {
      if (!requireAuth(req, res)) return;
      const slug = (req.body && req.body.slug) || req.query.slug;
      const type = (req.body && req.body.type) || req.query.type;
      if (!slug) return res.status(400).json({ error: "slug required" });
      if (type) {
        await query("DELETE FROM content_items WHERE type = ? AND slug = ?", [type, slug]);
        await deleteFts(slug, type);
      } else {
        await query("DELETE FROM content_items WHERE slug = ?", [slug]);
        await deleteFts(slug);
      }
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Content handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
