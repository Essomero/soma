// Modern idempotent migrations: always runs on boot, tracks _migrations table, never re-runs.
// Single source of truth for schema. Both api/* and scripts/* import this.

export const MIGRATIONS = [
  {
    id: "001_content_items_composite_pk",
    description: "Composite PK (type, slug) so story+featured can share same slug",
    async up(dbQuery) {
      // Detect legacy table
      let sql = "";
      try {
        const rows = await dbQuery("SELECT sql FROM sqlite_master WHERE type='table' AND name='content_items'", []);
        sql = (rows[0]?.sql || rows[0]?.SQL || "") as string;
      } catch {}
      if (!sql) {
        // No table yet — create fresh composite PK
        await dbQuery(`CREATE TABLE IF NOT EXISTS content_items (
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
      const upper = String(sql).toUpperCase();
      const isLegacy = upper.includes("SLUG TEXT PRIMARY KEY") || !upper.includes("PRIMARY KEY (TYPE, SLUG)");
      if (!isLegacy) return; // already composite — nothing to do

      console.log("[migrate] 001_content_items_composite_pk: migrating from slug PRIMARY KEY to (type,slug)");

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

      // Copy handling both 9-col (no archived_at) and 10-col variants
      let rows;
      try {
        rows = await dbQuery("SELECT slug, type, status, title, excerpt, body_json, meta_json, position, updated_at, archived_at FROM content_items", []);
      } catch {
        try {
          rows = await dbQuery("SELECT slug, type, status, title, excerpt, body_json, meta_json, position, updated_at FROM content_items", []);
        } catch {
          rows = [];
        }
      }
      for (const r of rows || []) {
        const rec = r as Record<string, unknown>;
        try {
          if ("archived_at" in rec) {
            await dbQuery("INSERT OR REPLACE INTO content_items_new (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at, archived_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [rec.slug, rec.type, rec.status, rec.title, rec.excerpt, rec.body_json, rec.meta_json, rec.position, rec.updated_at, rec.archived_at ?? null]);
          } else {
            await dbQuery("INSERT OR REPLACE INTO content_items_new (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [rec.slug, rec.type, rec.status, rec.title, rec.excerpt, rec.body_json, rec.meta_json, rec.position, rec.updated_at]);
          }
        } catch {}
      }

      await dbQuery("DROP TABLE content_items", []);
      await dbQuery("ALTER TABLE content_items_new RENAME TO content_items", []);
      try { await dbQuery("DROP TABLE IF EXISTS content_fts", []); } catch {}
    },
  },
  // Future migrations go here, e.g.
  // { id: "002_example_add_field", description: "...", async up(dbQuery) { ... } }
];

export async function runMigrations(dbQuery) {
  // Ensure migrations history table exists
  try {
    await dbQuery(`CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      description TEXT,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`, []);
  } catch (e) {
    console.error("[migrate] failed to create _migrations:", e && (e as Error).message);
    return;
  }

  let applied = new Set<string>();
  try {
    const rows = await dbQuery("SELECT id FROM _migrations", []);
    for (const r of rows || []) {
      const id = (r as Record<string, unknown>).id as string;
      if (id) applied.add(id);
    }
  } catch {}

  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    console.log(`[migrate] applying ${m.id}: ${m.description}`);
    try {
      await m.up(dbQuery);
      try {
        await dbQuery("INSERT OR IGNORE INTO _migrations (id, description, applied_at) VALUES (?, ?, datetime('now'))", [m.id, m.description]);
      } catch {}
      console.log(`[migrate] applied ${m.id}`);
    } catch (e) {
      console.error(`[migrate] failed ${m.id}:`, (e as Error)?.message || e);
      throw e; // stop chain — don't mark as applied
    }
  }
}
