// Guards the /api/* route contract.
//
// The API handlers were merged to keep Vercel under its 12-function Hobby
// limit: notes + highlights + comments -> social, ratings + progress + tests ->
// engagement, diag + public -> system. Routing configuration, not handler code,
// then became the thing that can break production. It did: every notes request
// hit `/api/notes/`, vercel.json only matched `/api/notes`, and Vercel answered
// with a platform 404 while local dev served a hand-written copy of the handler.
//
// This script fails the build when:
//   1. shared/api-routes.js points at an api/ file that does not exist, or api/
//      has a function file the table does not know about (Hobby 12 limit);
//   2. vercel.json does not route a public route to its handler, with AND
//      without a trailing slash (Vercel does not normalize rewrites);
//   3. a client fetch() in src/ asks for a route the table does not define;
//   4. netlify/functions/api.mjs does not implement a public route;
//   5. a host router stops reading the shared table.
//
// Run from package.json ci:check.

import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { HANDLER_FILES, ROUTE_HANDLERS } from "../shared/api-routes.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const violations = [];

const read = (path) => readFile(join(root, path), "utf8");
const exists = async (path) => {
  try {
    await stat(join(root, path));
    return true;
  } catch {
    return false;
  }
};

// ── 1. table <-> api/ files ─────────────────────────────

const apiFiles = (await readdir(join(root, "api")))
  .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
  .map((f) => f.slice(0, -3))
  .sort();

const missingHandlers = apiFiles.filter((f) => !HANDLER_FILES.includes(f));
const missingFiles = HANDLER_FILES.filter((f) => !apiFiles.includes(f));

if (missingHandlers.length) {
  violations.push(`api/ has function files the route table does not list: ${missingHandlers.join(", ")} — add them to HANDLER_FILES or delete them`);
}
if (missingFiles.length) {
  violations.push(`shared/api-routes.js lists handlers with no api/ file: ${missingFiles.join(", ")}`);
}
for (const [route, handler] of Object.entries(ROUTE_HANDLERS)) {
  if (!HANDLER_FILES.includes(handler)) {
    violations.push(`route "${route}" maps to "${handler}", which is not in HANDLER_FILES`);
  }
}

// ── 2. vercel.json rewrites ─────────────────────────────
//
// Only the two source shapes this project uses are modelled:
//   "/api/notes"        exact match
//   "/api/notes/:path*" splat
// Vercel's observed behaviour: a splat rule matches the bare path and paths
// with a real segment after the slash, but NOT "/api/notes/" — and rewrites are
// not trailing-slash tolerant. That gap is the bug this file exists for, so the
// model must encode it rather than paper over it.

function sourceMatches(source, path) {
  if (source === path) return true;
  const splat = /^\/api\/([a-z-]+)\/:path\*$/.exec(source);
  if (splat) {
    const bare = `/api/${splat[1]}`;
    return path === bare || (path.startsWith(bare + "/") && path.length > bare.length + 1);
  }
  return false;
}

function resolveVercel(path, rewrites) {
  for (const rule of rewrites) {
    if (rule.destination === "/index.html") continue;
    if (sourceMatches(rule.source, path)) {
      const handler = rule.destination.replace(/^\/api\//, "").replace(/\.js$/, "");
      if (!HANDLER_FILES.includes(handler)) {
        violations.push(`vercel.json routes ${rule.source} -> ${rule.destination}, which is not a known handler file`);
      }
      return handler;
    }
  }
  return null;
}

const vercel = JSON.parse(await read("vercel.json"));
const rewrites = vercel.rewrites || [];

for (const [route, handler] of Object.entries(ROUTE_HANDLERS)) {
  for (const path of [`/api/${route}`, `/api/${route}/`]) {
    const hasOwnFile = await exists(`api/${route}.js`);
    const resolved = resolveVercel(path, rewrites) ?? (hasOwnFile ? route : null);
    if (resolved !== handler) {
      violations.push(
        resolved === null
          ? `Vercel: ${path} matches no rewrite and no api/${route}.js file -> platform 404`
          : `Vercel: ${path} resolves to "${resolved}", expected "${handler}"`,
      );
    }
  }
}

// ── 3. client fetch paths ───────────────────────────────

async function listSourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "content") continue; // prose bodies mention /api/* in code samples
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listSourceFiles(full)));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const clientRoutes = new Set();
for (const file of await listSourceFiles(join(root, "src"))) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/\/api\/([a-z][a-z-]*)/g)) {
    clientRoutes.add(match[1]);
  }
}

for (const route of [...clientRoutes].sort()) {
  if (!Object.hasOwn(ROUTE_HANDLERS, route) && !HANDLER_FILES.includes(route)) {
    violations.push(`client calls /api/${route}, which the route table does not define`);
  }
}

// ── 4. netlify function coverage ────────────────────────

const netlify = await read("netlify/functions/api.mjs");
for (const route of Object.keys(ROUTE_HANDLERS).sort()) {
  if (!netlify.includes(`route === "${route}"`)) {
    violations.push(`netlify/functions/api.mjs has no branch for route "${route}" -> 501 "Route ${route} not implemented"`);
  }
}

// ── 5. host routers read the shared table ───────────────

for (const host of ["server/index.mjs", "server/api-dev.mjs", "vite.config.ts"]) {
  const text = await read(host);
  if (!text.includes("shared/api-routes.js")) {
    violations.push(`${host} does not import shared/api-routes.js — its route mapping can drift from production again`);
  }
}

// ── report ──────────────────────────────────────────────

if (violations.length) {
  console.error(`API route contract: ${violations.length} violation(s)\n`);
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

const routes = Object.keys(ROUTE_HANDLERS).length;
console.log(`API routes OK — ${routes} public routes -> ${HANDLER_FILES.length} handlers, both with and without a trailing slash.`);
