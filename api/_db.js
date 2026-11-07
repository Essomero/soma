// Shared DB layer: Turso remote or local SQLite file.
// USE_TURSO=/=true/false — true/false (also yes/no, 1/0, on/off).
// - USE_TURSO=false  → force local SQLite even if TURSO_* present (Docker default, isolation)
// - USE_TURSO=true   → force Turso remote when TURSO_* present
// - USE_TURSO unset  → backward compat: use Turso if TURSO_* present (Vercel existing deploys)
// This makes Docker default to local SQLite while Vercel keeps Turso without extra flag.

let _libsqlClient = null;
let _mode = null; // "remote" | "local"
let _dirEnsured = false;

function parseUseTurso() {
  const v = (process.env.USE_TURSO || "").trim().toLowerCase();
  if (!v) return null;
  if (["false", "0", "no", "off"].includes(v)) return false;
  if (["true", "1", "yes", "on"].includes(v)) return true;
  return null;
}

export function isTursoConfigured() {
  const flag = parseUseTurso();
  if (flag === false) return false; // explicitly forced local
  const hasVars = !!(process.env.TURSO_DATABASE_URL || process.env.TURSO_DB) && !!(process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN);
  if (flag === true) return hasVars; // explicitly wants Turso, needs vars
  return hasVars; // unset → Turso if vars present (Vercel compat)
}

function getMode() {
  if (_mode) return _mode;
  _mode = isTursoConfigured() ? "remote" : "local";
  return _mode;
}


function getRemoteConfig() {
  const url = (process.env.TURSO_DATABASE_URL || process.env.TURSO_DB || "").trim();
  const token = (process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "").trim();
  const httpUrl = url.replace(/^libsql:\/\//, "https://");
  return { url: httpUrl, token };
}

function getLocalPath() {
  const raw = (process.env.DATABASE_URL || process.env.SQLITE_PATH || "").trim();
  if (!raw) return "file:./data/soma.db";
  if (raw.startsWith("file:")) return raw;
  if (raw.startsWith("/") || raw.startsWith("./") || raw.startsWith("../")) return `file:${raw}`;
  if (raw.includes("/") || raw.endsWith(".db")) return `file:${raw}`;
  // Already a URL-like string (e.g. :memory:) — pass through
  if (raw === ":memory:") return "file::memory:";
  return raw;
}

function parseFilePath(fileUrl) {
  if (!fileUrl.startsWith("file:")) return null;
  const stripped = fileUrl.replace(/^file:/, "");
  // Handle file::memory: or empty
  if (!stripped || stripped === ":memory:") return null;
  // Remove query string
  return stripped.split("?")[0];
}

function ensureDataDir() {
  if (_dirEnsured) return;
  _dirEnsured = true;
  const fileUrl = getLocalPath();
  const fp = parseFilePath(fileUrl);
  if (!fp) return;
  try {
    // sync import via createRequire for CJS compat
    const { mkdirSync } = require("fs");
    const { dirname } = require("path");
    const dir = dirname(fp);
    if (dir && dir !== "." && dir !== "./") mkdirSync(dir, { recursive: true });
  } catch {
    // ESM path — try dynamic
    try {
      const fs = require("fs");
      const path = require("path");
      const dir = path.dirname(fp);
      if (dir && dir !== "." && dir !== "./") fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
}

async function getLibsqlClient() {
  if (_libsqlClient) return _libsqlClient;
  const fileUrl = getLocalPath();
  // Ensure dir before creating client (libsql may fail if dir missing)
  const fp = parseFilePath(fileUrl);
  if (fp) {
    try {
      const { mkdirSync } = await import("fs");
      const { dirname } = await import("path");
      const dir = dirname(fp);
      if (dir && dir !== "." && dir !== "./") mkdirSync(dir, { recursive: true });
    } catch {}
  }
  const { createClient } = await import("@libsql/client");
  _libsqlClient = createClient({ url: fileUrl });
  return _libsqlClient;
}

function val(cell) {
  if (cell && typeof cell === "object") {
    if (cell.type === "null") return null;
    if (cell.value !== undefined) return cell.value;
    return null;
  }
  return cell !== undefined ? cell : null;
}

function wrapArg(a) {
  if (a === null || a === undefined) return { type: "null" };
  if (typeof a === "number") return { type: "float", value: a };
  return { type: "text", value: String(a) };
}

function unwrapArg(a) {
  if (!a || typeof a !== "object") return a;
  if (a.type === "null") return null;
  if (a.value !== undefined) return a.value;
  return null;
}

// ── Remote ──────────────────────────────────────────────────────────

async function remoteQuery(sql, args) {
  args = args || [];
  const { url: DB_URL, token: TOKEN } = getRemoteConfig();
  if (!DB_URL || !TOKEN) return localQuery(sql, args);
  const requests = [{
    type: "execute",
    stmt: { sql, args: args.map(wrapArg) },
  }];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      console.error("[_db] remote FAIL:", r.status, JSON.stringify(data).slice(0, 500));
      return [];
    }
    const result = data?.results?.[0]?.response?.result;
    if (!result) {
      console.error("[_db] unexpected format:", JSON.stringify(data).slice(0, 300));
      return [];
    }
    const cols = (result.cols || []).map((c) => c.name || c);
    return (result.rows || []).map((row) => {
      const obj = {};
      cols.forEach((c, i) => { obj[c] = val(row[i]); });
      return obj;
    });
  } catch (e) {
    clearTimeout(timeout);
    console.error("[_db] remote query error:", e?.message);
    return [];
  }
}

async function remotePipeline(stmts) {
  const { url: DB_URL, token: TOKEN } = getRemoteConfig();
  if (!DB_URL || !TOKEN) {
    let last = [];
    for (const s of stmts) {
      last = await localQuery(s.sql || s.stmt?.sql, (s.args || s.stmt?.args || []).map(unwrapArg));
    }
    return last;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: stmts }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      console.error("[_db] pipeline FAIL:", r.status, JSON.stringify(data).slice(0, 500));
      return [];
    }
    const lastResult = data?.results?.[data.results.length - 1]?.response?.result;
    if (!lastResult) return [];
    const cols = (lastResult.cols || []).map((c) => c.name || c);
    return (lastResult.rows || []).map((row) => {
      const obj = {};
      cols.forEach((c, i) => { obj[c] = val(row[i]); });
      return obj;
    });
  } catch (e) {
    clearTimeout(timeout);
    console.error("[_db] pipeline error:", e?.message);
    return [];
  }
}

