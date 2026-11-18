import { requireAuth } from "./_auth.js";
import { query, runPipeline, arg } from "./_db.js";

const PROVIDER_FIELDS = [
  "deepseek",
  "openrouter",
  "gemini",
  "groq",
  "cerebras",
  "straitly",
];

const KEY_PREFIX = "provider.";

/**
 * Read all keys from DB settings, falling back to env vars.
 *
 * Returns an object like { deepseek: "sk-...", openrouter: "sk-or-...", ... }
 * with the effective key for each provider (DB wins over env).
 *
 * Also returns the `sources` object so the API can report where each
 * key came from.
 *
 * This is the function chat.js and models.js should import instead of
 * reading process.env directly.
 */
export async function envKeysWithFallback() {
  const envVars = {
    deepseek: process.env.DEEPSEEK_API_KEY || "",
    openrouter: process.env.OPENROUTER_API_KEY || "",
    gemini: process.env.GEMINI_API_KEY || "",
    groq: process.env.GROQ_API_KEY || "",
    cerebras: process.env.CEREBRAS_API_KEY || "",
    straitly: process.env.STRAITLY_API_KEY || "",
  };

  // Try to read DB settings
  let dbKeys = {};
  try {
    for (const p of PROVIDER_FIELDS) {
      // Hardcoded key string — remote pipeline doesn't bind ? args correctly
      const rows = await query(
        `SELECT value FROM user_settings WHERE key = '${KEY_PREFIX}${p}'`,
      );
      if (rows.length > 0) {
        dbKeys[p] = rows[0].value;
      }
    }
  } catch (e) {
    console.warn("[debug][envKeys] DB query failed:", e?.message || e);
  }

  // Merge: DB wins over env
  const keys = { ...envVars };
  const sources = {};
  for (const p of PROVIDER_FIELDS) {
    if (dbKeys[p]) {
      keys[p] = dbKeys[p];
      sources[p] = "dashboard";
    } else {
      sources[p] = envVars[p] ? "env" : null;
    }
  }

  console.log("[debug][envKeys] keys:", Object.fromEntries(PROVIDER_FIELDS.map(p => [p, keys[p] ? `${keys[p].slice(0, 10)}...` : null])));
  console.log("[debug][envKeys] sources:", JSON.stringify(sources));

  return { keys, sources };
}

// ── Schema ─────────────────────────────────────────────────────────

const ENSURE_TABLE = `CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
)`;

// ── Handler ────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!requireAuth(req, res)) return;

  // Ensure user_settings table exists (content.js handles _migrations)
  try { await query(ENSURE_TABLE); } catch {}

  if (req.method === "GET") {
    const { keys, sources } = await envKeysWithFallback();

    // Read default model from settings
    let defaultModel = null;
    try {
      const rows = await query(
        `SELECT value FROM user_settings WHERE key = 'default_model'`,
      );
      if (rows.length > 0) defaultModel = rows[0].value;
    } catch {}

    // Only return whether a key exists and its source — never leak key material
    const providers = {};
    for (const p of PROVIDER_FIELDS) {
      providers[p] = {
        hasKey: !!keys[p],
        source: sources[p],
      };
    }

    return res.status(200).json({ providers, defaultModel });
  }

  if (req.method === "PUT") {
    const body = req.body || {};
    console.log("[debug][config] PUT /api/config body keys:", Object.keys(body), "has straitly:", !!body?.providers?.straitly);

    const stmts = [];

    // Save provider keys
    if (body.providers) {
      for (const p of PROVIDER_FIELDS) {
        const val = body.providers[p];
        if (val === undefined) continue;
        const provKey = `${KEY_PREFIX}${p}`;
        if (val && typeof val === "string" && val.trim()) {
          stmts.push({
            type: "execute",
            stmt: {
              sql: `INSERT INTO user_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
              args: [arg(provKey), arg(val.trim())],
            },
          });
        } else {
          stmts.push({
            type: "execute",
            stmt: {
              sql: `DELETE FROM user_settings WHERE key = ?`,
              args: [arg(provKey)],
            },
          });
        }
      }
    }

    // Save default model
    if (body.defaultModel !== undefined) {
      if (body.defaultModel && typeof body.defaultModel === "string" && body.defaultModel.trim()) {
        stmts.push({
          type: "execute",
          stmt: {
            sql: `INSERT INTO user_settings (key, value, updated_at) VALUES ('default_model', ?, datetime('now'))
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
            args: [arg(body.defaultModel.trim())],
          },
        });
      } else {
        stmts.push({
          type: "execute",
          stmt: {
            sql: `DELETE FROM user_settings WHERE key = 'default_model'`,
          },
        });
      }
    }

    if (stmts.length > 0) {
      try {
        await runPipeline(stmts);
        // Read back to confirm
        const check = await query(`SELECT value FROM user_settings WHERE key = 'provider.straitly'`);
        console.log("[debug][config] wrote", stmts.length, "stmts, readback provider.straitly =", check.length ? check[0].value?.slice(0, 10) + "..." : "NOT FOUND");
      } catch (e) {
        return res.status(500).json({ error: `Failed to save settings: ${e.message}` });
      }
    }

    // Return success only — never echo keys back
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}