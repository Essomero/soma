// Provider registry for the AI gateway.
// Runtime-neutral: no env access, no Node APIs. Adapters pass keys in.

export const ALLOWED_PROVIDERS = new Set([
  "straitly",
  "gemini",
  "openrouter",
  "groq",
  "cerebras",
  "deepseek",
]);

export const STRAITLY_MODEL_IDS = new Set([
  "deepseek/deepseek-v4-1-flash",
  "z-ai/glm-5.3-flash",
  "gpt-6-luna",
  "claude-haiku-5-5",
  "qwen/qwen3.6-35b-a3b",
  "meta-llama/muse-spark-1.3-contributor",
  "gemini-3.8-flash",
  "deepseek/deepseek-v4-pro",
]);

export const PROVIDERS = {
  straitly: {
    keyName: "STRAITLY_API_KEY",
    url: "https://api.straitly.ai/v1/chat/completions",
    defaultModel: "deepseek/deepseek-v4-1-flash",
  },
  gemini: {
    keyName: "GEMINI_API_KEY",
    url: "https://generativelanguage.googleapis.com/v1beta/models",
    defaultModel: "gemini-2.5-flash",
  },
  openrouter: {
    keyName: "OPENROUTER_API_KEY",
    url: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "deepseek/deepseek-v4-flash",
  },
  groq: {
    keyName: "GROQ_API_KEY",
    url: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.1-8b-instant",
  },
  cerebras: {
    keyName: "CEREBRAS_API_KEY",
    url: "https://api.cerebras.ai/v1/chat/completions",
    defaultModel: "gemma-4-31b",
  },
  deepseek: {
    keyName: "DEEPSEEK_API_KEY",
    url: "https://api.deepseek.com/v1/chat/completions",
    defaultModel: "deepseek-flash",
  },
};

export function resolveProvider({ provider, model } = {}) {
  if (provider) return provider;
  if (model && (model.startsWith("straitly/") || STRAITLY_MODEL_IDS.has(model))) return "straitly";
  if (model && model.startsWith("gemini-")) return "gemini";
  if (model && model.includes("/")) return "openrouter";
  return "deepseek";
}

export function normalizeModel(provider, model) {
  const selected = model || PROVIDERS[provider]?.defaultModel || "";
  if (provider === "straitly") return selected.replace(/^straitly\//, "");
  if (provider === "openrouter") {
    const bare = selected.replace(/:free$/, "");
    if (bare === "google/gemini-flash-lite-latest" || bare === "~google/gemini-flash-lite-latest") {
      return "google/gemini-2.5-flash-lite";
    }
    if (bare === "google/gemini-flash-latest" || bare === "~google/gemini-flash-latest") {
      return "google/gemini-2.5-flash";
    }
    if (bare === "google/gemini-pro-latest" || bare === "~google/gemini-pro-latest") {
      return "google/gemini-2.5-pro";
    }
    return bare;
  }
  return selected;
}

export function isReasoningModel(model) {
  const id = String(model || "").toLowerCase();
  return id.includes("deepseek-v4") || id.includes("deepseek/deepseek-v4") || id.includes("z-ai/glm");
}
