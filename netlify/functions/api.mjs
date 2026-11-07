// Netlify Function — proxies all /api/* to api/*.js handlers (SPA rewrites from netlify.toml)
export default async (req, context) => {
  // Netlify already injects env vars into process.env, _db.js will see TURSO_* etc.
  const url = new URL(req.url);
  // /api/content -> route content, /api/content?type=story -> same
  const path = url.pathname; // /api/content
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "api" || !parts[1]) {
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }
  const route = parts[1];

  try {
    const mod = await import(`../../api/${route}.js`);
    const handler = mod.default;
    if (!handler) throw new Error("No handler");

    let body = {};
    if (["POST","PUT","PATCH","DELETE"].includes(req.method)) {
      try { body = await req.json(); } catch { body = {}; }
    }
    const query = Object.fromEntries(url.searchParams);

    let statusCode = 200;
    let respHeaders = {};
    let jsonBody = null;
    let rawBody = "";
    const vercelReq = {
      method: req.method,
      query,
      body,
      headers: {
        cookie: req.headers.get("cookie") || "",
        "x-forwarded-for": req.headers.get("x-forwarded-for") || "",
        "x-forwarded-proto": req.headers.get("x-forwarded-proto") || "https"
      },
      localBypass: false,
    };
    const vercelRes = {
      status(code){ statusCode=code; return this; },
      json(data){ jsonBody=data; },
      setHeader(name, value){ respHeaders[name]=value; },
      writeHead(code, headers){ statusCode=code; if(headers) Object.assign(respHeaders, headers); return this; },
      write(c){ rawBody+=c; },
      end(d){ if(d) rawBody=d; }
    };

    await handler(vercelReq, vercelRes);
    if (jsonBody !== null) {
      return new Response(JSON.stringify(jsonBody), { status: statusCode, headers: { "Content-Type": "application/json", ...respHeaders } });
    }
    return new Response(rawBody || "", { status: statusCode, headers: respHeaders });
  } catch (e) {
    console.error(`[netlify] /api/${route} error`, e);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

export const config = {
  path: "/api/*"
};
