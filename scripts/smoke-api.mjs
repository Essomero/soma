// Live check: every public /api/* route must be served by a running host.
//
// scripts/check-api-routes.mjs proves the config maps routes correctly before
// deploy. This proves the deployed platform actually serves them, which is the
// part only production can show (edge rewrites, function limits, cold starts,
// env). It exists because /api/notes/ answered 404 from Vercel while every
// local check passed.
//
// Usage:
//   node scripts/smoke-api.mjs                                  # soma.mayanja.dev
//   node scripts/smoke-api.mjs --base http://localhost:3000
//   node scripts/smoke-api.mjs --wait 600                       # poll for a fresh deploy
//
// A route passes when the request reaches a handler: any status below 500 is
// fine (401 and 400 are correct answers for unauthenticated or parameterless
// requests). 404, 5xx, platform NOT_FOUND pages and "unknown route" replies fail.

import { ROUTE_HANDLERS } from "../shared/api-routes.js";

const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const base = argValue("--base", "https://soma.mayanja.dev").replace(/\/$/, "");
const waitSeconds = Number(argValue("--wait", "0"));

const PLATFORM_404 = /The page could not be found|NOT_FOUND/;
const HANDLER_NO_ROUTE = /Unknown (social|engagement|system) route|Route [a-z-]+ not implemented/;

async function probe(path) {
  try {
    const res = await fetch(base + path, {
      redirect: "manual",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    const body = await res.text().catch(() => "");
    if (res.status === 404) return { ok: false, detail: PLATFORM_404.test(body) ? "platform 404" : "handler 404" };
    if (res.status >= 500) return { ok: false, detail: `HTTP ${res.status}` };
    if (HANDLER_NO_ROUTE.test(body)) return { ok: false, detail: "handler returned unknown-route" };
    return { ok: true, detail: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function run() {
  const failures = [];
  for (const route of Object.keys(ROUTE_HANDLERS).sort()) {
    for (const path of [`/api/${route}`, `/api/${route}/`]) {
      const result = await probe(path);
      console.log(`${result.ok ? "ok  " : "FAIL"}  ${path.padEnd(24)} ${result.detail}`);
      if (!result.ok) failures.push(`${path} (${result.detail})`);
    }
  }
  return failures;
}

const deadline = Date.now() + waitSeconds * 1000;
let lastFailures;
while (true) {
  lastFailures = await run();
  if (lastFailures.length === 0) {
    console.log(`\nAPI smoke passed against ${base}`);
    process.exit(0);
  }
  if (Date.now() >= deadline) break;
  console.log(`\n${lastFailures.length} failing route(s) — retrying in 15s (a deploy may still be rolling out)\n`);
  await new Promise((r) => setTimeout(r, 15_000));
}

console.error(`\nAPI smoke failed against ${base}:`);
for (const failure of lastFailures) console.error(`  - ${failure}`);
process.exit(1);
