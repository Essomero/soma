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

  // Curated OpenRouter models — only these pass through to the dropdown.
  const CURATED_OR_MODELS = new Set([
    // Free (IDs carry a :free suffix)
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
    "nousresearch/hermes-3-llama-3.1-405b:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    // Paid — quality daily drivers
    "anthropic/claude-sonnet-4.6",
    "anthropic/claude-sonnet-4.5",
    "anthropic/claude-haiku-4.5",
    "anthropic/claude-opus-4.8",
    // Gemini — 2.5 stable, 3 series previews, 3.5/3.6/3.7/3.8, latest aliases
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "google/gemini-2.5-pro",
    "google/gemini-3-flash-preview",
    "google/gemini-3-pro-preview",
    "google/gemini-3.1-flash-lite",
    "google/gemini-3.1-flash-lite-preview",
    "google/gemini-3.1-pro-preview",
    "google/gemini-3.5-flash",
    "google/gemini-3.5-flash-lite",
    "google/gemini-3.6-flash",
    "google/gemini-3.7-flash",
    "google/gemini-3.8-flash",
    "google/gemini-flash-latest",
    "google/gemini-flash-lite-latest",
    "google/gemini-pro-latest",
    "~google/gemini-flash-latest",
    "~google/gemini-flash-lite-latest",
    "~google/gemini-pro-latest",
    "openai/gpt-4o-mini",
    "openai/gpt-4o",
    "deepseek/deepseek-v4-flash",
    "deepseek/deepseek-v4-pro",
    "qwen/qwen3.6-flash",
    "qwen/qwen3.6-plus",
    "qwen/qwen3.6-max-preview",
    "mistralai/mistral-small-3.1-24b-instruct",
    "mistralai/mistral-medium-3.1",
    "x-ai/grok-4.3",
  ]);

  // Cached provider models
  let cachedORModels: any[] = [];
  let cacheORTime = 0;
  let cachedGeminiModels: any[] = [];
  let cacheGeminiTime = 0;
  let cachedGroqModels: any[] = [];
  let cacheGroqTime = 0;
  let cachedCerebrasModels: any[] = [];
  let cacheCerebrasTime = 0;
  const CACHE_TTL = 300000; // 5 minutes

  async function fetchOpenRouterModels(): Promise<any[]> {
    if (!OPENROUTER_KEY) return [];
    if (cachedORModels.length && Date.now() - cacheORTime < CACHE_TTL) return cachedORModels;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const r = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { "Authorization": `Bearer ${OPENROUTER_KEY}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (r.ok) {
        const data: any = await r.json();
        const seen = new Set<string>();
        cachedORModels = (data.data || [])
          .filter((m: any) => !m.id.includes("beta"))
          .filter((m: any) => CURATED_OR_MODELS.has(m.id) || CURATED_OR_MODELS.has(m.id.replace(/^~/, "")))
          .map((m: any) => {
            const id = m.id.replace(/^~/, "");
            return {
              id,
              label: (m.name || id).replace(/^Google:\s*~/, "Google: "),
              provider: "openrouter",
              free: !m.pricing || (parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0),
            };
          })
          .filter((m: any) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });
        if (!cachedORModels.some((m: any) => m.id === "google/gemini-flash-lite-latest")) {
          cachedORModels.push({
            id: "google/gemini-flash-lite-latest",
            label: "Google: Gemini Flash-Lite Latest",
            provider: "openrouter",
            free: false,
          });
        }
        cacheORTime = Date.now();
      }
    } catch {}
    return cachedORModels;
  }

  async function fetchGeminiModels(): Promise<any[]> {
    if (!GEMINI_KEY || GEMINI_DISABLED) return [];
    if (cachedGeminiModels.length && Date.now() - cacheGeminiTime < CACHE_TTL) return cachedGeminiModels;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (r.ok) {
        const data: any = await r.json();
        cachedGeminiModels = (data.models || [])
          .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
          .filter((m: any) => {
            // Exclude specialist models that aren't useful for text chat:
            //   * Gemini 2.x — superseded by gemini-flash-latest / gemini-pro-latest
            //   * image-gen (Nano Banana, Imagen, image-capable variants)
            //   * music-gen (Lyria)
            //   * robotics specialists
            //   * agent previews (Antigravity, Deep Research)
            //   * audio output (native-audio, TTS)
            //   * Gemma (different family with chat-tuned variants)
            const name = (m.name || "").toLowerCase();
            const display = (m.displayName || "").toLowerCase();
            const haystack = name + " " + display;
            if (haystack.includes("tts")) return false;
            if (haystack.includes("audio")) return false;
            if (haystack.includes("image")) return false;
            if (haystack.includes("computer-use")) return false;
            if (haystack.includes("lyria")) return false;
            if (haystack.includes("robotics")) return false;
            if (haystack.includes("deep-research")) return false;
            if (haystack.includes("antigravity")) return false;
            if (haystack.includes("nano-banana")) return false;
            if (name.startsWith("models/gemma")) return false;
            if (haystack.includes("native-audio")) return false;
            if (name.includes("embedding")) return false;
            return true;
          })
          .map((m: any) => ({
            id: (m.name || "").replace(/^models\//, ""),
            label: m.displayName || m.name || "",
            provider: "gemini",
            free: false,
            context_length: m.inputTokenLimit || null,
          }));
        if (!cachedGeminiModels.some((m: any) => m.id === "gemini-flash-lite-latest")) {
          cachedGeminiModels.unshift({
            id: "gemini-flash-lite-latest",
            label: "Gemini Flash-Lite Latest",
            provider: "gemini",
            free: false,
            context_length: 1048576,
          });
        }
        cacheGeminiTime = Date.now();
      }
    } catch {}
    return cachedGeminiModels;
  }

  async function fetchGroqModels(): Promise<any[]> {
    if (!GROQ_KEY) return [];
    if (cachedGroqModels.length && Date.now() - cacheGroqTime < CACHE_TTL) return cachedGroqModels;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const r = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { "Authorization": `Bearer ${GROQ_KEY}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (r.ok) {
        const data: any = await r.json();
        cachedGroqModels = (data.data || []).filter((m: any) => {
          const id = (m.id || "").toLowerCase();
          if (id.startsWith("whisper")) return false;
          if (id.includes("prompt-guard") || id.includes("safeguard")) return false;
          return true;
        }).map((m: any) => ({
          id: m.id,
          label: m.id,
          provider: "groq",
          free: false,
          context_length: m.context_window || null,
        }));
        cacheGroqTime = Date.now();
      }
    } catch {}
    return cachedGroqModels;
  }

  async function fetchCerebrasModels(): Promise<any[]> {
    if (!CEREBRAS_KEY) return [];
    if (cachedCerebrasModels.length && Date.now() - cacheCerebrasTime < CACHE_TTL) return cachedCerebrasModels;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const r = await fetch("https://api.cerebras.ai/v1/models", {
        headers: { "Authorization": `Bearer ${CEREBRAS_KEY}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (r.ok) {
        const data: any = await r.json();
        cachedCerebrasModels = (data.data || []).map((m: any) => ({
          id: m.id,
          label: m.id,
          provider: "cerebras",
          free: false,
          context_length: null,
        }));
        cacheCerebrasTime = Date.now();
      }
    } catch {}
    return cachedCerebrasModels;
  }
  interface DevModelItem {
    id: string;
    label: string;
    provider: string;
    free: boolean;
    context_length?: number | null;
  }

  let cachedStraitlyModels: DevModelItem[] = [];
  let cacheStraitlyTime = 0;

  async function fetchStraitlyModels(): Promise<DevModelItem[]> {
    // Same gating as production api/models.js: unconfigured provider
    // contributes zero models so explain/summarize stay disabled.
    if (!STRAITLY_KEY) return [];
    const defaultStraitly: DevModelItem[] = [
      { id: "deepseek/deepseek-v4-1-flash", label: "DeepSeek V4.1 Flash", provider: "straitly", free: false },
      { id: "z-ai/glm-5.3-flash", label: "GLM 5.3 Flash", provider: "straitly", free: false },
      { id: "gpt-6-luna", label: "GPT-6 Luna", provider: "straitly", free: false },
      { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", provider: "straitly", free: false },
      { id: "qwen/qwen3.6-35b-a3b", label: "Qwen 3.6 35B A3B", provider: "straitly", free: false },
      { id: "meta-llama/muse-spark-1.3-contributor", label: "Muse Spark 1.3 Contributor", provider: "straitly", free: false },
      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", provider: "straitly", free: false },
      { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "straitly", free: false },
    ];
    if (cachedStraitlyModels.length && Date.now() - cacheStraitlyTime < CACHE_TTL) return cachedStraitlyModels;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const r = await fetch("https://api.straitly.ai/v1/models", {
        headers: { "Authorization": `Bearer ${STRAITLY_KEY}` },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (r.ok) {
        const data = await r.json() as Record<string, unknown>;
        const rawList = Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : [];
        const modelMap: Record<string, Record<string, unknown>> = {};
        for (const item of rawList) {
          if (item && typeof item === "object") {
            const entry = item as Record<string, unknown>;
            const rawId = typeof entry.id === "string" ? entry.id : typeof entry.name === "string" ? entry.name : "";
            if (rawId) modelMap[rawId] = entry;
          }
        }
        const models: DevModelItem[] = defaultStraitly.map((cm) => {
          const remote = modelMap[cm.id];
          const contextLength = typeof remote?.context_window === "number" ? remote.context_window : typeof remote?.context_length === "number" ? remote.context_length : null;
          return {
            ...cm,
            context_length: contextLength,
          };
        });
        cachedStraitlyModels = models;
        cacheStraitlyTime = Date.now();
      }
    } catch {}
    return cachedStraitlyModels.length > 0 ? cachedStraitlyModels : defaultStraitly;
  }


  async function getModels(): Promise<any[]> {
    // Mirror production api/models.js: only advertise providers whose keys
    // are configured. A model in this list must be callable, otherwise the
    // UI enables explain/summarize actions that can only fail.
    const base = DEEPSEEK_KEY ? [
      { id: "deepseek-flash", label: "DeepSeek Flash", provider: "deepseek", free: false },
      { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "deepseek", free: false },
    ] : [];
    const [geminiModels, orModels, groqModels, cerebrasModels, straitlyModels] = await Promise.all([
      fetchGeminiModels(),
      fetchOpenRouterModels(),
      fetchGroqModels(),
      fetchCerebrasModels(),
      fetchStraitlyModels(),
    ]);

    const finalGemini = (GEMINI_KEY && !GEMINI_DISABLED) ? [...geminiModels] : [];
    if (finalGemini.length > 0 && !finalGemini.some((m: any) => m.id === "gemini-flash-lite-latest")) {
      finalGemini.unshift({
        id: "gemini-flash-lite-latest",
        label: "Gemini Flash-Lite Latest",
        provider: "gemini",
        free: false,
        context_length: 1048576,
      });
    }

    const finalOR = OPENROUTER_KEY ? [...orModels] : [];
    if (finalOR.length > 0 && !finalOR.some((m: any) => m.id === "google/gemini-flash-lite-latest")) {
      finalOR.push({
        id: "google/gemini-flash-lite-latest",
        label: "Google: Gemini Flash-Lite Latest",
        provider: "openrouter",
        free: false,
      });
    }

    return [...base, ...finalGemini, ...finalOR, ...groqModels, ...cerebrasModels, ...straitlyModels];
  }

  return {
    name: "chat-dev",
    configureServer(server: any) {
      // Models endpoint
      server.middlewares.use("/api/models", async (req: any, res: any) => {
        if (req.method === "OPTIONS") {
          res.writeHead(204, { "Access-Control-Allow-Origin": "*" });
          return res.end();
        }
        const models = await getModels();
        res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
        res.end(JSON.stringify({ models }));
      });

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
          else if (name === "engagement") localHandlerCache[name] = (await import("./api/engagement.js")).default;
          else if (name === "social") localHandlerCache[name] = (await import("./api/social.js")).default;
          else if (name === "system") localHandlerCache[name] = (await import("./api/system.js")).default;
          else if (name === "export") localHandlerCache[name] = (await import("./api/export.js")).default;
          else if (name === "proof") localHandlerCache[name] = (await import("./api/proof.js")).default;
          else if (name === "import") localHandlerCache[name] = (await import("./api/import.js")).default;
          else if (name === "voice-profiles") localHandlerCache[name] = (await import("./api/voice-profiles.js")).default;
          else localHandlerCache[name] = (await import("./api/content.js")).default;
        }
        return localHandlerCache[name];
      }
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const m = /^\/api\/([a-z-]+)/.exec(req.url || "");
        const name = m ? m[1] : "";
        // Old public routes map to the merged handler, exactly like vercel.json.
        const mapped = handlerForRoute(name);
        if (!mapped) return next();
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
        "/api": {
          target: env.LOCAL_API ? "http://localhost:3001" : "https://soma.mayanja.dev",
          changeOrigin: true,
        },
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
