import { createClient } from "@libsql/client/web";

const client = createClient({
  url: import.meta.env.VITE_TURSO_DATABASE_URL || import.meta.env.VITE_TURSO_DB || "",
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN || import.meta.env.VITE_TURSO_TOKEN || "",
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
      mode TEXT DEFAULT 'explain',
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
  try {
    await client.execute("ALTER TABLE comments ADD COLUMN mode TEXT DEFAULT 'explain'");
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
