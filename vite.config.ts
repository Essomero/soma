import { defineConfig, loadEnv } from "vite";
import type { Connect } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { runChat } from "./shared/chat/core.js";
import { handlerForRoute } from "./shared/api-routes.js";

// Inline chat + models handler for local dev — no separate API server needed
function chatDevPlugin(env: Record<string, string>) {
  const DEEPSEEK_KEY = env.DEEPSEEK_API_KEY || "";
  const OPENROUTER_KEY = env.OPENROUTER_API_KEY || "";
  const GEMINI_KEY = env.GEMINI_API_KEY || "";
  const GEMINI_DISABLED = env.GEMINI_DISABLED === "1" || env.GEMINI_DISABLED === "true";
  const GROQ_KEY = env.GROQ_API_KEY || "";
  const CEREBRAS_KEY = env.CEREBRAS_API_KEY || "";
  const STRAITLY_KEY = env.STRAITLY_API_KEY || "";

  const keys: string[] = [];
  if (DEEPSEEK_KEY) keys.push("DeepSeek");
  if (OPENROUTER_KEY) keys.push("OpenRouter");
  if (GEMINI_KEY && !GEMINI_DISABLED) keys.push("Gemini");
  if (GROQ_KEY) keys.push("Groq");
  if (CEREBRAS_KEY) keys.push("Cerebras");
  if (STRAITLY_KEY) keys.push("Straitly");
  console.log("[chat-dev] Providers configured:", keys.length ? keys.join(" + ") : "NONE — AI reply will not work");

  // Models are fetched server-side by api/models.js via the generic API
  // middleware — no inline handler needed. This avoids duplicating the
  // env+DB key resolution that api/models.js and shared/chat/providers.js
  // already handle.

  return {
    name: "chat-dev",
    configureServer(server: any) {
      // Chat endpoint (shared core)
      server.middlewares.use("/api/chat", async (req: Connect.IncomingMessage, res: Connect.ServerResponse, next: Connect.NextFunction) => {
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          });
          return res.end();
        }

        if (req.method !== "POST") return next();

        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk);
        let body: unknown = {};
        try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch {}

        const result = await runChat({
          body,
          keys: {
            deepseek: DEEPSEEK_KEY,
            openrouter: OPENROUTER_KEY,
            gemini: GEMINI_KEY,
            groq: GROQ_KEY,
            cerebras: CEREBRAS_KEY,
            straitly: STRAITLY_KEY,
          },
          options: {
            geminiDisabled: GEMINI_DISABLED,
            reasoningEffort: env.DEEPSEEK_REASONING_EFFORT,
            referer: "http://localhost:5173",
            title: "Soma (dev)",
          },
        });

        if (result.kind === "stream") {
          res.writeHead(result.status, {
            ...result.headers,
            "Access-Control-Allow-Origin": "*",
          });
          const reader = result.stream.getReader();
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
          } finally {
            res.end();
          }
          return;
        }

        res.writeHead(result.status, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify(result.body));
      });

      // Buffer request bodies for our API handlers
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
          const chunks: Buffer[] = [];
          req.on("data", (c: Buffer) => chunks.push(c));
          req.on("end", () => { req._body = Buffer.concat(chunks).toString(); next(); });
        } else {
          next();
        }
      });
      // Local API fallback: serve /api/* from api/*.js with the same owner
      // bypass as `npm run server`, so plain `npm run dev` runs the same
      // handlers as production instead of hand-written copies.
      for (const k of [
          "TURSO_DATABASE_URL", "TURSO_DB", "TURSO_AUTH_TOKEN", "TURSO_TOKEN",
          "SITE_PASSWORD", "UNSPLASH_ACCESS_KEY", "UNSPLASH_APP_ID",
          "DEEPSEEK_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY",
          "GROQ_API_KEY", "CEREBRAS_API_KEY",
          "STRAITLY_API_KEY",
          "DEEPSEEK_REASONING_EFFORT", "GEMINI_DISABLED",
        ]) {
        if (!process.env[k] && env[k]) process.env[k] = env[k];
      }
      const localHandlerCache: Record<string, any> = {};
      async function loadLocalHandler(name: string) {
        if (!localHandlerCache[name]) {
          if (name === "content") localHandlerCache[name] = (await import("./api/content.js")).default;
          else if (name === "config") localHandlerCache[name] = (await import("./api/config.js")).default;
          else if (name === "engagement") localHandlerCache[name] = (await import("./api/engagement.js")).default;
          else if (name === "social") localHandlerCache[name] = (await import("./api/social.js")).default;
          else if (name === "system") localHandlerCache[name] = (await import("./api/system.js")).default;
          else if (name === "export") localHandlerCache[name] = (await import("./api/export.js")).default;
          else if (name === "proof") localHandlerCache[name] = (await import("./api/proof.js")).default;
          else if (name === "import") localHandlerCache[name] = (await import("./api/import.js")).default;
          else if (name === "format-paste") localHandlerCache[name] = (await import("./api/format-paste.js")).default;
          else if (name === "models") localHandlerCache[name] = (await import("./api/models.js")).default;
          else if (name === "auth") localHandlerCache[name] = (await import("./api/auth.js")).default;
          else if (name === "verify") localHandlerCache[name] = (await import("./api/verify.js")).default;
          else if (name === "voice-profiles") localHandlerCache[name] = (await import("./api/voice-profiles.js")).default;
          else localHandlerCache[name] = (await import("./api/content.js")).default;
        }
        return localHandlerCache[name];
      }
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const m = /^\/api\/([a-z-]+)/.exec(req.url || "");
        const name = m ? m[1] : "";
        const mapped = handlerForRoute(name);
        if (!mapped) return next();
        if (name === "models") console.log("[debug][vite-mw] /api/models -> handler:", mapped);
        try {
          const handler = await loadLocalHandler(mapped);
          const u = new URL(req.url || "", "http://localhost");
          let body: any = {};
          if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method || "")) {
            try { body = JSON.parse(req._body || "{}"); } catch { body = {}; }
          }
          const vercelReq = { method: req.method, url: req.url, query: Object.fromEntries(u.searchParams), body, headers: { cookie: req.headers?.cookie || "" }, localBypass: true };
          const vercelRes = {
            status(code: number) { res.statusCode = code; return this; },
            json(data: any) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); return this; },
            setHeader(n: string, v: string) { res.setHeader(n, v); },
            end(data?: any) { res.end(data); return this; },
          };
          await handler(vercelReq, vercelRes);
        } catch (e: any) {
          console.error(`[api-local] ${name} handler error:`, e.message);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message || "Internal server error" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), chatDevPlugin(env)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        // No /api proxy — all API routes are handled by the local middleware
        // that loads api/*.js handlers directly. The proxy only existed when
        // routes had to reach a separate server, and defaulting to production
        // was wrong for local dev.
        // Local agent sidecar (shell/git/build): only reachable in local dev.
        // Production never proxies /agent — there is no sidecar on Vercel.
        "/agent": {
          target: "http://localhost:8765",
          changeOrigin: true,
        },
      },
    },
  };
});
