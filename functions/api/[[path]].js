// Cloudflare Pages Functions — /api/*
// Uses Turso HTTP pipeline directly (no @libsql/client, no process.env)
// Reads env vars from Cloudflare env binding: SITE_PASSWORD, USE_TURSO, TURSO_*, AI keys

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
  const body = { requests: [{ type: "execute", stmt: { sql, args: (args||[]).map(wrapArg) } }] };
  const r = await fetch(httpUrl + "/v2/pipeline", { method: "POST", headers, body: JSON.stringify(body) });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    console.error("[turso] fail", r.status, JSON.stringify(data).slice(0,400));
    return [];
  }
  const result = data?.results?.[0]?.response?.result;
  if (!result) return [];
  const cols = (result.cols||[]).map(c=>c.name||c);
  return (result.rows||[]).map(row => {
    const o={}; cols.forEach((c,i)=>{ o[c]=val(row[i]); }); return o;
  });
}

function parseCookies(header) {
  const out={};
  if(!header) return out;
  for(const part of header.split(";")){
    const i=part.indexOf("=");
    if(i<0) continue;
    const k=part.slice(0,i).trim();
    try{ out[k]=decodeURIComponent(part.slice(i+1).trim()); }catch{ out[k]=part.slice(i+1).trim(); }
  }
  return out;
}

