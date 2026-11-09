import { requireAuth } from "./_auth.js";
import { query } from "./_db.js";
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_APP_ID || "";
const UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos";


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
      const typeQ = req.query.type;
      if (!slug) return res.status(400).json({ error: "Missing slug param" });

      let rows;
      if (typeQ) {
        rows = await query("SELECT status FROM content_items WHERE type = ? AND slug = ?", [typeQ, slug]);
      } else {
        // Prefer featured if dupe slug exists (legacy fallback)
        rows = await query(
          "SELECT status FROM content_items WHERE slug = ? ORDER BY CASE WHEN type='featured' THEN 0 ELSE 1 END LIMIT 1",
          [slug]
        );
      }
      const isPublic = rows.length > 0 && rows[0].status === "published";
      return res.json({ public: isPublic });
    }

    // POST /api/public : set public/private state for one or more slugs (owner only).
    // Updates content_items.status directly. Supports type-aware payload.
    if (req.method === "POST") {
      if (!requireAuth(req, res)) return;
      const { slugs, public: isPublic, type: defaultType } = req.body || {};
      const rawList = slugs || (req.body.slug ? [req.body.slug] : []);
      if (!rawList.length) return res.status(400).json({ error: "Missing slugs" });
      const now = new Date().toISOString();
      const newStatus = isPublic ? "published" : "private";

      // Normalize to [{slug,type?}]
      const normalized = rawList.map((entry) => {
        if (typeof entry === "string") return { slug: entry, type: defaultType || null };
        if (entry && typeof entry === "object") return { slug: entry.slug, type: entry.type || defaultType || null };
        return { slug: String(entry), type: defaultType || null };
      }).filter((e) => !!e.slug);

      for (const { slug, type } of normalized) {
        if (type) {
          if (isPublic) {
            await query(
              "UPDATE content_items SET status = ?, updated_at = ?, archived_at = COALESCE(archived_at, ?) WHERE type = ? AND slug = ?",
              [newStatus, now, now, type, slug]
            );
          } else {
            await query(
              "UPDATE content_items SET status = ?, updated_at = ?, archived_at = NULL WHERE type = ? AND slug = ?",
              [newStatus, now, type, slug]
            );
          }
        } else {
          // Legacy fallback: update all matching slugs
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
      }

      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
