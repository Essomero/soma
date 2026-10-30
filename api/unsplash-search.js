// ── Unsplash Search Proxy ────────────────────────────
// Server-side proxy so the Unsplash access key stays server-side.
// GET /api/unsplash-search?q=<keyword>
// Returns Unsplash search results (id, urls, alt_description).

// Accepts UNSPLASH_ACCESS_KEY or UNSPLASH_APP_ID (the Unsplash UI labels it "App ID").
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_APP_ID || "";
const UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!UNSPLASH_ACCESS_KEY) {
    return res.status(501).json({
      error: "Unsplash not configured",
      message: "Set UNSPLASH_ACCESS_KEY (or UNSPLASH_APP_ID) in your environment variables to enable cover image search.",
    });
  }

  const query = (req.query?.q || "").trim();
  if (!query || query.length > 200) {
    return res.status(400).json({ error: "Query parameter 'q' is required (max 200 chars)" });
  }

  const page = Math.max(1, parseInt(req.query?.page || "1", 10));
  const perPage = Math.min(30, Math.max(1, parseInt(req.query?.per_page || "20", 10)));

  try {
    const url = new URL(UNSPLASH_SEARCH_URL);
    url.searchParams.set("query", query);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));

    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        "Accept-Version": "v1",
      },
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      console.error(`Unsplash API error (${resp.status}): ${body}`);
      return res.status(502).json({ error: "Unsplash API request failed" });
    }

    const data = await resp.json();

    // Map to a minimal shape the client needs.
    const results = (data.results || []).map((photo) => ({
      id: photo.id,
      description: photo.alt_description || photo.description || "",
      blurHash: photo.blur_hash || null,
      user: { name: photo.user?.name || "Unknown" },
      urls: {
        small: photo.urls?.small || "",
        regular: photo.urls?.regular || "",
        raw: photo.urls?.raw || "",
      },
    }));

    return res.json({
      results,
      total: data.total || 0,
      total_pages: data.total_pages || 0,
    });
  } catch (err) {
    console.error("Unsplash search error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
