import { createClient } from "@libsql/client/web";

const client = createClient({
  url: import.meta.env.VITE_TURSO_DB || "",
  authToken: import.meta.env.VITE_TURSO_TOKEN || "",
});

// ── Schema (run once) ──────────────────────────────────
export async function initDB() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS progress (
      story_slug TEXT PRIMARY KEY,
      completed INTEGER DEFAULT 0,
      completed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS ratings (
      story_slug TEXT PRIMARY KEY,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      rated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_slug TEXT NOT NULL,
      body TEXT NOT NULL,
      parent_id INTEGER,
      is_ai INTEGER DEFAULT 0,
      ai_model TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS highlights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_slug TEXT NOT NULL,
      section_index INTEGER NOT NULL,
      paragraph_index INTEGER NOT NULL,
      start_offset INTEGER NOT NULL,
      end_offset INTEGER NOT NULL,
      selected_text TEXT NOT NULL,
      text_hash TEXT NOT NULL,
      color TEXT DEFAULT 'primary',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  // Migrations for existing DBs
  try {
    await client.execute("ALTER TABLE comments ADD COLUMN parent_id INTEGER");
  } catch { /* column already exists */ }
  try {
    await client.execute("ALTER TABLE comments ADD COLUMN is_ai INTEGER DEFAULT 0");
  } catch { /* column already exists */ }
  try {
    await client.execute("ALTER TABLE comments ADD COLUMN ai_model TEXT");
  } catch { /* column already exists */ }
  try {
    await client.execute("ALTER TABLE comments ADD COLUMN highlight_id INTEGER");
  } catch { /* column already exists */ }
  try {
    await client.execute("ALTER TABLE comments ADD COLUMN section_index INTEGER");
  } catch { /* column already exists */ }
  try {
    await client.execute("ALTER TABLE comments ADD COLUMN paragraph_index INTEGER");
  } catch { /* column already exists */ }
  try {
    await client.execute("ALTER TABLE comments ADD COLUMN start_offset INTEGER");
  } catch { /* column already exists */ }
  try {
    await client.execute("ALTER TABLE comments ADD COLUMN end_offset INTEGER");
  } catch { /* column already exists */ }
  try {
    await client.execute("ALTER TABLE comments ADD COLUMN selected_text TEXT");
  } catch { /* column already exists */ }
}

// ── Progress ───────────────────────────────────────────
export async function getProgress(slug?: string) {
  if (slug) {
    const r = await client.execute({ sql: "SELECT * FROM progress WHERE story_slug = ?", args: [slug] });
    return r.rows[0] ? { slug: r.rows[0].story_slug as string, completed: !!r.rows[0].completed, completedAt: r.rows[0].completed_at as string | null } : null;
  }
  const r = await client.execute("SELECT * FROM progress WHERE completed = 1");
  return r.rows.map(row => ({ slug: row.story_slug as string, completed: true, completedAt: row.completed_at as string | null }));
}

export async function toggleProgress(slug: string, completed: boolean) {
  await client.execute({
    sql: "INSERT INTO progress (story_slug, completed, completed_at) VALUES (?, ?, ?) ON CONFLICT(story_slug) DO UPDATE SET completed = ?, completed_at = ?",
    args: [slug, completed ? 1 : 0, completed ? new Date().toISOString() : null, completed ? 1 : 0, completed ? new Date().toISOString() : null],
  });
}

// ── Ratings ────────────────────────────────────────────
export async function getRatings(slug?: string) {
  if (slug) {
    const r = await client.execute({ sql: "SELECT * FROM ratings WHERE story_slug = ?", args: [slug] });
    return r.rows[0] ? { slug: r.rows[0].story_slug as string, rating: r.rows[0].rating as number } : null;
  }
  const r = await client.execute("SELECT * FROM ratings");
  return r.rows.map(row => ({ slug: row.story_slug as string, rating: row.rating as number }));
}

export async function setRating(slug: string, rating: number) {
  await client.execute({
    sql: "INSERT INTO ratings (story_slug, rating, rated_at) VALUES (?, ?, ?) ON CONFLICT(story_slug) DO UPDATE SET rating = ?, rated_at = ?",
    args: [slug, rating, new Date().toISOString(), rating, new Date().toISOString()],
  });
}

// ── Comments ───────────────────────────────────────────
export interface CommentRow {
  id: number;
  story_slug: string;
  body: string;
  parent_id: number | null;
  is_ai: number;
  ai_model: string | null;
  highlight_id: number | null;
  section_index: number | null;
  paragraph_index: number | null;
  start_offset: number | null;
  end_offset: number | null;
  selected_text: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface HighlightRow {
  id: number;
  story_slug: string;
  section_index: number;
  paragraph_index: number;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  text_hash: string;
  color: string;
  created_at: string;
}

export interface ThreadedComment extends CommentRow {
  replies: ThreadedComment[];
}

function buildTree(rows: CommentRow[]): ThreadedComment[] {
  const map: Record<number, ThreadedComment> = {};
  const roots: ThreadedComment[] = [];

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

export async function getComments(storySlug: string): Promise<ThreadedComment[]> {
  const r = await client.execute({ sql: "SELECT * FROM comments WHERE story_slug = ? ORDER BY created_at DESC", args: [storySlug] });
  const rows: CommentRow[] = r.rows.map(row => ({
    id: row.id as number,
    story_slug: row.story_slug as string,
    body: row.body as string,
    parent_id: (row.parent_id as number) ?? null,
    is_ai: (row.is_ai as number) || 0,
    ai_model: (row.ai_model as string) ?? null,
    highlight_id: (row.highlight_id as number) ?? null,
    section_index: (row.section_index as number) ?? null,
    paragraph_index: (row.paragraph_index as number) ?? null,
    start_offset: (row.start_offset as number) ?? null,
    end_offset: (row.end_offset as number) ?? null,
    selected_text: (row.selected_text as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string | null,
  }));
  const tree = buildTree(rows);
  for (const root of tree) {
    root.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  return tree;
}

export async function addComment(
  storySlug: string, body: string, parentId?: number | null, isAi?: boolean, aiModel?: string | null,
  highlightId?: number | null, sectionIndex?: number | null, paragraphIndex?: number | null,
  startOffset?: number | null, endOffset?: number | null, selectedText?: string | null,
) {
  const r = await client.execute({
    sql: "INSERT INTO comments (story_slug, body, parent_id, is_ai, ai_model, highlight_id, section_index, paragraph_index, start_offset, end_offset, selected_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
    args: [storySlug, body, parentId ?? null, isAi ? 1 : 0, aiModel ?? null, highlightId ?? null, sectionIndex ?? null, paragraphIndex ?? null, startOffset ?? null, endOffset ?? null, selectedText ?? null],
  });
  const row = r.rows[0];
  return { id: row.id as number, storySlug: row.story_slug as string, body: row.body as string, parentId: (row.parent_id as number) ?? null, createdAt: row.created_at as string };
}

export async function updateComment(id: number, body: string) {
  await client.execute({ sql: "UPDATE comments SET body = ?, updated_at = ? WHERE id = ?", args: [body, new Date().toISOString(), id] });
}

export async function deleteComment(id: number) {
  await client.execute({ sql: "DELETE FROM comments WHERE parent_id = ?", args: [id] });
  await client.execute({ sql: "DELETE FROM comments WHERE id = ?", args: [id] });
}

// ── Highlights ─────────────────────────────────────────
export async function getHighlights(storySlug: string): Promise<HighlightRow[]> {
  const r = await client.execute({ sql: "SELECT * FROM highlights WHERE story_slug = ? ORDER BY section_index, paragraph_index, start_offset", args: [storySlug] });
  return r.rows.map(row => ({
    id: row.id as number,
    story_slug: row.story_slug as string,
    section_index: row.section_index as number,
    paragraph_index: row.paragraph_index as number,
    start_offset: row.start_offset as number,
    end_offset: row.end_offset as number,
    selected_text: row.selected_text as string,
    text_hash: row.text_hash as string,
    color: row.color as string,
    created_at: row.created_at as string,
  }));
}

export async function addHighlight(
  storySlug: string, sectionIndex: number, paragraphIndex: number,
  startOffset: number, endOffset: number, selectedText: string, textHash: string, color: string,
) {
  const r = await client.execute({
    sql: "INSERT INTO highlights (story_slug, section_index, paragraph_index, start_offset, end_offset, selected_text, text_hash, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
    args: [storySlug, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText, textHash, color],
  });
  const row = r.rows[0];
  return {
    id: row.id as number,
    story_slug: row.story_slug as string,
    section_index: row.section_index as number,
    paragraph_index: row.paragraph_index as number,
    start_offset: row.start_offset as number,
    end_offset: row.end_offset as number,
    selected_text: row.selected_text as string,
    text_hash: row.text_hash as string,
    color: row.color as string,
    created_at: row.created_at as string,
  };
}

export async function deleteHighlight(id: number) {
  await client.execute({ sql: "DELETE FROM comments WHERE highlight_id = ?", args: [id] });
  await client.execute({ sql: "DELETE FROM highlights WHERE id = ?", args: [id] });
}
