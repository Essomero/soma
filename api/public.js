import { requireAuth } from "./_auth.js";

const DB_URL = (process.env.TURSO_DATABASE_URL || process.env.TURSO_DB || "").replace("libsql://", "https://");
const TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "";

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
    // Ensure the table exists (self-healing : no manual migration needed)
    await query("CREATE TABLE IF NOT EXISTS public_pages (slug TEXT PRIMARY KEY, public INTEGER NOT NULL DEFAULT 0, set_at TEXT)", []);

    // GET /api/public?slug=... : check if a slug is public
    if (req.method === "GET") {
      const slug = req.query.slug;
      if (!slug) return res.status(400).json({ error: "Missing slug param" });

      const rows = await query("SELECT \"public\" FROM public_pages WHERE slug = ?", [slug]);
      // Turso returns INTEGER columns as strings : use == not ===
      const isPublic = rows.length > 0 && rows[0].public == 1;
      return res.json({ public: isPublic });
    }

    // POST /api/public : set public state for one or more slugs (owner only).
    // GET stays open: AuthGuard calls it to decide whether a slug renders.
    if (req.method === "POST") {
      if (!requireAuth(req, res)) return;
      const { slugs, public: isPublic } = req.body || {};
      const slugList = slugs || (req.body.slug ? [req.body.slug] : []);
      if (!slugList.length) return res.status(400).json({ error: "Missing slugs" });
      const now = new Date().toISOString();
      const val = isPublic ? 1 : 0;

      for (const slug of slugList) {
        await query(
          "INSERT INTO public_pages (slug, \"public\", set_at) VALUES (?, ?, ?) ON CONFLICT(slug) DO UPDATE SET \"public\" = excluded.\"public\", set_at = excluded.set_at",
          [slug, val, now]
        );
        // Content rows carry their own status column (read by /api/content);
        // the toggle writes both stores so route gate and data gate agree.
        // No content_items table yet (fresh DB, learn-only notes) → no-op.
        await query("UPDATE content_items SET status = ?, updated_at = ? WHERE slug = ?", [isPublic ? "published" : "private", now, slug]);
      }

      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
