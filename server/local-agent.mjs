// Local agent sidecar: shell/git/build access for the admin UI.
//   node server/local-agent.mjs        (via `npm run agent`)
//
// Listens on 127.0.0.1:8765 ONLY. Every route requires an X-Agent-Token
// header; the token lives in .local-agent-token (gitignored) and is handed
// to the browser through the same-origin Vite proxy at /agent/token.
//
// Why the token: a random web page loaded in the user's browser must not be
// able to trigger commands on this machine. The browser can't read /agent/token
// (the Vite dev server sets no CORS headers), so a remote origin can never
// learn the token, and preflight with a custom header needs it first.
// This is defense-in-depth on top of the existing localhost trust model
// (api-dev.mjs already runs requests with localBypass).

import { createServer } from "http";
import { spawn, execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { randomBytes } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8765;
const HOST = "127.0.0.1";
const TOKEN_FILE = join(rootDir, ".local-agent-token");

// ── Token ─────────────────────────────────────────────
function loadOrCreateToken() {
  if (existsSync(TOKEN_FILE)) {
    const t = readFileSync(TOKEN_FILE, "utf8").trim();
    if (t) return t;
  }
  const token = randomBytes(24).toString("hex");
  writeFileSync(TOKEN_FILE, token, { mode: 0o600 });
  return token;
}

const TOKEN = loadOrCreateToken();

// ── Helpers ───────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

function json(res, code, data, headers) {
  res.writeHead(code, { "Content-Type": "application/json", ...(headers || {}) });
  res.end(JSON.stringify(data));
}

/** Stream a command's stdout+stderr as chunked text to the response. */
function streamCommand(res, command, cwd, headers) {
  let child;
  try {
    child = spawn(command, { cwd: cwd || rootDir, shell: true });
  } catch (e) {
    json(res, 500, { error: e.message });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    ...(headers || {}),
  });

  child.stdout.on("data", (d) => res.write(d));
  child.stderr.on("data", (d) => res.write(d));

  child.on("error", (e) => res.write(`\n[agent] spawn error: ${e.message}\n`));

  child.on("close", (code) => {
    res.end(`\n[agent] exit code: ${code}\n`);
  });

  // Abort the child if the client goes away (e.g. cancels the fetch).
  res.on("close", () => {
    if (!res.writableEnded && child && !child.killed) {
      try { child.kill("SIGTERM"); } catch {}
    }
  });
}

function gitBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: rootDir }).toString().trim();
  } catch {
    return "";
  }
}

function gitStatus() {
  try {
    return execSync("git status --short", { cwd: rootDir, encoding: "utf8" }).toString();
  } catch (e) {
    return `[git error] ${e.message}`;
  }
}

// ── CORS ──────────────────────────────────────────────
// The browser talks to the agent DIRECTLY (never through the Vite proxy —
// the proxy buffers streaming POST responses). Cross-origin therefore
// applies. Allow only localhost dev origins; a remote web page gets no
// CORS headers, so it cannot read the token or responses.

function isLocalhostOrigin(origin) {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    return u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname);
  } catch {
    return false;
  }
}

function corsHeaders(req) {
  const origin = isLocalhostOrigin(req.headers.origin)
    ? req.headers.origin
    : "";
  return origin
    ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Agent-Token",
        "Vary": "Origin",
      }
    : {};
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const path = url.pathname;

  // Token handshake. The panel fetches this through the same-origin Vite
  // proxy (/agent/token -> agent), which never sets CORS on the browser
  // side, so a remote page cannot read the token. Direct requests read it
  // only when the Origin is a localhost port (corsHeaders below).
  if (req.method === "GET" && path === "/agent/token") {
    const headers = { ...corsHeaders(req), "Content-Type": "application/json" };
    return json(res, 200, { token: TOKEN, pid: process.pid, cwd: rootDir }, headers);
  }

  // Everything below needs the token.
  if (req.headers["x-agent-token"] !== TOKEN) {
    // Preflight must pass for localhost origins so the browser will send
    // the real request; the real request is rejected if the token is wrong.
    if (req.method === "OPTIONS") {
      return res.writeHead(204, { ...corsHeaders(req) }).end();
    }
    return json(res, 401, { error: "Invalid or missing X-Agent-Token" }, corsHeaders(req));
  }

  if (req.method === "OPTIONS") {
    return res.writeHead(204, { ...corsHeaders(req) }).end();
  }

  // GET /agent/health — status probe for the panel
  if (req.method === "GET" && path === "/agent/health") {
    return json(res, 200, {
      ok: true,
      pid: process.pid,
      cwd: rootDir,
      branch: gitBranch(),
      node: process.version,
    }, corsHeaders(req));
  }

  // GET /agent/git/status — short status
  if (req.method === "GET" && path === "/agent/git/status") {
    return json(res, 200, { status: gitStatus() }, corsHeaders(req));
  }

  // POST /agent/git/commit { message } — `git add -A && git commit -m msg`
  // Stages nothing outside tracked/untracked project files (gitignore rules
  // apply — never force-adds). Dry if nothing to commit.
  if (req.method === "POST" && path === "/agent/git/commit") {
    const body = await readBody(req);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return json(res, 400, { error: "message required" }, corsHeaders(req));
    const safe = message.replace(/"/g, '\\"').replace(/`/g, "\\`");
    const cmd = `git add -A && git commit -m "${safe}"`;
    return streamCommand(res, cmd, rootDir, corsHeaders(req));
  }

  // POST /agent/exec { command, cwd? } — arbitrary shell command, streamed
  if (req.method === "POST" && path === "/agent/exec") {
    const body = await readBody(req);
    const command = typeof body.command === "string" ? body.command.trim() : "";
    if (!command) return json(res, 400, { error: "command required" }, corsHeaders(req));
    return streamCommand(res, command, typeof body.cwd === "string" ? body.cwd : undefined, corsHeaders(req));
  }

  // POST /agent/validate { targets: string[] } — run project checks, streamed.
  // The admin UI maps friendly labels to these scripts. Never `npm run build`
  // here (it ships a production bundle); these are fast correctness checks.
  const VALIDATE_SCRIPTS = {
    typecheck: "npx tsc -b --noEmit",
    content: "npx tsx scripts/validate-content.ts",
    sitemap: "npx tsx scripts/generate-sitemap.ts",
  };
  if (req.method === "POST" && path === "/agent/validate") {
    const body = await readBody(req);
    const targets = Array.isArray(body.targets) ? body.targets : ["typecheck"];
    const valid = targets.filter((t) => VALIDATE_SCRIPTS[t]);
    if (valid.length === 0) return json(res, 400, { error: "no valid targets" }, corsHeaders(req));
    const cmd = valid.map((t) => VALIDATE_SCRIPTS[t]).join(" && ");
    return streamCommand(res, cmd, rootDir, corsHeaders(req));
  }

  return json(res, 404, { error: "Not found" }, corsHeaders(req));
});

server.listen(PORT, HOST, () => {
  console.log(`Local agent running at http://${HOST}:${PORT}`);
  console.log(`  token: ${TOKEN_FILE}`);
  console.log(`  proxy: /agent/* -> http://${HOST}:${PORT} (Vite dev only)`);
});