// ── Local ───────────────────────────────────────────────────────────

async function localQuery(sql, args) {
  const client = await getLibsqlClient();
  const res = await client.execute({ sql, args: args || [] });
  // libsql rows are array-like with named props
  return res.rows.map((r) => {
    if (Array.isArray(r)) return r;
    const out = {};
    for (const k of Object.keys(r)) out[k] = r[k];
    return out;
  });
}

async function localPipelineResult(stmts) {
  let last = [];
  for (const s of stmts) {
    const sql = s.sql || s.stmt?.sql;
    const rawArgs = s.args || s.stmt?.args || [];
    last = await localQuery(sql, rawArgs.map(unwrapArg));
  }
  return last;
}

// ── Public ──────────────────────────────────────────────────────────

export async function query(sql, args) {
  if (getMode() === "remote" && isTursoConfigured()) return remoteQuery(sql, args);
  return localQuery(sql, args);
}

export async function runPipeline(stmts) {
  if (getMode() === "remote" && isTursoConfigured()) return remotePipeline(stmts);
  return localPipelineResult(stmts);
}

export function arg(a) { return wrapArg(a); }

export async function ping() {
  const started = Date.now();
  try {
    const rows = await query("SELECT 1 AS one", []);
    return { ok: true, latencyMs: Date.now() - started, rows };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - started, error: e?.message };
  }
}

export function getDbInfo() {
  return {
    mode: getMode(),
    turso: isTursoConfigured(),
    localPath: getMode() === "local" ? getLocalPath().replace(/^file:/, "") : null,
  };
}
