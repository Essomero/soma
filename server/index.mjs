// Production unified server: serves dist/ + /api/* from one Node process.
// Used by Docker, Fly.io, Railway, Render, and `npm run start`.
// Supports:
// - Local SQLite file ./data/soma.db (default in Dockerfile solo)
// - Local libSQL server sqld at libsql://sqld:8080 (default in docker-compose.yml)
// - Turso cloud when USE_TURSO=true + TURSO_* vars present (Vercel or explicit opt-in)

import { createServer } from "http";
import { createHmac, timingSafeEqual } from "crypto";
import { readFileSync, existsSync, statSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { HANDLER_FILES, handlerForRoute } from "../shared/api-routes.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

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

if (!process.env.SITE_PASSWORD) {
  console.warn("[soma] SITE_PASSWORD not set — private routes will reject (set it in env)");
}

function parseUseTurso() {
  const v = (process.env.USE_TURSO || "").trim().toLowerCase();
  if (!v) return null;
  if (["false", "0", "no", "off"].includes(v)) return false;
  if (["true", "1", "yes", "on"].includes(v)) return true;
  return null;
}

const useTursoFlag = parseUseTurso();
const tursoUrl = (process.env.TURSO_DATABASE_URL || "").trim();
const isSqld = tursoUrl.toLowerCase().includes("sqld") || tursoUrl.includes("localhost:8080") || tursoUrl.includes("127.0.0.1:8080");
const hasTursoUrl = !!(process.env.TURSO_DATABASE_URL || process.env.TURSO_DB);
const hasToken = !!(process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN);
const hasTurso = useTursoFlag === false ? false : useTursoFlag === true ? (hasTursoUrl && (hasToken || isSqld)) : (hasTursoUrl && (hasToken || isSqld));
const localPath = (process.env.DATABASE_URL || process.env.SQLITE_PATH || "./data/soma.db").replace(/^file:/, "");

const aiKeys = [];
if (process.env.OPENROUTER_API_KEY) aiKeys.push("OpenRouter");
if (process.env.DEEPSEEK_API_KEY) aiKeys.push("DeepSeek");
if (process.env.GEMINI_API_KEY && process.env.GEMINI_DISABLED !== "1") aiKeys.push("Gemini");
if (process.env.GROQ_API_KEY) aiKeys.push("Groq");
if (process.env.CEREBRAS_API_KEY) aiKeys.push("Cerebras");
if (process.env.STRAITLY_API_KEY || process.env.STRAIGHTLY_API_KEY || process.env.STRIGHTLY_API_KEY) aiKeys.push("Straitly");

const dbLabel = hasTurso ? (isSqld ? `sqld at ${tursoUrl}` : "Turso remote") : `local SQLite file ${localPath}`;
console.log(`[soma] DB: ${dbLabel} (USE_TURSO=${process.env.USE_TURSO || "unset"})`);
console.log(`[soma] AI: ${aiKeys.length ? aiKeys.join(" + ") : "none — set OPENROUTER_API_KEY etc. to enable margin AI"}`);

const handlers = {};
for (const name of HANDLER_FILES) {
  try {
    const mod = await import(`../api/${name}.js`);
    handlers[name] = mod.default;
  } catch (e) {
    // Every route in shared/api-routes.js points at one of these files. A load
    // failure means those routes would 404 silently, so refuse to boot.
    console.error(`[soma] Failed to load api/${name}.js: ${e.message}`);
    process.exit(1);
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
  const candidates = [join(DIST, pathname.slice(1)), null];
  for (const fp of candidates) {
    if (!fp) {
      const idx = join(DIST, "index.html");
      if (!existsSync(idx)) return false;
      let body = readFileSync(idx, "utf8");
      // Inject cloud-auth detection flag so the frontend AuthGuard can
      // redirect to cloud-auth login instead of showing the password form.
      if (process.env.CLOUD_AUTH_JWT_SECRET) {
        body = body.replace(
          "</head>",
          '<script>window.__CLOUD_AUTH__=true</script></head>',
        );
      }
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
    const route = pathname.split("/")[2] || "";
    const handlerName = handlerForRoute(route);
    const handler = handlerName ? handlers[handlerName] : null;
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
      url: req.url,
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

  // ── Cloud-auth features (token bridge, logout, auth redirect) ──
  // Only enabled when CLOUD_AUTH_JWT_SECRET is set — standalone mode skips these.
  if (process.env.CLOUD_AUTH_JWT_SECRET) {

    // ── Token bridge — accept JWT from cloud-auth, set cookies on this origin ──
    if (pathname === "/auth/token-bridge" && url.searchParams.has("token")) {
      const token = url.searchParams.get("token");
      const jwtSecret = process.env.CLOUD_AUTH_JWT_SECRET;
      const sitePassword = process.env.SITE_PASSWORD;

      if (jwtSecret && sitePassword && token) {
        try {
          // Verify JWT (HS256) using Node crypto
          const parts = token.split(".");
          if (parts.length === 3) {
            const headerRaw = Buffer.from(parts[0], "base64url").toString();
            const payloadRaw = Buffer.from(parts[1], "base64url").toString();
            const sigRaw = Buffer.from(parts[2], "base64url");

            const header = JSON.parse(headerRaw);
            if (header.alg === "HS256") {
              const data = parts[0] + "." + parts[1];
              const expected = createHmac("sha256", jwtSecret).update(data).digest();
              if (expected.length === sigRaw.length) {
                const valid = timingSafeEqual(expected, sigRaw);
                if (valid) {
                  const payload = JSON.parse(payloadRaw);
                  // Check expiry
                  const now = Math.floor(Date.now() / 1000);
                  if (!payload.exp || now <= payload.exp) {
                    // Valid — mint soma_session cookie for this origin
                    const maxAge = 30 * 24 * 60 * 60;
                    const exp = Math.floor(Date.now() / 1000) + maxAge;
                    const sessPayload = String(exp);
                    const sessSig = createHmac("sha256", sitePassword).update(sessPayload).digest("hex");
                    const sessToken = `${sessPayload}.${sessSig}`;

                    res.writeHead(302, {
                      Location: "/",
                      "Set-Cookie": [
                        `soma_session=${sessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
                        `soma_auth=1; Path=/; SameSite=Lax; Max-Age=${maxAge}`,
                      ],
                    });
                    res.end();
                    return;
                  }
                }
              }
            }
          }
        } catch {
          // Invalid JWT — fall through to redirect
        }
      }
      // Token invalid or missing — redirect to login
      const fallbackUrl = req.headers["x-forwarded-host"]
        ? "/login"
        : "http://localhost:3001/login";
      res.writeHead(302, { Location: fallbackUrl });
      res.end();
      return;
    }

    // ── Logout — redirect to cloud-auth logout ──
    // Behind proxy, /auth/* is routed to cloud-auth, so this handler is
    // only reached on direct access. Use absolute URL for local dev;
    // behind proxy, construct the proxy URL for safety.
    if (pathname === "/auth/logout") {
      const proto = req.headers["x-forwarded-proto"] || "http";
      const authUrl = req.headers["x-forwarded-host"]
        ? `${proto}://${req.headers["x-forwarded-host"]}/auth/logout`
        : "http://localhost:3001/auth/logout";
      res.writeHead(302, { Location: authUrl });
      res.end();
      return;
    }

    // ── SPA root — redirect unauthenticated to cloud-auth login ──
    // Only intercept `/`, not content paths like `/some-story`.
    // The SPA handles auth client-side for deep links.
    if (pathname === "/") {
      const cookies = req.headers.cookie || "";
      const hasSession = cookies.split(";").some(c => c.trim().startsWith("soma_session="));
      if (!hasSession) {
        const authUrl = req.headers["x-forwarded-host"]
          ? "/login"
          : "http://localhost:3001/login";
        res.writeHead(302, { Location: authUrl });
        res.end();
        return;
      }
    }
  }

  if (serveStatic(req, res)) return;
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[soma] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[soma] API: ${Object.keys(handlers).join(", ")}`);
});
