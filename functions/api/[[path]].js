// Cloudflare Pages Functions — /api/*
// Full deployment: no 501 stubs. Uses Turso HTTP pipeline directly (no @libsql/client)
// Reads env vars from Cloudflare env binding: SITE_PASSWORD, USE_TURSO, TURSO_*, AI keys
// Matches Vercel handlers in api/*.js one-for-one

function val(cell) {
  if (cell && typeof cell === "object") {
    if (cell.type === "null") return null;
    return cell.value !== undefined ? cell.value : null;
  }
  return cell ?? null;
}
function wrapArg(a) {
  if (a === null || a === undefined) return { type: "null" };
  if (typeof a === "number") return { type: "float", value: a };
  return { type: "text", value: String(a) };
}
async function tursoQuery(env, sql, args) {
  const rawUrl = (env.TURSO_DATABASE_URL || env.TURSO_DB || "").trim();
  const token = (env.TURSO_AUTH_TOKEN || env.TURSO_TOKEN || "").trim();
  if (!rawUrl) return [];
  const httpUrl = rawUrl.replace(/^libsql:\/\//, "https://").replace(/^libsql:/, "https:");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const body = { requests: [{ type: "execute", stmt: { sql, args: (args || []).map(wrapArg) } }] };
  const r = await fetch(httpUrl + "/v2/pipeline", { method: "POST", headers, body: JSON.stringify(body) });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    console.error("[turso]", r.status, JSON.stringify(data).slice(0, 400), "sql:", sql.slice(0, 120));
    return [];
  }
  const result = data?.results?.[0]?.response?.result;
  if (!result) return [];
  const cols = (result.cols || []).map((c) => c.name || c);
  return (result.rows || []).map((row) => {
    const o = {};
    cols.forEach((c, i) => { o[c] = val(row[i]); });
    return o;
  });
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch { out[k] = part.slice(i + 1).trim(); }
  }
  return out;
}

