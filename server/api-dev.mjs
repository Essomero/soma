// Local API dev server: runs the same handlers as Vercel, but locally
// Usage: node server/api-dev.mjs
// Requires: TURSO_DB and TURSO_TOKEN env vars

import { createServer } from "http";

const PORT = 3001;

// Dynamically import API handlers
// Note: auth.ts is TypeScript and needs the Vercel build; local DEV mode
// bypasses the auth gate in AuthGuard, so it is intentionally not served here.
const handlers = {};
for (const name of ["progress", "ratings", "comments", "chat", "models", "tests", "learn", "public", "highlights"]) {
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

  // Build Vercel-compatible request/response objects
  const vercelReq = { method: req.method, query: Object.fromEntries(url.searchParams), body };
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

server.listen(PORT, () => {
  console.log(`API dev server running at http://localhost:${PORT}`);
  console.log(`Proxying ${Object.keys(handlers).join(", ")}`);
});
