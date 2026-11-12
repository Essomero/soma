// Netlify Function — /api/*
// Full deployment: no 501. Uses Turso HTTP /v2/pipeline
// Env vars in process.env: SITE_PASSWORD, USE_TURSO, TURSO_*, AI keys
// Returns {models: [...]} shape (not bare array) to match Vercel frontend expectation

import { runChat } from "../../shared/chat/core.js";
import { isTutorMode } from "../../shared/tutor/modes.js";

let commentsModeReady = false;

function chatKeys() {
  return {
    deepseek: process.env.DEEPSEEK_API_KEY || "",
    openrouter: process.env.OPENROUTER_API_KEY || "",
    gemini: process.env.GEMINI_API_KEY || "",
    groq: process.env.GROQ_API_KEY || "",
    cerebras: process.env.CEREBRAS_API_KEY || "",
    straitly:
      process.env.STRAITLY_API_KEY ||
      process.env.STRAIGHTLY_API_KEY ||
      process.env.STRIGHTLY_API_KEY ||
      "",
  };
}

function chatOptions() {
  return {
    geminiDisabled:
      process.env.GEMINI_DISABLED === "1" || process.env.GEMINI_DISABLED === "true",
    reasoningEffort: process.env.DEEPSEEK_REASONING_EFFORT,
    referer: "https://soma.mayanja.dev",
    title: "Soma",
  };
}

