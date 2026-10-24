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
      const story = req.query.story;
      if (!story) return res.status(400).json({ error: "story required" });

      const rows = await query(
        "SELECT * FROM highlights WHERE story_slug = ? ORDER BY section_index, paragraph_index, start_offset",
        [story]
      );

      // Also fetch inline comments for each highlight
      const highlightsWithComments = [];
      for (const h of rows) {
        const comments = await query(
          "SELECT * FROM comments WHERE highlight_id = ? ORDER BY created_at ASC",
          [h.id]
        );
        highlightsWithComments.push({
          id: h.id,
          storySlug: h.story_slug,
          sectionIndex: h.section_index,
          paragraphIndex: h.paragraph_index,
          startOffset: h.start_offset,
          endOffset: h.end_offset,
          selectedText: h.selected_text,
          textHash: h.text_hash,
          color: h.color,
          createdAt: h.created_at,
          comments: comments.map(c => ({
            id: c.id,
            storySlug: c.story_slug,
            body: c.body,
            parentId: c.parent_id,
            isAi: c.is_ai === 1,
            aiModel: c.ai_model,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          })),
        });
      }

      return res.json(highlightsWithComments);
    }

    if (req.method === "POST") {
      const { storySlug, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText, textHash, color } = req.body || {};
      if (!storySlug || selectedText == null) return res.status(400).json({ error: "storySlug and selectedText required" });

      const result = await query(
        "INSERT INTO highlights (story_slug, section_index, paragraph_index, start_offset, end_offset, selected_text, text_hash, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
        [storySlug, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText, textHash, color || "primary"]
      );
      const row = result[0];
      return res.status(201).json({
        id: row.id,
        storySlug: row.story_slug,
        sectionIndex: row.section_index,
        paragraphIndex: row.paragraph_index,
        startOffset: row.start_offset,
        endOffset: row.end_offset,
        selectedText: row.selected_text,
        textHash: row.text_hash,
        color: row.color,
        createdAt: row.created_at,
      });
    }

    if (req.method === "DELETE") {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: "id required" });

      // Cascade delete associated comments
      await query("DELETE FROM comments WHERE highlight_id = ?", [id]);
      await query("DELETE FROM highlights WHERE id = ?", [id]);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("Highlights handler error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
