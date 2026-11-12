// Single source of truth for /api/* routing.
//
// The API was merged into fewer files to stay under Vercel's Hobby limit of 12
// functions: notes + highlights + comments -> social, ratings + progress + tests
// -> engagement, diag + public -> system. Public URLs stayed the same, so every
// host has to map a public route to a handler file, and every merged handler has
// to know which route it is serving.
//
// That mapping used to live in six places and they drifted: Vercel's rewrites
// did not match `/api/notes/` (the notes client appended a slash), while local
// dev served a hand-written copy of the handler, so "works locally" proved
// nothing. Both facts now come from this table.
//
// Consumers: vercel.json rewrites (verified by scripts/check-api-routes.mjs),
// server/index.mjs, server/api-dev.mjs, the Vite dev middleware, and
// netlify/functions/api.mjs.

/** Public route -> API handler file name (without .js). */
export const ROUTE_HANDLERS = {
  auth: "auth",
  chat: "chat",
  content: "content",
  export: "export",
  import: "import",
  models: "models",
  comments: "social",
  highlights: "social",
  notes: "social",
  proof: "proof",
  diag: "system",
  public: "system",
  progress: "engagement",
  ratings: "engagement",
  tests: "engagement",
};

/** Handler files that must exist under api/. One function per entry. */
export const HANDLER_FILES = [
  "auth",
  "chat",
  "content",
  "engagement",
  "export",
  "import",
  "models",
  "proof",
  "social",
  "system",
];

/** Public routes served by one handler, e.g. "social" -> ["comments","highlights","notes"]. */
export function routesForHandler(handler) {
  return Object.keys(ROUTE_HANDLERS)
    .filter((route) => ROUTE_HANDLERS[route] === handler)
    .sort();
}

/** "/api/notes/?q=1" -> "notes". Unknown or non-API path -> null. */
export function apiRouteFromPath(path) {
  const pathname = String(path || "").split("?")[0].split("#")[0];
  const parts = pathname.split("/");
  if (parts[1] !== "api") return null;
  const route = parts[2] || "";
  return Object.hasOwn(ROUTE_HANDLERS, route) ? route : null;
}

/**
 * Route name -> handler file name, or null. A handler's own name resolves to
 * itself so hosts that route by URL segment still invoke the real file (which
 * then answers 404 for an unknown sub-route), matching Vercel's direct hit.
 */
export function handlerForRoute(route) {
  if (Object.hasOwn(ROUTE_HANDLERS, route || "")) return ROUTE_HANDLERS[route];
  return HANDLER_FILES.includes(route || "") ? route : null;
}

/** URL path -> handler file name, or null. */
export function handlerForPath(path) {
  const route = apiRouteFromPath(path);
  return route === null ? null : ROUTE_HANDLERS[route];
}
