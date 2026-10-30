import { requireAuth } from "./_auth.js";

const DB_URL = (process.env.TURSO_DATABASE_URL || process.env.TURSO_DB || "").replace("libsql://", "https://");
const TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "";
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_APP_ID || "";
const UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos";

async function query(sql, args) {
  args = args || [];
  const body = {
    requests: [{
      type: "execute",
      stmt: {
        sql: sql,
        args: args.map(a => {
          if (a === null || a === undefined) return { type: "null" };
          if (typeof a === "number") return { type: "integer", value: String(a) };
          return { type: "text", value: String(a) };
        })
      }
    }]
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const r = await fetch(DB_URL + "/v2/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await r.json();

    if (!r.ok) {
      console.error("Turso FAIL:", r.status, JSON.stringify(data).slice(0, 500));
      return [];
    }

    const result = data.results && data.results[0] && data.results[0].response && data.results[0].response.result;
    if (!result) {
      console.error("Unexpected Turso format:", JSON.stringify(data).slice(0, 300));
      return [];
    }

    const cols = (result.cols || []).map(function(c) { return c.name || c; });
    const rows = result.rows || [];
    return rows.map(function(row) {
      const obj = {};
      cols.forEach(function(c, i) {
        const cell = row[i];
        obj[c] = (cell && typeof cell === "object") ? (cell.type === "null" ? null : (cell.value !== undefined ? cell.value : null)) : (cell !== undefined ? cell : null);
      });
      return obj;
    });
  } catch (e) {
    console.error("Query error:", e.message);
    return [];
  }
}

export default async function handler(req, res) {
  try {
    // GET /api/public?slug=... : check if a slug is visible to the public.
    // Reads content_items.status directly — the single visibility gate.
    if (req.method === "GET") {
      // ── Unsplash search proxy (no auth required, public API) ──────
      if (req.query.unsplash === "search") {
        const q = (req.query.q || "").trim();
        if (!q || q.length > 200) return res.status(400).json({ error: "Missing or invalid query param 'q'" });

        if (!UNSPLASH_KEY) {
          return res.json({ results: [], total: 0, total_pages: 0, configured: false });
        }

        const page = Math.max(1, parseInt(req.query.page || "1", 10));
        const perPage = Math.min(30, Math.max(1, parseInt(req.query.per_page || "24", 10)));

        try {
          const url = new URL(UNSPLASH_SEARCH_URL);
          url.searchParams.set("query", q);
          url.searchParams.set("page", String(page));
          url.searchParams.set("per_page", String(perPage));

          const resp = await fetch(url.toString(), {
            headers: {
              Authorization: `Client-ID ${UNSPLASH_KEY}`,
              "Accept-Version": "v1",
            },
          });

          if (!resp.ok) {
            const body = await resp.text().catch(() => "");
            console.error(`Unsplash API error (${resp.status}): ${body}`);
            return res.status(502).json({ error: "Unsplash API request failed" });
          }

          const data = await resp.json();
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

          return res.json({ results, total: data.total || 0, total_pages: data.total_pages || 0, configured: true });
        } catch (err) {
          console.error("Unsplash search error:", err);
          return res.status(500).json({ error: "Internal server error" });
        }
      }

      // ── Unsplash config probe (check if search is configured) ─────
      if (req.query.unsplash === "probe") {
        return res.json({ configured: !!UNSPLASH_KEY });
      }

      // ── Public visibility check ───────────────────────────────────
      const slug = req.query.slug;
      if (!slug) return res.status(400).json({ error: "Missing slug param" });

      const rows = await query("SELECT status FROM content_items WHERE slug = ?", [slug]);
      const isPublic = rows.length > 0 && rows[0].status === "published";
      return res.json({ public: isPublic });
    }

    // POST /api/public : set public/private state for one or more slugs (owner only).
    // Updates content_items.status directly.
    if (req.method === "POST") {
      if (!requireAuth(req, res)) return;
      const { slugs, public: isPublic } = req.body || {};
      const slugList = slugs || (req.body.slug ? [req.body.slug] : []);
      if (!slugList.length) return res.status(400).json({ error: "Missing slugs" });
      const now = new Date().toISOString();
      const newStatus = isPublic ? "published" : "private";

      for (const slug of slugList) {
        if (isPublic) {
          await query(
            "UPDATE content_items SET status = ?, updated_at = ?, archived_at = COALESCE(archived_at, ?) WHERE slug = ?",
            [newStatus, now, now, slug]
          );
        } else {
          await query(
            "UPDATE content_items SET status = ?, updated_at = ?, archived_at = NULL WHERE slug = ?",
            [newStatus, now, slug]
          );
        }
      }

      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
