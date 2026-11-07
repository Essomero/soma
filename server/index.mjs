// Production unified server: serves dist/ + /api/* from one Node process.
// Used by Docker, Fly.io, Railway, Render, and `npm run start`.
// Turso optional: falls back to local SQLite file ./data/soma.db (or $DATABASE_URL / $SQLITE_PATH).
// Reads .env / .env.local if present, so Docker with bind-mounted .env works even without env_file.

import { createServer } from "http";
import { readFileSync, existsSync, statSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load .env / .env.local if present (env vars win)
for (const file of [".env.local", ".env"]) {
  const p = join(rootDir, file);
  if (!existsSync(p)) continue;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

const PORT = Number(process.env.PORT || process.env.SERVER_PORT || 3000);
const DIST = join(rootDir, "dist");

if (!existsSync(DIST)) {
  console.error(`[soma] dist/ not found at ${DIST} — run npm run build first`);
  process.exit(1);
}

const SITE_PASSWORD = process.env.SITE_PASSWORD || "";
if (!SITE_PASSWORD) {
  console.warn("[soma] SITE_PASSWORD not set — private routes will reject (set it in env)");
}

const hasTurso = !!(process.env.TURSO_DATABASE_URL || process.env.TURSO_DB) && !!(process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN);
const localPath = (process.env.DATABASE_URL || process.env.SQLITE_PATH || "./data/soma.db").replace(/^file:/, "");
const aiKeys = [];
if (process.env.OPENROUTER_API_KEY) aiKeys.push("OpenRouter");
if (process.env.DEEPSEEK_API_KEY) aiKeys.push("DeepSeek");
if (process.env.GEMINI_API_KEY && process.env.GEMINI_DISABLED !== "1") aiKeys.push("Gemini");
if (process.env.GROQ_API_KEY) aiKeys.push("Groq");
if (process.env.CEREBRAS_API_KEY) aiKeys.push("Cerebras");
if (process.env.STRAITLY_API_KEY) aiKeys.push("Straitly");
console.log(`[soma] DB: ${hasTurso ? `Turso remote` : `local SQLite file ${localPath}`}`);
console.log(`[soma] AI: ${aiKeys.length ? aiKeys.join(" + ") : "none — set OPENROUTER_API_KEY etc. to enable margin AI"}`);

const handlerNames = ["content", "notes", "comments", "highlights", "ratings", "progress", "tests", "public", "diag", "chat", "models", "auth"];
const handlers = {};
for (const name of handlerNames) {
  try {
    const mod = await import(`../api/${name}.js`);
    handlers[name] = mod.default;
  } catch (e) {
    console.warn(`[soma] Skipping api/${name}.js: ${e.message}`);
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json",
};

function serveStatic(req, res) {
  let pathname = req.url.split("?")[0];
  try { pathname = decodeURIComponent(pathname); } catch {}
  if (!pathname || pathname === "/") pathname = "/index.html";
  if (pathname.includes("..")) return false;

  const candidates = [
    join(DIST, pathname.slice(1)),
    null,
  ];

  for (const fp of candidates) {
    if (!fp) {
      const idx = join(DIST, "index.html");
      if (!existsSync(idx)) return false;
      const body = readFileSync(idx);
      res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-cache" });
      res.end(body);
      return true;
    }
    if (existsSync(fp)) {
      const stat = statSync(fp);
      if (stat.isDirectory()) {
        const idxFile = join(fp, "index.html");
        if (existsSync(idxFile)) {
          res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-cache" });
          res.end(readFileSync(idxFile));
          return true;
        }
        continue;
      }
      const ext = extname(fp).toLowerCase();
      const ct = MIME[ext] || "application/octet-stream";
      const headers = { "Content-Type": ct };
      if (fp.includes("/assets/") || /\.[a-f0-9]{8}\./.test(fp)) {
        headers["Cache-Control"] = "public, max-age=31536000, immutable";
      } else if (ext === ".html") {
        headers["Cache-Control"] = "no-cache";
      } else {
        headers["Cache-Control"] = "public, max-age=3600";
      }
      res.writeHead(200, headers);
      res.end(readFileSync(fp));
      return true;
    }
  }
  return false;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/")) {
    const route = pathname.split("/")[2];
    const handler = handlers[route];
    if (!handler) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }
    let body = {};
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      if (raw) {
        try { body = JSON.parse(raw); } catch { body = {}; }
      }
    }
    const vercelReq = {
      method: req.method,
      query: Object.fromEntries(url.searchParams),
      body,
      headers: {
        cookie: req.headers.cookie || "",
        "x-forwarded-for": req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "",
        "x-forwarded-proto": req.headers["x-forwarded-proto"] || "",
      },
      localBypass: false,
    };
    let _status = 200;
    let _extraHeaders = {};
    const vercelRes = {
      status(code) { _status = code; return this; },
      json(data) {
        const headers = { "Content-Type": "application/json", ..._extraHeaders };
        if (!res.writableEnded) {
          res.writeHead(_status, headers);
          res.end(JSON.stringify(data));
        }
      },
      setHeader(name, value) { _extraHeaders[name] = value; res.setHeader(name, value); },
      writeHead(statusCode, headers) {
        _status = statusCode;
        if (headers) Object.assign(_extraHeaders, headers);
        res.writeHead(statusCode, headers);
        return this;
      },
      write(c) { res.write(c); },
      end(d) { res.end(d); },
    };
    try {
      await handler(vercelReq, vercelRes);
    } catch (e) {
      console.error(`[soma] /api/${route} error:`, e);
      if (!res.writableEnded) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal error" }));
      }
    }
    return;
  }

  if (serveStatic(req, res)) return;

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[soma] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[soma] API: ${Object.keys(handlers).join(", ")}`);
});
