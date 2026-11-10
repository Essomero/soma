#!/usr/bin/env tsx
/**
 * CLI export — backup all Soma content as markdown.
 *
 * Works with both Turso remote and local SQLite.
 * For Turso users on Vercel/Netlify/Cloudflare who hit the 10s function
 * timeout, run this locally with your Turso credentials:
 *
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npx tsx scripts/export.ts
 *
 * For Docker/Fly/Railway users the /api/export endpoint works directly
 * (streams a zip). This script is an alternative that also works.
 *
 * Usage:
 *   npx tsx scripts/export.ts                        # uses .env / .env.local
 *   npx tsx scripts/export.ts -o ./backup            # custom output dir
 *   npx tsx scripts/export.ts --with-db               # include soma.db in zip
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@libsql/client";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load env from files
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const fp = join(rootDir, file);
    if (!existsSync(fp)) continue;
    const text = readFileSync(fp, "utf-8");
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] = process.env[m[1]] || m[2].replace(/^"|"$/g, "");
    }
  }
}

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const outDir = args.includes("-o") ? args[args.indexOf("-o") + 1] || "soma-export" : "soma-export";
  const withDb = args.includes("--with-db");

  const tursoUrl = (process.env.TURSO_DATABASE_URL || process.env.TURSO_DB || "").trim();
  const tursoToken = (process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "").trim();
  const useTurso = !!(tursoUrl && tursoToken);

  let db;
  if (useTurso) {
    const httpUrl = tursoUrl.replace(/^libsql:\/\//, "https://");
    db = createClient({ url: httpUrl, authToken: tursoToken });
    console.log(`Exporting from Turso: ${httpUrl}`);
  } else {
    // Try local SQLite
    const localUrl = (process.env.DATABASE_URL || process.env.SQLITE_PATH || "file:./data/soma.db").trim();
    const filePath = localUrl.replace(/^file:/, "").split("?")[0];
    const absPath = join(rootDir, filePath);
    if (!existsSync(absPath)) {
      console.error("No Turso credentials and no local SQLite file found.");
      console.error("Set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN or run from the repo root.");
      process.exit(1);
    }
    db = createClient({ url: `file:${absPath}` });
    console.log(`Exporting from local SQLite: ${absPath}`);
  }

  const rows = await db.execute("SELECT * FROM content_items ORDER BY type ASC, position ASC");
  const items = rows.rows;

  // Build markdown dump
  const parts = [];
  parts.push("# Soma Export\n");
  parts.push(`> Exported: ${new Date().toISOString()}\n`);
  parts.push(`> Total items: ${items.length}\n\n`);
  parts.push("---\n\n");

  for (const row of items) {
    parts.push(`# ${row.title || row.slug}\n`);
    parts.push(`> ${row.excerpt || ""}\n\n`);
    parts.push(`- **Type:** ${row.type || ""}`);
    parts.push(`\n- **Status:** ${row.status || ""}`);
    parts.push(`\n- **Slug:** ${row.slug || ""}`);
    if (row.updated_at) parts.push(`\n- **Updated:** ${row.updated_at}`);
    parts.push("\n\n---\n\n");
  }

  mkdirSync(join(rootDir, outDir), { recursive: true });
  const mdPath = join(rootDir, outDir, "content.md");
  writeFileSync(mdPath, parts.join(""));
  console.log(`\nWrote content.md (${parts.join("").length} bytes)`);

  // Assets manifest
  const manifest = {
    exportedAt: new Date().toISOString(),
    totalItems: items.length,
    assets: [],
  };
  const manifestPath = join(rootDir, outDir, "assets-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Wrote assets-manifest.json`);

  // Include DB file if --with-db and local
  if (withDb && !useTurso) {
    const localUrl = (process.env.DATABASE_URL || process.env.SQLITE_PATH || "file:./data/soma.db").trim();
    const filePath = localUrl.replace(/^file:/, "").split("?")[0];
    const absPath = join(rootDir, filePath);
    if (existsSync(absPath)) {
      const dbData = readFileSync(absPath);
      writeFileSync(join(rootDir, outDir, "soma.db"), dbData);
      console.log(`Copied soma.db (${dbData.length} bytes)`);
    }
  }

  console.log(`\nExport written to: ${join(rootDir, outDir)}/`);
  db.close();
}

main().catch((e) => {
  console.error("Export failed:", e.message || e);
  process.exit(1);
});
