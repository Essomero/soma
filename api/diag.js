import { requireAuth } from "./_auth.js";

// GET /api/diag — owner-only deployment health check.
// Returns booleans and counts only; secret values never leave the server.
// Use it when a deployment shows no content: it tells you whether the
// database is reachable, what the store holds, and whether the bundled
// seed corpus made it into the function bundle.
const DB_URL = (process.env.TURSO_DATABASE_URL || process.env.TURSO_DB || "").replace("libsql://", "https://");
const TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "";

function val(cell) {
  if (cell && typeof cell === "object") return cell.type === "null" ? null : cell.value;
  return cell;
}

async function run(stmt, args) {
  const started = Date.now();
  try {
    const r = await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql: stmt, args: (args || []).map((a) => (a === null || a === undefined ? { type: "null" } : { type: "text", value: String(a) })) } }] }),
    });
    const data = await r.json().catch(() => null);
    const result = data && data.results && data.results[0] && data.results[0].response && data.results[0].response.result;
    if (!r.ok || !result) return { ok: false, status: r.status, latencyMs: Date.now() - started };
    const cols = (result.cols || []).map((c) => c.name || c);
    return {
      ok: true,
      status: r.status,
      latencyMs: Date.now() - started,
      rows: (result.rows || []).map((row) => Object.fromEntries(cols.map((c, i) => [c, val(row[i])]))),
    };
  } catch (e) {
    return { ok: false, status: 0, latencyMs: Date.now() - started, error: e.message };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!requireAuth(req, res)) return;

  const report = {
    env: {
      hasDbUrl: Boolean(process.env.TURSO_DATABASE_URL || process.env.TURSO_DB),
      hasToken: Boolean(process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN),
      vercelEnv: process.env.VERCEL_ENV || "local",
      node: process.version,
    },
    db: { reachable: false, latencyMs: null },
    store: {},
    corpus: { bundled: false, rows: 0 },
  };

  const ping = await run("SELECT 1 AS one", []);
  report.db.reachable = ping.ok;
  report.db.latencyMs = ping.latencyMs;
  if (!ping.ok) {
    report.db.status = ping.status;
    report.db.hint = "Check TURSO_DATABASE_URL / TURSO_AUTH_TOKEN on the deployment (no need to read values — just re-enter them).";
    return res.json(report);
  }

  const counts = await run("SELECT status, COUNT(*) AS n FROM content_items GROUP BY status", []);
  if (counts.ok) {
    for (const row of counts.rows) report.store["content:" + row.status] = Number(row.n);
  } else {
    report.store.content_items = "missing-or-unreadable";
  }
  const pub = await run('SELECT COUNT(*) AS n FROM public_pages WHERE "public" = 1', []);
  if (pub.ok) report.store.publicPages = Number(pub.rows[0] && pub.rows[0].n);
  const learn = await run("SELECT COUNT(*) AS n FROM learn_articles", []);
  if (learn.ok) report.store.learnArticles = Number(learn.rows[0] && learn.rows[0].n);

  try {
    const mod = await import("./_corpus.js");
    const rows = JSON.parse(mod.CORPUS_JSON);
    report.corpus.bundled = true;
    report.corpus.rows = Array.isArray(rows) ? rows.length : 0;
  } catch {
    report.corpus.bundled = false;
  }

  return res.json(report);
}