function chatResponse(result) {
  if (result.kind === "stream") {
    return new Response(result.stream, { status: result.status, headers: result.headers });
  }
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  });
}

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
async function tursoQuery(sql, args) {
  const rawUrl = (process.env.TURSO_DATABASE_URL || process.env.TURSO_DB || "").trim();
  const token = (process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "").trim();
  if (!rawUrl) return [];
  const httpUrl = rawUrl.replace(/^libsql:\/\//, "https://").replace(/^libsql:/, "https:");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  const body = { requests: [{ type: "execute", stmt: { sql, args: (args || []).map(wrapArg) } }] };
  const r = await fetch(httpUrl + "/v2/pipeline", { method: "POST", headers, body: JSON.stringify(body) });
  const data = await r.json().catch(() => null);
  if (!r.ok) return [];
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
function isAuthedFromCookie(cookieHeader) {
  const secret = process.env.SITE_PASSWORD || "";
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
  try {
    const { createHmac } = require("node:crypto");
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (sig.length !== expected.length) return false;
    return sig === expected;
  } catch { return sig.length > 20; }
}
const ROUTE_BASE = { story: "stories", guide: "guides", doc: "docs", course: "courses", book: "books", series: "series", test: "tests", featured: "featured", podcast: "podcast", topic: "topics" };
function mapContentRow(r) {
  if (!r) return null;
  let body = {}; try { body = JSON.parse(r.body_json || "{}"); } catch {}
  let meta = {}; try { meta = JSON.parse(r.meta_json || "{}"); } catch {}
  const base = ROUTE_BASE[r.type] || r.type;
  return { ...body, slug: r.slug, type: r.type, status: r.status, title: r.title, excerpt: r.excerpt, meta, isFeatured: meta.featured === true, position: Number(r.position) || 0, updatedAt: r.updated_at, id: r.slug, href: `/${base}/${r.slug}` };
}
function mapCommentRow(row) {
  return {
    id: row.id,
    storySlug: row.story_slug,
    body: row.body,
    parentId: row.parent_id,
    isAi: row.is_ai === 1 || row.is_ai === "1" || row.is_ai === true,
    aiModel: row.ai_model,
    mode: row.mode,
    highlightId: row.highlight_id,
    sectionIndex: row.section_index,
    paragraphIndex: row.paragraph_index,
    startOffset: row.start_offset,
    endOffset: row.end_offset,
    selectedText: row.selected_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function buildTree(rows) {
  const map = {}; const roots = [];
  const mapped = rows.map(mapCommentRow);
  for (const row of mapped) map[row.id] = { ...row, replies: [] };
  for (const row of mapped) {
    const node = map[row.id];
    if (row.parentId && map[row.parentId]) map[row.parentId].replies.push(node);
    else roots.push(node);
  }
  return roots;
}
const MAX_BODY = 5000;
const buckets = new Map();
function rateLimit(ip, key, limit = 10, windowMs = 60000) {
  const now = Date.now(); const bk = `${key}:${ip}`;
  let entry = buckets.get(bk);
  if (!entry || entry.reset < now) entry = { count: 0, reset: now + windowMs };
  entry.count++; buckets.set(bk, entry);
  return entry.count <= limit;
}

export default async (req, context) => {
  const url = new URL(req.url);
  const path = url.pathname;
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "api" || !parts[1]) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  const route = parts[1];
  const query = Object.fromEntries(url.searchParams);
  const cookieHeader = req.headers.get("cookie") || "";
  const authed = isAuthedFromCookie(cookieHeader);
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  try {
    const tenant_id = req.headers.get("x-tenant-id") || "default";

    if (route === "content") {
      if (req.method === "GET" && query.slug) {
        let rows;
        if (query.type) {
          rows = await tursoQuery("SELECT * FROM content_items WHERE tenant_id=? AND type=? AND slug=?", [tenant_id, query.type, query.slug]);
        } else {
          rows = await tursoQuery("SELECT * FROM content_items WHERE tenant_id=? AND slug=? ORDER BY CASE WHEN type='featured' THEN 0 ELSE 1 END LIMIT 1", [tenant_id, query.slug]);
        }
        const row = rows[0];
        if (!row) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        if (row.status !== "published" && !authed) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        return new Response(JSON.stringify(mapContentRow(row)), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (req.method === "GET" && query.type) {
        const isOwner = authed;
        const statusSet = new Set(["private", "published"]);
        const statusValue = isOwner && typeof query.status === "string" && statusSet.has(query.status) ? query.status : (isOwner ? null : "published");
        const q = typeof query.q === "string" ? query.q.trim() : "";
        const typeList = query.type === "all" ? Object.keys(ROUTE_BASE) : [query.type];
        if (q) {
          const like = `%${q.replace(/%/g, "").replace(/"/g, "")}%`;
          let sql = `SELECT * FROM content_items WHERE tenant_id=? AND type IN (${typeList.map(() => "?").join(",") || "?"}) AND (title LIKE ? OR excerpt LIKE ?)`;
          const args = [tenant_id, ...typeList, like, like];
          if (statusValue) { sql += " AND status=?"; args.push(statusValue); }
          sql += " ORDER BY updated_at DESC LIMIT 20";
          const rows = await tursoQuery(sql, args);
          return new Response(JSON.stringify(rows.map(mapContentRow)), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        let sql = `SELECT * FROM content_items WHERE tenant_id=? AND type=?`;
        let args = [tenant_id, query.type];
        if (statusValue) { sql += " AND status=?"; args.push(statusValue); }
        sql += " ORDER BY updated_at DESC, position ASC";
        const rows = await tursoQuery(sql, args);
        return new Response(JSON.stringify(rows.map(mapContentRow)), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (req.method === "GET") {
        if (!authed) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        const rows = await tursoQuery("SELECT * FROM content_items WHERE tenant_id=? ORDER BY type ASC, position ASC", [tenant_id]);
        return new Response(JSON.stringify(rows.map(mapContentRow)), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (!authed) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const { slug, type, status, title, excerpt, body: b, meta, position, updatedAt } = body;
        if (!slug || !type || !b) return new Response(JSON.stringify({ error: "slug, type and body required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const existing = await tursoQuery("SELECT status FROM content_items WHERE tenant_id=? AND type=? AND slug=?", [tenant_id, type, slug]);
        const effectiveStatus = status || (existing[0]?.status) || "private";
        const now = updatedAt && typeof updatedAt === "string" ? updatedAt : new Date().toISOString();
        const rows = await tursoQuery(`INSERT INTO content_items (tenant_id,slug,type,status,title,excerpt,body_json,meta_json,position,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(tenant_id, type, slug) DO UPDATE SET status=excluded.status, title=excluded.title, excerpt=excluded.excerpt, body_json=excluded.body_json, meta_json=excluded.meta_json, position=excluded.position, updated_at=excluded.updated_at RETURNING *`, [tenant_id, slug, type, effectiveStatus, title || b.title || "", excerpt || b.excerpt || b.description || "", JSON.stringify(b), JSON.stringify(meta || {}), Number.isFinite(Number(position)) ? Number(position) : 0, now]);
        return new Response(JSON.stringify(mapContentRow(rows[0])), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (req.method === "DELETE") {
        const body = await req.json().catch(() => ({}));
        const slug = body.slug || query.slug;
        const type = body.type || query.type;
        if (!slug) return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (type) {
          await tursoQuery("DELETE FROM content_items WHERE tenant_id=? AND type=? AND slug=?", [tenant_id, type, slug]);
        } else {
          await tursoQuery("DELETE FROM content_items WHERE tenant_id=? AND slug=?", [tenant_id, slug]);
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    if (route === "notes") {
      // Merged into api/social.js on Vercel; Netlify functions keep their own
      // Turso-pipeline implementation, so the route has to exist here too.
      // scripts/check-api-routes.mjs fails the build if a route is missing.
      await tursoQuery(`CREATE TABLE IF NOT EXISTS note_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL DEFAULT 'default',
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        published_content TEXT DEFAULT '[]',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT,
        UNIQUE(tenant_id, slug)
      )`, []);
      const send = (data, status = 200) =>
        new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
      const mapNote = (row) => {
        let publishedContent = [];
        try { publishedContent = JSON.parse(row.published_content || "[]"); } catch {}
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          content: row.content,
          publishedContent: Array.isArray(publishedContent) ? publishedContent : [],
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      };
      if (req.method === "GET") {
        const slug = query.slug;
        if (slug) {
          const rows = await tursoQuery("SELECT * FROM note_articles WHERE tenant_id=? AND slug=?", [tenant_id, slug]);
          if (!rows[0]) return send({ error: "Not found" }, 404);
          if (!authed) {
            const vis = await tursoQuery('SELECT "public" FROM public_pages WHERE slug=?', [slug]);
            if (!(vis.length > 0 && vis[0].public == 1)) return send({ error: "Not found" }, 404);
          }
          return send(mapNote(rows[0]));
        }
        const q = typeof query.q === "string" ? query.q.trim() : "";
        const like = q ? `%${q.replace(/%/g, "").replace(/"/g, "")}%` : "";
        const rows = q
          ? authed
            ? await tursoQuery("SELECT * FROM note_articles WHERE tenant_id=? AND (title LIKE ? OR content LIKE ?) ORDER BY updated_at DESC, created_at DESC LIMIT 20", [tenant_id, like, like])
            : await tursoQuery('SELECT la.* FROM note_articles la JOIN public_pages pp ON pp.slug = la.slug WHERE la.tenant_id=? AND pp."public" = 1 AND (la.title LIKE ? OR la.content LIKE ?) ORDER BY la.updated_at DESC, la.created_at DESC LIMIT 20', [tenant_id, like, like])
          : authed
            ? await tursoQuery("SELECT * FROM note_articles WHERE tenant_id=? ORDER BY updated_at DESC, created_at DESC", [tenant_id])
            : await tursoQuery('SELECT la.* FROM note_articles la JOIN public_pages pp ON pp.slug = la.slug WHERE la.tenant_id=? AND pp."public" = 1 ORDER BY la.updated_at DESC, la.created_at DESC', [tenant_id]);
        return send(rows.map(mapNote));
      }
      if (!authed) return send({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => ({}));
      if (req.method === "POST") {
        const { title, content, slug: rawSlug, publishedContent } = body;
        if (!title || content == null) return send({ error: "title and content required" }, 400);
        const finalSlug = rawSlug && rawSlug.trim()
          ? rawSlug.trim()
          : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        if (!finalSlug) return send({ error: "title must produce a slug" }, 400);
        const existing = await tursoQuery("SELECT slug FROM note_articles WHERE tenant_id=? AND slug=?", [tenant_id, finalSlug]);
        if (existing.length) return send({ error: "slug already exists" }, 409);
        const pcJson = Array.isArray(publishedContent) ? JSON.stringify(publishedContent) : "[]";
        const rows = await tursoQuery("INSERT INTO note_articles (tenant_id, slug, title, content, published_content) VALUES (?,?,?,?,?) RETURNING *", [tenant_id, finalSlug, title, content, pcJson]);
        return send(mapNote(rows[0]), 201);
      }
      if (req.method === "PUT") {
        const { slug, title, content, publishedContent } = body;
        if (!slug || !title || content == null) return send({ error: "slug, title and content required" }, 400);
        const pcJson = Array.isArray(publishedContent) ? JSON.stringify(publishedContent) : null;
        const rows = pcJson
          ? await tursoQuery("UPDATE note_articles SET title=?, content=?, published_content=?, updated_at=datetime('now') WHERE tenant_id=? AND slug=? RETURNING *", [title, content, pcJson, tenant_id, slug])
          : await tursoQuery("UPDATE note_articles SET title=?, content=?, updated_at=datetime('now') WHERE tenant_id=? AND slug=? RETURNING *", [title, content, tenant_id, slug]);
        if (!rows[0]) return send({ error: "Not found" }, 404);
        return send(mapNote(rows[0]));
      }
      if (req.method === "DELETE") {
        const { slug } = body;
        if (!slug) return send({ error: "slug required" }, 400);
        await tursoQuery("DELETE FROM comments WHERE tenant_id=? AND story_slug=?", [tenant_id, slug]);
        await tursoQuery("DELETE FROM highlights WHERE tenant_id=? AND story_slug=?", [tenant_id, slug]);
        await tursoQuery("DELETE FROM note_articles WHERE tenant_id=? AND slug=?", [tenant_id, slug]);
        return send({ success: true });
      }
      return send({ error: "Method not allowed" }, 405);
    }

    if (route === "comments") {
      await tursoQuery(`CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'default', story_slug TEXT NOT NULL, body TEXT NOT NULL, parent_id INTEGER, is_ai INTEGER DEFAULT 0, ai_model TEXT, mode TEXT, highlight_id INTEGER, section_index INTEGER, paragraph_index INTEGER, start_offset INTEGER, end_offset INTEGER, selected_text TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT)`, []);
      if (!commentsModeReady) {
        try {
          await tursoQuery("ALTER TABLE comments ADD COLUMN mode TEXT", []);
        } catch {
          // Column already exists — safe to ignore
        }
        commentsModeReady = true;
      }
      if (req.method === "GET") {
        const story = query.story;
        if (!story) return new Response(JSON.stringify({ error: "story required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const rows = await tursoQuery("SELECT * FROM comments WHERE tenant_id=? AND story_slug=? ORDER BY created_at DESC", [tenant_id, story]);
        const tree = buildTree(rows);
        for (const root of tree) root.replies.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        return new Response(JSON.stringify(tree), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (req.method === "POST") {
        if (!rateLimit(ip, "comments-post", 20, 60000)) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { "Content-Type": "application/json" } });
        const body = await req.json().catch(() => ({}));
        const { storySlug, body: b, parentId, isAi, aiModel, mode, highlightId, sectionIndex, paragraphIndex, startOffset, endOffset, selectedText } = body;
        if (!storySlug || !b) return new Response(JSON.stringify({ error: "storySlug and body required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (typeof b !== "string" || b.length > MAX_BODY) return new Response(JSON.stringify({ error: "body too long" }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (mode != null && !isTutorMode(mode)) return new Response(JSON.stringify({ error: "invalid mode" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const rows = await tursoQuery("INSERT INTO comments (tenant_id, story_slug, body, parent_id, is_ai, ai_model, mode, highlight_id, section_index, paragraph_index, start_offset, end_offset, selected_text, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING *", [tenant_id, storySlug, b, parentId || null, isAi ? 1 : 0, aiModel || null, mode ?? null, highlightId || null, sectionIndex ?? null, paragraphIndex ?? null, startOffset ?? null, endOffset ?? null, selectedText || null, new Date().toISOString()]);
        const created = rows[0];
        return new Response(JSON.stringify(created ? mapCommentRow(created) : { success: true }), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (req.method === "PUT" || req.method === "DELETE") {
        if (!authed) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      }
      if (req.method === "PUT") {
        const { id, body } = await req.json().catch(() => ({}));
        await tursoQuery("UPDATE comments SET body=?, updated_at=? WHERE tenant_id=? AND id=?", [body, new Date().toISOString(), tenant_id, id]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (req.method === "DELETE") {
        const { id } = await req.json().catch(() => ({}));
        await tursoQuery("DELETE FROM comments WHERE tenant_id=? AND parent_id=?", [tenant_id, id]);
        await tursoQuery("DELETE FROM comments WHERE tenant_id=? AND id=?", [tenant_id, id]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    if (route === "ratings") {
      await tursoQuery(`CREATE TABLE IF NOT EXISTS ratings (tenant_id TEXT NOT NULL DEFAULT 'default', story_slug TEXT NOT NULL, rating INTEGER NOT NULL, rated_at TEXT, PRIMARY KEY (tenant_id, story_slug))`, []);
      if (req.method === "GET") {
        const slug = query.slug;
        const rows = await tursoQuery(slug ? "SELECT * FROM ratings WHERE tenant_id=? AND story_slug=?" : "SELECT * FROM ratings WHERE tenant_id=?", slug ? [tenant_id, slug] : [tenant_id]);
        return new Response(JSON.stringify(rows[0] || null), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (req.method === "POST") {
        if (!rateLimit(ip, "ratings-post", 20, 60000)) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { "Content-Type": "application/json" } });
        const { slug, rating } = await req.json().catch(() => ({}));
        if (typeof slug !== "string" || !slug || slug.length > 200) return new Response(JSON.stringify({ error: "invalid slug" }), { status: 400, headers: { "Content-Type": "application/json" } });
        if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5) return new Response(JSON.stringify({ error: "rating must be 1-5" }), { status: 400, headers: { "Content-Type": "application/json" } });
        await tursoQuery("INSERT INTO ratings (tenant_id, story_slug, rating, rated_at) VALUES (?,?,?,?) ON CONFLICT(tenant_id, story_slug) DO UPDATE SET rating=excluded.rating, rated_at=excluded.rated_at", [tenant_id, slug, rating, new Date().toISOString()]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    if (route === "highlights") {
      await tursoQuery(`CREATE TABLE IF NOT EXISTS highlights (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'default', story_slug TEXT NOT NULL, section_index INTEGER NOT NULL, paragraph_index INTEGER NOT NULL, start_offset INTEGER NOT NULL, end_offset INTEGER NOT NULL, selected_text TEXT NOT NULL, text_hash TEXT NOT NULL, color TEXT DEFAULT 'primary', created_at TEXT DEFAULT (datetime('now')))`, []);
      if (req.method === "GET") {
        const slug = query.story || query.slug;
        if (!slug) return new Response(JSON.stringify({ error: "story required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const rows = await tursoQuery("SELECT * FROM highlights WHERE tenant_id=? AND story_slug=? ORDER BY created_at DESC", [tenant_id, slug]);
        return new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (!authed) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      if (req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        if (!b.storySlug || b.selectedText == null) return new Response(JSON.stringify({ error: "storySlug and selectedText required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const rows = await tursoQuery("INSERT INTO highlights (tenant_id, story_slug, section_index, paragraph_index, start_offset, end_offset, selected_text, text_hash, color) VALUES (?,?,?,?,?,?,?,?,?) RETURNING *", [tenant_id, b.storySlug, b.sectionIndex, b.paragraphIndex, b.startOffset, b.endOffset, b.selectedText, b.textHash, b.color || "primary"]);
        return new Response(JSON.stringify(rows[0] || { success: true }), { status: 201, headers: { "Content-Type": "application/json" } });
      }
      if (req.method === "DELETE") {
        const { id } = await req.json().catch(() => ({}));
        await tursoQuery("DELETE FROM highlights WHERE tenant_id=? AND id=?", [tenant_id, id]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    if (route === "progress") {
      await tursoQuery(`CREATE TABLE IF NOT EXISTS progress (tenant_id TEXT NOT NULL DEFAULT 'default', story_slug TEXT NOT NULL, completed INTEGER DEFAULT 0, completed_at TEXT, PRIMARY KEY (tenant_id, story_slug))`, []);
      if (req.method === "GET") {
        if (query.slug) {
          const rows = await tursoQuery("SELECT * FROM progress WHERE tenant_id=? AND story_slug=?", [tenant_id, query.slug]);
          const r = rows[0];
          return new Response(JSON.stringify(r ? { slug: r.story_slug, completed: !!r.completed, completedAt: r.completed_at } : null), { status: 200, headers: { "Content-Type": "application/json" } });
        }
        const rows = await tursoQuery("SELECT * FROM progress WHERE tenant_id=?", [tenant_id]);
        return new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (req.method === "POST") {
        const { slug, completed } = await req.json().catch(() => ({}));
        if (!slug) return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        await tursoQuery("INSERT INTO progress (tenant_id, story_slug, completed, completed_at) VALUES (?,?,?,?) ON CONFLICT(tenant_id, story_slug) DO UPDATE SET completed=excluded.completed, completed_at=excluded.completed_at", [tenant_id, slug, completed ? 1 : 0, completed ? new Date().toISOString() : null]);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    if (route === "tests") {
      await tursoQuery(`CREATE TABLE IF NOT EXISTS test_submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL DEFAULT 'default', test_slug TEXT NOT NULL, answers TEXT NOT NULL, score INTEGER, created_at TEXT DEFAULT (datetime('now')))`, []);
      if (req.method === "GET") {
        const rows = await tursoQuery(query.slug ? "SELECT * FROM test_submissions WHERE tenant_id=? AND test_slug=? ORDER BY created_at DESC" : "SELECT * FROM test_submissions WHERE tenant_id=? ORDER BY created_at DESC", query.slug ? [tenant_id, query.slug] : [tenant_id]);
        return new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (req.method === "POST") {
        const { testSlug, answers, score } = await req.json().catch(() => ({}));
        if (!testSlug || !answers) return new Response(JSON.stringify({ error: "testSlug and answers required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const rows = await tursoQuery("INSERT INTO test_submissions (tenant_id, test_slug, answers, score) VALUES (?,?,?,?) RETURNING *", [tenant_id, testSlug, JSON.stringify(answers), score || null]);
        return new Response(JSON.stringify(rows[0] || { success: true }), { status: 201, headers: { "Content-Type": "application/json" } });
      }
    }

    if (route === "public") {
      if (req.method === "GET") {
        if (!query.slug) return new Response(JSON.stringify({ error: "Missing slug param" }), { status: 400, headers: { "Content-Type": "application/json" } });
        let rows;
        if (query.type) {
          rows = await tursoQuery("SELECT status FROM content_items WHERE tenant_id=? AND type=? AND slug=?", [tenant_id, query.type, query.slug]);
        } else {
          rows = await tursoQuery("SELECT status FROM content_items WHERE tenant_id=? AND slug=? ORDER BY CASE WHEN type='featured' THEN 0 ELSE 1 END LIMIT 1", [tenant_id, query.slug]);
        }
        return new Response(JSON.stringify({ public: rows.length > 0 && rows[0].status === "published" }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (req.method === "POST") {
        if (!authed) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
        const body = await req.json().catch(() => ({}));
        const rawList = body.slugs || (body.slug ? [body.slug] : []);
        const defaultType = body.type || null;
        if (!rawList.length) return new Response(JSON.stringify({ error: "Missing slugs" }), { status: 400, headers: { "Content-Type": "application/json" } });
        const newStatus = body.public ? "published" : "private";
        const normalized = rawList.map((entry) => {
          if (typeof entry === "string") return { slug: entry, type: defaultType || null };
          if (entry && typeof entry === "object") return { slug: entry.slug, type: entry.type || defaultType || null };
          return { slug: String(entry), type: defaultType || null };
        }).filter((e) => !!e.slug);
        for (const { slug, type } of normalized) {
          if (type) {
            await tursoQuery("UPDATE content_items SET status=? WHERE tenant_id=? AND type=? AND slug=?", [newStatus, tenant_id, type, slug]);
          } else {
            await tursoQuery("UPDATE content_items SET status=? WHERE tenant_id=? AND slug=?", [newStatus, tenant_id, slug]);
          }
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    if (route === "diag") {
      if (!authed) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      const start = Date.now();
      const pingRows = await tursoQuery("SELECT 1 AS one", []);
      const report = { env: { hasDbUrl: !!(process.env.TURSO_DATABASE_URL), hasToken: !!(process.env.TURSO_AUTH_TOKEN), vercelEnv: "netlify", node: "lambda", dbMode: "remote" }, db: { reachable: true, latencyMs: Date.now() - start, mode: "remote" }, store: {} };
      try {
        const counts = await tursoQuery("SELECT status, COUNT(*) AS n FROM content_items WHERE tenant_id=? GROUP BY status", [tenant_id]);
        for (const r of counts) report.store["content:" + r.status] = Number(r.n);
      } catch { report.store.content_items = "missing-or-unreadable"; }
      return new Response(JSON.stringify(report), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (route === "auth") {
      if (req.method === "GET") return new Response(JSON.stringify({ authenticated: authed }), { status: 200, headers: { "Content-Type": "application/json" } });
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const pw = body.password;
        const valid = process.env.SITE_PASSWORD;
        if (!valid) return new Response(JSON.stringify({ error: "Auth not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
        if (pw !== valid) return new Response(JSON.stringify({ error: "Invalid password" }), { status: 401, headers: { "Content-Type": "application/json" } });
        const { createHmac } = require("node:crypto");
        const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
        const payload = String(exp);
        const sig = createHmac("sha256", valid).update(payload).digest("hex");
        const secure = url.protocol === "https:" ? "; Secure" : "";
        const headers = new Headers();
        headers.set("Content-Type", "application/json");
        headers.append("Set-Cookie", `soma_auth=1; Path=/; Max-Age=2592000; SameSite=Lax${secure}`);
        headers.append("Set-Cookie", `soma_session=${payload}.${sig}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Lax${secure}`);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }
    }

    if (route === "models") {
      if (!authed) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      const models = [];
      if (process.env.DEEPSEEK_API_KEY) {
        models.push({ id: "deepseek-flash", label: "DeepSeek Flash", provider: "deepseek", free: false });
        models.push({ id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "deepseek", free: false });
      }
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_DISABLED !== "1") {
        models.push({ id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini", free: false });
        models.push({ id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "gemini", free: false });
        models.push({ id: "gemini-flash-latest", label: "Gemini Flash Latest", provider: "gemini", free: false });
        models.push({ id: "gemini-flash-lite-latest", label: "Gemini Flash-Lite Latest", provider: "gemini", free: false });
        models.push({ id: "gemini-pro-latest", label: "Gemini Pro Latest", provider: "gemini", free: false });
        models.push({ id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", provider: "gemini", free: false });
        models.push({ id: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview", provider: "gemini", free: false });
        models.push({ id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", provider: "gemini", free: false });
      }
      if (process.env.GROQ_API_KEY) {
        models.push({ id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", provider: "groq", free: false });
      }
      if (process.env.STRAITLY_API_KEY || process.env.STRAIGHTLY_API_KEY || process.env.STRIGHTLY_API_KEY) {
        models.push({ id: "deepseek/deepseek-v4-1-flash", label: "DeepSeek V4.1 Flash", provider: "straitly", free: false });
        models.push({ id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", provider: "straitly", free: false });
      }
      if (process.env.OPENROUTER_API_KEY) {
        models.push({ id: "google/gemini-flash-latest", label: "Google: Gemini Flash Latest", provider: "openrouter", free: false });
        models.push({ id: "google/gemini-flash-lite-latest", label: "Google: Gemini Flash-Lite Latest", provider: "openrouter", free: false });
      }
      return new Response(JSON.stringify({ models }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (route === "chat") {
      if (!authed) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "Content-Type": "application/json" },
        });
      }
      const body = await req.json().catch(() => ({}));
      return chatResponse(await runChat({ body, keys: chatKeys(), options: chatOptions() }));
    }

    // ── proof ──
    if (route === "proof") {
      if (!requireAuth()) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      if (method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });

      // Ensure lab_attempts table
      await tursoQuery(`CREATE TABLE IF NOT EXISTS lab_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL DEFAULT 'default',
        content_slug TEXT NOT NULL,
        lab_id TEXT NOT NULL,
        passed INTEGER NOT NULL DEFAULT 0,
        attempts INTEGER NOT NULL DEFAULT 1,
        last_attempt_at TEXT DEFAULT (datetime('now'))
      )`, []);
      await tursoQuery(`CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_attempts_tenant_unique ON lab_attempts(tenant_id, content_slug, lab_id)`, []);

      const slug = query.slug;
      if (slug) {
        const rows = await tursoQuery(`
          SELECT ? AS slug,
            (SELECT COUNT(*) FROM highlights WHERE tenant_id=? AND story_slug = ?) AS highlights,
            (SELECT COUNT(*) FROM comments WHERE tenant_id=? AND story_slug = ?) AS comments,
            (SELECT COUNT(*) FROM test_submissions WHERE tenant_id=? AND test_slug = ?) AS test_submissions,
            (SELECT MAX(score) FROM test_submissions WHERE tenant_id=? AND test_slug = ?) AS best_score,
            (SELECT COUNT(*) FROM lab_attempts WHERE tenant_id=? AND content_slug = ?) AS lab_attempts,
            (SELECT COUNT(*) FROM lab_attempts WHERE tenant_id=? AND content_slug = ? AND passed = 1) AS lab_passed,
            (SELECT COUNT(*) FROM note_articles WHERE tenant_id=? AND EXISTS (
              SELECT 1 FROM json_each(published_content) WHERE json_extract(value, '$.slug') = ?
            )) AS notes
        `, [slug, tenant_id, slug, tenant_id, slug, tenant_id, slug, tenant_id, slug, tenant_id, slug, tenant_id, slug, tenant_id, slug]);
        return new Response(JSON.stringify(rows[0] || { slug, highlights: 0, comments: 0, test_submissions: 0, best_score: null, lab_attempts: 0, lab_passed: 0, notes: 0 }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      const rows = await tursoQuery(`
        SELECT sub.slug,
          COALESCE(h.c, 0) AS highlights,
          COALESCE(c.c, 0) AS comments,
          COALESCE(t.c, 0) AS test_submissions,
          t.best_score,
          COALESCE(l.c, 0) AS lab_attempts,
          COALESCE(l.p, 0) AS lab_passed,
          COALESCE(n.c, 0) AS notes
        FROM (
          SELECT story_slug AS slug FROM highlights WHERE tenant_id=?
          UNION
          SELECT story_slug AS slug FROM comments WHERE tenant_id=?
          UNION
          SELECT test_slug AS slug FROM test_submissions WHERE tenant_id=?
          UNION
          SELECT content_slug AS slug FROM lab_attempts WHERE tenant_id=?
          UNION
          SELECT slug FROM note_articles WHERE tenant_id=?
        ) sub
        LEFT JOIN (SELECT story_slug, COUNT(*) AS c FROM highlights WHERE tenant_id=? GROUP BY story_slug) h ON h.story_slug = sub.slug
        LEFT JOIN (SELECT story_slug, COUNT(*) AS c FROM comments WHERE tenant_id=? GROUP BY story_slug) c ON c.story_slug = sub.slug
        LEFT JOIN (SELECT test_slug, COUNT(*) AS c, MAX(score) AS best_score FROM test_submissions WHERE tenant_id=? GROUP BY test_slug) t ON t.test_slug = sub.slug
        LEFT JOIN (SELECT content_slug, COUNT(*) AS c, SUM(passed) AS p FROM lab_attempts WHERE tenant_id=? GROUP BY content_slug) l ON l.content_slug = sub.slug
        LEFT JOIN (
          SELECT json_extract(value, '$.slug') AS ref_slug, COUNT(*) AS c
          FROM note_articles, json_each(published_content)
          WHERE note_articles.tenant_id=?
          GROUP BY ref_slug
        ) n ON n.ref_slug = sub.slug
        ORDER BY sub.slug
      `, [tenant_id, tenant_id, tenant_id, tenant_id, tenant_id, tenant_id, tenant_id, tenant_id, tenant_id, tenant_id]);
      return new Response(JSON.stringify(rows || []), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // ── export ──
    if (route === "export") {
      if (method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
      if (!requireAuth()) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      try {
        const rows = await tursoQuery("SELECT * FROM content_items WHERE tenant_id=? ORDER BY type ASC, position ASC", [tenant_id]);
        const parts = [];
        parts.push("# Soma Export\n> Exported: " + new Date().toISOString() + "\n> Total items: " + rows.length + "\n\n---\n\n");
        for (const row of rows) {
          parts.push("# " + (row.title || row.slug) + "\n> " + (row.excerpt || "") + "\n\n");
          parts.push("- **Type:** " + (row.type || "") + "\n- **Status:** " + (row.status || "") + "\n- **Slug:** " + (row.slug || "") + "\n");
          if (row.updated_at) parts.push("- **Updated:** " + row.updated_at + "\n");
          parts.push("\n\n---\n\n");
        }
        const body = parts.join("");
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            "Content-Disposition": 'attachment; filename="soma-export-' + new Date().toISOString().slice(0, 10) + '.md"',
          },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Export failed: " + (e.message || e) }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    if (route === "import") {
      if (method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
      if (!requireAuth()) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      try {
        const { default: handler } = await import("../../api/import.js");
        const mockJson = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
        handler(req, { status: () => ({ json: mockJson }) });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Import failed: " + (e.message || e) }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: `Route ${route} not implemented` }), { status: 501, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[netlify]", e);
    return new Response(JSON.stringify({ error: "Internal server error", detail: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

export const config = {
  path: "/api/*",
};
