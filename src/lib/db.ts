import { createClient } from "@libsql/client/web";

const client = createClient({
  url: import.meta.env.VITE_TURSO_DATABASE_URL || import.meta.env.VITE_TURSO_DB || "",
  authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN || import.meta.env.VITE_TURSO_TOKEN || "",
});

// ── Schema (run once) ──────────────────────────────────
export async function initDB() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS progress (
      tenant_id TEXT NOT NULL DEFAULT 'default',
      story_slug TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      PRIMARY KEY (tenant_id, story_slug)
    );
    CREATE TABLE IF NOT EXISTS ratings (
      tenant_id TEXT NOT NULL DEFAULT 'default',
      story_slug TEXT NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      rated_at TEXT,
      PRIMARY KEY (tenant_id, story_slug)
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      story_slug TEXT NOT NULL,
      body TEXT NOT NULL,
      parent_id INTEGER,
      is_ai INTEGER DEFAULT 0,
      ai_model TEXT,
      mode TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    );
    CREATE TABLE IF NOT EXISTS highlights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'default',
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
    await client.execute("ALTER TABLE comments ADD COLUMN mode TEXT");
  } catch { /* column already exists */ }
}

// ── Progress ───────────────────────────────────────────
export async function getProgress(slug?: string, tenant_id = "default") {
  if (slug) {
    const r = await client.execute({ sql: "SELECT * FROM progress WHERE tenant_id = ? AND story_slug = ?", args: [tenant_id, slug] });
    return r.rows[0] ? { slug: r.rows[0].story_slug as string, completed: !!r.rows[0].completed, completedAt: r.rows[0].completed_at as string | null } : null;
  }
  const r = await client.execute({ sql: "SELECT * FROM progress WHERE tenant_id = ? AND completed = 1", args: [tenant_id] });
  return r.rows.map(row => ({ slug: row.story_slug as string, completed: true, completedAt: row.completed_at as string | null }));
}

export async function toggleProgress(slug: string, completed: boolean, tenant_id = "default") {
  await client.execute({
    sql: "INSERT INTO progress (tenant_id, story_slug, completed, completed_at) VALUES (?, ?, ?, ?) ON CONFLICT(tenant_id, story_slug) DO UPDATE SET completed = ?, completed_at = ?",
    args: [tenant_id, slug, completed ? 1 : 0, completed ? new Date().toISOString() : null, completed ? 1 : 0, completed ? new Date().toISOString() : null],
  });
}

// ── Ratings ────────────────────────────────────────────
export async function getRatings(slug?: string, tenant_id = "default") {
  if (slug) {
    const r = await client.execute({ sql: "SELECT * FROM ratings WHERE tenant_id = ? AND story_slug = ?", args: [tenant_id, slug] });
    return r.rows[0] ? { slug: r.rows[0].story_slug as string, rating: r.rows[0].rating as number } : null;
  }
  const r = await client.execute({ sql: "SELECT * FROM ratings WHERE tenant_id = ?", args: [tenant_id] });
  return r.rows.map(row => ({ slug: row.story_slug as string, rating: row.rating as number }));
}

export async function setRating(slug: string, rating: number, tenant_id = "default") {
  await client.execute({
    sql: "INSERT INTO ratings (tenant_id, story_slug, rating, rated_at) VALUES (?, ?, ?, ?) ON CONFLICT(tenant_id, story_slug) DO UPDATE SET rating = ?, rated_at = ?",
    args: [tenant_id, slug, rating, new Date().toISOString(), rating, new Date().toISOString()],
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
export async function getHighlights(storySlug: string, tenant_id = "default"): Promise<HighlightRow[]> {
  const r = await client.execute({ sql: "SELECT * FROM highlights WHERE tenant_id = ? AND story_slug = ? ORDER BY section_index, paragraph_index, start_offset", args: [tenant_id, storySlug] });
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
  tenant_id = "default",
) {
  const r = await client.execute({
    sql: "INSERT INTO highlights (tenant_id, story_slug, section_index, paragraph_index, start_offset, end_offset, selected_text, text_hash, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
    args: [tenant_id, storySlug, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText, textHash, color],
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

export async function deleteHighlight(id: number, tenant_id = "default") {
  await client.execute({ sql: "DELETE FROM comments WHERE tenant_id = ? AND highlight_id = ?", args: [tenant_id, id] });
  await client.execute({ sql: "DELETE FROM highlights WHERE tenant_id = ? AND id = ?", args: [tenant_id, id] });
}
