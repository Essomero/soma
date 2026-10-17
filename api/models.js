const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_DISABLED = process.env.GEMINI_DISABLED === "1" || process.env.GEMINI_DISABLED === "true";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const CEREBRAS_KEY = process.env.CELEBRAS_API_KEY || "";
const META_KEY = process.env.META_API_KEY || process.env.MODEL_API_KEY || "";
const STRAITLY_KEY = process.env.STRAITLY_API_KEY || process.env.STRAIGHTLY_API_KEY || "";
const STRAITLY_URL = "https://api.straitly.ai/v1/models";

// Curated Straitly models (displayed under Straightly section)
const STRAITLY_MODELS = [
  { id: "deepseek/deepseek-v4-1-flash", label: "DeepSeek V4.1 Flash", provider: "straitly", free: false },
  { id: "z-ai/glm-5.3-flash", label: "GLM 5.3 Flash", provider: "straitly", free: false },
  { id: "gpt-6-luna", label: "GPT-6 Luna", provider: "straitly", free: false },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", provider: "straitly", free: false },
  { id: "qwen/qwen3.6-35b-a3b", label: "Qwen 3.6 35B A3B", provider: "straitly", free: false },
  { id: "meta-llama/muse-spark-1.3-contributor", label: "Muse Spark 1.3 Contributor", provider: "straitly", free: false },
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", provider: "straitly", free: false },
  { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "straitly", free: false },
];

// Hardcoded direct Meta models (always available in dropdown)
const META_MODELS = [
  { id: "muse-spark-1.3", label: "Muse Spark 1.3", provider: "meta", free: false },
];

// Hardcoded direct DeepSeek models (always available if DEEPSEEK_API_KEY is set)
const DEEPSEEK_MODELS = [
  { id: "deepseek-flash", label: "DeepSeek Flash", provider: "deepseek", free: false },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "deepseek", free: false },
];

// Curated OpenRouter models : only these pass through to the dropdown.
// Everything else is hidden. Add IDs here to unlock more models.
const CURATED_OR_MODELS = new Set([
  // Free (IDs carry a :free suffix)
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  // Paid : quality daily drivers
  "anthropic/claude-sonnet-4.6",
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-opus-4.8",
  // Gemini : 2.5 stable, 3 series previews, 3.5/3.6/3.7/3.8, latest aliases
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

// Cache OpenRouter models in memory (lives as long as the serverless function)
let cachedORModels = null;
let cacheORTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchOpenRouterModels() {
  if (!OPENROUTER_KEY) return [];
  if (cachedORModels && Date.now() - cacheORTime < CACHE_TTL) return cachedORModels;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const r = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!r.ok) {
      console.error(`OpenRouter models error ${r.status}`);
      return cachedORModels || [];
    }

    const data = await r.json();
    const seen = new Set();
    const models = (data.data || [])
      .filter(m => !m.id.includes("beta"))
      .filter(m => CURATED_OR_MODELS.has(m.id) || CURATED_OR_MODELS.has(m.id.replace(/^~/, "")))
      .map(m => {
        const id = m.id.replace(/^~/, "");
        return {
          id,
          label: (m.name || id).replace(/^Google:\s*~/, "Google: "),
          provider: "openrouter",
          free: !m.pricing || (parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0),
          pricing: m.pricing ? {
            prompt: m.pricing.prompt,
            completion: m.pricing.completion,
          } : null,
          context_length: m.context_length || null,
        };
      })
      .filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
    if (!models.some(m => m.id === "google/gemini-flash-lite-latest")) {
      models.push({
        id: "google/gemini-flash-lite-latest",
        label: "Google: Gemini Flash-Lite Latest",
        provider: "openrouter",
        free: false,
        pricing: null,
        context_length: 1048576,
      });
    }

    cachedORModels = models;
    cacheORTime = Date.now();
    return models;
  } catch (e) {
    console.error("OpenRouter fetch error:", e.message);
    return cachedORModels || [];
  }
}

// Cache Gemini models in memory
let cachedGeminiModels = null;
let cacheGeminiTime = 0;

