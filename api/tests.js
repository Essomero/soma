import { requireAuth } from "./_auth.js";
import { rateLimit } from "./_limits.js";
import { query } from "./_db.js";


let tableCreated = false;
async function ensureTable() {
  if (tableCreated) return;
  await query(`
    CREATE TABLE IF NOT EXISTS test_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_slug TEXT NOT NULL,
      answers TEXT NOT NULL,
      evaluation TEXT,
      score INTEGER,
      model TEXT,
      created_at TEXT NOT NULL
    )
  `);
  tableCreated = true;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    await ensureTable();

    // Submission history is owner-only (fetchTests tolerates 401 → []).
    // POST stays open so public tests remain submittable by visitors.
    if (req.method === "GET") {
      if (!requireAuth(req, res)) return;
      const slug = req.query.slug;
      const sql = slug
        ? "SELECT * FROM test_submissions WHERE test_slug = ? ORDER BY created_at DESC LIMIT 20"
        : "SELECT * FROM test_submissions ORDER BY created_at DESC LIMIT 50";
      const rows = await query(sql, slug ? [slug] : []);
      return res.json(rows);
    }

    if (req.method === "POST") {
      if (!rateLimit(req, res, { key: "tests-post", limit: 20, windowMs: 60_000 })) return;
      const { slug, answers, evaluation, score, model } = req.body || {};
      if (!slug || !answers) {
        return res.status(400).json({ error: "slug and answers are required" });
      }
      if (typeof slug !== "string" || slug.length > 200) return res.status(400).json({ error: "invalid slug" });

      const answersStr = typeof answers === "string" ? answers : JSON.stringify(answers);
      if (answersStr.length > 10000) return res.status(400).json({ error: "answers too long" });
      const evalStr = typeof evaluation === "string" ? evaluation : evaluation == null ? null : JSON.stringify(evaluation);
      if (evalStr && evalStr.length > 10000) return res.status(400).json({ error: "evaluation too long" });
      if (typeof model !== "undefined" && model !== null && (typeof model !== "string" || model.length > 200)) return res.status(400).json({ error: "invalid model" });
      if (typeof score !== "undefined" && score !== null && (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100)) return res.status(400).json({ error: "invalid score" });
      const now = new Date().toISOString();

      await query(
        `INSERT INTO test_submissions (test_slug, answers, evaluation, score, model, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [slug, answersStr, evalStr, score ?? null, model || null, now]
      );

      return res.json({ success: true, timestamp: now });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
