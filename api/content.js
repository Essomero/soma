import { isAuthed, requireAuth } from "./_auth.js";
import { query as dbQuery, runPipeline, arg, isTursoConfigured } from "./_db.js";
import { getTenantId } from "./_tenant.js";

// Modern migrations: always runs on boot, tracks _migrations table, skips applied.
const MIGRATIONS = [
  {
    id: "001_content_items_composite_pk",
    description: "Composite PK (type, slug) so story+featured can share slug",
    up: async (q) => {
      let sql = "";
      try {
        const rows = await q("SELECT sql FROM sqlite_master WHERE type='table' AND name='content_items'", []);
        sql = rows[0]?.sql || rows[0]?.SQL || "";
      } catch {}
      if (!sql) {
        await q(`CREATE TABLE IF NOT EXISTS content_items (
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
        return;
      }
      const upper = sql.toUpperCase();
      const hasTenantPk = upper.includes("PRIMARY KEY (TENANT_ID, TYPE, SLUG)");
      const isLegacy = !hasTenantPk && (upper.includes("SLUG TEXT PRIMARY KEY") || !upper.includes("PRIMARY KEY (TYPE, SLUG)"));
      if (!isLegacy) return;
      console.log("[migrate] 001 composite PK: migrating legacy slug PK -> (type,slug)");
      await q(`CREATE TABLE IF NOT EXISTS content_items_new (
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
      // Copy handling both 9-col (no archived_at) and 10-col variants
      try {
        await q(`INSERT OR REPLACE INTO content_items_new (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at, archived_at)
          SELECT slug, type, status, title, excerpt, body_json, meta_json, position, updated_at, archived_at FROM content_items`, []);
      } catch {
        try {
          await q(`INSERT OR REPLACE INTO content_items_new (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at)
            SELECT slug, type, status, title, excerpt, body_json, meta_json, position, updated_at FROM content_items`, []);
        } catch (e) {
          console.error("[migrate] copy failed", e && e.message);
        }
      }
      await q("DROP TABLE content_items", []);
      await q("ALTER TABLE content_items_new RENAME TO content_items", []);
      try { await q("DROP TABLE IF EXISTS content_fts", []); } catch {}
    },
  },
  {
    id: "002_tenant_id",
    description: "Add tenant_id column to every data table for multi-tenant support",
    up: async (q) => {
      // Check if already applied — look for tenant_id on content_items
      try {
        const rows = await q("PRAGMA table_info(content_items)", []);
        const cols = (rows || []).map((r) => r.name || r.Name || "");
        if (cols.includes("tenant_id")) {
          console.log("[migrate] 002 tenant_id: already present, skipping");
          return;
        }
      } catch {}
      console.log("[migrate] 002 tenant_id: adding tenant_id to all tables");

      // 1. content_items — PK rebuild
      await q(`CREATE TABLE IF NOT EXISTS content_items_new (
        tenant_id TEXT NOT NULL DEFAULT 'default',
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
        PRIMARY KEY (tenant_id, type, slug)
      )`, []);
      try {
        await q(`INSERT OR REPLACE INTO content_items_new (tenant_id, slug, type, status, title, excerpt, body_json, meta_json, position, updated_at, archived_at)
          SELECT 'default', slug, type, status, title, excerpt, body_json, meta_json, position, updated_at, archived_at FROM content_items`, []);
      } catch {
        await q(`INSERT OR REPLACE INTO content_items_new (tenant_id, slug, type, status, title, excerpt, body_json, meta_json, position, updated_at)
          SELECT 'default', slug, type, status, title, excerpt, body_json, meta_json, position, updated_at FROM content_items`, []);
      }
      await q("DROP TABLE content_items", []);
      await q("ALTER TABLE content_items_new RENAME TO content_items", []);
      try { await q("DROP TABLE IF EXISTS content_fts", []); } catch {}

      // 2. note_articles — simple ALTER
      try { await q("ALTER TABLE note_articles ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'", []); } catch (e) { console.log("[migrate] note_articles tenant_id:", e?.message); }

      // 3. ratings — PK rebuild
      try {
        await q("DROP TABLE IF EXISTS ratings_old", []);
        await q("ALTER TABLE ratings RENAME TO ratings_old", []);
        await q(`CREATE TABLE IF NOT EXISTS ratings (
          tenant_id TEXT NOT NULL DEFAULT 'default',
          story_slug TEXT NOT NULL,
          rating INTEGER NOT NULL,
          rated_at TEXT,
          PRIMARY KEY (tenant_id, story_slug)
        )`, []);
        await q(`INSERT OR IGNORE INTO ratings (tenant_id, story_slug, rating, rated_at)
          SELECT 'default', story_slug, rating, rated_at FROM ratings_old`, []);
        await q("DROP TABLE ratings_old", []);
      } catch (e) { console.log("[migrate] ratings:", e?.message); }

      // 4. highlights — simple ALTER
      try { await q("ALTER TABLE highlights ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'", []); } catch (e) { console.log("[migrate] highlights tenant_id:", e?.message); }

      // 5. comments — simple ALTER
      try { await q("ALTER TABLE comments ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'", []); } catch (e) { console.log("[migrate] comments tenant_id:", e?.message); }

      // 6. progress — PK rebuild
      try {
        await q("DROP TABLE IF EXISTS progress_old", []);
        await q("ALTER TABLE progress RENAME TO progress_old", []);
        await q(`CREATE TABLE IF NOT EXISTS progress (
          tenant_id TEXT NOT NULL DEFAULT 'default',
          story_slug TEXT NOT NULL,
          completed INTEGER NOT NULL DEFAULT 0,
          completed_at TEXT,
          PRIMARY KEY (tenant_id, story_slug)
        )`, []);
        await q(`INSERT OR IGNORE INTO progress (tenant_id, story_slug, completed, completed_at)
          SELECT 'default', story_slug, completed, completed_at FROM progress_old`, []);
        await q("DROP TABLE progress_old", []);
      } catch (e) { console.log("[migrate] progress:", e?.message); }

      // 7. test_submissions — simple ALTER
      try { await q("ALTER TABLE test_submissions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'", []); } catch (e) { console.log("[migrate] test_submissions tenant_id:", e?.message); }

      // 8. lab_attempts — simple ALTER + index rebuild
      try { await q("ALTER TABLE lab_attempts ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'", []); } catch (e) { console.log("[migrate] lab_attempts tenant_id:", e?.message); }
      try { await q("DROP INDEX IF EXISTS idx_lab_attempts_slug", []); } catch {}
      try { await q("DROP INDEX IF EXISTS idx_lab_attempts_unique", []); } catch {}
      try { await q("CREATE INDEX IF NOT EXISTS idx_lab_attempts_tenant_slug ON lab_attempts(tenant_id, content_slug)", []); } catch {}
      try { await q("CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_attempts_tenant_unique ON lab_attempts(tenant_id, content_slug, lab_id)", []); } catch {}
    },
  },
  {
    id: "003_voice_profiles",
    description: "Add voice_profiles table for AI humanization rewrites",
    up: async (q) => {
      await q(`CREATE TABLE IF NOT EXISTS voice_profiles (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default',
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        samples_json TEXT NOT NULL DEFAULT '[]',
        style_prompt TEXT NOT NULL DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )`, []);
      console.log("[migrate] voice_profiles table ready");
    },
  },
];

let _migrationsEnsured = false;
let _migrationsLock = Promise.resolve();
async function runMigrations() {
  if (_migrationsEnsured) return;
  // Serialize concurrent calls — _migrationsEnsured race + concurrent
  // DROP+CREATE on content_items can lose data (migration 002).
  let done;
  const prev = _migrationsLock;
  _migrationsLock = new Promise((r) => { done = r; });
  await prev;
  if (_migrationsEnsured) { done(); return; }
  try {
    await dbQuery(`CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      description TEXT,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`, []);
  } catch (e) {
    console.error("[migrate] _migrations create failed", e && e.message);
    done();
    return;
  }
  _migrationsEnsured = true;
  try {
    let applied = new Set();
    try {
      const rows = await dbQuery("SELECT id FROM _migrations", []);
      for (const r of rows || []) if (r.id) applied.add(r.id);
    } catch {}
    for (const m of MIGRATIONS) {
      if (applied.has(m.id)) continue;
      console.log(`[migrate] applying ${m.id}: ${m.description}`);
      try {
        await m.up(dbQuery);
        try {
          await dbQuery("INSERT OR IGNORE INTO _migrations (id, description) VALUES (?, ?)", [m.id, m.description]);
        } catch {}
        console.log(`[migrate] applied ${m.id}`);
      } catch (e) {
        console.error(`[migrate] failed ${m.id}`, e && e.message);
      }
    }
  } finally {
    done();
  }
}

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS content_items (
  tenant_id TEXT NOT NULL DEFAULT 'default',
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
  PRIMARY KEY (tenant_id, type, slug)
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

async function ensureTables() {
  if (_tablesReady) return;
  try { await dbQuery(CREATE_TABLE); } catch {}
  await runMigrations();
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
    const tenant_id = getTenantId(req);

    if (req.method === "GET" && req.query.slug) {
      const slug = req.query.slug;
      const wantedType = req.query.type;
      let rows;
      if (wantedType) {
        rows = await query("SELECT * FROM content_items WHERE tenant_id = ? AND type = ? AND slug = ?", [tenant_id, wantedType, slug]);
      } else {
        rows = await query("SELECT * FROM content_items WHERE tenant_id = ? AND slug = ? ORDER BY CASE type WHEN 'featured' THEN 0 ELSE 1 END LIMIT 1", [tenant_id, slug]);
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
          JOIN content_items ci ON ci.tenant_id = ? AND ci.type = fts.type AND ci.slug = fts.slug
          WHERE content_fts MATCH ?
            AND ${typeClause}${statusClause}
          ORDER BY rank
          LIMIT ? OFFSET ?`;
        const rows = await searchQuery(sql, [tenant_id, ftsQuery, ...typeArgs, ...statusArgs, limit, offset]);
        return res.json(rows.map(mapRow));
      }

      const orderBy = "updated_at DESC, position ASC";
      const rows = await query(
        `SELECT * FROM content_items WHERE tenant_id = ? AND type = ?${statusValue ? " AND status = ?" : ""} ORDER BY ${orderBy}`,
        statusValue ? [tenant_id, req.query.type, statusValue] : [tenant_id, req.query.type]);
      return res.json(rows.map(mapRow));
    }

    if (req.method === "GET") {
      if (!requireAuth(req, res)) return;
      const rows = await query("SELECT * FROM content_items WHERE tenant_id = ? ORDER BY type ASC, position ASC", [tenant_id]);
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
      const existing = await query("SELECT status FROM content_items WHERE tenant_id = ? AND type = ? AND slug = ?", [tenant_id, type, slug]);
      const effectiveStatus = status || (existing.length && existing[0].status) || "private";
      const now = updatedAt && typeof updatedAt === "string" ? updatedAt : new Date().toISOString();
      const rows = await query(
        `INSERT INTO content_items (tenant_id, slug, type, status, title, excerpt, body_json, meta_json, position, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id, type, slug) DO UPDATE SET status = excluded.status,
           title = excluded.title, excerpt = excluded.excerpt, body_json = excluded.body_json,
           meta_json = excluded.meta_json, position = excluded.position, updated_at = excluded.updated_at
         RETURNING *`,
        [tenant_id, slug, type, effectiveStatus,
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
        await query("DELETE FROM content_items WHERE tenant_id = ? AND type = ? AND slug = ?", [tenant_id, type, slug]);
        await deleteFts(slug, type);
      } else {
        await query("DELETE FROM content_items WHERE tenant_id = ? AND slug = ?", [tenant_id, slug]);
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
