import { requireAuth } from "./_auth.js";
import { rateLimit } from "./_limits.js";

const DB_URL = (process.env.TURSO_DATABASE_URL || process.env.TURSO_DB || "").replace("libsql://", "https://");
const TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "";

async function query(sql, args) {
  args = args || [];
  const body = {
    requests: [
      {
        type: "execute",
        stmt: {
          sql: sql,
          args: args.map((a) => {
            if (a === null || a === undefined) return { type: "null" };
            if (typeof a === "number") return { type: "integer", value: String(a) };
            return { type: "text", value: String(a) };
          }),
        },
      },
    ],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const r = await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await r.json();

    if (!r.ok) {
      console.error("Turso FAIL:", r.status, JSON.stringify(data).slice(0, 500));
      return [];
    }

    const result = data.results && data.results[0] && data.results[0].response && data.results[0].response.result;
    if (!result) {
      return [];
    }

    const cols = (result.cols || []).map(function (c) {
      return c.name || c;
    });
    const rows = result.rows || [];
    return rows.map(function (row) {
      const obj = {};
      cols.forEach(function (c, i) {
        const cell = row[i];
        obj[c] = cell && typeof cell === "object" ? (cell.type === "null" ? null : cell.value !== undefined ? cell.value : null) : cell !== undefined ? cell : null;
      });
      return obj;
    });
  } catch (e) {
    console.error("Query error:", e.message);
    return [];
  }
}

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