async function fetchGeminiModels() {
  if (!GEMINI_KEY || GEMINI_DISABLED) return [];
  if (cachedGeminiModels && Date.now() - cacheGeminiTime < CACHE_TTL) return cachedGeminiModels;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`,
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!r.ok) {
      console.error(`Gemini models error ${r.status}`);
      return cachedGeminiModels || [];
    }

    const data = await r.json();
    const models = (data.models || [])
      .filter(m => {
        const methods = m.supportedGenerationMethods || [];
        return methods.includes("generateContent");
      })
      .filter(m => {
        // Exclude specialist models that aren't useful for text chat:
        //   * Gemini 2.x : superseded by gemini-flash-latest / gemini-pro-latest
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
        if (haystack.includes("lyria")) return false;        // music generation
        if (haystack.includes("robotics")) return false;     // robotics specialists
        if (haystack.includes("deep-research")) return false; // research agents
        if (haystack.includes("antigravity")) return false;  // agent preview
        if (haystack.includes("nano-banana")) return false;  // image-gen brand
        if (name.startsWith("models/gemma")) return false;   // Gemma family
        if (haystack.includes("native-audio")) return false; // audio output
        if (name.includes("embedding")) return false; // embedding models
        return true;
      })
      .map(m => {
        // Strip "models/" prefix from name to get the ID
        const id = (m.name || "").replace(/^models\//, "");
        return {
          id,
          label: m.displayName || id,
          provider: "gemini",
          free: false,
          context_length: m.inputTokenLimit || null,
        };
      });
    if (!models.some(m => m.id === "gemini-flash-lite-latest")) {
      models.unshift({
        id: "gemini-flash-lite-latest",
        label: "Gemini Flash-Lite Latest",
        provider: "gemini",
        free: false,
        context_length: 1048576,
      });
    }

    cachedGeminiModels = models;
    cacheGeminiTime = Date.now();
    return models;
  } catch (e) {
    console.error("Gemini fetch error:", e.message);
    return cachedGeminiModels || [];
  }
}

// Cache Groq models in memory
let cachedGroqModels = null;
let cacheGroqTime = 0;

async function fetchGroqModels() {
  if (!GROQ_KEY) return [];
  if (cachedGroqModels && Date.now() - cacheGroqTime < CACHE_TTL) return cachedGroqModels;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const r = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!r.ok) {
      console.error(`Groq models error ${r.status}`);
      return cachedGroqModels || [];
    }

    const data = await r.json();
    const models = (data.data || [])
      .filter(m => {
        // Exclude audio and safety models
        const id = (m.id || "").toLowerCase();
        if (id.startsWith("whisper")) return false;
        if (id.includes("prompt-guard") || id.includes("safeguard")) return false;
        return true;
      })
      .map(m => ({
        id: m.id,
        label: m.id,
        provider: "groq",
        free: false,
        context_length: m.context_window || null,
      }));

    cachedGroqModels = models;
    cacheGroqTime = Date.now();
    return models;
  } catch (e) {
    console.error("Groq fetch error:", e.message);
    return cachedGroqModels || [];
  }
}

// Cache Cerebras models in memory
let cachedCerebrasModels = null;
let cacheCerebrasTime = 0;

async function fetchCerebrasModels() {
  if (!CEREBRAS_KEY) return [];
  if (cachedCerebrasModels && Date.now() - cacheCerebrasTime < CACHE_TTL) return cachedCerebrasModels;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const r = await fetch("https://api.cerebras.ai/v1/models", {
      headers: {
        "Authorization": `Bearer ${CEREBRAS_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!r.ok) {
      console.error(`Cerebras models error ${r.status}`);
      return cachedCerebrasModels || [];
    }

    const data = await r.json();
    const models = (data.data || [])
      .map(m => ({
        id: m.id,
        label: m.id,
        provider: "cerebras",
        free: false,
        context_length: null,
      }));

    cachedCerebrasModels = models;
    cacheCerebrasTime = Date.now();
    return models;
  } catch (e) {
    console.error("Cerebras fetch error:", e.message);
    return cachedCerebrasModels || [];
  }
}
// Cache Meta models in memory
let cachedMetaModels = null;
let cacheMetaTime = 0;

