// Gateway core. Pure transport logic: no auth, no framework request objects.
// Adapters pass a normalized body, a keys object, and options; they get back
// a json, error, or stream result they can render in their own runtime.

import {
  ALLOWED_PROVIDERS,
  PROVIDERS,
  isReasoningModel,
  normalizeModel,
  resolveProvider,
} from "./providers.js";
import { extractErrorMessage } from "./errors.js";
import { buildGeminiBody, translateGeminiStream } from "./gemini.js";
import { buildActionPrompt } from "../tutor/actions.js";

const MAX_USER_MESSAGE = 20000;
const MAX_SYSTEM_PROMPT = 60000;
const MAX_MODEL_ID = 200;
const DEFAULT_TIMEOUT_MS = 60000;

const json = (status, body) => ({ kind: "json", status, body });
const error = (status, message) => ({ kind: "error", status, body: { error: message } });
const stream = (status, headers, body) => ({ kind: "stream", status, headers, stream: body });

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export async function runChat({
  body = {},
  keys = {},
  options = {},
  fetchImpl = fetch,
} = {}) {
  let {
    systemPrompt,
    userMessage,
    messages: reqMessages,
    model,
    stream: shouldStreamRaw,
    provider,
    action,
    mode,
    context,
  } = body || {};

  if (action) {
    const built = buildActionPrompt({ action, mode, context });
    if (built.error) return error(400, built.error);
    systemPrompt = built.systemPrompt;
    userMessage = built.userMessage;
  } else if (!userMessage && Array.isArray(reqMessages)) {
    const sys = reqMessages.find((m) => m.role === "system");
    const usr = reqMessages.find((m) => m.role === "user");
    if (sys && !systemPrompt) systemPrompt = sys.content;
    if (usr) userMessage = usr.content;
  }

  if (!userMessage) return error(400, "userMessage is required");
  if (typeof userMessage !== "string" || userMessage.length > MAX_USER_MESSAGE) {
    return error(400, "userMessage too long");
  }
  if (systemPrompt && (typeof systemPrompt !== "string" || systemPrompt.length > MAX_SYSTEM_PROMPT)) {
    return error(400, "systemPrompt too long");
  }
  if (typeof model !== "undefined" && (typeof model !== "string" || model.length > MAX_MODEL_ID)) {
    return error(400, "invalid model");
  }

  const resolvedProvider = resolveProvider({ provider, model });
  if (!ALLOWED_PROVIDERS.has(resolvedProvider)) {
    return error(400, "unknown provider");
  }

  const config = PROVIDERS[resolvedProvider];
  const apiKey = keys[resolvedProvider] || "";
  if (!apiKey) {
    console.error(`${config.keyName} is not configured`);
    return error(500, `AI service not configured (${config.keyName})`);
  }
  if (resolvedProvider === "gemini" && options.geminiDisabled) {
    return error(503, "Gemini is temporarily disabled (GEMINI_DISABLED=1).");
  }

  const selectedModel = normalizeModel(resolvedProvider, model);
  const shouldStream = shouldStreamRaw !== false;
  const timeoutMs = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (resolvedProvider === "gemini") {
      const modelId = selectedModel.replace(/^models\//, "");
      const endpoint = shouldStream
        ? `${config.url}/${modelId}:streamGenerateContent?alt=sse`
        : `${config.url}/${modelId}:generateContent`;

      const r = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify(buildGeminiBody({ systemPrompt, userMessage })),
        signal: controller.signal,
      });

      if (!r.ok) {
        const raw = await r.text().catch(() => "");
        console.error(`Gemini API error ${r.status} (${modelId}): ${raw.slice(0, 500)}`);
        return error(502, extractErrorMessage(raw, r.status));
      }

      if (!shouldStream) {
        const data = await r.json().catch(() => ({}));
        return json(200, {
          reply: data.candidates?.[0]?.content?.parts?.[0]?.text || "",
        });
      }

      if (!r.body) return error(500, "No response body");
      return stream(
        200,
        { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
        translateGeminiStream(r.body, modelId),
      );
    }

    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: userMessage });

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (resolvedProvider === "openrouter") {
      headers["HTTP-Referer"] = options.referer || "https://soma.mayanja.dev";
      headers["X-Title"] = options.title || "Soma";
    }

    const reasoning = isReasoningModel(selectedModel);
    const maxTokens = reasoning
      ? clamp(Number(body.max_tokens) || 64000, 1, 64000)
      : clamp(Number(body.max_tokens) || 3500, 1, 8000);

    const r = await fetchImpl(config.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: selectedModel,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        stream: shouldStream,
        ...(reasoning
          ? {
              thinking: { type: "enabled" },
              reasoning_effort: options.reasoningEffort || "high",
            }
          : {}),
      }),
      signal: controller.signal,
    });

    if (!r.ok) {
      const raw = await r.text().catch(() => "");
      console.error(`API error ${r.status} (${selectedModel}): ${raw.slice(0, 500)}`);
      return error(502, extractErrorMessage(raw, r.status));
    }

    if (shouldStream) {
      if (!r.body) return error(500, "No response body");
      return stream(
        200,
        { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" },
        r.body,
      );
    }

    const data = await r.json().catch(() => ({}));
    return json(200, { reply: data.choices?.[0]?.message?.content || "" });
  } catch (e) {
    if (e?.name === "AbortError") {
      console.error("Request timed out");
      return error(504, "AI service timeout");
    }
    console.error("Chat handler error:", e?.message || e);
    return error(500, "Internal server error");
  } finally {
    clearTimeout(timeout);
  }
}
