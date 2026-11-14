import { requireAuth } from "./_auth.js";
import { query as dbQuery, runPipeline, arg } from "./_db.js";
import { getTenantId } from "./_tenant.js";
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

// ── Path parsing ─────────────────────────────────────

function parsePath(url) {
  const path = (url || "").split("?")[0].split("#")[0];
  // /api/voice-profiles → {}, /api/voice-profiles/id → { id }, /api/voice-profiles/id/analyze → { id, action }
  const parts = path.split("/").filter(Boolean);
  // parts = ["api", "voice-profiles", ...]
  if (parts.length < 3 || parts[1] !== "voice-profiles") return {};
  const id = parts[2] || null;
  const action = parts[3] || null;
  return { id, action };
}

// ── Migration ────────────────────────────────────────

let _tableEnsured = false;

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS voice_profiles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  samples_json TEXT NOT NULL DEFAULT '[]',
  style_prompt TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
)`;

async function ensureTable() {
  if (_tableEnsured) return;
  try { await dbQuery(CREATE_TABLE); } catch {}
  _tableEnsured = true;
}

async function query(sql, args) {
  await ensureTable();
  return dbQuery(sql, args);
}

// ── Helpers ──────────────────────────────────────────

function mapRow(r) {
  if (!r) return null;
  let samples = [];
  try { samples = JSON.parse(r.samples_json || "[]"); } catch {}
  return {
    id: r.id,
    tenant_id: r.tenant_id,
    name: r.name,
    description: r.description,
    samples,
    style_prompt: r.style_prompt,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

function generateId() {
  return "vp_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const HUMANIZABLE_TYPES = new Set(["story", "guide", "doc", "featured"]);

// ── Analysis prompt builder ──────────────────────────

function buildAnalysisPrompt(samples) {
  const sampleText = samples.map((s, i) => `[Sample ${i + 1}]\n${s}`).join("\n\n");
  return {
    systemPrompt: "You are a writing style analyst. Given 3-5 writing samples from the same author, produce a concise style guide that captures:\n"
      + "1. Tone (formal/casual/conversational/authoritative, any specific voice rules from the Grokking Algorithms standard)\n"
      + "2. Sentence structure (short/punchy, long/flowing, varied, run-on tendency)\n"
      + "3. Vocabulary level (plain English, technical jargon, domain-specific terms)\n"
      + "4. Rhythm and flow (paragraph length, transition patterns, how they open)\n"
      + "5. Concrete examples, metaphors, and stakes: how does the author make ideas land?\n"
      + "6. What to ALWAYS avoid (em dashes? academic register? hedge openers?)\n"
      + "7. Force-ranked rules from most to least important\n\n"
      + "Output a plain-language style prompt. The goal: another LLM can read this prompt and rewrite new text to sound like the original author. Be specific: reference actual phrases from the samples. Output NOTHING else — no chat, no meta-commentary.",
    userMessage: `Analyze these writing samples and produce a style guide:\n\n${sampleText}`,
  };
}

// ── Endpoint handlers ────────────────────────────────

async function handleList(req, res) {
  const tenant_id = getTenantId(req);
  const rows = await query(
    "SELECT * FROM voice_profiles WHERE tenant_id = ? ORDER BY updated_at DESC",
    [tenant_id],
  );
  return res.json(rows.map(mapRow));
}

async function handleCreate(req, res) {
  const tenant_id = getTenantId(req);
  const { name, description, samples } = req.body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (!Array.isArray(samples)) {
    return res.status(400).json({ error: "samples must be an array of strings" });
  }
  if (samples.length < 1) {
    return res.status(400).json({ error: "at least one sample is required" });
  }

  const id = generateId();
  const now = new Date().toISOString();
  const samplesJson = JSON.stringify(samples);

  const rows = await query(
    `INSERT INTO voice_profiles (id, tenant_id, name, description, samples_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [id, tenant_id, name.trim(), (description || "").trim(), samplesJson, now, now],
  );
  return res.status(201).json(mapRow(rows[0]));
}

async function handleGet(req, res, id) {
  const tenant_id = getTenantId(req);
  const rows = await query(
    "SELECT * FROM voice_profiles WHERE id = ? AND tenant_id = ?",
    [id, tenant_id],
  );
  if (!rows || !rows.length) {
    return res.status(404).json({ error: "Voice profile not found" });
  }
  return res.json(mapRow(rows[0]));
}

