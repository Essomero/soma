// Cloudflare Pages Functions — catch-all for /api/*
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  // Map /api/foo/bar to api/foo/bar if needed, but we proxy to our Node handlers via _db which reads process.env
  // For Cloudflare we need to inject env into process.env so api/_db.js sees TURSO_* etc.

  // Inject Cloudflare env into process.env (for _db adapter)
  if (env) {
    for (const [k, v] of Object.entries(env)) {
      if (typeof v === "string" && !(k in process.env)) {
        process.env[k] = v;
      }
    }
  }

  // Extract route: /api/content -> content, /api/notes -> notes
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api" || !parts[1]) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  const route = parts[1];

  // Dynamic import of handler (api/*.js are ESM)
  try {
    const mod = await import(`../../api/${route}.js`);
    const handler = mod.default;
    if (!handler) throw new Error("No handler");

    const method = request.method;
    let body = {};
    if (["POST","PUT","PATCH","DELETE"].includes(method)) {
      try { body = await request.json(); } catch { body = {}; }
    }
    const query = Object.fromEntries(url.searchParams);

    // Minimal Vercel-like req/res
    let statusCode = 200;
    let respHeaders = {};
    let jsonBody = null;
    let ended = false;
    let rawBody = "";

    const vercelReq = {
      method,
      query,
      body,
      headers: {
        cookie: request.headers.get("cookie") || "",
        "x-forwarded-for": request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "",
        "x-forwarded-proto": url.protocol.replace(":","")
      },
      localBypass: false,
    };
    const vercelRes = {
      status(code){ statusCode=code; return this; },
      json(data){ jsonBody=data; ended=true; },
      setHeader(name, value){ respHeaders[name]=value; },
      writeHead(code, headers){ statusCode=code; if(headers) Object.assign(respHeaders, headers); return this; },
      write(c){ rawBody+=c; },
      end(d){ if(d) rawBody = d; ended=true; }
    };

    await handler(vercelReq, vercelRes);
    if (jsonBody !== null) {
      return new Response(JSON.stringify(jsonBody), { status: statusCode, headers: { "Content-Type": "application/json", ...respHeaders } });
    }
    return new Response(rawBody || "", { status: statusCode, headers: respHeaders });
  } catch (e) {
    console.error(`[cloudflare] /api/${route} error`, e);
    return new Response(JSON.stringify({ error: "Internal error", detail: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
