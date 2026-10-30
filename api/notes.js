import { isAuthed, requireAuth } from "./_auth.js";

const DB_URL = (process.env.TURSO_DATABASE_URL || process.env.TURSO_DB || "").replace("libsql://", "https://");
const TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "";

// Table is created idempotently on every request : no manual migration needed.
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS note_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published_content TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
)`;

// Add published_content column if it doesn't exist (migration for existing DBs).
const MIGRATE_PUBLISHED = `ALTER TABLE note_articles ADD COLUMN published_content TEXT DEFAULT '[]'`;

// FTS5 full-text search index over note_articles.
// Backfill works via pure SQL (no custom functions needed for raw text).
const CREATE_FTS = `CREATE VIRTUAL TABLE IF NOT EXISTS note_fts USING fts5(
  slug UNINDEXED,
  title,
  content,
  tokenize='porter unicode61 remove_diacritics 2'
)`;
const BACKFILL_FTS = `INSERT OR IGNORE INTO note_fts(slug, title, content)
  SELECT slug, title, content FROM note_articles`;

// ── FTS + schema migration tracking (process-level flag to run setup once) ──
let _ftsInitialized = false;
let _schemaMigrated = false;

function prepareNotesPipeline(searchSql, searchArgs) {
  const stmts = [
    { type: "execute", stmt: { sql: CREATE_TABLE } },
  ];
  if (!_schemaMigrated) {
    stmts.push({ type: "execute", stmt: { sql: MIGRATE_PUBLISHED } });
    _schemaMigrated = true;
  }
  if (!_ftsInitialized) {
    stmts.push({ type: "execute", stmt: { sql: CREATE_FTS } });
    stmts.push({ type: "execute", stmt: { sql: BACKFILL_FTS } });
    _ftsInitialized = true;
  }
  stmts.push({ type: "execute", stmt: { sql: searchSql, args: searchArgs.map(arg) } });
  return stmts;
}

function arg(a) {
  if (a === null || a === undefined) return { type: "null" };
  if (typeof a === "number") return { type: "integer", value: String(a) };
  return { type: "text", value: String(a) };
}

async function runTursoPipeline(stmts) {
  const body = { requests: stmts };
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
    console.error("Notes pipeline error:", e.message);
    return [];
  }
}

/** Search notes via FTS5 with ranking. */
async function notesSearchQuery(sql, args) {
  const stmts = prepareNotesPipeline(sql, args.map(arg));
  return runTursoPipeline(stmts);
}

/** Sync a note into the FTS index. Called from POST/PUT handlers. */
async function syncNoteFts(slug, title, content) {
  const stmts = [
    { type: "execute", stmt: { sql: CREATE_TABLE } },
    { type: "execute", stmt: { sql: CREATE_FTS } },
    { type: "execute", stmt: {
      sql: `INSERT INTO note_fts(slug, title, content) VALUES (?, ?, ?)`,
      args: [arg(slug), arg(title), arg(content)],
    }},
  ];
  try {
    await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: stmts }),
    });
  } catch (e) {
    console.error("Note FTS sync error:", e.message);
  }
}

/** Remove a note from the FTS index. Called from DELETE handler. */
async function deleteNoteFts(slug) {
  const stmts = [
    { type: "execute", stmt: { sql: CREATE_TABLE } },
    { type: "execute", stmt: { sql: CREATE_FTS } },
    { type: "execute", stmt: {
      sql: `INSERT INTO note_fts(note_fts, slug, title, content) VALUES ('delete', ?, '', '')`,
      args: [arg(slug)],
    }},
  ];
  try {
    await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: stmts }),
    });
  } catch (e) {
    console.error("Note FTS delete error:", e.message);
  }
}

/** Convert a user search string into an FTS5 query (mirrors content.js). */
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

function mapRow(r) {
  if (!r) return null;
  let publishedContent = [];
  try {
    if (r.published_content) publishedContent = JSON.parse(r.published_content);
  } catch {}
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    content: r.content,
    publishedContent: Array.isArray(publishedContent) ? publishedContent : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export default async function handler(req, res) {
  try {
    // GET: list all (newest-first), ?slug= single, or ?q= search (FTS5).
    // Unauthenticated callers see only rows flagged public in public_pages;
    // everything else requires the owner session.
    if (req.method === "GET") {
      const authed = isAuthed(req);

      // ?slug= single item
      if (req.query.slug) {
        const rows = await query("SELECT * FROM note_articles WHERE slug = ?", [req.query.slug]);
        const row = rows[0];
        if (!row) return res.status(404).json({ error: "Not found" });
        if (!authed) {
          const vis = await query("SELECT \"public\" FROM public_pages WHERE slug = ?", [req.query.slug]);
          if (!(vis.length > 0 && vis[0].public == 1)) return res.status(404).json({ error: "Not found" });
        }
        return res.json(mapRow(row));
      }

      // ?q= FTS5 search with rank
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (q) {
        // Build visibility clause
        const visibilityClause = authed ? "" : " JOIN public_pages pp ON pp.slug = fts.slug AND pp.\"public\" = 1";
        const sql = `SELECT na.*, rank
          FROM note_fts fts
          JOIN note_articles na ON na.slug = fts.slug${visibilityClause}
          WHERE note_fts MATCH ?
          ORDER BY rank
          LIMIT 20`;
        const rows = await notesSearchQuery(sql, [toFtsQuery(q)]);
        return res.json(rows.map(mapRow));
      }

      // No query: list all (newest-first)
      if (authed) {
        const rows = await query("SELECT * FROM note_articles ORDER BY updated_at DESC, created_at DESC");
        return res.json(rows.map(mapRow));
      }
      const rows = await query(
        "SELECT la.* FROM note_articles la JOIN public_pages pp ON pp.slug = la.slug WHERE pp.\"public\" = 1 ORDER BY la.updated_at DESC, la.created_at DESC"
      );
      return res.json(rows.map(mapRow));
    }

    // POST / PUT / DELETE mutate the notebook: owner only.
    if (!requireAuth(req, res)) return;

    if (req.method === "POST") {
      const { title, content, slug, publishedContent } = req.body || {};
      if (!title || content == null) return res.status(400).json({ error: "title and content required" });

      const finalSlug = slug && slug.trim() ? slug.trim() : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!finalSlug) return res.status(400).json({ error: "title must produce a slug" });

      const existing = await query("SELECT slug FROM note_articles WHERE slug = ?", [finalSlug]);
      if (existing.length) return res.status(409).json({ error: "slug already exists" });

      const pcJson = Array.isArray(publishedContent) ? JSON.stringify(publishedContent) : '[]';
      const result = await query(
        "INSERT INTO note_articles (slug, title, content, published_content) VALUES (?, ?, ?, ?) RETURNING *",
        [finalSlug, title, content, pcJson]
      );
      const noteRow = result[0];
      if (noteRow) await syncNoteFts(noteRow.slug, noteRow.title, noteRow.content);
      return res.status(201).json(mapRow(noteRow));
    }

    if (req.method === "PUT") {
      const { slug, title, content, publishedContent } = req.body || {};
      if (!slug || !title || content == null) return res.status(400).json({ error: "slug, title and content required" });

      const pcJson = Array.isArray(publishedContent) ? JSON.stringify(publishedContent) : undefined;

      const result = pcJson
        ? await query(
            "UPDATE note_articles SET title = ?, content = ?, published_content = ?, updated_at = datetime('now') WHERE slug = ? RETURNING *",
            [title, content, pcJson, slug]
          )
        : await query(
            "UPDATE note_articles SET title = ?, content = ?, updated_at = datetime('now') WHERE slug = ? RETURNING *",
            [title, content, slug]
          );
      const row = result[0];
      if (!row) return res.status(404).json({ error: "Not found" });
      await syncNoteFts(row.slug, row.title, row.content);
      return res.json(mapRow(row));
    }

    if (req.method === "DELETE") {
      const { slug } = req.body || {};
      if (!slug) return res.status(400).json({ error: "slug required" });

      // Cascade: remove comments + highlights attached to this article
      await query("DELETE FROM comments WHERE story_slug = ?", [slug]);
      await query("DELETE FROM highlights WHERE story_slug = ?", [slug]);
      await deleteNoteFts(slug);
      await query("DELETE FROM note_articles WHERE slug = ?", [slug]);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Learn handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
