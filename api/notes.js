import { isAuthed, requireAuth } from "./_auth.js";

const DB_URL = (process.env.TURSO_DATABASE_URL || process.env.TURSO_DB || "").replace("libsql://", "https://");
const TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "";

// Table is created idempotently on every request : no manual migration needed.
const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS note_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
)`;

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
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export default async function handler(req, res) {
  try {
    // GET: list all (newest-first) or ?slug= single.
    // Unauthenticated callers see only rows flagged public in public_pages;
    // everything else requires the owner session.
    if (req.method === "GET") {
      const authed = isAuthed(req);
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
      const { title, content, slug } = req.body || {};
      if (!title || content == null) return res.status(400).json({ error: "title and content required" });

      const finalSlug = slug && slug.trim() ? slug.trim() : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!finalSlug) return res.status(400).json({ error: "title must produce a slug" });

      const existing = await query("SELECT slug FROM note_articles WHERE slug = ?", [finalSlug]);
      if (existing.length) return res.status(409).json({ error: "slug already exists" });

      const result = await query(
        "INSERT INTO note_articles (slug, title, content) VALUES (?, ?, ?) RETURNING *",
        [finalSlug, title, content]
      );
      return res.status(201).json(mapRow(result[0]));
    }

    if (req.method === "PUT") {
      const { slug, title, content } = req.body || {};
      if (!slug || !title || content == null) return res.status(400).json({ error: "slug, title and content required" });

      const result = await query(
        "UPDATE note_articles SET title = ?, content = ?, updated_at = datetime('now') WHERE slug = ? RETURNING *",
        [title, content, slug]
      );
      const row = result[0];
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.json(mapRow(row));
    }

    if (req.method === "DELETE") {
      const { slug } = req.body || {};
      if (!slug) return res.status(400).json({ error: "slug required" });

      // Cascade: remove comments + highlights attached to this article
      await query("DELETE FROM comments WHERE story_slug = ?", [slug]);
      await query("DELETE FROM highlights WHERE story_slug = ?", [slug]);
      await query("DELETE FROM note_articles WHERE slug = ?", [slug]);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Learn handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
