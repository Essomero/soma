import { isAuthed, requireAuth } from "./_auth.js";
import { rateLimit } from "./_limits.js";
import { isTutorMode } from "../shared/tutor/modes.js";
import { apiRouteFromPath } from "../shared/api-routes.js";
import { query as dbQueryRaw, runPipeline as dbRunPipeline, arg as dbArg } from "./_db.js";
import { query as simpleQuery } from "./_db.js";

// Use simple wrapper for generic queries (comments/highlights)
// For notes we use FTS pipeline helpers.
const query = simpleQuery;

// ── notes: shared pipeline helpers ──
const CREATE_NOTE_TABLE = `CREATE TABLE IF NOT EXISTS note_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published_content TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
)`;
const MIGRATE_PUBLISHED = `ALTER TABLE note_articles ADD COLUMN published_content TEXT DEFAULT '[]'`;
const CREATE_FTS = `CREATE VIRTUAL TABLE IF NOT EXISTS note_fts USING fts5(
  slug UNINDEXED,
  title,
  content,
  tokenize='porter unicode61 remove_diacritics 2'
)`;
const BACKFILL_FTS = `INSERT OR IGNORE INTO note_fts(slug, title, content)
  SELECT slug, title, content FROM note_articles`;

let _ftsInitialized = false;
let _schemaMigrated = false;

function prepareNotesPipeline(searchSql, searchArgs) {
  const stmts = [{ type: "execute", stmt: { sql: CREATE_NOTE_TABLE } }];
  if (!_schemaMigrated) {
    stmts.push({ type: "execute", stmt: { sql: MIGRATE_PUBLISHED } });
    _schemaMigrated = true;
  }
  if (!_ftsInitialized) {
    stmts.push({ type: "execute", stmt: { sql: CREATE_FTS } });
    stmts.push({ type: "execute", stmt: { sql: BACKFILL_FTS } });
    _ftsInitialized = true;
  }
  stmts.push({ type: "execute", stmt: { sql: searchSql, args: searchArgs.map(dbArg) } });
  return stmts;
}

async function runTursoPipeline(stmts) {
  return dbRunPipeline(stmts);
}

async function notesSearchQuery(sql, args) {
  // prepareNotesPipeline wraps args with dbArg(); wrapping them here too would
  // stringify objects, so every FTS search queried for "[object Object]".
  return runTursoPipeline(prepareNotesPipeline(sql, args));
}

async function syncNoteFts(slug, title, content) {
  const stmts = [
    { type: "execute", stmt: { sql: CREATE_NOTE_TABLE } },
    { type: "execute", stmt: { sql: CREATE_FTS } },
    {
      type: "execute",
      stmt: {
        sql: `INSERT INTO note_fts(slug, title, content) VALUES (?, ?, ?)`,
        args: [dbArg(slug), dbArg(title), dbArg(content)],
      },
    },
  ];
  try {
    await dbRunPipeline(stmts);
  } catch (e) {
    console.error("Note FTS sync error:", e.message);
  }
}

async function deleteNoteFts(slug) {
  const stmts = [
    { type: "execute", stmt: { sql: CREATE_NOTE_TABLE } },
    { type: "execute", stmt: { sql: CREATE_FTS } },
    {
      type: "execute",
      stmt: {
        sql: `INSERT INTO note_fts(note_fts, slug, title, content) VALUES ('delete', ?, '', '')`,
        args: [dbArg(slug)],
      },
    },
  ];
  try {
    await dbRunPipeline(stmts);
  } catch (e) {
    console.error("Note FTS delete error:", e.message);
  }
}