async function fetchMetaModels() {
  if (!META_KEY) return META_MODELS;
  if (cachedMetaModels && Date.now() - cacheMetaTime < CACHE_TTL) return cachedMetaModels;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const r = await fetch("https://api.meta.ai/v1/models", {
      headers: {
        "Authorization": `Bearer ${META_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!r.ok) {
      console.error(`Meta models error ${r.status}`);
      return cachedMetaModels || META_MODELS;
    }

    const data = await r.json();
    const rawList = Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : [];
    const models = rawList
      .filter(m => {
        const id = (m.id || m.name || "").toLowerCase();
        return id.includes("muse-spark");
      })
      .map(m => ({
        id: m.id || m.name,
        label: m.displayName || m.name || m.id,
        provider: "meta",
        free: false,
        context_length: m.context_window || m.context_length || 1048576,
      }));

    const result = models.length > 0 ? models : META_MODELS;
    cachedMetaModels = result;
    cacheMetaTime = Date.now();
    return result;
  } catch (e) {
    console.error("Meta fetch error:", e.message);
    return cachedMetaModels || META_MODELS;
  }
}
// Cache Straitly models in memory
let cachedStraitlyModels = null;
let cacheStraitlyTime = 0;

async function fetchStraitlyModels() {
  if (!STRAITLY_KEY) return STRAITLY_MODELS;
  if (cachedStraitlyModels && Date.now() - cacheStraitlyTime < CACHE_TTL) return cachedStraitlyModels;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const r = await fetch(STRAITLY_URL, {
      headers: {
        "Authorization": `Bearer ${STRAITLY_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!r.ok) {
      console.error(`Straitly models error ${r.status}`);
      return cachedStraitlyModels || STRAITLY_MODELS;
    }

    const data = await r.json();
    const rawList = Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : [];
    const modelMap = {};
    for (const m of rawList) {
      const id = m.id || m.name;
      if (id) modelMap[id] = m;
    }
    const models = STRAITLY_MODELS.map(cm => {
      const remote = modelMap[cm.id];
      return {
        ...cm,
        context_length: remote?.context_window || remote?.context_length || null,
      };
    });
    const result = models;
    cachedStraitlyModels = result;
    cacheStraitlyTime = Date.now();
    return result;
  } catch (e) {
    console.error("Straitly fetch error:", e.message);
    return cachedStraitlyModels || STRAITLY_MODELS;
  }
}



export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const [geminiModels, openrouterModels, groqModels, cerebrasModels, metaModels, straitlyModels] = await Promise.all([
      fetchGeminiModels(),
      fetchOpenRouterModels(),
      fetchGroqModels(),
      fetchCerebrasModels(),
      fetchMetaModels(),
      fetchStraitlyModels(),
    ]);

    const finalGemini = [...geminiModels];
    if (!finalGemini.some(m => m.id === "gemini-flash-lite-latest")) {
      finalGemini.unshift({
        id: "gemini-flash-lite-latest",
        label: "Gemini Flash-Lite Latest",
        provider: "gemini",
        free: false,
        context_length: 1048576,
      });
    }

    const finalOR = [...openrouterModels];
    if (!finalOR.some(m => m.id === "google/gemini-flash-lite-latest")) {
      finalOR.push({
        id: "google/gemini-flash-lite-latest",
        label: "Google: Gemini Flash-Lite Latest",
        provider: "openrouter",
        free: false,
        context_length: 1048576,
      });
    }

    const models = [...DEEPSEEK_MODELS, ...finalGemini, ...finalOR, ...groqModels, ...cerebrasModels, ...metaModels, ...straitlyModels];
    return res.json({ models });
  } catch (e) {
    console.error("Models handler error:", e.message);
    return res.json({ models: [...DEEPSEEK_MODELS, ...META_MODELS, ...STRAITLY_MODELS] });
  }
}