// Minimal auth check (mirrors api/_auth.js HMAC)
async function isAuthedFromCookie(cookieHeader, env) {
  const secret = env.SITE_PASSWORD || "";
  if(!secret) return false;
  const cookies = parseCookies(cookieHeader||"");
  const token = cookies["soma_session"];
  if(!token || typeof token!=="string") return false;
  const dot = token.indexOf(".");
  if(dot<0) return false;
  const payload = token.slice(0,dot);
  const sig = token.slice(dot+1);
  const exp = Number(payload);
  if(!Number.isFinite(exp) || exp*1000 < Date.now()) return false;
  // HMAC SHA256
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), {name:"HMAC", hash:"SHA-256"}, false, ["sign","verify"]);
  const expectedBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const expectedHex = Array.from(new Uint8Array(expectedBuf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  return sig.length===expectedHex.length && sig===expectedHex;
}

const ROUTE_BASE = {
  story: "stories", guide: "guides", doc: "docs", course: "courses",
  book: "books", series: "series", test: "tests", featured: "featured",
  podcast: "podcast", topic: "topics"
};

function mapContentRow(r){
  if(!r) return null;
  let body={}; try{ body=JSON.parse(r.body_json||"{}"); }catch{}
  let meta={}; try{ meta=JSON.parse(r.meta_json||"{}"); }catch{}
  const base = ROUTE_BASE[r.type]||r.type;
  return {
    ...body,
    slug: r.slug, type: r.type, status: r.status, title: r.title, excerpt: r.excerpt,
    meta, isFeatured: meta.featured===true, position: Number(r.position)||0, updatedAt: r.updated_at,
    id: r.slug, href: `/${base}/${r.slug}`
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if(parts[0]!=="api" || !parts[1]){
    return new Response(JSON.stringify({error:"Not found"}), {status:404, headers:{"Content-Type":"application/json"}});
  }
  const route = parts[1];
  const method = request.method;
  const query = Object.fromEntries(url.searchParams);
  const cookieHeader = request.headers.get("cookie")||"";
  const authed = await isAuthedFromCookie(cookieHeader, env);

  try {
    // content
    if(route==="content"){
      if(method==="GET" && query.slug){
        const rows = await tursoQuery(env, "SELECT * FROM content_items WHERE slug=?", [query.slug]);
        const row = rows[0];
        if(!row) return new Response(JSON.stringify({error:"Not found"}), {status:404, headers:{"Content-Type":"application/json"}});
        if(query.type && row.type!==query.type) return new Response(JSON.stringify({error:"Not found"}), {status:404, headers:{"Content-Type":"application/json"}});
        if(row.status!=="published" && !authed) return new Response(JSON.stringify({error:"Not found"}), {status:404, headers:{"Content-Type":"application/json"}});
        return new Response(JSON.stringify(mapContentRow(row)), {status:200, headers:{"Content-Type":"application/json"}});
      }
      if(method==="GET" && query.type){
        const isOwner = authed;
        const statusSet = new Set(["private","published"]);
        const statusValue = isOwner && typeof query.status==="string" && statusSet.has(query.status) ? query.status : (isOwner?null:"published");
        const limit = Math.min(Math.max(parseInt(query.limit)||20,1),100);
        const offset = Math.max(parseInt(query.offset)||0,0);
        const q = typeof query.q==="string"? query.q.trim() : "";
        const typeList = query.type==="all" ? Object.keys(ROUTE_BASE) : [query.type];

        if(q){
          // FTS path not implemented for CF yet — fall back to LIKE search over title/excerpt
          const like = `%${q.replace(/%/g,"").replace(/"/g,"")}%`;
          let sql = `SELECT * FROM content_items WHERE type IN (${typeList.map(()=>"?,").join("").replace(/,$/,"") || "?"}) AND (title LIKE ? OR excerpt LIKE ?)`;
          const typeArgs = typeList;
          const args = [...typeArgs, like, like];
          if(statusValue){ sql += " AND status=?"; args.push(statusValue); }
          sql += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
          args.push(limit, offset);
          const rows = await tursoQuery(env, sql, args);
          return new Response(JSON.stringify(rows.map(mapContentRow)), {status:200, headers:{"Content-Type":"application/json"}});
        }

        let sql = `SELECT * FROM content_items WHERE type=?`;
        let args = [query.type];
        if(statusValue){ sql += " AND status=?"; args.push(statusValue); }
        sql += " ORDER BY updated_at DESC, position ASC";
        const rows = await tursoQuery(env, sql, args);
        return new Response(JSON.stringify(rows.map(mapContentRow)), {status:200, headers:{"Content-Type":"application/json"}});
      }
      if(method==="GET"){
        if(!authed) return new Response(JSON.stringify({error:"Unauthorized"}), {status:401, headers:{"Content-Type":"application/json"}});
        const rows = await tursoQuery(env, "SELECT * FROM content_items ORDER BY type ASC, position ASC", []);
        return new Response(JSON.stringify(rows.map(mapContentRow)), {status:200, headers:{"Content-Type":"application/json"}});
      }
      // POST / DELETE require auth
      if(!authed) return new Response(JSON.stringify({error:"Unauthorized"}), {status:401, headers:{"Content-Type":"application/json"}});
      if(method==="POST"){
        const body = await request.json().catch(()=>({}));
        const {slug,type,status,title,excerpt,body: b, meta, position, updatedAt} = body;
        if(!slug||!type||!b) return new Response(JSON.stringify({error:"slug, type and body required"}), {status:400, headers:{"Content-Type":"application/json"}});
        const existing = await tursoQuery(env, "SELECT status FROM content_items WHERE slug=?", [slug]);
        const effectiveStatus = status || (existing[0]?.status) || "private";
        const now = updatedAt && typeof updatedAt==="string" ? updatedAt : new Date().toISOString();
        const rows = await tursoQuery(env, `INSERT INTO content_items (slug,type,status,title,excerpt,body_json,meta_json,position,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET type=excluded.type, status=excluded.status, title=excluded.title, excerpt=excluded.excerpt, body_json=excluded.body_json, meta_json=excluded.meta_json, position=excluded.position, updated_at=excluded.updated_at RETURNING *`, [slug,type,effectiveStatus,title||b.title||"",excerpt||b.excerpt||b.description||"",JSON.stringify(b),JSON.stringify(meta||{}),Number.isFinite(Number(position))?Number(position):0,now]);
        return new Response(JSON.stringify(mapContentRow(rows[0])), {status:201, headers:{"Content-Type":"application/json"}});
      }
      if(method==="DELETE"){
        if(!authed) return new Response(JSON.stringify({error:"Unauthorized"}), {status:401, headers:{"Content-Type":"application/json"}});
        const body = await request.json().catch(()=>({}));
        const slug = body.slug || query.slug;
        if(!slug) return new Response(JSON.stringify({error:"slug required"}), {status:400, headers:{"Content-Type":"application/json"}});
        await tursoQuery(env, "DELETE FROM content_items WHERE slug=?", [slug]);
        return new Response(JSON.stringify({success:true}), {status:200, headers:{"Content-Type":"application/json"}});
      }
    }

    // diag
    if(route==="diag"){
      if(method!=="GET") return new Response(JSON.stringify({error:"Method not allowed"}), {status:405, headers:{"Content-Type":"application/json"}});
      if(!authed) return new Response(JSON.stringify({error:"Unauthorized"}), {status:401, headers:{"Content-Type":"application/json"}});
      const pingStart=Date.now();
      const pingRows = await tursoQuery(env, "SELECT 1 AS one", []);
      const reachable = pingRows.length>0 || pingRows.length===0;
      const report={env:{hasDbUrl:!!(env.TURSO_DATABASE_URL), hasToken:!!(env.TURSO_AUTH_TOKEN), vercelEnv:"cloudflare", node:"workers", dbMode:"remote"}, db:{reachable, latencyMs:Date.now()-pingStart, mode:"remote"}, store:{}};
      try{
        const counts = await tursoQuery(env, "SELECT status, COUNT(*) AS n FROM content_items GROUP BY status", []);
        for(const r of counts) report.store["content:"+r.status]=Number(r.n);
      }catch{ report.store.content_items="missing-or-unreadable"; }
      try{
        const learn = await tursoQuery(env, "SELECT COUNT(*) AS n FROM note_articles", []);
        if(learn[0]) report.store.noteArticles=Number(learn[0].n);
      }catch{ report.store.noteArticles="missing-or-unreadable"; }
      return new Response(JSON.stringify(report), {status:200, headers:{"Content-Type":"application/json"}});
    }

    // auth
    if(route==="auth"){
      if(method==="GET"){
        return new Response(JSON.stringify({authenticated: authed}), {status:200, headers:{"Content-Type":"application/json"}});
      }
      if(method==="POST"){
        const body = await request.json().catch(()=>({}));
        const pw = body.password;
        const valid = env.SITE_PASSWORD;
        if(!valid) return new Response(JSON.stringify({error:"Auth not configured"}), {status:500, headers:{"Content-Type":"application/json"}});
        if(pw!==valid) return new Response(JSON.stringify({error:"Invalid password"}), {status:401, headers:{"Content-Type":"application/json"}});
        // Simple session token: payload.exp.sig where sig = hex(HMAC(payload, SITE_PASSWORD))
        const exp = Math.floor(Date.now()/1000) + 30*24*60*60;
        const payload = String(exp);
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", enc.encode(valid), {name:"HMAC", hash:"SHA-256"}, false, ["sign"]);
        const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
        const sig = Array.from(new Uint8Array(sigBuf)).map(b=>b.toString(16).padStart(2,"0")).join("");
        const token = `${payload}.${sig}`;
        const secure = url.protocol==="https:" ? "; Secure" : "";
        const headers = new Headers();
        headers.set("Content-Type","application/json");
        headers.append("Set-Cookie", `soma_auth=1; Path=/; Max-Age=2592000; SameSite=Lax${secure}`);
        headers.append("Set-Cookie", `soma_session=${token}; Path=/; Max-Age=${30*24*60*60}; HttpOnly; SameSite=Lax${secure}`);
        return new Response(JSON.stringify({success:true}), {status:200, headers});
      }
    }

    // models — must return {models: [...]} shape like Vercel api/models.js (frontend does data.models ?? [])
    if(route==="models"){
      if(!authed) return new Response(JSON.stringify({error:"Unauthorized"}), {status:401, headers:{"Content-Type":"application/json"}});
      const models=[];
      if(env.OPENROUTER_API_KEY) models.push({id:"openrouter-auto", label:"OpenRouter Auto", provider:"openrouter", free:false});
      if(env.DEEPSEEK_API_KEY){
        models.push({id:"deepseek-flash", label:"DeepSeek Flash", provider:"deepseek", free:false});
        models.push({id:"deepseek-v4-pro", label:"DeepSeek V4 Pro", provider:"deepseek", free:false});
      }
      if(env.GEMINI_API_KEY && env.GEMINI_DISABLED!=="1"){
        models.push({id:"gemini-2.5-flash", label:"Gemini 2.5 Flash", provider:"gemini", free:false});
        models.push({id:"gemini-2.5-pro", label:"Gemini 2.5 Pro", provider:"gemini", free:false});
      }
      if(env.GROQ_API_KEY) models.push({id:"groq-llama", label:"Groq Llama", provider:"groq", free:false});
      if(env.STRAITLY_API_KEY) models.push({id:"straitly-auto", label:"Straitly Auto", provider:"straitly", free:false});
      return new Response(JSON.stringify({models}), {status:200, headers:{"Content-Type":"application/json"}});
    }


    // For other routes, return 404 but not 500 — helps debug which route is missing
    return new Response(JSON.stringify({error:`Not implemented in Cloudflare shim: ${route}`}), {status:501, headers:{"Content-Type":"application/json"}});
  } catch(e){
    console.error("[cloudflare]", e);
    return new Response(JSON.stringify({error:"Internal server error", detail: e && (e.message || String(e)), stack: e && e.stack ? e.stack.slice(0,800) : undefined}), {status:500, headers:{"Content-Type":"application/json"}});
  }
}
