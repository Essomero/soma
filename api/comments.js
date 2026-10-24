import { isAuthed, requireAuth } from "./_auth.js";

const DB_URL = (process.env.TURSO_DATABASE_URL || process.env.TURSO_DB || "").replace("libsql://", "https://");
const TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "";

async function query(sql, args) {
  args = args || [];
  const body = {
    requests: [{
      type: "execute",
      stmt: {
        sql: sql,
        args: args.map(a => {
          if (a === null || a === undefined) return { type: "null" };
          if (typeof a === "number") return { type: "integer", value: String(a) };
          return { type: "text", value: String(a) };
        })
      }
    }]
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

    const result = data.results && data.results[0] && data.results[0].response && data.results[0].response.result;
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

// Build threaded tree from flat rows
function buildTree(rows) {
  const map = {};
  const roots = [];

  for (const row of rows) {
    map[row.id] = { ...row, replies: [] };
  }

  for (const row of rows) {
    const node = map[row.id];
    if (row.parent_id != null && map[row.parent_id]) {
      map[row.parent_id].replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// Run migrations for columns added after the table first existed.
// Inspects the live schema and adds only what's missing, so fresh
// databases (full schema from CREATE TABLE) and old ones (partial
// schema, columns added over time) converge silently with no
// "duplicate column" noise in the logs.
let migrated = false;
async function ensureSchema() {
  if (migrated) return;
  // Fresh database (e.g. just provisioned via the Vercel integration):
  // create the table first so later statements never hit "no such table".
  await query(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_slug TEXT NOT NULL,
    body TEXT NOT NULL,
    parent_id INTEGER,
    is_ai INTEGER DEFAULT 0,
    ai_model TEXT,
    highlight_id INTEGER,
    section_index INTEGER,
    paragraph_index INTEGER,
    start_offset INTEGER,
    end_offset INTEGER,
    selected_text TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  )`);
  let existing = [];
  try {
    const info = await query("PRAGMA table_info(comments)");
    existing = info.map((c) => c.name);
  } catch {}
  const wanted = [
    ["parent_id", "INTEGER"],
    ["is_ai", "INTEGER DEFAULT 0"],
    ["ai_model", "TEXT"],
  ];
  for (const [name, ddl] of wanted) {
    if (!existing.includes(name)) {
      await query(`ALTER TABLE comments ADD COLUMN ${name} ${ddl}`);
    }
  }
  migrated = true;
}

export default async function handler(req, res) {
  try {
    await ensureSchema();

    if (req.method === "GET") {
      const story = req.query.story;
      if (!story) return res.status(400).json({ error: "story required" });

      // Thread reads stay open for public slugs (visitors see discussion)
      // but private slugs need the owner session. A missing public_pages
      // table (fresh DB) means nothing is public yet, so fall to 404.
      if (!isAuthed(req)) {
        const vis = await query("SELECT \"public\" FROM public_pages WHERE slug = ?", [story]).catch(() => []);
        if (!(vis.length > 0 && vis[0].public == 1)) return res.status(404).json({ error: "Not found" });
      }

      // Fetch all comments for the story, newest first at top level
      const rows = await query(
        "SELECT * FROM comments WHERE story_slug = ? ORDER BY created_at DESC",
        [story]
      );

      // Build tree: top-level sorted newest-first, replies sorted oldest-first within each parent
      const tree = buildTree(rows);
      for (const root of tree) {
        root.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }

      return res.json(tree);
    }

    if (req.method === "POST") {
      const { storySlug, body, parentId, isAi, aiModel, highlightId, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText } = req.body || {};
      if (!storySlug || !body) return res.status(400).json({ error: "storySlug and body required" });

      const now = new Date().toISOString();
      const result = await query(
        "INSERT INTO comments (story_slug, body, parent_id, is_ai, ai_model, highlight_id, section_index, paragraph_index, start_offset, end_offset, selected_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
        [storySlug, body, parentId || null, isAi ? 1 : 0, aiModel || null, highlightId || null, sectionIndex ?? null, paragraphIndex ?? null, startOffset ?? null, endOffset ?? null, selectedText || null, now]
      );
      return res.status(201).json(result[0] || { error: "Failed" });
    }
    // Edits and deletes are owner-only. POST stays open: public visitors
    // comment as Anonymous (see Comments.tsx).
    if (req.method === "PUT" || req.method === "DELETE") {
      if (!requireAuth(req, res)) return;
    }

    if (req.method === "PUT") {
      const { id, body } = req.body || {};
      await query("UPDATE comments SET body = ?, updated_at = ? WHERE id = ?", [body, new Date().toISOString(), id]);
      return res.json({ success: true });
    }
    if (req.method === "DELETE") {
      const { id } = req.body || {};
      // Also delete replies
      await query("DELETE FROM comments WHERE parent_id = ?", [id]);
      await query("DELETE FROM comments WHERE id = ?", [id]);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Handler error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
