import { requireAuth } from "./_auth.js";
import { query, ping, getDbInfo } from "./_db.js";

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_APP_ID || "";
const UNSPLASH_SEARCH_URL = "https://api.unsplash.com/search/photos";

// ---- diag logic ----
async function handleDiag(_req, res) {
  const dbInfo = getDbInfo();
  const report = {
    env: {
      hasDbUrl: Boolean(process.env.TURSO_DATABASE_URL || process.env.TURSO_DB),
      hasToken: Boolean(process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN),
      vercelEnv: process.env.VERCEL_ENV || "local",
      node: process.version,
      dbMode: dbInfo.mode,
      localPath: dbInfo.localPath,
    },
    db: { reachable: false, latencyMs: null, mode: dbInfo.mode },
    store: {},
  };

  const pingRes = await ping();
  report.db.reachable = pingRes.ok;
  report.db.latencyMs = pingRes.latencyMs;
  if (!pingRes.ok) {
    report.db.error = pingRes.error || undefined;
    report.db.hint =
      dbInfo.mode === "local"
        ? "Local SQLite not reachable at " + (dbInfo.localPath || "unknown") + "."
        : "Check TURSO_DATABASE_URL / TURSO_AUTH_TOKEN on the deployment (no need to read values — just re-enter them).";
    return res.json(report);
  }

  try {
    const counts = await query("SELECT status, COUNT(*) AS n FROM content_items GROUP BY status", []);
    if (counts && counts.length) {
      for (const row of counts) report.store["content:" + row.status] = Number(row.n);
    }
  } catch {
    report.store.content_items = "missing-or-unreadable";
  }

  try {
    const learn = await query("SELECT COUNT(*) AS n FROM note_articles", []);
    if (learn && learn.length) report.store.noteArticles = Number(learn[0].n);
  } catch {
    report.store.noteArticles = "missing-or-unreadable";
  }

  return res.json(report);
}

// ---- public logic ----
async function handlePublic(req, res) {
  if (req.method === "GET") {
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

    if (req.query.unsplash === "probe") {
      return res.json({ configured: !!UNSPLASH_KEY });
    }

    const slug = req.query.slug;
    const typeQ = req.query.type;
    if (!slug) return res.status(400).json({ error: "Missing slug param" });

    let rows;
    if (typeQ) {
      rows = await query("SELECT status FROM content_items WHERE type = ? AND slug = ?", [typeQ, slug]);
    } else {
      rows = await query(
        "SELECT status FROM content_items WHERE slug = ? ORDER BY CASE WHEN type='featured' THEN 0 ELSE 1 END LIMIT 1",
        [slug],
      );
    }
    const isPublic = rows.length > 0 && rows[0].status === "published";
    return res.json({ public: isPublic });
  }

  if (req.method === "POST") {
    if (!requireAuth(req, res)) return;
    const { slugs, public: isPublic, type: defaultType } = req.body || {};
    const rawList = slugs || (req.body.slug ? [req.body.slug] : []);
    if (!rawList.length) return res.status(400).json({ error: "Missing slugs" });
    const now = new Date().toISOString();
    const newStatus = isPublic ? "published" : "private";

    const normalized = rawList
      .map((entry) => {
        if (typeof entry === "string") return { slug: entry, type: defaultType || null };
        if (entry && typeof entry === "object") return { slug: entry.slug, type: entry.type || defaultType || null };
        return { slug: String(entry), type: defaultType || null };
      })
      .filter((e) => !!e.slug);

    for (const { slug, type } of normalized) {
      if (type) {
        if (isPublic) {
          await query(
            "UPDATE content_items SET status = ?, updated_at = ?, archived_at = COALESCE(archived_at, ?) WHERE type = ? AND slug = ?",
            [newStatus, now, now, type, slug],
          );
        } else {
          await query(
            "UPDATE content_items SET status = ?, updated_at = ?, archived_at = NULL WHERE type = ? AND slug = ?",
            [newStatus, now, type, slug],
          );
        }
      } else {
        if (isPublic) {
          await query(
            "UPDATE content_items SET status = ?, updated_at = ?, archived_at = COALESCE(archived_at, ?) WHERE slug = ?",
            [newStatus, now, now, slug],
          );
        } else {
          await query(
            "UPDATE content_items SET status = ?, updated_at = ?, archived_at = NULL WHERE slug = ?",
            [newStatus, now, slug],
          );
        }
      }
    }

    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

function getSubRoute(req) {
  const raw = (req.url || "").toString();
  if (raw.includes("/api/diag") || raw.includes("/diag")) return "diag";
  if (raw.includes("/api/public") || raw.includes("/public")) return "public";
  // Unsplash requests come via /api/public?unsplash=... but after rewrite they land here;
  // detect by query params.
  if (req.query && (req.query.unsplash === "search" || req.query.unsplash === "probe")) return "public";
  // Default: if slug has no unsplash, disambiguate by checking if it looks like
  // public flow (slug param) vs diag (no slug). Diag has no slug.
  // Fallback — if method GET and no slug and no unsplash, treat as diag (owner health).
  // Otherwise public.
  if (req.method === "GET" && !req.query?.slug && !req.query?.unsplash) return "diag";
  return "public";
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") return res.status(204).end();

    const route = getSubRoute(req);

    if (route === "diag") {
      if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
      if (!requireAuth(req, res)) return;
      return handleDiag(req, res);
    }

    return handlePublic(req, res);
  } catch (e) {
    console.error("System handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
