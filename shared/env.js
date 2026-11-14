// Shared environment helpers for API handlers and MCP tools.
// Avoids duplicating envKeys/envOptions across files that consume AI keys.

/** Build the API keys map from environment variables. */
export function envKeys() {
  return {
    deepseek: process.env.DEEPSEEK_API_KEY || "",
    openrouter: process.env.OPENROUTER_API_KEY || "",
    gemini: process.env.GEMINI_API_KEY || "",
    groq: process.env.GROQ_API_KEY || "",
    cerebras: process.env.CEREBRAS_API_KEY || "",
    straitly: process.env.STRAITLY_API_KEY || "",
  };
}

/** Build the options object for runChat. */
export function envOptions() {
  return {
    geminiDisabled:
      process.env.GEMINI_DISABLED === "1" || process.env.GEMINI_DISABLED === "true",
    reasoningEffort: process.env.DEEPSEEK_REASONING_EFFORT,
    referer: "https://soma.mayanja.dev",
    title: "Soma",
  };
}