import { isAuthed, requireAuth } from "./_auth.js";
import { rateLimit } from "./_limits.js";
import { query } from "./_db.js";

// ---- ratings ----
let ratingsTablesReady = false;
async function ensureRatingsTables() {
  if (ratingsTablesReady) return;
  await query(`CREATE TABLE IF NOT EXISTS ratings (
    story_slug TEXT PRIMARY KEY,
    rating INTEGER NOT NULL,
    rated_at TEXT
  )`);
  ratingsTablesReady = true;
}

async function handleRatings(req, res) {
  await ensureRatingsTables();
  if (req.method === "GET") {
    const slug = req.query.slug;
    if (!isAuthed(req)) {
      if (slug) {
        const vis = await query("SELECT \"public\" FROM public_pages WHERE slug = ?", [slug]).catch(() => []);
        if (!(vis.length > 0 && vis[0].public == 1)) return res.status(404).json({ error: "Not found" });
      } else {
        return res.json(
          (await query("SELECT r.* FROM ratings r JOIN public_pages pp ON pp.slug = r.story_slug WHERE pp.\"public\" = 1", []))[0] || null,
        );
      }
    }
    const result = await query(
      slug ? "SELECT * FROM ratings WHERE story_slug = ?" : "SELECT * FROM ratings",
      slug ? [slug] : [],
    );
    return res.json(result[0] || null);
  }

  if (req.method === "POST") {
    if (!rateLimit(req, res, { key: "ratings-post", limit: 20, windowMs: 60_000 })) return;
    const { slug, rating } = req.body || {};
    if (typeof slug !== "string" || !slug || slug.length > 200) return res.status(400).json({ error: "invalid slug" });
    if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5)
      return res.status(400).json({ error: "rating must be 1-5" });
    const now = new Date().toISOString();
    await query(
      "INSERT INTO ratings (story_slug, rating, rated_at) VALUES (?, ?, ?) ON CONFLICT(story_slug) DO UPDATE SET rating = excluded.rating, rated_at = excluded.rated_at",
      [slug, rating, now],
    );
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ---- progress ----
let progressTablesReady = false;
async function ensureProgressTables() {
  if (progressTablesReady) return;
  await query(`CREATE TABLE IF NOT EXISTS progress (
    story_slug TEXT PRIMARY KEY,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT
  )`);
  progressTablesReady = true;
}

async function handleProgress(req, res) {
  await ensureProgressTables();
  if (!requireAuth(req, res)) return;
  if (req.method === "GET") {
    const slug = req.query.slug;
    const sql = slug ? "SELECT * FROM progress WHERE story_slug = ?" : "SELECT * FROM progress WHERE completed = 1";
    const result = await query(sql, slug ? [slug] : []);
    return res.json(result);
  }

  if (req.method === "POST") {
    const { slug, completed } = req.body || {};
    const now = new Date().toISOString();
    await query(
      "INSERT INTO progress (story_slug, completed, completed_at) VALUES (?, ?, ?) ON CONFLICT(story_slug) DO UPDATE SET completed = excluded.completed, completed_at = excluded.completed_at",
      [slug, completed ? 1 : 0, completed ? now : null],
    );
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ---- tests ----
let testsTablesReady = false;
async function ensureTestsTables() {
  if (testsTablesReady) return;
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
  testsTablesReady = true;
}

async function handleTests(req, res) {
  await ensureTestsTables();

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
    const evalStr =
      typeof evaluation === "string" ? evaluation : evaluation == null ? null : JSON.stringify(evaluation);
    if (evalStr && evalStr.length > 10000) return res.status(400).json({ error: "evaluation too long" });
    if (
      typeof model !== "undefined" &&
      model !== null &&
      (typeof model !== "string" || model.length > 200)
    )
      return res.status(400).json({ error: "invalid model" });
    if (
      typeof score !== "undefined" &&
      score !== null &&
      (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100)
    )
      return res.status(400).json({ error: "invalid score" });
    const now = new Date().toISOString();

    await query(
      `INSERT INTO test_submissions (test_slug, answers, evaluation, score, model, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      [slug, answersStr, evalStr, score ?? null, model || null, now],
    );

    return res.json({ success: true, timestamp: now });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

function getSubRoute(req) {
  const raw = (req.url || "").toString();
  if (raw.includes("/api/ratings") || raw.includes("/ratings")) return "ratings";
  if (raw.includes("/api/progress") || raw.includes("/progress")) return "progress";
  if (raw.includes("/api/tests") || raw.includes("/tests")) return "tests";
  return "unknown";
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const route = getSubRoute(req);
    if (route === "ratings") return handleRatings(req, res);
    if (route === "progress") return handleProgress(req, res);
    if (route === "tests") return handleTests(req, res);

    // Fallback: if we can't detect, try to infer from query/body
    // but return 404 for truly unknown.
    return res.status(404).json({ error: "Unknown engagement route — use /api/ratings, /api/progress, or /api/tests" });
  } catch (e) {
    console.error("Engagement handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