function toFtsQuery(input) {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const tokens = [];
  let i = 0;
  while (i < trimmed.length) {
    if (trimmed[i] === '"') {
      const end = trimmed.indexOf('"', i + 1);
      if (end === -1) {
        tokens.push(`"${trimmed.slice(i + 1)}"`);
        break;
      }
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

async function notesQuery(sql, args) {
  args = args || [];
  try {
    await dbQueryRaw(CREATE_NOTE_TABLE);
  } catch {}
  try {
    const rows = await dbQueryRaw(sql, args);
    return rows || [];
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

// ---- notes handler ----
async function handleNotes(req, res) {
  if (req.method === "GET") {
    const authed = isAuthed(req);

    if (req.query.slug) {
      const rows = await notesQuery("SELECT * FROM note_articles WHERE slug = ?", [req.query.slug]);
      const row = rows[0];
      if (!row) return res.status(404).json({ error: "Not found" });
      if (!authed) {
        const vis = await notesQuery('SELECT "public" FROM public_pages WHERE slug = ?', [req.query.slug]);
        if (!(vis.length > 0 && vis[0].public == 1)) return res.status(404).json({ error: "Not found" });
      }
      return res.json(mapRow(row));
    }

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (q) {
      const visibilityClause = authed ? "" : ' JOIN public_pages pp ON pp.slug = fts.slug AND pp."public" = 1';
      const sql = `SELECT na.*, rank
          FROM note_fts fts
          JOIN note_articles na ON na.slug = fts.slug${visibilityClause}
          WHERE note_fts MATCH ?
          ORDER BY rank
          LIMIT 20`;
      const rows = await notesSearchQuery(sql, [toFtsQuery(q)]);
      return res.json(rows.map(mapRow));
    }

    if (authed) {
      const rows = await notesQuery("SELECT * FROM note_articles ORDER BY updated_at DESC, created_at DESC");
      return res.json(rows.map(mapRow));
    }
    const rows = await notesQuery(
      'SELECT la.* FROM note_articles la JOIN public_pages pp ON pp.slug = la.slug WHERE pp."public" = 1 ORDER BY la.updated_at DESC, la.created_at DESC',
    );
    return res.json(rows.map(mapRow));
  }

  if (!requireAuth(req, res)) return;

  if (req.method === "POST") {
    const { title, content, slug, publishedContent } = req.body || {};
    if (!title || content == null) return res.status(400).json({ error: "title and content required" });

    const finalSlug = slug && slug.trim()
      ? slug.trim()
      : title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
    if (!finalSlug) return res.status(400).json({ error: "title must produce a slug" });

    const existing = await notesQuery("SELECT slug FROM note_articles WHERE slug = ?", [finalSlug]);
    if (existing.length) return res.status(409).json({ error: "slug already exists" });

    const pcJson = Array.isArray(publishedContent) ? JSON.stringify(publishedContent) : "[]";
    const result = await notesQuery(
      "INSERT INTO note_articles (slug, title, content, published_content) VALUES (?, ?, ?, ?) RETURNING *",
      [finalSlug, title, content, pcJson],
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
      ? await notesQuery(
          "UPDATE note_articles SET title = ?, content = ?, published_content = ?, updated_at = datetime('now') WHERE slug = ? RETURNING *",
          [title, content, pcJson, slug],
        )
      : await notesQuery(
          "UPDATE note_articles SET title = ?, content = ?, updated_at = datetime('now') WHERE slug = ? RETURNING *",
          [title, content, slug],
        );
    const row = result[0];
    if (!row) return res.status(404).json({ error: "Not found" });
    await syncNoteFts(row.slug, row.title, row.content);
    return res.json(mapRow(row));
  }

  if (req.method === "DELETE") {
    const { slug } = req.body || {};
    if (!slug) return res.status(400).json({ error: "slug required" });

    await notesQuery("DELETE FROM comments WHERE story_slug = ?", [slug]);
    await notesQuery("DELETE FROM highlights WHERE story_slug = ?", [slug]);
    await deleteNoteFts(slug);
    await notesQuery("DELETE FROM note_articles WHERE slug = ?", [slug]);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ---- highlights ----
let highlightsTablesReady = false;
async function ensureHighlightsTables() {
  if (highlightsTablesReady) return;
  await query(`CREATE TABLE IF NOT EXISTS highlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_slug TEXT NOT NULL,
    section_index INTEGER NOT NULL DEFAULT 0,
    paragraph_index INTEGER NOT NULL DEFAULT 0,
    start_offset INTEGER NOT NULL DEFAULT 0,
    end_offset INTEGER NOT NULL DEFAULT 0,
    selected_text TEXT,
    text_hash TEXT,
    color TEXT DEFAULT 'yellow',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  await query(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_slug TEXT NOT NULL,
    body TEXT NOT NULL,
    parent_id INTEGER,
    is_ai INTEGER DEFAULT 0,
    ai_model TEXT,
    mode TEXT,
    highlight_id INTEGER,
    section_index INTEGER,
    paragraph_index INTEGER,
    start_offset INTEGER,
    end_offset INTEGER,
    selected_text TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT
  )`);
  highlightsTablesReady = true;
}

async function handleHighlights(req, res) {
  await ensureHighlightsTables();
  if (req.method === "GET") {
    const story = req.query.story;
    if (!story) return res.status(400).json({ error: "story required" });

    if (!isAuthed(req)) {
      const vis = await query('SELECT "public" FROM public_pages WHERE slug = ?', [story]).catch(() => []);
      if (!(vis.length > 0 && vis[0].public == 1)) return res.status(404).json({ error: "Not found" });
    }

    const rows = await query(
      "SELECT * FROM highlights WHERE story_slug = ? ORDER BY section_index, paragraph_index, start_offset",
      [story],
    );

    const highlightsWithComments = [];
    for (const h of rows) {
      const comments = await query("SELECT * FROM comments WHERE highlight_id = ? ORDER BY created_at ASC", [h.id]);
      highlightsWithComments.push({
        id: h.id,
        storySlug: h.story_slug,
        sectionIndex: h.section_index,
        paragraphIndex: h.paragraph_index,
        startOffset: h.start_offset,
        endOffset: h.end_offset,
        selectedText: h.selected_text,
        textHash: h.text_hash,
        color: h.color,
        createdAt: h.created_at,
        comments: comments.map((c) => ({
          id: c.id,
          storySlug: c.story_slug,
          body: c.body,
          parentId: c.parent_id,
          isAi: c.is_ai === 1 || c.is_ai === "1" || c.is_ai === true,
          aiModel: c.ai_model,
          mode: c.mode,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
      });
    }

    return res.json(highlightsWithComments);
  }

  if (req.method === "POST" || req.method === "DELETE") {
    if (!requireAuth(req, res)) return;
  }

  if (req.method === "POST") {
    const { storySlug, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText, textHash, color } =
      req.body || {};
    if (!storySlug || selectedText == null) return res.status(400).json({ error: "storySlug and selectedText required" });

    const result = await query(
      "INSERT INTO highlights (story_slug, section_index, paragraph_index, start_offset, end_offset, selected_text, text_hash, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
      [storySlug, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText, textHash, color || "primary"],
    );
    const row = result[0];
    return res.status(201).json({
      id: row.id,
      storySlug: row.story_slug,
      sectionIndex: row.section_index,
      paragraphIndex: row.paragraph_index,
      startOffset: row.start_offset,
      endOffset: row.end_offset,
      selectedText: row.selected_text,
      textHash: row.text_hash,
      color: row.color,
      createdAt: row.created_at,
    });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id required" });

    await query("DELETE FROM comments WHERE highlight_id = ?", [id]);
    await query("DELETE FROM highlights WHERE id = ?", [id]);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ---- comments ----
const MAX_BODY = 5000;
const MAX_FIELD = 2000;

function buildTree(rows) {
  const map = {};
  const roots = [];

  for (const row of rows) {
    map[row.id] = { ...row, replies: [] };
  }

  for (const row of rows) {
    if (row.parent_id && map[row.parent_id]) {
      map[row.parent_id].replies.push(map[row.id]);
    } else {
      roots.push(map[row.id]);
    }
  }

  return roots;
}

let commentsMigrated = false;
async function ensureCommentsSchema() {
  if (commentsMigrated) return;
  await query(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    story_slug TEXT NOT NULL,
    body TEXT NOT NULL,
    parent_id INTEGER,
    is_ai INTEGER DEFAULT 0,
    ai_model TEXT,
    mode TEXT,
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
    ["mode", "TEXT"],
  ];
  for (const [name, ddl] of wanted) {
    if (!existing.includes(name)) {
      await query(`ALTER TABLE comments ADD COLUMN ${name} ${ddl}`);
    }
  }
  commentsMigrated = true;
}

async function handleComments(req, res) {
  await ensureCommentsSchema();

  if (req.method === "GET") {
    const story = req.query.story;
    if (!story) return res.status(400).json({ error: "story required" });

    if (!isAuthed(req)) {
      const vis = await query('SELECT "public" FROM public_pages WHERE slug = ?', [story]).catch(() => []);
      if (!(vis.length > 0 && vis[0].public == 1)) return res.status(404).json({ error: "Not found" });
    }

    const rows = await query("SELECT * FROM comments WHERE story_slug = ? ORDER BY created_at DESC", [story]);

    const tree = buildTree(rows);
    for (const root of tree) {
      root.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return res.json(tree);
  }

  if (req.method === "POST") {
    if (!rateLimit(req, res, { key: "comments-post", limit: 20, windowMs: 60_000 })) return;
    const {
      storySlug,
      body,
      parentId,
      isAi,
      aiModel,
      mode,
      highlightId,
      sectionIndex,
      paragraphIndex,
      startOffset,
      endOffset,
      selectedText,
    } = req.body || {};
    if (!storySlug || !body) return res.status(400).json({ error: "storySlug and body required" });
    if (typeof body !== "string" || body.length > MAX_BODY) return res.status(400).json({ error: "body too long" });
    if (typeof storySlug !== "string" || storySlug.length > 200)
      return res.status(400).json({ error: "invalid storySlug" });
    for (const f of [selectedText, aiModel]) {
      if (typeof f !== "undefined" && f !== null && (typeof f !== "string" || f.length > MAX_FIELD))
        return res.status(400).json({ error: "field too long" });
    }
    if (mode != null && !isTutorMode(mode)) return res.status(400).json({ error: "invalid mode" });

    const now = new Date().toISOString();
    const result = await query(
      "INSERT INTO comments (story_slug, body, parent_id, is_ai, ai_model, mode, highlight_id, section_index, paragraph_index, start_offset, end_offset, selected_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
      [
        storySlug,
        body,
        parentId || null,
        isAi ? 1 : 0,
        aiModel || null,
        mode ?? null,
        highlightId || null,
        sectionIndex ?? null,
        paragraphIndex ?? null,
        startOffset ?? null,
        endOffset ?? null,
        selectedText || null,
        now,
      ],
    );
    return res.status(201).json(result[0] || { error: "Failed" });
  }

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
    await query("DELETE FROM comments WHERE parent_id = ?", [id]);
    await query("DELETE FROM comments WHERE id = ?", [id]);
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

function getSubRoute(req) {
  return apiRouteFromPath(req.url);
}

export default async function handler(req, res) {
  try {
    const route = getSubRoute(req);
    if (route === "notes") return handleNotes(req, res);
    if (route === "highlights") return handleHighlights(req, res);
    if (route === "comments") return handleComments(req, res);
    return res.status(404).json({ error: "Unknown social route — use /api/notes, /api/highlights, or /api/comments" });
  } catch (e) {
    console.error("Social handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
