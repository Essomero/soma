/**
 * Shared setup for content tooling scripts (seed, publish).
 * Reads .env.local then .env (real environment wins), exposes a libsql client.
 * Usage: const { db } = await getDb(); db.execute({ sql, args });
 * Supports both hosted Turso (TURSO_DATABASE_URL + token) and local file (Docker path).
 */
import { existsSync, readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@libsql/client";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = join(rootDir, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || m[1] in process.env) continue;
      let v = m[2].trim();
      if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
}

function ensureLocalDir(fileUrl: string) {
  const fp = fileUrl.replace(/^file:/, "").split("?")[0];
  if (!fp || fp === ":memory:") return;
  try {
    const abs = fp.startsWith("/") ? fp : join(rootDir, fp);
    mkdirSync(dirname(abs), { recursive: true });
  } catch {}
}

export async function getDb() {
  loadEnv();
  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.TURSO_DB || "";
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "";
  if (tursoUrl && authToken) {
    return createClient({ url: tursoUrl, authToken });
  }
  const rawLocal = (process.env.DATABASE_URL || process.env.SQLITE_PATH || "").trim();
  const localUrl = rawLocal
    ? rawLocal.startsWith("file:")
      ? rawLocal
      : `file:${rawLocal}`
    : "file:./data/soma.db";
  ensureLocalDir(localUrl);
  return createClient({ url: localUrl });
}



export const CREATE_CONTENT_ITEMS = `CREATE TABLE IF NOT EXISTS content_items (
  slug TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'private',
  title TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  body_json TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  archived_at TEXT
)`;