async function handleUpdate(req, res, id) {
  const tenant_id = getTenantId(req);
  const existing = await query(
    "SELECT * FROM voice_profiles WHERE id = ? AND tenant_id = ?",
    [id, tenant_id],
  );
  if (!existing || !existing.length) {
    return res.status(404).json({ error: "Voice profile not found" });
  }

  const { name, description, samples } = req.body || {};
  const row = existing[0];

  const newName = typeof name === "string" && name.trim()
    ? name.trim()
    : row.name;
  const newDescription = typeof description === "string"
    ? description.trim()
    : row.description;
  let newSamplesJson = row.samples_json;
  let samplesChanged = false;

  if (Array.isArray(samples)) {
    newSamplesJson = JSON.stringify(samples);
    samplesChanged = true;
  }

  const now = new Date().toISOString();
  // If samples changed, clear the style_prompt so the user re-analyzes
  const newStylePrompt = samplesChanged ? "" : row.style_prompt;

  const rows = await query(
    `UPDATE voice_profiles
     SET name = ?, description = ?, samples_json = ?, style_prompt = ?, updated_at = ?
     WHERE id = ? AND tenant_id = ?
     RETURNING *`,
    [newName, newDescription, newSamplesJson, newStylePrompt, now, id, tenant_id],
  );
  const result = mapRow(rows[0]);
  result.samplesChanged = samplesChanged;
  return res.json(result);
}

async function handleDelete(req, res, id) {
  const tenant_id = getTenantId(req);
  await query(
    "DELETE FROM voice_profiles WHERE id = ? AND tenant_id = ?",
    [id, tenant_id],
  );
  return res.json({ success: true });
}

async function handleAnalyze(req, res, id) {
  const tenant_id = getTenantId(req);
  const rows = await query(
    "SELECT * FROM voice_profiles WHERE id = ? AND tenant_id = ?",
    [id, tenant_id],
  );
  if (!rows || !rows.length) {
    return res.status(404).json({ error: "Voice profile not found" });
  }

  const row = rows[0];
  let samples = [];
  try { samples = JSON.parse(row.samples_json || "[]"); } catch {}
  if (!samples.length) {
    return res.status(400).json({ error: "No samples to analyze. Add samples first." });
  }

  const { systemPrompt, userMessage } = buildAnalysisPrompt(samples);

  const result = await runChat({
    body: {
      systemPrompt,
      userMessage,
      stream: false,
      max_tokens: 4000,
    },
    keys: envKeys(),
    options: envOptions(),
  });

  let stylePrompt = "";
  if (result.kind === "json") {
    const body = result.body;
    stylePrompt = typeof body === "string"
      ? body
      : (body?.choices?.[0]?.message?.content || body?.content || "");
  } else if (result.kind === "error") {
    return res.status(502).json({ error: `Analysis failed: ${result.body?.error || "unknown error"}` });
  } else {
    return res.status(502).json({ error: "Unexpected response format from chat" });
  }

  if (!stylePrompt.trim()) {
    return res.status(502).json({ error: "Analysis returned empty style prompt" });
  }

  const now = new Date().toISOString();
  const updated = await query(
    `UPDATE voice_profiles SET style_prompt = ?, updated_at = ? WHERE id = ? RETURNING *`,
    [stylePrompt.trim(), now, id],
  );

  return res.json(mapRow(updated[0]));
}

