// Enforces the shared-core import boundary.
//
//   shared/  -> may not import from src/, api/, functions/, netlify/
//   shared/  -> may not touch window, document, or process
//   src/     -> may not import server-only shared modules (shared/chat)
//
// Run from package.json ci:check.

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const violations = [];

const IMPORT_RE = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;

async function listFiles(dir) {
  try {
    return await readdir(dir, { recursive: true, withFileTypes: false });
  } catch {
    return [];
  }
}

function checkShared(file, text) {
  for (const match of text.matchAll(IMPORT_RE)) {
    const spec = match[1];
    if (/(^|\/)(src|api|functions|netlify)\//.test(spec)) {
      violations.push(`${file}: imports adapter code "${spec}"`);
    }
  }
  if (/\bwindow\b/.test(text)) violations.push(`${file}: references window`);
  if (/\bdocument\b/.test(text)) violations.push(`${file}: references document`);
  if (/\bprocess\b/.test(text)) violations.push(`${file}: references process`);
}

function checkSrc(file, text) {
  for (const match of text.matchAll(IMPORT_RE)) {
    const spec = match[1];
    if (spec.includes("shared/chat")) {
      violations.push(`${file}: imports server-only "${spec}"`);
    }
  }
}

const sharedDir = join(root, "shared");
for (const file of await listFiles(sharedDir)) {
  const path = join(sharedDir, file);
  if (!/\.(js|mjs|ts)$/.test(path)) continue;
  checkShared(relative(root, path), await readFile(path, "utf8"));
}

const srcDir = join(root, "src");
for (const file of await listFiles(srcDir)) {
  const path = join(srcDir, file);
  if (!/\.(js|mjs|ts|tsx)$/.test(path)) continue;
  checkSrc(relative(root, path), await readFile(path, "utf8"));
}

if (violations.length) {
  console.error("Boundary violations:\n" + violations.map((v) => `  ${v}`).join("\n"));
  process.exit(1);
}
console.log("Boundaries clean");
