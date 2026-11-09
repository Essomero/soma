// Shared migrator for scripts (node) — same contract as api/migrations.js but uses @libsql client execute signature.
// Always runs, tracks _migrations, skips applied.

export const MIGRATIONS = [
  {
    id: "001_content_items_composite_pk",
    description: "Composite PK (type, slug) so story+featured can share slug",
    async up(db: { execute: (q: string | { sql: string; args?: unknown[] }) => Promise<{ rows: Array<Record<string, unknown>> }> }) {
      let sql = "";
      try {
        const rows = await db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='content_items'");
        sql = (rows.rows[0]?.sql as string) || "";
      } catch {}
      if (!sql) {
        await db.execute(`CREATE TABLE IF NOT EXISTS content_items (
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
        )`);
        return;
      }
      const upper = String(sql).toUpperCase();
      const isLegacy = upper.includes("SLUG TEXT PRIMARY KEY") || !upper.includes("PRIMARY KEY (TYPE, SLUG)");
      if (!isLegacy) return;
      console.log("[migrate] 001 composite PK: migrating legacy slug PK -> (type,slug)");
      await db.execute(`CREATE TABLE IF NOT EXISTS content_items_new (
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
      )`);
      try {
        await db.execute(`INSERT OR REPLACE INTO content_items_new (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at, archived_at)
          SELECT slug, type, status, title, excerpt, body_json, meta_json, position, updated_at, archived_at FROM content_items`);
      } catch {
        try {
          await db.execute(`INSERT OR REPLACE INTO content_items_new (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at)
            SELECT slug, type, status, title, excerpt, body_json, meta_json, position, updated_at FROM content_items`);
        } catch (e) {
          console.error("[migrate] copy failed", (e as Error)?.message);
        }
      }
      await db.execute("DROP TABLE content_items");
      await db.execute("ALTER TABLE content_items_new RENAME TO content_items");
      try { await db.execute("DROP TABLE IF EXISTS content_fts"); } catch {}
    },
  },
];

export async function runMigrations(db: { execute: (q: string | { sql: string; args?: unknown[] }) => Promise<{ rows: Array<Record<string, unknown>> }> }) {
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      description TEXT,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
  } catch (e) {
    console.error("[migrate] _migrations create failed", (e as Error)?.message);
    return;
  }
  let applied = new Set<string>();
  try {
    const rows = await db.execute("SELECT id FROM _migrations");
    for (const r of rows.rows || []) {
      const id = (r as Record<string, unknown>).id as string;
      if (id) applied.add(id);
    }
  } catch {}
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    console.log(`[migrate] applying ${m.id}: ${m.description}`);
    try {
      await m.up(db);
      try {
        await db.execute({ sql: "INSERT OR IGNORE INTO _migrations (id, description) VALUES (?, ?)", args: [m.id, m.description] });
      } catch {}
      console.log(`[migrate] applied ${m.id}`);
    } catch (e) {
      console.error(`[migrate] failed ${m.id}`, (e as Error)?.message || e);
    }
  }
}