async function handleHumanize(req, res) {
  const { profile_id, content_json, content_type } = req.body || {};
  if (!profile_id || !content_json || !content_type) {
    return res.status(400).json({ error: "profile_id, content_json, and content_type are required" });
  }

  if (!HUMANIZABLE_TYPES.has(content_type)) {
    return res.status(400).json({
      error: `Content type '${content_type}' is not supported for humanization. Supported types: ${[...HUMANIZABLE_TYPES].join(", ")}`,
    });
  }

  // Fetch profile
  const tenant_id = getTenantId(req);
  const rows = await query(
    "SELECT * FROM voice_profiles WHERE id = ? AND tenant_id = ?",
    [profile_id, tenant_id],
  );
  if (!rows || !rows.length) {
    return res.status(404).json({ error: "Voice profile not found" });
  }

  const profile = rows[0];
  if (!profile.style_prompt) {
    return res.status(400).json({ error: "Voice profile has not been analyzed yet. Click 'Analyze' first." });
  }

  // Parse the content JSON to validate
  let parsedContent;
  try {
    parsedContent = typeof content_json === "string" ? JSON.parse(content_json) : content_json;
  } catch {
    return res.status(400).json({ error: "Invalid content_json: not valid JSON" });
  }

  const humanizableFields = {
    story: "title, excerpt, intro, body, pullQuotes (text fields), sections (heading, paragraphs text fields)",
    guide: "title, excerpt, intro, body, sections (heading, paragraphs text fields)",
    doc:   "title, excerpt, sections (heading, content text fields)",
    featured: "title, excerpt, intro, body, pullQuotes (text fields), sections (heading, paragraphs text fields)",
  };

  const systemPrompt = [
    profile.style_prompt,
    "",
    "You are rewriting existing content to match the voice profile above.",
    "Keep EVERY fact, reference, source, and structural field. Change only tone, register, sentence structure, and flow.",
    "",
    "Content type: " + content_type,
    "\nText fields to rewrite:\n" + (humanizableFields[content_type] || "all text content"),
    "\nKeep all structural fields (slug, author, publishedAt, image, imageAlt, tags, sources, etc.) exactly as-is.",
    "\nRespond with valid JSON only — the same shape as the input, with text fields rewritten.",
  ].filter(Boolean).join("\n");

  const userMessage = [
    "Rewrite this content to match the voice profile. Keep every fact, every reference, every source, every structural field. Change only the tone, register, sentence structure, and flow to match the voice.",
    "",
    "CURRENT CONTENT:",
    JSON.stringify(parsedContent, null, 2),
    "",
    "Respond with the JSON object only.",
  ].join("\n");

  const result = await runChat({
    body: {
      systemPrompt,
      userMessage,
      stream: false,
      max_tokens: 8000,
    },
    keys: envKeys(),
    options: envOptions(),
  });

  let rewrittenRaw = "";
  if (result.kind === "json") {
    const body = result.body;
    rewrittenRaw = typeof body === "string"
      ? body
      : (body?.choices?.[0]?.message?.content || body?.content || "");
  } else if (result.kind === "error") {
    return res.status(502).json({ error: `Humanization failed: ${result.body?.error || "unknown error"}` });
  } else {
    // Stream response — read it (though we asked for non-stream)
    try {
      const reader = result.stream?.getReader();
      if (reader) {
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
        }
        rewrittenRaw = buf;
      }
    } catch {
      return res.status(502).json({ error: "Failed to read humanization response stream" });
    }
  }

  // Extract JSON from response
  let cleaned = rewrittenRaw.replace(/```json\s*/gi, "").replace(/```\s*$/gm, "").trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    return res.status(502).json({
      error: "Response did not contain valid JSON",
      raw: cleaned.slice(0, 2000),
    });
  }

  let rewrittenJson;
  try {
    rewrittenJson = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
  } catch (e) {
    return res.status(502).json({
      error: `Failed to parse rewritten content as JSON: ${e.message}`,
    });
  }

  return res.json({
    rewritten_json: JSON.stringify(rewrittenJson),
    reasoning: `Humanized using voice profile "${profile.name}"`,
  });
}

// ── Main handler ─────────────────────────────────────

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();

  // All voice profile endpoints mutate data or consume AI keys: auth required.
  if (!requireAuth(req, res)) return;

  // Parse path for sub-routes
  const { id, action } = parsePath(req.url);

  try {
    // Special: /api/voice-profiles/humanize (no id, action="humanize")
    // parsePath gives: parts = ["api","voice-profiles"], parts[3] = "humanize"
    // but that's actually id="humanize", action=null
    // Fix: check if id === "humanize" and there's no next segment
    if (id === "humanize" && !action) {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      return handleHumanize(req, res);
    }

    // With ID and action: /api/voice-profiles/:id/analyze
    if (id && action === "analyze") {
      if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
      return handleAnalyze(req, res, id);
    }

    // With ID: /api/voice-profiles/:id
    if (id) {
      if (req.method === "GET") return handleGet(req, res, id);
      if (req.method === "PUT") return handleUpdate(req, res, id);
      if (req.method === "DELETE") return handleDelete(req, res, id);
      return res.status(405).json({ error: "Method not allowed" });
    }

    // No ID: /api/voice-profiles
    if (req.method === "GET") return handleList(req, res);
    if (req.method === "POST") return handleCreate(req, res);

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Voice profiles handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}