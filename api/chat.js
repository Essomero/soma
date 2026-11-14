import { requireAuth } from "./_auth.js";
import { runChat } from "../shared/chat/core.js";

function envKeys() {
  return {
    deepseek: process.env.DEEPSEEK_API_KEY || "",
    openrouter: process.env.OPENROUTER_API_KEY || "",
    gemini: process.env.GEMINI_API_KEY || "",
    groq: process.env.GROQ_API_KEY || "",
    cerebras: process.env.CEREBRAS_API_KEY || "",
    straitly: process.env.STRAITLY_API_KEY || "",
  };
}

function envOptions() {
  return {
    geminiDisabled:
      process.env.GEMINI_DISABLED === "1" || process.env.GEMINI_DISABLED === "true",
    reasoningEffort: process.env.DEEPSEEK_REASONING_EFFORT,
    referer: "https://soma.mayanja.dev",
    title: "Soma",
  };
}

async function writeResult(res, result) {
  if (result.kind === "stream") {
    res.writeHead(result.status, result.headers);
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
  res.status(result.status).json(result.body);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // This proxies the owner's paid AI keys: owner session required.
  // Public test grading and visitor margin AI now need the owner login.
  if (!requireAuth(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // customApiUrl/customApiKey deliberately ignored: the shared core picks the
  // endpoint and key from the provider map. Any client-supplied URL would turn
  // this authenticated proxy into a fetch oracle.
  const result = await runChat({
    body: req.body || {},
    keys: envKeys(),
    options: envOptions(),
  });

  await writeResult(res, result);
}
