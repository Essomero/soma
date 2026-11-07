import { requireAuth } from "./_auth.js";
import { query } from "./_db.js";


// Fresh database (e.g. just provisioned via the Vercel integration):
// create the table on first request so reads/writes never hit
// "no such table". Safe on every cold start; IF NOT EXISTS makes it
// a no-op once the table is there. story_slug is the primary key
// because upserts address rows ON CONFLICT(story_slug).
let tablesReady = false;
async function ensureTables() {
  if (tablesReady) return;
  await query(`CREATE TABLE IF NOT EXISTS progress (
    story_slug TEXT PRIMARY KEY,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT
  )`);
  tablesReady = true;
}

export default async function handler(req, res) {
  try {
    await ensureTables();
    // Reading progress and toggling it are owner-only. The useProgress
    // hooks tolerate 401 and render empty state for visitors.
    if (!requireAuth(req, res)) return;
    if (req.method === "GET") {
      const slug = req.query.slug;
      const sql = slug
        ? "SELECT * FROM progress WHERE story_slug = ?"
        : "SELECT * FROM progress WHERE completed = 1";
      const result = await query(sql, slug ? [slug] : []);
      return res.json(result);
    }

    if (req.method === "POST") {
      const { slug, completed } = req.body || {};
      const now = new Date().toISOString();
      await query(
        "INSERT INTO progress (story_slug, completed, completed_at) VALUES (?, ?, ?) ON CONFLICT(story_slug) DO UPDATE SET completed = excluded.completed, completed_at = excluded.completed_at",
        [slug, completed ? 1 : 0, completed ? now : null]
      );
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
