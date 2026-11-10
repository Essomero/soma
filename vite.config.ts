import { defineConfig, loadEnv } from "vite";
import type { Connect } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { runChat } from "./shared/chat/core.js";

// Inline chat + models handler for local dev — no separate API server needed
function chatDevPlugin(env: Record<string, string>) {
  const DEEPSEEK_KEY = env.DEEPSEEK_API_KEY || "";
  const OPENROUTER_KEY = env.OPENROUTER_API_KEY || "";
  const GEMINI_KEY = env.GEMINI_API_KEY || "";
  const GEMINI_DISABLED = env.GEMINI_DISABLED === "1" || env.GEMINI_DISABLED === "true";
  const GROQ_KEY = env.GROQ_API_KEY || "";
  const CEREBRAS_KEY = env.CEREBRAS_API_KEY || "";
  const STRAITLY_KEY = env.STRAITLY_API_KEY || env.STRAIGHTLY_API_KEY || env.STRIGHTLY_API_KEY || "";

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
      // Comments CRUD — handle locally so highlight_id works (not yet deployed)
      server.middlewares.use("/api/comments", async (req: any, res: any, next: any) => {
        const TURSO_URL = (env.TURSO_DATABASE_URL || env.TURSO_DB || "").replace("libsql://", "https://");
        const TURSO_TOKEN = env.TURSO_AUTH_TOKEN || env.TURSO_TOKEN || "";

        async function turso(sql: string, args: any[]) {
          const body = { requests: [{ type: "execute", stmt: { sql, args: args.map((a: any) => {
            if (a == null) return { type: "null" };
            if (typeof a === "number") return { type: "integer", value: String(a) };
            return { type: "text", value: String(a) };
          }) } }] };
          const r = await fetch(TURSO_URL + "/v2/pipeline", {
            method: "POST", headers: { Authorization: "Bearer " + TURSO_TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
          });
          const data = await r.json();
          return data.results?.[0]?.response?.result;
        }

        // GET — list comments for a story as a threaded tree (same shape as /api/comments).
        // Without this, GET falls through to the proxy below and reloads show nothing.
        if (req.method === "GET") {
          try {
            const u = new URL(req.url || "", "http://localhost");
            const story = u.searchParams.get("story");
            if (!story) { res.writeHead(400, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ error: "story required" })); }
            const result = await turso("SELECT * FROM comments WHERE story_slug = ? ORDER BY created_at DESC", [story]);
            const cols = (result?.cols || []).map((c: any) => c.name || c);
            const rows = (result?.rows || []).map((r: any[]) => {
              const o: Record<string, any> = {};
              cols.forEach((c: string, i: number) => {
                const cell = r[i];
                o[c] = cell && typeof cell === "object" ? (cell.type === "null" ? null : cell.value) : cell;
              });
              return o;
            });
            const map: Record<string, any> = {};
            const roots: any[] = [];
            for (const r of rows) map[r.id] = { ...r, replies: [] };
            for (const r of rows) {
              const node = map[r.id];
              if (r.parent_id != null && map[r.parent_id]) map[r.parent_id].replies.push(node);
              else roots.push(node);
            }
            for (const root of roots) root.replies.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(roots));
          } catch (e: any) {
            console.error("[comments-dev GET]", e.message);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        // POST — create comment
        if (req.method === "POST") {
          try {
            const body = req._body ? JSON.parse(req._body) : {};
            const { storySlug, body: text, parentId, isAi, aiModel, highlightId, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText } = body;
            if (!storySlug || !text) { res.writeHead(400, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ error: "storySlug and body required" })); }
            const now = new Date().toISOString();
            const args = [
              storySlug, text, parentId ?? null, isAi ? 1 : 0, aiModel ?? null,
              highlightId ?? null, sectionIndex ?? null, paragraphIndex ?? null,
              startOffset ?? null, endOffset ?? null, selectedText ?? null, now,
            ];
            const result = await turso("INSERT INTO comments (story_slug, body, parent_id, is_ai, ai_model, highlight_id, section_index, paragraph_index, start_offset, end_offset, selected_text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *", args);
            const cols = (result?.cols || []).map((c: any) => c.name || c);
            const cells: any[] = result?.rows?.[0] || [];
            const row: Record<string, any> = {};
            cols.forEach((c: string, i: number) => {
              const cell = cells[i];
              row[c] = cell && typeof cell === "object" ? (cell.type === "null" ? null : cell.value) : cell;
            });
            if (row.id == null) { res.writeHead(500, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ error: "Insert failed" })); }
            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify(row));
          } catch (e: any) {
            console.error("[comments-dev POST]", e.message);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        // DELETE — delete comment (and its replies)
        if (req.method === "DELETE") {
          try {
            const body = req._body ? JSON.parse(req._body) : {};
            const { id } = body;
            if (!id) { res.writeHead(400, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ error: "id required" })); }
            await turso("DELETE FROM comments WHERE parent_id = ?", [id]);
            await turso("DELETE FROM comments WHERE id = ?", [id]);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          } catch (e: any) {
            console.error("[comments-dev DELETE]", e.message);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        // PUT — update comment
        if (req.method === "PUT") {
          try {
            const body = req._body ? JSON.parse(req._body) : {};
            const { id, body: text } = body;
            if (!id || !text) { res.writeHead(400, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ error: "id and body required" })); }
            const now = new Date().toISOString();
            await turso("UPDATE comments SET body = ?, updated_at = ? WHERE id = ?", [text, now, id]);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          } catch (e: any) {
            console.error("[comments-dev PUT]", e.message);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: e.message }));
          }
          return;
        }

        return next();
      });

      server.middlewares.use("/api/highlights", async (req: any, res: any, next: any) => {
        if (!["GET", "POST", "DELETE"].includes(req.method || "")) return next();
        const TURSO_URL = (env.TURSO_DATABASE_URL || env.TURSO_DB || "").replace("libsql://", "https://");
        const TURSO_TOKEN = env.TURSO_AUTH_TOKEN || env.TURSO_TOKEN || "";

        // Ensure table exists on first request
        await fetch(TURSO_URL + "/v2/pipeline", {
          method: "POST",
          headers: { Authorization: "Bearer " + TURSO_TOKEN, "Content-Type": "application/json" },
          body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql: "CREATE TABLE IF NOT EXISTS highlights (id INTEGER PRIMARY KEY AUTOINCREMENT, story_slug TEXT NOT NULL, section_index INTEGER NOT NULL, paragraph_index INTEGER NOT NULL, start_offset INTEGER NOT NULL, end_offset INTEGER NOT NULL, selected_text TEXT NOT NULL, text_hash TEXT NOT NULL, color TEXT DEFAULT 'primary', created_at TEXT DEFAULT (datetime('now')))" } }] }),
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});

        async function turso(sql: string, args: any[]) {
          const body = { requests: [{ type: "execute", stmt: { sql, args: args.map((a: any) => {
            if (a == null) return { type: "null" };
            if (typeof a === "number") return { type: "integer", value: String(a) };
            return { type: "text", value: String(a) };
          }) } }] };
          const r = await fetch(TURSO_URL + "/v2/pipeline", {
            method: "POST", headers: { Authorization: "Bearer " + TURSO_TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
          });
          const data = await r.json();
          const result = data.results?.[0]?.response?.result;
          if (!result) return { rows: [], lastInsertRowid: null };
          const cols = (result.cols || []).map((c: any) => c.name || c);
          const rows = (result.rows || []).map((row: any[]) => {
            const o: Record<string, any> = {};
            cols.forEach((c: string, i: number) => {
              o[c] = (row[i] && typeof row[i] === "object") ? (row[i].type === "null" ? null : row[i].value) : row[i];
            });
            return o;
          });
          return { rows, lastInsertRowid: result.last_insert_rowid ?? null };
        }

        async function tursoRows(sql: string, args: any[]) {
          return (await turso(sql, args)).rows;
        }

        function readBody(): string {
          if (req._body) return req._body;
          return "";
        }

        try {
          if (req.method === "GET") {
            const u = new URL(req.url, "http://localhost");
            const story = u.searchParams.get("story");
            if (!story) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "story required" }));
            }
            const rows = await tursoRows(
              "SELECT * FROM highlights WHERE story_slug = ? ORDER BY section_index, paragraph_index, start_offset",
              [story],
            );
            const result = [];
            for (const h of rows) {
              const comments = await tursoRows(
                "SELECT * FROM comments WHERE highlight_id = ? ORDER BY created_at ASC",
                [h.id],
              );
              result.push({
                id: h.id, storySlug: h.story_slug,
                sectionIndex: h.section_index, paragraphIndex: h.paragraph_index,
                startOffset: h.start_offset, endOffset: h.end_offset,
                selectedText: h.selected_text, textHash: h.text_hash,
                color: h.color, createdAt: h.created_at,
                comments: comments.map((c: any) => ({
                  id: c.id, body: c.body,
                  parentId: c.parent_id, isAi: c.is_ai === 1,
                  aiModel: c.ai_model, createdAt: c.created_at,
                  updatedAt: c.updated_at,
                })),
              });
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify(result));
          }
          if (req.method === "POST") {
            const body = readBody();
            const { storySlug, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText, textHash, color } = JSON.parse(body);
            if (!storySlug || !selectedText) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "storySlug and selectedText required" }));
            }
            const insertResult = await turso(
              "INSERT INTO highlights (story_slug, section_index, paragraph_index, start_offset, end_offset, selected_text, text_hash, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              [storySlug, sectionIndex ?? 0, paragraphIndex ?? 0, startOffset ?? 0, endOffset ?? 0, selectedText, textHash ?? "", color || "yellow"],
            );
            // Read back the inserted row using last_insert_rowid
            const inserted = await tursoRows(
              "SELECT * FROM highlights WHERE id = ?",
              [insertResult.lastInsertRowid],
            );
            const row = inserted[0];
            if (!row) { res.writeHead(500, { "Content-Type": "application/json" }); return res.end(JSON.stringify({ error: "Failed to create highlight" })); }
            res.writeHead(201, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({
              id: row.id, storySlug: row.story_slug,
              sectionIndex: row.section_index, paragraphIndex: row.paragraph_index,
              startOffset: row.start_offset, endOffset: row.end_offset,
              selectedText: row.selected_text, textHash: row.text_hash,
              color: row.color, createdAt: row.created_at,
            }));
          }
          if (req.method === "DELETE") {
            const body = readBody();
            const { id } = JSON.parse(body);
            await turso("DELETE FROM comments WHERE highlight_id = ?", [id]);
            await turso("DELETE FROM highlights WHERE id = ?", [id]);
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ success: true }));
          }
        } catch (e: any) {
          console.error("[highlights-dev]", e.message);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });

      // Notes CRUD — local dev mirror of api/notes.js
      server.middlewares.use("/api/notes", async (req: any, res: any, next: any) => {
        const TURSO_URL = (env.TURSO_DATABASE_URL || env.TURSO_DB || "").replace("libsql://", "https://");
        const TURSO_TOKEN = env.TURSO_AUTH_TOKEN || env.TURSO_TOKEN || "";

        async function turso(sql: string, args: any[]) {
          const body = { requests: [{ type: "execute", stmt: { sql, args: args.map((a: any) => {
            if (a == null) return { type: "null" };
            if (typeof a === "number") return { type: "integer", value: String(a) };
            return { type: "text", value: String(a) };
          }) } }] };
          const r = await fetch(TURSO_URL + "/v2/pipeline", {
            method: "POST", headers: { Authorization: "Bearer " + TURSO_TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
          });
          const data = await r.json();
          return data.results?.[0]?.response?.result;
        }

        async function tursoRows(sql: string, args: any[]) {
          const result = await turso(sql, args);
          if (!result) return [];
          const cols = (result.cols || []).map((c: any) => c.name || c);
          return (result.rows || []).map((row: any[]) => {
            const o: Record<string, any> = {};
            cols.forEach((c: string, i: number) => { o[c] = (row[i] && typeof row[i] === "object") ? (row[i].type === "null" ? null : row[i].value) : row[i]; });
            return o;
          });
        }

        function readBody(): any {
          try { return req._body ? JSON.parse(req._body) : {}; } catch { return {}; }
        }

        // Ensure table exists on first request
        await turso("CREATE TABLE IF NOT EXISTS note_articles (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT)", []).catch(() => {});

        const send = (code: number, data: any) => { res.writeHead(code, { "Content-Type": "application/json" }); return res.end(JSON.stringify(data)); };
        const mapRow = (r: any) => r && ({ id: r.id, slug: r.slug, title: r.title, content: r.content, createdAt: r.created_at, updatedAt: r.updated_at });

        try {
          if (req.method === "GET") {
            const u = new URL(req.url, "http://localhost");
            const slug = u.searchParams.get("slug");
            if (slug) {
              const rows = await tursoRows("SELECT * FROM note_articles WHERE slug = ?", [slug]);
              if (!rows[0]) return send(404, { error: "Not found" });
              return send(200, mapRow(rows[0]));
            }
            const rows = await tursoRows("SELECT * FROM note_articles ORDER BY updated_at DESC, created_at DESC", []);
            return send(200, rows.map(mapRow));
          }
          if (req.method === "POST") {
            const { title, content, slug } = readBody();
            if (!title || content == null) return send(400, { error: "title and content required" });
            const finalSlug = (slug && slug.trim()) ? slug.trim() : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
            if (!finalSlug) return send(400, { error: "title must produce a slug" });
            const existing = await tursoRows("SELECT slug FROM note_articles WHERE slug = ?", [finalSlug]);
            if (existing.length) return send(409, { error: "slug already exists" });
            const result = await turso("INSERT INTO note_articles (slug, title, content) VALUES (?, ?, ?)", [finalSlug, title, content]);
            const inserted = await tursoRows("SELECT * FROM note_articles WHERE slug = ?", [finalSlug]);
            return send(201, mapRow(inserted[0]));
          }
          if (req.method === "PUT") {
            const { slug, title, content } = readBody();
            if (!slug || !title || content == null) return send(400, { error: "slug, title and content required" });
            const updated = await tursoRows("UPDATE note_articles SET title = ?, content = ?, updated_at = datetime('now') WHERE slug = ? RETURNING *", [title, content, slug]);
            if (!updated[0]) return send(404, { error: "Not found" });
            return send(200, mapRow(updated[0]));
          }
          if (req.method === "DELETE") {
            const { slug } = readBody();
            if (!slug) return send(400, { error: "slug required" });
            await turso("DELETE FROM comments WHERE story_slug = ?", [slug]);
            await turso("DELETE FROM highlights WHERE story_slug = ?", [slug]);
            await turso("DELETE FROM note_articles WHERE slug = ?", [slug]);
            return send(200, { success: true });
          }
          return next();
        } catch (e: any) {
          console.error("[notes-dev]", e.message);
          return send(500, { error: e.message });
        }
      });

      // Public-page toggles — mirrors api/public.js so the notes/public toggle works in dev
      server.middlewares.use("/api/public", async (req: any, res: any, next: any) => {
        const TURSO_URL = (env.TURSO_DATABASE_URL || env.TURSO_DB || "").replace("libsql://", "https://");
        const TURSO_TOKEN = env.TURSO_AUTH_TOKEN || env.TURSO_TOKEN || "";

        async function turso(sql: string, args: any[]) {
          const body = { requests: [{ type: "execute", stmt: { sql, args: args.map((a: any) => {
            if (a == null) return { type: "null" };
            if (typeof a === "number") return { type: "integer", value: String(a) };
            return { type: "text", value: String(a) };
          }) } }] };
          const r = await fetch(TURSO_URL + "/v2/pipeline", {
            method: "POST", headers: { Authorization: "Bearer " + TURSO_TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify(body), signal: AbortSignal.timeout(8000),
          });
          const data = await r.json();
          return data.results?.[0]?.response?.result;
        }

        async function tursoRows(sql: string, args: any[]) {
          const result = await turso(sql, args);
          if (!result) return [];
          const cols = (result.cols || []).map((c: any) => c.name || c);
          return (result.rows || []).map((row: any[]) => {
            const o: Record<string, any> = {};
            cols.forEach((c: string, i: number) => { o[c] = (row[i] && typeof row[i] === "object") ? (row[i].type === "null" ? null : row[i].value) : row[i]; });
            return o;
          });
        }

        function readBody(): any {
          try { return req._body ? JSON.parse(req._body) : {}; } catch { return {}; }
        }

        await turso("CREATE TABLE IF NOT EXISTS public_pages (slug TEXT PRIMARY KEY, \"public\" INTEGER NOT NULL DEFAULT 0, set_at TEXT)", []).catch(() => {});

        const send = (code: number, data: any) => { res.writeHead(code, { "Content-Type": "application/json" }); return res.end(JSON.stringify(data)); };

        try {
          if (req.method === "GET") {
            const u = new URL(req.url, "http://localhost");
            // Passthrough unsplash search/probe to the fallback handler
            if (u.searchParams.get("unsplash")) return next();
            const slug = u.searchParams.get("slug");
            if (!slug) return send(400, { error: "Missing slug param" });
            const rows = await tursoRows("SELECT \"public\" FROM public_pages WHERE slug = ?", [slug]);
            return send(200, { public: rows.length > 0 && rows[0].public == 1 });
          }
          if (req.method === "POST") {
            const { slugs, public: isPublic } = readBody();
            const slugList = slugs || (req.body?.slug ? [req.body.slug] : []);
            if (!slugList.length) return send(400, { error: "Missing slugs" });
            const now = new Date().toISOString();
            const val = isPublic ? 1 : 0;
            for (const slug of slugList) {
              await turso("INSERT INTO public_pages (slug, \"public\", set_at) VALUES (?, ?, ?) ON CONFLICT(slug) DO UPDATE SET \"public\" = excluded.\"public\", set_at = excluded.set_at", [slug, val, now]);
            }
            return send(200, { success: true });
          }
          return next();
        } catch (e: any) {
          console.error("[public-dev]", e.message);
          return send(500, { error: e.message });
        }
      });
      // Local API fallback: serve the remaining /api/* routes from api/*.js
      // with the same owner bypass as `npm run server`, so plain `npm run dev`
      // works with zero extra processes. Routes handled above (chat, models,
      // comments, highlights, notes, public) never reach this.
      for (const k of ["TURSO_DATABASE_URL", "TURSO_DB", "TURSO_AUTH_TOKEN", "TURSO_TOKEN", "SITE_PASSWORD", "UNSPLASH_ACCESS_KEY", "UNSPLASH_APP_ID"]) {
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
          else localHandlerCache[name] = (await import("./api/content.js")).default;
        }
        return localHandlerCache[name];
      }
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const m = /^\/api\/([a-z-]+)/.exec(req.url || "");
        const name = m ? m[1] : "";
        // Map old routes to new merged handlers via dev fallback too
        const mapped =
          name === "progress" || name === "ratings" || name === "tests" ? "engagement" :
          name === "notes" || name === "highlights" || name === "comments" ? "social" :
          name === "diag" || name === "public" ? "system" :
          name;
        if (!["content", "engagement", "social", "system", "progress", "ratings", "tests", "diag", "public", "notes", "highlights", "comments", "export"].includes(name)) return next();
        try {
          const handler = await loadLocalHandler(mapped);
          const u = new URL(req.url || "", "http://localhost");
          let body: any = {};
          if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method || "")) {
            try { body = JSON.parse(req._body || "{}"); } catch { body = {}; }
          }
          const vercelReq = { method: req.method, query: Object.fromEntries(u.searchParams), body, headers: { cookie: req.headers?.cookie || "" }, localBypass: true };
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
