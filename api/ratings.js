import { isAuthed } from "./_auth.js";
import { rateLimit } from "./_limits.js";
import { query } from "./_db.js";


// Fresh database (e.g. just provisioned via the Vercel integration):
// create the table on first request so reads/writes never hit
// "no such table". Safe on every cold start; IF NOT EXISTS makes it
// a no-op once the table is there. story_slug is the primary key
// because upserts address rows ON CONFLICT(story_slug).
let tablesReady = false;
async function ensureTables() {
  if (tablesReady) return;
  await query(`CREATE TABLE IF NOT EXISTS ratings (
    story_slug TEXT PRIMARY KEY,
    rating INTEGER NOT NULL,
    rated_at TEXT
  )`);
  tablesReady = true;
}

export default async function handler(req, res) {
  try {
    await ensureTables();
    if (req.method === "GET") {
      const slug = req.query.slug;
      // Personal-first: anonymous callers see ratings only for public pieces.
      // Owner session bypasses, same rule as comments and highlights.
      if (!isAuthed(req)) {
        if (slug) {
          const vis = await query("SELECT \"public\" FROM public_pages WHERE slug = ?", [slug]).catch(() => []);
          if (!(vis.length > 0 && vis[0].public == 1)) return res.status(404).json({ error: "Not found" });
        } else {
          return res.json((await query("SELECT r.* FROM ratings r JOIN public_pages pp ON pp.slug = r.story_slug WHERE pp.\"public\" = 1", []))[0] || null);
        }
      }
      const result = await query(slug ? "SELECT * FROM ratings WHERE story_slug = ?" : "SELECT * FROM ratings", slug ? [slug] : []);
      return res.json(result[0] || null);
    }

    if (req.method === "POST") {
      if (!rateLimit(req, res, { key: "ratings-post", limit: 20, windowMs: 60_000 })) return;
      const { slug, rating } = req.body || {};
      if (typeof slug !== "string" || !slug || slug.length > 200) return res.status(400).json({ error: "invalid slug" });
      if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: "rating must be 1-5" });
      const now = new Date().toISOString();
      await query(
        "INSERT INTO ratings (story_slug, rating, rated_at) VALUES (?, ?, ?) ON CONFLICT(story_slug) DO UPDATE SET rating = excluded.rating, rated_at = excluded.rated_at",
        [slug, rating, now]
      );
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
