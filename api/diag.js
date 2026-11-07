import { requireAuth } from "./_auth.js";
import { query, ping, getDbInfo } from "./_db.js";

// GET /api/diag — owner-only deployment health check.
// Returns booleans and counts only; secret values never leave the server.
// Use it when a deployment shows no content: it tells you whether the
// database is reachable and what the store holds.

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!requireAuth(req, res)) return;

  const dbInfo = getDbInfo();

  const report = {
    env: {
      hasDbUrl: Boolean(process.env.TURSO_DATABASE_URL || process.env.TURSO_DB),
      hasToken: Boolean(process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN),
      vercelEnv: process.env.VERCEL_ENV || "local",
      node: process.version,
      dbMode: dbInfo.mode,
      localPath: dbInfo.localPath,
    },
    db: { reachable: false, latencyMs: null, mode: dbInfo.mode },
    store: {},
  };

  const pingRes = await ping();
  report.db.reachable = pingRes.ok;
  report.db.latencyMs = pingRes.latencyMs;
  if (!pingRes.ok) {
    report.db.error = pingRes.error || undefined;
    report.db.hint = dbInfo.mode === "local"
      ? "Local SQLite not reachable at " + (dbInfo.localPath || "unknown") + "."
      : "Check TURSO_DATABASE_URL / TURSO_AUTH_TOKEN on the deployment (no need to read values — just re-enter them).";
    return res.json(report);
  }

  try {
    const counts = await query("SELECT status, COUNT(*) AS n FROM content_items GROUP BY status", []);
    if (counts && counts.length) {
      for (const row of counts) report.store["content:" + row.status] = Number(row.n);
    }
  } catch {
    report.store.content_items = "missing-or-unreadable";
  }

  try {
    const learn = await query("SELECT COUNT(*) AS n FROM note_articles", []);
    if (learn && learn.length) report.store.noteArticles = Number(learn[0].n);
  } catch {
    report.store.noteArticles = "missing-or-unreadable";
  }

  return res.json(report);
}
