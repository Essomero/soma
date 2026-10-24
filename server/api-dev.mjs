// Local API dev server: runs the same handlers as Vercel, but locally
// Usage: node server/api-dev.mjs (via `npm run server`)
// Requires: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars (legacy TURSO_DB / TURSO_TOKEN also accepted)

import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Vite loads .env files on its own, but plain `node` does not. Read them
// here so `npm run server` works straight after `cp .env.example .env.local`
// without exporting anything by hand. Real environment wins over files.
const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [".env.local", ".env"]) {
  const path = join(rootDir, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

const PORT = 3001;

// Dynamically import API handlers
// Note: auth.ts is TypeScript and needs the Vercel build; local DEV mode
// bypasses the auth gate in AuthGuard, so it is intentionally not served here.
const handlers = {};
for (const name of ["progress", "ratings", "comments", "chat", "models", "tests", "learn", "public", "highlights", "content", "diag"]) {
  const mod = await import(`../api/${name}.js`);
  handlers[name] = mod.default;
}

const server = createServer(async (req, res) => {
  // CORS for local Vite dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.writeHead(204).end();

  // Parse URL
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  // Route to handler
  const route = path.split("/")[2]; // /api/progress → progress
  const handler = handlers[route];

  if (!handler) {
    res.writeHead(404).end(JSON.stringify({ error: "Not found" }));
    return;
  }

  // Parse body for methods that carry one (learn DELETE sends { slug })
  let body = {};
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch {}
  }

  // Build Vercel-compatible request/response objects.
  // localBypass mirrors production auth without a login flow: localhost is
  // single-user, and Vercel never sets this flag (it builds req itself).
  const vercelReq = { method: req.method, query: Object.fromEntries(url.searchParams), body, headers: { cookie: req.headers.cookie || "" }, localBypass: true };
  const vercelRes = {
    status(code) { res.statusCode = code; return this; },
    json(data) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); },
    setHeader(name, value) { res.setHeader(name, value); },
    writeHead(statusCode, headers) {
      res.writeHead(statusCode, headers);
      // Don't overwrite CORS if already set by handler
      if (!headers || !("Access-Control-Allow-Origin" in (headers || {}))) {
        // Handler's writeHead may have set its own CORS : keep what's there
      }
      return this;
    },
    write(chunk) { res.write(chunk); },
    end(data) { res.end(data); },
  };

  await handler(vercelReq, vercelRes);
});

const hasDb = !!(process.env.TURSO_DATABASE_URL || process.env.TURSO_DB);
const hasToken = !!(process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN);
if (!hasDb || !hasToken) {
  console.error("Missing Turso credentials: set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN (see .env.example) or every /api/* request will fail.");
}

server.listen(PORT, () => {
  console.log(`API dev server running at http://localhost:${PORT}`);
  console.log(`Proxying ${Object.keys(handlers).join(", ")}`);
});
