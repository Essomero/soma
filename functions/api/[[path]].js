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

    // models — mirrors api/models.js but in Workers (fetches Gemini/OpenRouter lists)
    if(route==="models"){
      if(!authed) return new Response(JSON.stringify({error:"Unauthorized"}), {status:401, headers:{"Content-Type":"application/json"}});
      const GEMINI_KEY = env.GEMINI_API_KEY || "";
      const GEMINI_DISABLED = env.GEMINI_DISABLED==="1" || env.GEMINI_DISABLED==="true";
      const OPENROUTER_KEY = env.OPENROUTER_API_KEY || "";
      const GROQ_KEY = env.GROQ_API_KEY || "";
      const CEREBRAS_KEY = env.CEREBRAS_API_KEY || "";
      const STRAITLY_KEY = env.STRAITLY_API_KEY || env.STRAIGHTLY_API_KEY || "";
      const DEEPSEEK_MODELS = [
        {id:"deepseek-flash", label:"DeepSeek Flash", provider:"deepseek", free:false},
        {id:"deepseek-v4-pro", label:"DeepSeek V4 Pro", provider:"deepseek", free:false},
      ];
      const CURATED_OR = new Set(["google/gemini-2.5-flash","google/gemini-2.5-flash-lite","google/gemini-2.5-pro","google/gemini-3-flash-preview","google/gemini-3-pro-preview","google/gemini-3.1-flash-lite","google/gemini-flash-latest","google/gemini-flash-lite-latest","google/gemini-pro-latest","google/gemini-2.5-flash-lite","google/gemini-3-flash-preview","google/gemini-3.1-pro-preview","google/gemini-3.5-flash","google/gemini-3.5-flash-lite","google/gemini-3.6-flash","google/gemini-3.7-flash","google/gemini-3.8-flash","google/gemini-3.1-flash-lite-preview","google/gemini-3.1-pro-preview","google/gemini-3.6-flash","google/gemini-3.6-plus","google/gemini-3.6-max-preview","google/gemini-3-flash-preview","google/gemini-3.1-flash-lite-preview"]);

      const cache = globalThis.__somaModelsCache || (globalThis.__somaModelsCache={});

      async function fetchGeminiModels(){
        if(!GEMINI_KEY || GEMINI_DISABLED) return [];
        if(cache.gemini && Date.now()-cache.geminiTime < 300000) return cache.gemini;
        try{
          const controller=new AbortController(); const to=setTimeout(()=>controller.abort(),8000);
          const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`, {signal:controller.signal});
          clearTimeout(to);
          if(!r.ok) return cache.gemini||[];
          const data=await r.json();
          const models=(data.models||[]).filter(m=>{
            const methods=m.supportedGenerationMethods||[];
            if(!methods.includes("generateContent")) return false;
            const name=(m.name||"").toLowerCase(); const disp=(m.displayName||"").toLowerCase();
            const hay=name+" "+disp;
            if(hay.includes("tts")||hay.includes("audio")||hay.includes("image")||hay.includes("lyria")||hay.includes("robotics")||hay.includes("deep-research")||hay.includes("antigravity")||hay.includes("nano-banana")) return false;
            if(name.startsWith("models/gemma")) return false;
            if(name.includes("embedding")) return false;
            return true;
          }).map(m=>{
            const id=m.name.replace(/^models\//,"");
            return {id, label:m.displayName||id, provider:"gemini", free:false, context_length:1048576};
          });
          cache.gemini=models; cache.geminiTime=Date.now(); return models;
        }catch{ return cache.gemini||[]; }
      }

      async function fetchOpenRouterModels(){
        if(!OPENROUTER_KEY) return [];
        if(cache.openrouter && Date.now()-cache.orTime < 300000) return cache.openrouter;
        try{
          const controller=new AbortController(); const to=setTimeout(()=>controller.abort(),8000);
          const r=await fetch("https://openrouter.ai/api/v1/models", {headers:{"Authorization":`Bearer ${OPENROUTER_KEY}`}, signal:controller.signal});
          clearTimeout(to);
          if(!r.ok) return cache.openrouter||[];
          const data=await r.json();
          const seen=new Set();
          const models=(data.data||[]).filter(m=>!m.id.includes("beta")).filter(m=>{
            const base=m.id.replace(/^~/,"");
            return CURATED_OR.has(base) || CURATED_OR.has(m.id);
          }).map(m=>{
            const id=m.id.replace(/^~/,"");
            return {id, label:(m.name||id).replace(/^Google:\s*~/,"Google: "), provider:"openrouter", free:!m.pricing || (parseFloat(m.pricing.prompt)===0 && parseFloat(m.pricing.completion)===0)};
          }).filter(m=>{ if(seen.has(m.id)) return false; seen.add(m.id); return true; });
          if(!models.some(m=>m.id==="google/gemini-flash-lite-latest")){
            models.push({id:"google/gemini-flash-lite-latest", label:"Google: Gemini Flash-Lite Latest", provider:"openrouter", free:false, context_length:1048576});
          }
          cache.openrouter=models; cache.orTime=Date.now(); return models;
        }catch{ return cache.openrouter||[]; }
      }

      async function fetchGroqModels(){
        if(!GROQ_KEY) return [];
        if(cache.groq && Date.now()-cache.groqTime < 300000) return cache.groq;
        try{
          const controller=new AbortController(); const to=setTimeout(()=>controller.abort(),8000);
          const r=await fetch("https://api.groq.com/openai/v1/models", {headers:{"Authorization":`Bearer ${GROQ_KEY}`}, signal:controller.signal});
          clearTimeout(to);
          if(!r.ok) return cache.groq||[];
          const data=await r.json();
          const models=(data.data||[]).map(m=>({id:m.id, label:m.id, provider:"groq", free:false}));
          cache.groq=models; cache.groqTime=Date.now(); return models;
        }catch{ return cache.groq||[]; }
      }

      async function fetchStraitlyModels(){
        if(!STRAITLY_KEY) return [];
        const STATIC=[
          {id:"deepseek/deepseek-v4-1-flash", label:"DeepSeek V4.1 Flash", provider:"straitly", free:false},
          {id:"z-ai/glm-5.3-flash", label:"GLM 5.3 Flash", provider:"straitly", free:false},
          {id:"gpt-6-luna", label:"GPT-6 Luna", provider:"straitly", free:false},
          {id:"claude-haiku-5-5", label:"Claude Haiku 5.5", provider:"straitly", free:false},
          {id:"qwen/qwen3.6-35b-a3b", label:"Qwen 3.6 35B A3B", provider:"straitly", free:false},
          {id:"meta-llama/straitly-meta-llama-muse-spark-1.3-contributor", label:"Muse Spark 1.3", provider:"straitly", free:false},
          {id:"gemini-3.8-flash", label:"Gemini 3.8 Flash", provider:"straitly", free:false},
          {id:"deepseek/deepseek-v4-pro", label:"DeepSeek V4 Pro", provider:"straitly", free:false},
        ];
        return STATIC;
      }

      async function fetchCerebrasModels(){
        if(!CEREBRAS_KEY) return [];
        if(cache.cerebras && Date.now()-cache.cerebrasTime < 300000) return cache.cerebras;
        try{
          const controller=new AbortController(); const to=setTimeout(()=>controller.abort(),8000);
          const r=await fetch("https://api.cerebras.ai/v1/models", {headers:{"Authorization":`Bearer ${CEREBRAS_KEY}`}, signal:controller.signal});
          clearTimeout(to);
          if(!r.ok) return cache.cerebras||[];
          const data=await r.json();
          const models=(data.data||[]).map(m=>({id:m.id, label:m.id, provider:"cerebras", free:false}));
          cache.cerebras=models; cache.cerebrasTime=Date.now(); return models;
        }catch{ return cache.cerebras||[]; }
      }

      const [geminiModels, openrouterModels, groqModels, cerebrasModels, straitlyModels] = await Promise.all([fetchGeminiModels(), fetchOpenRouterModels(), fetchGroqModels(), fetchCerebrasModels(), fetchStraitlyModels()]);

      let finalGemini = (GEMINI_KEY && !GEMINI_DISABLED) ? [...geminiModels] : [];
      if(finalGemini.length>0 && !finalGemini.some(m=>m.id==="gemini-flash-lite-latest")){
        finalGemini.unshift({id:"gemini-flash-lite-latest", label:"Gemini Flash-Lite Latest", provider:"gemini", free:false, context_length:1048576});
      }
      const finalOR = OPENROUTER_KEY ? [...openrouterModels] : [];
      const models = [...(env.DEEPSEEK_API_KEY ? DEEPSEEK_MODELS : []), ...finalGemini, ...finalOR, ...groqModels, ...cerebrasModels, ...straitlyModels];

      // Ensure minimal curated Gemini set if API fetch yielded nothing but key present (matches Vercel fallback)
      if(finalGemini.length===0 && GEMINI_KEY && !GEMINI_DISABLED){
        models.push(
          {id:"gemini-2.5-flash", label:"Gemini 2.5 Flash", provider:"gemini", free:false},
          {id:"gemini-2.5-pro", label:"Gemini 2.5 Pro", provider:"gemini", free:false},
          {id:"gemini-flash-latest", label:"Gemini Flash Latest", provider:"gemini", free:false},
          {id:"gemini-flash-lite-latest", label:"Gemini Flash-Lite Latest", provider:"gemini", free:false},
          {id:"gemini-pro-latest", label:"Gemini Pro Latest", provider:"gemini", free:false},
          {id:"gemini-2.5-flash-lite", label:"Gemini 2.5 Flash-Lite", provider:"gemini", free:false},
          {id:"gemini-3-flash-preview", label:"Gemini 3 Flash Preview", provider:"gemini", free:false},
          {id:"gemini-3.1-pro-preview", label:"Gemini 3.1 Pro Preview", provider:"gemini", free:false},
        );
      }

      return new Response(JSON.stringify({models}), {status:200, headers:{"Content-Type":"application/json"}});
    }


    // For other routes, return 404 but not 500 — helps debug which route is missing
    return new Response(JSON.stringify({error:`Not implemented in Cloudflare shim: ${route}`}), {status:501, headers:{"Content-Type":"application/json"}});
  } catch(e){
    console.error("[cloudflare]", e);
    return new Response(JSON.stringify({error:"Internal server error", detail: e && (e.message || String(e)), stack: e && e.stack ? e.stack.slice(0,800) : undefined}), {status:500, headers:{"Content-Type":"application/json"}});
  }
}
