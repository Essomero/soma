// Proof Graph v0 — aggregate proof activity per content slug.
// Shows how much a reader has engaged with each piece of content:
// highlights, test submissions, comments, linked notes, lab attempts.
// No gating, just visibility.
//
// GET /api/proof?slug=X  — proof summary for one slug
// GET /api/proof          — all slugs the owner has interacted with

import { query } from "./_db.js";
import { requireAuth } from "./_auth.js";

let _tablesReady = false;

async function ensureTables() {
  if (_tablesReady) return;
  await query(`CREATE TABLE IF NOT EXISTS lab_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_slug TEXT NOT NULL,
    lab_id TEXT NOT NULL,
    passed INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 1,
    last_attempt_at TEXT DEFAULT (datetime('now'))
  )`);
  await query(`CREATE INDEX IF NOT EXISTS idx_lab_attempts_slug ON lab_attempts(content_slug)`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_attempts_unique ON lab_attempts(content_slug, lab_id)`);
  _tablesReady = true;
}

/**
 * Aggregate proof stats for one slug (or across all slugs when slug is null).
 * Counts from existing tables so nothing goes stale.
 */
async function aggregate(slug) {
  // The JOIN shadow union is simpler than N queries or pipelines.
  const sql = slug
    ? `
    SELECT
      ? AS slug,
      (SELECT COUNT(*) FROM highlights WHERE story_slug = ?) AS highlights,
      (SELECT COUNT(*) FROM comments WHERE story_slug = ?) AS comments,
      (SELECT COUNT(*) FROM test_submissions WHERE test_slug = ?) AS test_submissions,
      (SELECT MAX(score) FROM test_submissions WHERE test_slug = ?) AS best_score,
      (SELECT COUNT(*) FROM lab_attempts WHERE content_slug = ?) AS lab_attempts,
      (SELECT COUNT(*) FROM lab_attempts WHERE content_slug = ? AND passed = 1) AS lab_passed,
      (SELECT COUNT(*) FROM note_articles WHERE EXISTS (
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
      SELECT story_slug AS slug FROM highlights
      UNION
      SELECT story_slug AS slug FROM comments
      UNION
      SELECT test_slug AS slug FROM test_submissions
      UNION
      SELECT content_slug AS slug FROM lab_attempts
      UNION
      SELECT slug FROM note_articles
    ) sub
    LEFT JOIN (SELECT story_slug, COUNT(*) AS c FROM highlights GROUP BY story_slug) h ON h.story_slug = sub.slug
    LEFT JOIN (SELECT story_slug, COUNT(*) AS c FROM comments GROUP BY story_slug) c ON c.story_slug = sub.slug
    LEFT JOIN (SELECT test_slug, COUNT(*) AS c, MAX(score) AS best_score FROM test_submissions GROUP BY test_slug) t ON t.test_slug = sub.slug
    LEFT JOIN (SELECT content_slug, COUNT(*) AS c, SUM(passed) AS p FROM lab_attempts GROUP BY content_slug) l ON l.content_slug = sub.slug
    LEFT JOIN (
      SELECT json_extract(value, '$.slug') AS ref_slug, COUNT(*) AS c
      FROM note_articles, json_each(published_content)
      GROUP BY ref_slug
    ) n ON n.ref_slug = sub.slug
    ORDER BY sub.slug
    `;

  const args = slug
    ? [slug, slug, slug, slug, slug, slug, slug, slug]
    : [];

  const rows = await query(sql, args);
  return rows;
}

export default async function handler(req, res) {
  await ensureTables();

  if (!requireAuth(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const slug = req.query?.slug;
    const rows = await aggregate(slug || null);

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
