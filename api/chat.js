import { requireAuth } from "./_auth.js";

const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_DISABLED = process.env.GEMINI_DISABLED === "1" || process.env.GEMINI_DISABLED === "true";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const CEREBRAS_KEY = process.env.CEREBRAS_API_KEY || "";
const CEREBRAS_URL = "https://api.cerebras.ai/v1/chat/completions";
const STRAITLY_KEY = process.env.STRAITLY_API_KEY || process.env.STRAIGHTLY_API_KEY || "";
const STRAITLY_URL = "https://api.straitly.ai/v1/chat/completions";
const STRAITLY_MODEL_IDS = new Set([
  "deepseek/deepseek-v4-1-flash",
  "z-ai/glm-5.3-flash",
  "gpt-6-luna",
  "claude-haiku-5-5",
  "qwen/qwen3.6-35b-a3b",
  "meta-llama/muse-spark-1.3-contributor",
  "gemini-3.8-flash",
  "deepseek/deepseek-v4-pro",
]);

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // This proxies the owner's paid AI keys: owner session required.
  // Public test grading and visitor margin AI now need the owner login.
  if (!requireAuth(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  let { systemPrompt, userMessage, messages: reqMessages, model, stream, provider, apiKey: customApiKey, apiUrl: customApiUrl } = req.body || {};

  if (!userMessage && Array.isArray(reqMessages)) {
    const sys = reqMessages.find(m => m.role === "system");
    const usr = reqMessages.find(m => m.role === "user");
    if (sys && !systemPrompt) systemPrompt = sys.content;
    if (usr) userMessage = usr.content;
  }

  if (!userMessage) {
    return res.status(400).json({ error: "userMessage is required" });
  }

  // Determine provider: explicit param first, fallback to inference only if omitted
  let resolvedProvider = provider;
  if (!resolvedProvider) {
    if (customApiUrl) {
      resolvedProvider = "custom";
    } else if (model && (model.startsWith("straitly/") || STRAITLY_MODEL_IDS.has(model))) {
      resolvedProvider = "straitly";
    } else if (model && model.startsWith("gemini-")) {
      resolvedProvider = "gemini";
    } else if (model && model.includes("/")) {
      resolvedProvider = "openrouter";
    } else {
      resolvedProvider = "deepseek";
    }
  }

  const isCustom = resolvedProvider === "custom";
  const isStraitly = resolvedProvider === "straitly";
  const isGemini = resolvedProvider === "gemini";
  const isOpenRouter = resolvedProvider === "openrouter";
  const isGroq = resolvedProvider === "groq";
  const isCerebras = resolvedProvider === "cerebras";
  const isDeepSeek = resolvedProvider === "deepseek";

  let apiKey, apiUrl;
  if (isCustom) {
    apiKey = customApiKey || "custom-key";
    apiUrl = customApiUrl || "https://api.openai.com/v1/chat/completions";
  } else if (isGemini) {
    apiKey = customApiKey || GEMINI_KEY;
    apiUrl = customApiUrl || GEMINI_URL;
  } else if (isOpenRouter) {
    apiKey = customApiKey || OPENROUTER_KEY;
    apiUrl = customApiUrl || OPENROUTER_URL;
  } else if (isGroq) {
    apiKey = customApiKey || GROQ_KEY;
    apiUrl = customApiUrl || GROQ_URL;
  } else if (isCerebras) {
    apiKey = customApiKey || CEREBRAS_KEY;
    apiUrl = customApiUrl || CEREBRAS_URL;
  } else if (isStraitly) {
    apiKey = customApiKey || STRAITLY_KEY;
    apiUrl = customApiUrl || STRAITLY_URL;
  } else {
    apiKey = customApiKey || DEEPSEEK_KEY;
    apiUrl = customApiUrl || DEEPSEEK_URL;
  }

  if (!apiKey) {
    const name = isGemini ? "GEMINI_API_KEY" : isOpenRouter ? "OPENROUTER_API_KEY" : isGroq ? "GROQ_API_KEY" : isCerebras ? "CEREBRAS_API_KEY" : isStraitly ? "STRAITLY_API_KEY" : "DEEPSEEK_API_KEY";
    console.error(`${name} is not configured`);
    return res.status(500).json({ error: `AI service not configured (${name})` });
  }
  if (isGemini && GEMINI_DISABLED) {
    return res.status(503).json({ error: "Gemini is temporarily disabled (GEMINI_DISABLED=1)." });
  }

  let selectedModel = model || (isGemini ? "gemini-2.5-flash" : isStraitly ? "deepseek/deepseek-v4-1-flash" : isOpenRouter ? "deepseek/deepseek-v4-flash" : isGroq ? "llama-3.1-8b-instant" : isCerebras ? "gemma-4-31b" : "deepseek-flash");
  if (isStraitly) {
    selectedModel = selectedModel.replace(/^straitly\//, "");
  }
  // OpenRouter free variants have a :free suffix in listings but the chat API
  if (isOpenRouter) {
    selectedModel = selectedModel.replace(/:free$/, "");
    if (selectedModel === "google/gemini-flash-lite-latest" || selectedModel === "~google/gemini-flash-lite-latest") {
      selectedModel = "google/gemini-2.5-flash-lite";
    } else if (selectedModel === "google/gemini-flash-latest" || selectedModel === "~google/gemini-flash-latest") {
      selectedModel = "google/gemini-2.5-flash";
    } else if (selectedModel === "google/gemini-pro-latest" || selectedModel === "~google/gemini-pro-latest") {
      selectedModel = "google/gemini-2.5-pro";
    }
  }

  const shouldStream = stream !== false;

  try {
    // ── Gemini path (non-OpenAI-compatible API) ──
    if (isGemini) {
      return await handleGemini(req, res, {
        systemPrompt,
        userMessage,
        selectedModel,
        shouldStream,
        apiKey,
        apiUrl,
      });
    }

    // ── OpenAI-compatible path (DeepSeek + OpenRouter) ──
    const messages = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }

    messages.push({ role: "user", content: userMessage });

    const headers = {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    // OpenRouter requires these headers
    if (isOpenRouter) {
      headers["HTTP-Referer"] = "https://soma.vercel.app";
      headers["X-Title"] = "Soma";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const r = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: 0.7,
        max_tokens: req.body?.max_tokens || 3500,
        stream: shouldStream,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!r.ok) {
      const err = await r.text();
      const detail = extractErrorMessage(err, r.status);
      console.error(`API error ${r.status} (${selectedModel}): ${err.slice(0, 500)}`);
      return res.status(502).json({ error: detail });
    }

    if (shouldStream) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });

      const reader = r.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          res.write(chunk);
        }
      } catch (streamErr) {
        console.error("Stream read error:", streamErr.message);
      }

      res.end();
    } else {
      const data = await r.json();
      const reply = data.choices?.[0]?.message?.content || "";
      return res.json({ reply });
    }
  } catch (e) {
    if (e.name === "AbortError") {
      console.error("Request timed out");
      return res.status(504).json({ error: "AI service timeout" });
    }
    console.error("Chat handler error:", e.message);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ── Error message extraction ──
// Parses Gemini and OpenAI-compatible error responses to surface the
// actual message (rate limits, invalid keys, etc.) to the frontend.

function extractErrorMessage(raw, status) {
  try {
    const parsed = JSON.parse(raw);
    // Gemini format: { error: { message: "..." } }
    // OpenAI format: { error: { message: "..." } }
    if (parsed.error?.message) return parsed.error.message;
  } catch {}
  // Fallback: use status text
  if (status === 429) return "Rate limit exceeded : try again later or switch models.";
  if (status === 401 || status === 403) return "Invalid or missing API key.";
  return `AI service error (HTTP ${status})`;
}

// ── Gemini API handler ──
// Gemini uses a completely different request/response format.
// We translate to/from OpenAI-compatible SSE so the frontend stays unchanged.

async function handleGemini(req, res, opts) {
  const { systemPrompt, userMessage, selectedModel, shouldStream, apiKey, apiUrl } = opts;

  // Strip models/ prefix if present (Gemini API returns names like "models/gemini-2.5-flash")
  const modelId = selectedModel.replace(/^models\//, "");

  // Build Gemini-format request body
  const contents = [{ parts: [{ text: userMessage }], role: "user" }];
  const generationConfig = { temperature: 0.7, maxOutputTokens: 2000 };
  const geminiBody = { contents, generationConfig };

  if (systemPrompt) {
    geminiBody.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const endpoint = shouldStream
    ? `${apiUrl}/${modelId}:streamGenerateContent?alt=sse`
    : `${apiUrl}/${modelId}:generateContent`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": apiKey,
    },
    body: JSON.stringify(geminiBody),
    signal: controller.signal,
  });

  clearTimeout(timeout);

  if (!r.ok) {
    const err = await r.text();
    const detail = extractErrorMessage(err, r.status);
    console.error(`Gemini API error ${r.status} (${modelId}): ${err.slice(0, 500)}`);
    return res.status(502).json({ error: detail });
  }

  if (!shouldStream) {
    const data = await r.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return res.json({ reply });
  }

  // ── Streaming: transform Gemini SSE → OpenAI-compatible SSE ──
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const parsed = JSON.parse(jsonStr);
          // Gemini 2.x and 3.x both emit PER-CHUNK deltas : each chunk's
          // parts[*].text is the new text to append, NOT a cumulative
          // running total. The previous translator's slice(diff) trick
          // silently dropped content on Gemini 3.x where subsequent
          // chunks can be SHORTER than earlier ones (e.g. the trailing
          // "thought signature" chunk has text: ""). Concatenate parts
          // within a chunk directly and emit as the SSE delta.
          const parts = parsed.candidates?.[0]?.content?.parts ?? [];
          const text = parts.map((p) => p.text ?? "").join("");

          if (text) {
            const chunk = JSON.stringify({
              id: "gemini-" + Date.now(),
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model: modelId,
              choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
            });
            res.write(`data: ${chunk}\n\n`);
          }
        } catch {}
      }
    }
  } catch (streamErr) {
    console.error("Gemini stream read error:", streamErr.message);
  }

  // Emit [DONE] to match OpenAI SSE convention
  res.write("data: [DONE]\n\n");
  res.end();
}
