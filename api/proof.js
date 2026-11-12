// Proof Graph v0 — aggregate proof activity per content slug.
// Shows how much a reader has engaged with each piece of content:
// highlights, test submissions, comments, linked notes, lab attempts.
// No gating, just visibility.
//
// GET /api/proof?slug=X  — proof summary for one slug
// GET /api/proof          — all slugs the owner has interacted with

import { query } from "./_db.js";
import { requireAuth } from "./_auth.js";
import { getTenantId } from "./_tenant.js";

let _tablesReady = false;

async function ensureTables() {
  if (_tablesReady) return;

  // Tables created lazily by other handlers — ensure them here too since
  // aggregate() queries them before those handlers may have fired.
  await query(`CREATE TABLE IF NOT EXISTS highlights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
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
    tenant_id TEXT NOT NULL DEFAULT 'default',
    story_slug TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  await query(`CREATE TABLE IF NOT EXISTS test_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    test_slug TEXT NOT NULL,
    answers TEXT NOT NULL,
    evaluation TEXT,
    score INTEGER,
    model TEXT,
    created_at TEXT NOT NULL
  )`);
  await query(`CREATE TABLE IF NOT EXISTS note_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    published_content TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT,
    UNIQUE(tenant_id, slug)
  )`);

  // proof's own table
  await query(`CREATE TABLE IF NOT EXISTS lab_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL DEFAULT 'default',
    content_slug TEXT NOT NULL,
    lab_id TEXT NOT NULL,
    passed INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 1,
    last_attempt_at TEXT DEFAULT (datetime('now'))
  )`);
  await query(`CREATE INDEX IF NOT EXISTS idx_lab_attempts_tenant_slug ON lab_attempts(tenant_id, content_slug)`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_attempts_tenant_unique ON lab_attempts(tenant_id, content_slug, lab_id)`);

  _tablesReady = true;
}

/**
 * Aggregate proof stats for one slug (or across all slugs when slug is null).
 * Counts from existing tables so nothing goes stale.
 */
async function aggregate(slug, tenant_id) {
  // The JOIN shadow union is simpler than N queries or pipelines.
  const sql = slug
    ? `
    SELECT
      ? AS slug,
      (SELECT COUNT(*) FROM highlights WHERE tenant_id = ? AND story_slug = ?) AS highlights,
      (SELECT COUNT(*) FROM comments WHERE tenant_id = ? AND story_slug = ?) AS comments,
      (SELECT COUNT(*) FROM test_submissions WHERE tenant_id = ? AND test_slug = ?) AS test_submissions,
      (SELECT MAX(score) FROM test_submissions WHERE tenant_id = ? AND test_slug = ?) AS best_score,
      (SELECT COUNT(*) FROM lab_attempts WHERE tenant_id = ? AND content_slug = ?) AS lab_attempts,
      (SELECT COUNT(*) FROM lab_attempts WHERE tenant_id = ? AND content_slug = ? AND passed = 1) AS lab_passed,
      (SELECT COUNT(*) FROM note_articles WHERE tenant_id = ? AND EXISTS (
        SELECT 1 FROM json_each(published_content) WHERE json_extract(value, '$.slug') = ?
      )) AS notes
    `
    : `
    SELECT
      sub.slug,
      COALESCE(h.c, 0) AS highlights,
      COALESCE(c.c, 0) AS comments,
      COALESCE(t.c, 0) AS test_submissions,
      t.best_score,
      COALESCE(l.c, 0) AS lab_attempts,
      COALESCE(l.p, 0) AS lab_passed,
      COALESCE(n.c, 0) AS notes
    FROM (
      SELECT story_slug AS slug FROM highlights WHERE tenant_id = ?
      UNION
      SELECT story_slug AS slug FROM comments WHERE tenant_id = ?
      UNION
      SELECT test_slug AS slug FROM test_submissions WHERE tenant_id = ?
      UNION
      SELECT content_slug AS slug FROM lab_attempts WHERE tenant_id = ?
      UNION
      SELECT slug FROM note_articles WHERE tenant_id = ?
    ) sub
    LEFT JOIN (SELECT story_slug, COUNT(*) AS c FROM highlights WHERE tenant_id = ? GROUP BY story_slug) h ON h.story_slug = sub.slug
    LEFT JOIN (SELECT story_slug, COUNT(*) AS c FROM comments WHERE tenant_id = ? GROUP BY story_slug) c ON c.story_slug = sub.slug
    LEFT JOIN (SELECT test_slug, COUNT(*) AS c, MAX(score) AS best_score FROM test_submissions WHERE tenant_id = ? GROUP BY test_slug) t ON t.test_slug = sub.slug
    LEFT JOIN (SELECT content_slug, COUNT(*) AS c, SUM(passed) AS p FROM lab_attempts WHERE tenant_id = ? GROUP BY content_slug) l ON l.content_slug = sub.slug
    LEFT JOIN (
      SELECT json_extract(value, '$.slug') AS ref_slug, COUNT(*) AS c
      FROM note_articles, json_each(published_content)
      WHERE note_articles.tenant_id = ?
      GROUP BY ref_slug
    ) n ON n.ref_slug = sub.slug
    ORDER BY sub.slug
    `;

  const args = slug
    ? [
        slug,
        tenant_id, slug,
        tenant_id, slug,
        tenant_id, slug,
        tenant_id, slug,
        tenant_id, slug,
        tenant_id, slug,
        tenant_id, slug,
      ]
    : [
        tenant_id, tenant_id, tenant_id, tenant_id, tenant_id,
        tenant_id, tenant_id, tenant_id, tenant_id, tenant_id,
      ];

  const rows = await query(sql, args);
  return rows;
}

export default async function handler(req, res) {
  const tenant_id = getTenantId(req);
  await ensureTables();

  if (!requireAuth(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const slug = req.query?.slug;
    const rows = await aggregate(slug || null, tenant_id);

    if (slug) {
      const row = rows?.[0] || {
        slug,
        highlights: 0,
        comments: 0,
        test_submissions: 0,
        best_score: null,
        lab_attempts: 0,
        lab_passed: 0,
        notes: 0,
      };
      return res.json(row);
    }

    return res.json(rows || []);
  } catch (e) {
    console.error("Proof handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal error" });
  }
}