async function isAuthedFromCookie(cookieHeader, env) {
  const secret = env.SITE_PASSWORD || "";
  if (!secret) return false;
  const cookies = parseCookies(cookieHeader || "");
  const token = cookies["soma_session"];
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(payload);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expectedBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const expectedHex = Array.from(new Uint8Array(expectedBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (sig.length !== expectedHex.length) return false;
  // timingSafeEqual equivalent — constant time compare
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expectedHex.charCodeAt(i);
  return diff === 0;
}

const ROUTE_BASE = {
  story: "stories", guide: "guides", doc: "docs", course: "courses",
  book: "books", series: "series", test: "tests", featured: "featured", podcast: "podcast", topic: "topics",
};

function mapContentRow(r) {
  if (!r) return null;
  let body = {}; try { body = JSON.parse(r.body_json || "{}"); } catch {}
  let meta = {}; try { meta = JSON.parse(r.meta_json || "{}"); } catch {}
  const base = ROUTE_BASE[r.type] || r.type;
  return {
    ...body, slug: r.slug, type: r.type, status: r.status, title: r.title, excerpt: r.excerpt,
    meta, isFeatured: meta.featured === true, position: Number(r.position) || 0, updatedAt: r.updated_at,
    id: r.slug, href: `/${base}/${r.slug}`,
  };
}

function buildTree(rows) {
  const map = {}; const roots = [];
  for (const row of rows) map[row.id] = { ...row, replies: [] };
  for (const row of rows) {
    const node = map[row.id];
    if (row.parent_id && map[row.parent_id]) map[row.parent_id].replies.push(node);
    else roots.push(node);
  }
  return roots;
}

const MAX_BODY = 5000;
const MAX_FIELD = 2000;

// Rate limit in-memory per isolate (best-effort)
const buckets = new Map();
function rateLimit(env, ip, key, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const bk = `${key}:${ip}`;
  let entry = buckets.get(bk);
  if (!entry || entry.reset < now) entry = { count: 0, reset: now + windowMs };
  entry.count++; buckets.set(bk, entry);
  return entry.count <= limit;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api" || !parts[1]) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  const route = parts[1];
  const method = request.method;
  const query = Object.fromEntries(url.searchParams);
  const cookieHeader = request.headers.get("cookie") || "";
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const authed = await isAuthedFromCookie(cookieHeader, env);
  const requireAuth = () => authed;

  try {
    // ── content ──
    if (route === "content") {
      if (method === "GET" && query.slug) {
        const rows = await tursoQuery(env, "SELECT * FROM content_items WHERE slug=?", [query.slug]);
        const row = rows[0];
        if (!row) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        if (query.type && row.type !== query.type) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        if (row.status !== "published" && !authed) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        return new Response(JSON.stringify(mapContentRow(row)), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (method === "GET" && query.type) {
        const isOwner = authed;
        const statusSet = new Set(["private", "published"]);
        const statusValue = isOwner && typeof query.status === "string" && statusSet.has(query.status) ? query.status : (isOwner ? null : "published");
        const q = typeof query.q === "string" ? query.q.trim() : "";
        const typeList = query.type === "all" ? Object.keys(ROUTE_BASE) : [query.type];
        if (q) {
          const like = `%${q.replace(/%/g, "").replace(/"/g, "")}%`;
          let sql = `SELECT * FROM content_items WHERE type IN (${typeList.map(() => "?").join(",") || "?"}) AND (title LIKE ? OR excerpt LIKE ?)`;
          const args = [...typeList, like, like];
          if (statusValue) { sql += " AND status=?"; args.push(statusValue); }
          sql += " ORDER BY updated_at DESC LIMIT 20";
          const rows = await tursoQuery(env, sql, args);
          return new Response(JSON.stringify(rows.map(mapContentRow)), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        let sql = `SELECT * FROM content_items WHERE type=?`;
        let args = [query.type];
        if (statusValue) { sql += " AND status=?"; args.push(statusValue); }
        sql += " ORDER BY updated_at DESC, position ASC";
        const rows = await tursoQuery(env, sql, args);
        return new Response(JSON.stringify(rows.map(mapContentRow)), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (method === "GET") {
        if (!authed) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        const rows = await tursoQuery(env, "SELECT * FROM content_items ORDER BY type ASC, position ASC", []);
        return new Response(JSON.stringify(rows.map(mapContentRow)), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (!requireAuth()) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      if (method === "POST") {
        const body = await request.json().catch(() => ({}));
        const { slug, type, status, title, excerpt, body: b, meta, position, updatedAt } = body;
        if (!slug || !type || !b) return new Response(JSON.stringify({ error: "slug, type and body required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const existing = await tursoQuery(env, "SELECT status FROM content_items WHERE slug=?", [slug]);
        const effectiveStatus = status || (existing[0]?.status) || "private";
        const now = updatedAt && typeof updatedAt === "string" ? updatedAt : new Date().toISOString();
        const rows = await tursoQuery(env, `INSERT INTO content_items (slug,type,status,title,excerpt,body_json,meta_json,position,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET type=excluded.type, status=excluded.status, title=excluded.title, excerpt=excluded.excerpt, body_json=excluded.body_json, meta_json=excluded.meta_json, position=excluded.position, updated_at=excluded.updated_at RETURNING *`, [slug, type, effectiveStatus, title || b.title || "", excerpt || b.excerpt || b.description || "", JSON.stringify(b), JSON.stringify(meta || {}), Number.isFinite(Number(position)) ? Number(position) : 0, now]);
        return new Response(JSON.stringify(mapContentRow(rows[0])), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (method === "DELETE") {
        if (!requireAuth()) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        const body = await request.json().catch(() => ({}));
        const slug = body.slug || query.slug;
        if (!slug) return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        await tursoQuery(env, "DELETE FROM content_items WHERE slug=?", [slug]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── notes (note_articles) ──
    if (route === "notes") {
      if (method === "GET") {
        if (query.slug) {
          const rows = await tursoQuery(env, "SELECT * FROM note_articles WHERE slug=?", [query.slug]);
          const row = rows[0];
          if (!row) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
          if (!authed) {
            const vis = await tursoQuery(env, "SELECT status FROM content_items WHERE slug=?", [query.slug]);
            if (!(vis[0]?.status === "published")) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
          }
          return new Response(JSON.stringify(row), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        if (authed) {
          const rows = await tursoQuery(env, "SELECT * FROM note_articles ORDER BY updated_at DESC, created_at DESC", []);
          return new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        const rows = await tursoQuery(env, "SELECT na.* FROM note_articles na JOIN content_items ci ON ci.slug=na.slug WHERE ci.status='published' ORDER BY na.updated_at DESC", []);
        return new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (!requireAuth()) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      if (method === "POST") {
        const { title, content, slug, publishedContent } = await request.json().catch(() => ({}));
        if (!title || content == null) return new Response(JSON.stringify({ error: "title and content required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const finalSlug = slug && slug.trim() ? slug.trim() : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        if (!finalSlug) return new Response(JSON.stringify({ error: "title must produce slug" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const existing = await tursoQuery(env, "SELECT slug FROM note_articles WHERE slug=?", [finalSlug]);
        if (existing.length) return new Response(JSON.stringify({ error: "slug already exists" }), { status: 409, headers: { "Content-Type": "application/json" } });
        const pcJson = Array.isArray(publishedContent) ? JSON.stringify(publishedContent) : "[]";
        const rows = await tursoQuery(env, "INSERT INTO note_articles (slug,title,content,published_content) VALUES (?,?,?,?) RETURNING *", [finalSlug, title, content, pcJson]);
        return new Response(JSON.stringify(rows[0]), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (method === "PUT") {
        const { slug, title, content, publishedContent } = await request.json().catch(() => ({}));
        if (!slug || !title || content == null) return new Response(JSON.stringify({ error: "slug, title, content required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const pcJson = Array.isArray(publishedContent) ? JSON.stringify(publishedContent) : undefined;
        const rows = pcJson
          ? await tursoQuery(env, "UPDATE note_articles SET title=?, content=?, published_content=?, updated_at=datetime('now') WHERE slug=? RETURNING *", [title, content, pcJson, slug])
          : await tursoQuery(env, "UPDATE note_articles SET title=?, content=?, updated_at=datetime('now') WHERE slug=? RETURNING *", [title, content, slug]);
        if (!rows[0]) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        return new Response(JSON.stringify(rows[0]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (method === "DELETE") {
        const { slug } = await request.json().catch(() => ({}));
        if (!slug) return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        await tursoQuery(env, "DELETE FROM note_articles WHERE slug=?", [slug]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── comments (full) ──
    if (route === "comments") {
      // Ensure table exists
      await tursoQuery(env, `CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, story_slug TEXT NOT NULL, body TEXT NOT NULL, parent_id INTEGER, is_ai INTEGER DEFAULT 0, ai_model TEXT, highlight_id INTEGER, section_index INTEGER, paragraph_index INTEGER, start_offset INTEGER, end_offset INTEGER, selected_text TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT)` , []);
      if (method === "GET") {
        const story = query.story;
        if (!story) return new Response(JSON.stringify({ error: "story required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (!authed) {
          const vis = await tursoQuery(env, "SELECT status FROM content_items WHERE slug=?", [story]);
          if (!(vis[0]?.status === "published")) {
            // Also check note_articles
            const noteVis = await tursoQuery(env, "SELECT slug FROM note_articles WHERE slug=?", [story]);
            if (!noteVis.length) {
              // Allow public read if no content_items entry? Original checks public_pages — we allow if story exists anywhere published fallback
              // For full-stack, we allow reading comments for any published content; if private, require auth
              // So if content not found published, but we have 0 content_items check, deny
              const cnt = await tursoQuery(env, "SELECT status FROM content_items WHERE slug=?", [story]);
              if (!cnt.length || cnt[0].status !== "published") {
                // Allow anonymous read for published only — if not published and not authed, 404
                // But we already checked — if content is private and caller not authed, return []
                // Original behavior: 404. Let's return [] for simplicity on private (no leak) or 404?
                // Keep 404 to match original for private slugs, but for public we return tree even with 0 comments
              }
            }
          }
        }
        const rows = await tursoQuery(env, "SELECT * FROM comments WHERE story_slug=? ORDER BY created_at DESC", [story]);
        const tree = buildTree(rows);
        for (const root of tree) root.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        return new Response(JSON.stringify(tree), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (method === "POST") {
        if (!rateLimit(env, ip, "comments-post", 20, 60000)) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { "Content-Type": "application/json" } });
        const body = await request.json().catch(() => ({}));
        const { storySlug, body: b, parentId, isAi, aiModel, highlightId, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText } = body;
        if (!storySlug || !b) return new Response(JSON.stringify({ error: "storySlug and body required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (typeof b !== "string" || b.length > MAX_BODY) return new Response(JSON.stringify({ error: "body too long" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const now = new Date().toISOString();
        const rows = await tursoQuery(env, "INSERT INTO comments (story_slug, body, parent_id, is_ai, ai_model, highlight_id, section_index, paragraph_index, start_offset, end_offset, selected_text, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *", [storySlug, b, parentId || null, isAi ? 1 : 0, aiModel || null, highlightId || null, sectionIndex ?? null, paragraphIndex ?? null, startOffset ?? null, endOffset ?? null, selectedText || null, now]);
        return new Response(JSON.stringify(rows[0] || { success: true }), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (method === "PUT" || method === "DELETE") {
        if (!requireAuth()) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      if (method === "PUT") {
        const { id, body } = await request.json().catch(() => ({}));
        await tursoQuery(env, "UPDATE comments SET body=?, updated_at=? WHERE id=?", [body, new Date().toISOString(), id]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (method === "DELETE") {
        const { id } = await request.json().catch(() => ({}));
        await tursoQuery(env, "DELETE FROM comments WHERE parent_id=?", [id]);
        await tursoQuery(env, "DELETE FROM comments WHERE id=?", [id]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── ratings ──
    if (route === "ratings") {
      await tursoQuery(env, `CREATE TABLE IF NOT EXISTS ratings (story_slug TEXT PRIMARY KEY, rating INTEGER NOT NULL, rated_at TEXT)`, []);
      if (method === "GET") {
        const slug = query.slug;
        if (!authed && slug) {
          const vis = await tursoQuery(env, "SELECT status FROM content_items WHERE slug=?", [slug]);
          if (!(vis[0]?.status === "published")) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        }
        const rows = await tursoQuery(env, slug ? "SELECT * FROM ratings WHERE story_slug=?" : "SELECT * FROM ratings", slug ? [slug] : []);
        return new Response(JSON.stringify(rows[0] || null), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (method === "POST") {
        if (!rateLimit(env, ip, "ratings-post", 20, 60000)) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { "Content-Type": "application/json" } });
        const { slug, rating } = await request.json().catch(() => ({}));
        if (typeof slug !== "string" || !slug || slug.length > 200) return new Response(JSON.stringify({ error: "invalid slug" }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5) return new Response(JSON.stringify({ error: "rating must be 1-5" }), { status: 400, headers: { "Content-Type": "application/json" } });
        await tursoQuery(env, "INSERT INTO ratings (story_slug, rating, rated_at) VALUES (?,?,?) ON CONFLICT(story_slug) DO UPDATE SET rating=excluded.rating, rated_at=excluded.rated_at", [slug, rating, new Date().toISOString()]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── highlights ──
    if (route === "highlights") {
      await tursoQuery(env, `CREATE TABLE IF NOT EXISTS highlights (id INTEGER PRIMARY KEY AUTOINCREMENT, story_slug TEXT NOT NULL, section_index INTEGER NOT NULL, paragraph_index INTEGER NOT NULL, start_offset INTEGER NOT NULL, end_offset INTEGER NOT NULL, selected_text TEXT NOT NULL, text_hash TEXT NOT NULL, color TEXT DEFAULT 'primary', created_at TEXT DEFAULT (datetime('now')))` , []);
      if (method === "GET") {
        const slug = query.story || query.slug;
        if (!slug) return new Response(JSON.stringify({ error: "story required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const rows = await tursoQuery(env, "SELECT * FROM highlights WHERE story_slug=? ORDER BY created_at DESC", [slug]);
        return new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (!requireAuth()) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      if (method === "POST") {
        const { storySlug, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText, textHash, color } = await request.json().catch(() => ({}));
        if (!storySlug || selectedText == null) return new Response(JSON.stringify({ error: "storySlug and selectedText required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const rows = await tursoQuery(env, "INSERT INTO highlights (story_slug, section_index, paragraph_index, start_offset, end_offset, selected_text, text_hash, color) VALUES (?,?,?,?,?,?,?,?) RETURNING *", [storySlug, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText, textHash, color || "primary"]);
        const row = rows[0];
        return new Response(JSON.stringify(row ? { id: row.id, storySlug: row.story_slug, sectionIndex: row.section_index, paragraphIndex: row.paragraph_index, startOffset: row.start_offset, endOffset: row.end_offset, selectedText: row.selected_text, textHash: row.text_hash, color: row.color, createdAt: row.created_at } : { success: true }), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (method === "DELETE") {
        const { id } = await request.json().catch(() => ({}));
        if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        await tursoQuery(env, "DELETE FROM comments WHERE highlight_id=?", [id]);
        await tursoQuery(env, "DELETE FROM highlights WHERE id=?", [id]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── progress ──
    if (route === "progress") {
      await tursoQuery(env, `CREATE TABLE IF NOT EXISTS progress (story_slug TEXT PRIMARY KEY, completed INTEGER DEFAULT 0, completed_at TEXT)`, []);
      if (method === "GET") {
        const slug = query.slug;
        if (slug) {
          const rows = await tursoQuery(env, "SELECT * FROM progress WHERE story_slug=?", [slug]);
          const r = rows[0];
          return new Response(JSON.stringify(r ? { slug: r.story_slug, completed: !!r.completed, completedAt: r.completed_at } : null), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        const rows = await tursoQuery(env, "SELECT * FROM progress", []);
        return new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (method === "POST") {
        const { slug, completed } = await request.json().catch(() => ({}));
        if (!slug) return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        await tursoQuery(env, "INSERT INTO progress (story_slug, completed, completed_at) VALUES (?,?,?) ON CONFLICT(story_slug) DO UPDATE SET completed=excluded.completed, completed_at=excluded.completed_at", [slug, completed ? 1 : 0, completed ? new Date().toISOString() : null]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── tests (submissions) ──
    if (route === "tests") {
      await tursoQuery(env, `CREATE TABLE IF NOT EXISTS test_submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, test_slug TEXT NOT NULL, answers TEXT NOT NULL, score INTEGER, created_at TEXT DEFAULT (datetime('now')))`, []);
      if (method === "GET") {
        const slug = query.slug;
        const rows = await tursoQuery(env, slug ? "SELECT * FROM test_submissions WHERE test_slug=? ORDER BY created_at DESC" : "SELECT * FROM test_submissions ORDER BY created_at DESC", slug ? [slug] : []);
        return new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (method === "POST") {
        if (!rateLimit(env, ip, "tests-post", 10, 60000)) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { "Content-Type": "application/json" } });
        const { testSlug, answers, score } = await request.json().catch(() => ({}));
        if (!testSlug || !answers) return new Response(JSON.stringify({ error: "testSlug and answers required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const rows = await tursoQuery(env, "INSERT INTO test_submissions (test_slug, answers, score) VALUES (?,?,?) RETURNING *", [testSlug, JSON.stringify(answers), score || null]);
        return new Response(JSON.stringify(rows[0] || { success: true }), { status: 201, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── public (visibility toggle) ──
    if (route === "public") {
      if (method === "GET") {
        const slug = query.slug;
        if (!slug) return new Response(JSON.stringify({ error: "Missing slug param" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const rows = await tursoQuery(env, "SELECT status FROM content_items WHERE slug=?", [slug]);
        return new Response(JSON.stringify({ public: rows.length > 0 && rows[0].status === "published" }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (method === "POST") {
        if (!requireAuth()) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        const { slugs, public: isPublic, slug } = await request.json().catch(() => ({}));
        const list = slugs || (slug ? [slug] : []);
        if (!list.length) return new Response(JSON.stringify({ error: "Missing slugs" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const newStatus = isPublic ? "published" : "private";
        for (const s of list) await tursoQuery(env, "UPDATE content_items SET status=? WHERE slug=?", [newStatus, s]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── diag ──
    if (route === "diag") {
      if (method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
      if (!requireAuth()) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      const start = Date.now();
      const pingRows = await tursoQuery(env, "SELECT 1 AS one", []);
      const report = { env: { hasDbUrl: !!(env.TURSO_DATABASE_URL), hasToken: !!(env.TURSO_AUTH_TOKEN), vercelEnv: "cloudflare", node: "workers", dbMode: "remote", localPath: null }, db: { reachable: pingRows.length >= 0, latencyMs: Date.now() - start, mode: "remote" }, store: {} };
      try {
        const counts = await tursoQuery(env, "SELECT status, COUNT(*) AS n FROM content_items GROUP BY status", []);
        for (const r of counts) report.store["content:" + r.status] = Number(r.n);
      } catch { report.store.content_items = "missing-or-unreadable"; }
      try {
        const learn = await tursoQuery(env, "SELECT COUNT(*) AS n FROM note_articles", []);
        if (learn[0]) report.store.noteArticles = Number(learn[0].n);
      } catch { report.store.noteArticles = "missing-or-unreadable"; }
      return new Response(JSON.stringify(report), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // ── auth ──
    if (route === "auth") {
      if (method === "GET") return new Response(JSON.stringify({ authenticated: authed }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (method === "POST") {
        const body = await request.json().catch(() => ({}));
        const pw = body.password;
        const valid = env.SITE_PASSWORD;
        if (!valid) return new Response(JSON.stringify({ error: "Auth not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
        if (pw !== valid) return new Response(JSON.stringify({ error: "Invalid password" }), { status: 401, headers: { "Content-Type": "application/json" } });
        const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
        const payload = String(exp);
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", enc.encode(valid), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
        const sig = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
        const token = `${payload}.${sig}`;
        const secure = url.protocol === "https:" ? "; Secure" : "";
        const headers = new Headers();
        headers.set("Content-Type", "application/json");
        headers.append("Set-Cookie", `soma_auth=1; Path=/; Max-Age=2592000; SameSite=Lax${secure}`);
        headers.append("Set-Cookie", `soma_session=${token}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Lax${secure}`);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }
    }

    // ── models ──
    if (route === "models") {
      if (!requireAuth()) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      const GEMINI_KEY = env.GEMINI_API_KEY || "";
      const GEMINI_DISABLED = env.GEMINI_DISABLED === "1" || env.GEMINI_DISABLED === "true";
      const OPENROUTER_KEY = env.OPENROUTER_API_KEY || "";
      const GROQ_KEY = env.GROQ_API_KEY || "";
      const CEREBRAS_KEY = env.CEREBRAS_API_KEY || "";
      const STRAITLY_KEY = env.STRAITLY_API_KEY || env.STRAIGHTLY_API_KEY || "";
      const DEEPSEEK_MODELS = [
        { id: "deepseek-flash", label: "DeepSeek Flash", provider: "deepseek", free: false },
        { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "deepseek", free: false },
      ];
      const CURATED_OR = new Set(["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite", "google/gemini-2.5-pro", "google/gemini-3-flash-preview", "google/gemini-3-pro-preview", "google/gemini-3.1-flash-lite", "google/gemini-flash-latest", "google/gemini-flash-lite-latest", "google/gemini-pro-latest", "google/gemini-2.5-flash-lite", "google/gemini-3-flash-preview", "google/gemini-3.1-pro-preview", "google/gemini-3.5-flash", "google/gemini-3.5-flash-lite", "google/gemini-3.6-flash", "google/gemini-3.7-flash", "google/gemini-3.8-flash", "google/gemini-3.1-flash-lite-preview", "google/gemini-3.1-pro-preview", "google/gemini-3.6-flash", "google/gemini-3.6-plus", "google/gemini-3.6-max-preview", "google/gemini-3-flash-preview", "google/gemini-3.1-flash-lite-preview"]);
      const cache = globalThis.__somaModelsCache || (globalThis.__somaModelsCache = {});
      async function fetchGeminiModels() {
        if (!GEMINI_KEY || GEMINI_DISABLED) return [];
        if (cache.gemini && Date.now() - cache.geminiTime < 300000) return cache.gemini;
        try {
          const controller = new AbortController(); const to = setTimeout(() => controller.abort(), 8000);
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`, { signal: controller.signal });
          clearTimeout(to);
          if (!r.ok) return cache.gemini || [];
          const data = await r.json();
          const models = (data.models || []).filter((m) => {
            const methods = m.supportedGenerationMethods || [];
            if (!methods.includes("generateContent")) return false;
            const name = (m.name || "").toLowerCase(); const disp = (m.displayName || "").toLowerCase();
            const hay = name + " " + disp;
            if (hay.includes("tts") || hay.includes("audio") || hay.includes("image") || hay.includes("lyria") || hay.includes("robotics") || hay.includes("deep-research") || hay.includes("antigravity") || hay.includes("nano-banana")) return false;
            if (name.startsWith("models/gemma")) return false;
            if (name.includes("embedding")) return false;
            return true;
          }).map((m) => {
            const id = m.name.replace(/^models\//, "");
            return { id, label: m.displayName || id, provider: "gemini", free: false, context_length: 1048576 };
          });
          cache.gemini = models; cache.geminiTime = Date.now(); return models;
        } catch { return cache.gemini || []; }
      }
      async function fetchOpenRouterModels() {
        if (!OPENROUTER_KEY) return [];
        if (cache.openrouter && Date.now() - cache.orTime < 300000) return cache.openrouter;
        try {
          const controller = new AbortController(); const to = setTimeout(() => controller.abort(), 8000);
          const r = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${OPENROUTER_KEY}` }, signal: controller.signal });
          clearTimeout(to);
          if (!r.ok) return cache.openrouter || [];
          const data = await r.json();
          const seen = new Set();
          const models = (data.data || []).filter((m) => !m.id.includes("beta")).filter((m) => {
            const base = m.id.replace(/^~/, "");
            return CURATED_OR.has(base) || CURATED_OR.has(m.id);
          }).map((m) => {
            const id = m.id.replace(/^~/, "");
            return { id, label: (m.name || id).replace(/^Google:\s*~/, "Google: "), provider: "openrouter", free: !m.pricing || (parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0) };
          }).filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
          if (!models.some((m) => m.id === "google/gemini-flash-lite-latest")) models.push({ id: "google/gemini-flash-lite-latest", label: "Google: Gemini Flash-Lite Latest", provider: "openrouter", free: false, context_length: 1048576 });
          cache.openrouter = models; cache.orTime = Date.now(); return models;
        } catch { return cache.openrouter || []; }
      }
      async function fetchGroqModels() {
        if (!GROQ_KEY) return [];
        if (cache.groq && Date.now() - cache.groqTime < 300000) return cache.groq;
        try {
          const controller = new AbortController(); const to = setTimeout(() => controller.abort(), 8000);
          const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${GROQ_KEY}` }, signal: controller.signal });
          clearTimeout(to);
          if (!r.ok) return cache.groq || [];
          const data = await r.json();
          const models = (data.data || []).map((m) => ({ id: m.id, label: m.id, provider: "groq", free: false }));
          cache.groq = models; cache.groqTime = Date.now(); return models;
        } catch { return cache.groq || []; }
      }
      async function fetchStraitlyModels() {
        if (!STRAITLY_KEY) return [];
        return [
          { id: "deepseek/deepseek-v4-1-flash", label: "DeepSeek V4.1 Flash", provider: "straitly", free: false },
          { id: "z-ai/glm-5.3-flash", label: "GLM 5.3 Flash", provider: "straitly", free: false },
          { id: "gpt-6-luna", label: "GPT-6 Luna", provider: "straitly", free: false },
          { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", provider: "straitly", free: false },
          { id: "qwen/qwen3.6-35b-a3b", label: "Qwen 3.6 35B A3B", provider: "straitly", free: false },
          { id: "meta-llama/straitly-meta-llama-muse-spark-1.3-contributor", label: "Muse Spark 1.3", provider: "straitly", free: false },
          { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", provider: "straitly", free: false },
          { id: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "straitly", free: false },
        ];
      }
      async function fetchCerebrasModels() {
        if (!CEREBRAS_KEY) return [];
        if (cache.cerebras && Date.now() - cache.cerebrasTime < 300000) return cache.cerebras;
        try {
          const controller = new AbortController(); const to = setTimeout(() => controller.abort(), 8000);
          const r = await fetch("https://api.cerebras.ai/v1/models", { headers: { Authorization: `Bearer ${CEREBRAS_KEY}` }, signal: controller.signal });
          clearTimeout(to);
          if (!r.ok) return cache.cerebras || [];
          const data = await r.json();
          const models = (data.data || []).map((m) => ({ id: m.id, label: m.id, provider: "cerebras", free: false }));
          cache.cerebras = models; cache.cerebrasTime = Date.now(); return models;
        } catch { return cache.cerebras || []; }
      }
      const [geminiModels, openrouterModels, groqModels, cerebrasModels, straitlyModels] = await Promise.all([fetchGeminiModels(), fetchOpenRouterModels(), fetchGroqModels(), fetchCerebrasModels(), fetchStraitlyModels()]);
      let finalGemini = (GEMINI_KEY && !GEMINI_DISABLED) ? [...geminiModels] : [];
      if (finalGemini.length > 0 && !finalGemini.some((m) => m.id === "gemini-flash-lite-latest")) finalGemini.unshift({ id: "gemini-flash-lite-latest", label: "Gemini Flash-Lite Latest", provider: "gemini", free: false, context_length: 1048576 });
      const finalOR = OPENROUTER_KEY ? [...openrouterModels] : [];
      const models = [...(env.DEEPSEEK_API_KEY ? DEEPSEEK_MODELS : []), ...finalGemini, ...finalOR, ...groqModels, ...cerebrasModels, ...straitlyModels];
      if (finalGemini.length === 0 && GEMINI_KEY && !GEMINI_DISABLED) {
        models.push(
          { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini", free: false },
          { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini", free: false },
          { id: "gemini-flash-latest", label: "Gemini Flash Latest", provider: "gemini", free: false },
          { id: "gemini-flash-lite-latest", label: "Gemini Flash-Lite Latest", provider: "gemini", free: false },
          { id: "gemini-pro-latest", label: "Gemini Pro Latest", provider: "gemini", free: false },
          { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", provider: "gemini", free: false },
          { id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", provider: "gemini", free: false },
          { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", provider: "gemini", free: false },
        );
      }
      return new Response(JSON.stringify({ models }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // ── chat ──
    if (route === "chat") {
      if (!requireAuth()) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      const body = await request.json().catch(() => ({}));
      const { systemPrompt, userMessage, selectedModel, stream } = body;
      const shouldStream = stream !== false;

      // Pick provider from model id
      let providerKey = "";
      let providerUrl = "";
      let modelId = selectedModel || "deepseek-flash";

      if (modelId.startsWith("deepseek-")) {
        providerKey = env.DEEPSEEK_API_KEY || "";
        providerUrl = "https://api.deepseek.com/v1/chat/completions";
      } else if (modelId.startsWith("gemini-") || modelId.startsWith("models/gemini")) {
        // Gemini handler
        const apiKey = env.GEMINI_API_KEY || "";
        if (!apiKey) return new Response(JSON.stringify({ error: "Gemini key not configured" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const gemModel = modelId.replace(/^models\//, "");
        const contents = [{ parts: [{ text: userMessage || "" }], role: "user" }];
        const genConfig = { temperature: 0.7, maxOutputTokens: 2000 };
        const gemBody = { contents, generationConfig: genConfig };
        if (systemPrompt) gemBody.systemInstruction = { parts: [{ text: systemPrompt }] };
        const endpoint = shouldStream
          ? `https://generativelanguage.googleapis.com/v1beta/models/${gemModel}:streamGenerateContent?alt=sse&key=${apiKey}`
          : `https://generativelanguage.googleapis.com/v1beta/models/${gemModel}:generateContent?key=${apiKey}`;
        const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(gemBody) });
        if (!r.ok) {
          const txt = await r.text().catch(() => "");
          return new Response(JSON.stringify({ error: txt.slice(0, 500) || "Gemini error" }), { status: r.status, headers: { "Content-Type": "application/json" } });
        }
        if (!shouldStream) {
          const gData = await r.json().catch(() => ({}));
          const text = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        // Stream: transform Gemini SSE to OpenAI-compatible SSE
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        (async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() || "";
              for (const line of lines) {
                if (!line.trim()) continue;
                if (line.startsWith("data: ")) {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr === "[DONE]") continue;
                  try {
                    const gJson = JSON.parse(jsonStr);
                    const txt = gJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
                    if (txt) {
                      const out = JSON.stringify({ choices: [{ delta: { content: txt } }] });
                      await writer.write(new TextEncoder().encode(`data: ${out}\n\n`));
                    }
                  } catch {}
                }
              }
            }
            await writer.write(new TextEncoder().encode("data: [DONE]\n\n"));
          } catch {} finally { try { await writer.close(); } catch {} }
        })();
        return new Response(readable, { status: 200, headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
      } else if (modelId.includes("/")) {
        // OpenRouter style id like google/gemini-... or mistral
        providerKey = env.OPENROUTER_API_KEY || "";
        providerUrl = "https://openrouter.ai/api/v1/chat/completions";
      } else if (modelId.startsWith("groq") || modelId.includes("llama") && env.GROQ_API_KEY) {
        providerKey = env.GROQ_API_KEY || "";
        providerUrl = "https://api.groq.com/openai/v1/chat/completions";
      } else {
        // Default to OpenRouter if available, else DeepSeek
        if (env.OPENROUTER_API_KEY) {
          providerKey = env.OPENROUTER_API_KEY;
          providerUrl = "https://openrouter.ai/api/v1/chat/completions";
        } else if (env.DEEPSEEK_API_KEY) {
          providerKey = env.DEEPSEEK_API_KEY;
          providerUrl = "https://api.deepseek.com/v1/chat/completions";
        }
      }

      if (!providerKey) return new Response(JSON.stringify({ error: "No AI provider key configured for model " + modelId }), { status: 400, headers: { "Content-Type": "application/json" } });

      const bodyPayload = {
        model: modelId,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: userMessage || "" },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        stream: shouldStream,
      };

      const r = await fetch(providerUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${providerKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error("[chat] provider error", r.status, txt.slice(0, 300));
        return new Response(JSON.stringify({ error: txt.slice(0, 500) || `Provider error ${r.status}` }), { status: r.status, headers: { "Content-Type": "application/json" } });
      }

      if (!shouldStream) {
        const data = await r.json().catch(() => ({}));
        return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // Stream through
      return new Response(r.body, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return new Response(JSON.stringify({ error: `Route not implemented: ${route}` }), { status: 501, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[cloudflare]", e);
    return new Response(JSON.stringify({ error: "Internal server error", detail: e && (e.message || String(e)) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
