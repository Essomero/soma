// ── Unsplash Config Check ────────────────────────────
// Lightweight endpoint: returns whether a search key is configured.
// The client uses this to gate the search button (direct URL input
// always works regardless).
// GET /api/unsplash-config → { configured: boolean }

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_APP_ID || "";

export default async function handler(req, res) {
  return res.json({ configured: !!UNSPLASH_ACCESS_KEY });
}