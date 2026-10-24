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
    if (req.method === "GET") {
      const slug = req.query.slug;
      const result = await query(slug ? "SELECT * FROM ratings WHERE story_slug = ?" : "SELECT * FROM ratings", slug ? [slug] : []);
      return res.json(result[0] || null);
    }

    if (req.method === "POST") {
      const { slug, rating } = req.body || {};
      const now = new Date().toISOString();
      await query(
        "INSERT INTO ratings (story_slug, rating, rated_at) VALUES (?, ?, ?) ON CONFLICT(story_slug) DO UPDATE SET rating = excluded.rating, rated_at = excluded.rated_at",
        [slug, rating, now]
      );
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Handler error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
