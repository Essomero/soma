// Server-side provider key verification.
//
// The browser cannot verify Straitly (and some other providers) directly
// because their API responses lack CORS headers. This endpoint proxies the
// verification through the server.

import { requireAuth } from "./_auth.js";

const ENDPOINTS = {
  openrouter: "https://openrouter.ai/api/v1/models",
  deepseek: "https://api.deepseek.com/models",
  gemini: "https://generativelanguage.googleapis.com/v1beta/models",
  groq: "https://api.groq.com/openai/v1/models",
  cerebras: "https://api.cerebras.ai/v1/models",
  straitly: "https://api.straitly.ai/v1/models",
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!requireAuth(req, res)) return;

  const { provider, key } = req.body || {};
  if (!provider || !key) return res.status(400).json({ error: "provider and key are required" });

  const url = ENDPOINTS[provider];
  if (!url) return res.status(400).json({ error: `Unknown provider: ${provider}` });

  // Gemini passes the key as a query parameter, not a header.
  const fetchUrl = provider === "gemini" ? `${url}?key=${key}` : url;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const r = await fetch(fetchUrl, {
      headers: provider === "gemini"
        ? {}
        : { Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (r.ok) return res.json({ ok: true });

    if (r.status === 401) return res.json({ ok: false, error: "Invalid key — check it and try again" });
    if (r.status === 403) return res.json({ ok: false, error: "Key does not have access to this provider" });
    return res.json({ ok: false, error: `Provider returned ${r.status} — check your key` });
  } catch (e) {
    return res.json({ ok: false, error: "Could not reach provider — check your network" });
  }
}