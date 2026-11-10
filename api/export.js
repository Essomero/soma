// Export endpoint — streams a downloadable backup of your content.
// Two strategies based on DB mode:
//   Local SQLite (Docker / Fly / Railway) → zip with soma.db + markdown dump
//   Turso remote (Vercel / Netlify)       → zip with markdown dump only
// Falls back to markdown-only dump if zipping fails.

import { requireAuth } from "./_auth.js";
import { query as dbQuery, getDbInfo } from "./_db.js";
import { readFileSync } from "fs";
import { createGzip } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Markdown dump helpers ──────────────────────────────────────────

function contentToMarkdown(item, bodyJson) {
  const sections = [];
  sections.push(`# ${item.title}`);
  sections.push(`> ${item.excerpt || ""}`);
  sections.push("");
  sections.push(`- **Type:** ${item.type}`);
  sections.push(`- **Status:** ${item.status}`);
  sections.push(`- **Slug:** ${item.slug}`);
  if (item.updated_at) sections.push(`- **Updated:** ${item.updated_at}`);
  sections.push("");

  if (bodyJson) {
    // Extract readable content from body_json
    const body = typeof bodyJson === "string" ? JSON.parse(bodyJson) : bodyJson;
    sections.push(bodyToMarkdown(body));
  }

  return sections.join("\n") + "\n\n---\n\n";
}

function bodyToMarkdown(body) {
  if (!body) return "";
  if (typeof body === "string") return body;

  // Walk the body structure — handles sections, items, paragraphs etc.
  const parts = [];
  if (Array.isArray(body.sections)) {
    for (const section of body.sections) {
      if (section.heading) parts.push(`## ${section.heading}\n`);
      if (section.intro) parts.push(`${section.intro}\n`);
      if (Array.isArray(section.items)) {
        for (const item of section.items) {
          if (item.question) parts.push(`### ${item.question}\n`);
          if (Array.isArray(item.answer)) {
            for (const a of item.answer) {
              if (typeof a === "string") parts.push(`${a}\n`);
            }
          }
        }
      }
      if (Array.isArray(section.paragraphs)) {
        for (const p of section.paragraphs) {
          if (typeof p === "string") parts.push(`${p}\n`);
        }
      }
    }
  }
  if (body.paragraphs && Array.isArray(body.paragraphs)) {
    for (const p of body.paragraphs) {
      if (typeof p === "string") parts.push(`${p}\n`);
    }
  }
  if (body.content && typeof body.content === "string") parts.push(`${body.content}\n`);
  if (body.body && typeof body.body === "string") parts.push(`${body.body}\n`);

  return parts.join("\n");
}

// ── Inline zip builder (no dependencies) ──────────────────────────
// Produces a valid ZIP file in memory. Simple enough for Phase 0.

function crc32(buf) {
  let c = 0xffffffff;
  const table = crc32.table || (crc32.table = makeCrcTable());
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function makeCrcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
}

function makeZipEntry(name, data, date) {
  const utfName = Buffer.from(name, "utf8");
  const crc = crc32(data);
  const uncompressed = data.length;
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);  // local file header signature
  header.writeUInt16LE(20, 4);           // version needed
  header.writeUInt16LE(0x0800, 6);       // flags: UTF-8
  header.writeUInt16LE(0, 8);            // compression: stored
  header.writeUInt16LE((date.getSeconds() >>> 1) | (date.getMinutes() << 5) | (date.getHours() << 11), 10);
  header.writeUInt16LE(date.getDate() | ((date.getMonth() + 1) << 5) | ((date.getFullYear() - 1980) << 9), 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(uncompressed, 18);
  header.writeUInt32LE(uncompressed, 22); // compressed = stored, same size
  header.writeUInt16LE(utfName.length, 26);
  return { header, data, utfName, crc, uncompressed };
}

function buildZip(files) {
  // files: Array<{name: string, data: Buffer}>
  const now = new Date();
  const entries = files.map(f => makeZipEntry(f.name, f.data, now));
  const centralDir = [];
  let offset = 0;
  const bodyParts = [];

  for (const e of entries) {
    bodyParts.push(e.header, e.utfName, e.data);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);  // central directory file header signature
    cd.writeUInt16LE(20, 4);           // version made by
    cd.writeUInt16LE(20, 6);           // version needed
    cd.writeUInt16LE(0x0800, 8);       // flags: UTF-8
    cd.writeUInt16LE(0, 10);           // compression
    cd.writeUInt16LE(e.header.readUInt16LE(10), 12); // last mod time
    cd.writeUInt16LE(e.header.readUInt16LE(12), 14); // last mod date
    cd.writeUInt32LE(e.crc, 16);
    cd.writeUInt32LE(e.uncompressed, 20);
    cd.writeUInt32LE(e.uncompressed, 24);
    cd.writeUInt16LE(e.utfName.length, 28);
    cd.writeUInt16LE(0, 30);           // extra field length
    cd.writeUInt16LE(0, 32);           // file comment length
    cd.writeUInt16LE(0, 34);           // disk number start
    cd.writeUInt16LE(0, 36);           // internal file attributes
    cd.writeUInt32LE(0, 38);           // external file attributes
    cd.writeUInt32LE(offset, 42);      // relative offset
    centralDir.push(cd, e.utfName);
    offset += 30 + e.utfName.length + e.data.length;
  }

  const cdEnd = Buffer.alloc(22);
  cdEnd.writeUInt32LE(0x06054b50, 0);  // end of central directory signature
  cdEnd.writeUInt16LE(0, 4);           // disk number
  cdEnd.writeUInt16LE(0, 6);           // disk with central directory
  cdEnd.writeUInt16LE(entries.length, 8);  // entries on this disk
  cdEnd.writeUInt16LE(entries.length, 10); // total entries
  const cdSize = centralDir.reduce((n, b) => n + b.length, 0);
  cdEnd.writeUInt32LE(cdSize, 12);
  cdEnd.writeUInt32LE(offset, 16);
  cdEnd.writeUInt16LE(0, 20);          // comment length

  return Buffer.concat([...bodyParts, ...centralDir, cdEnd]);
}

// ── Content dump ──────────────────────────────────────────────────

async function dumpContent() {
  const rows = await dbQuery("SELECT * FROM content_items ORDER BY type ASC, position ASC", []);
  const parts = [];
  const assets = new Set();

  for (const row of rows) {
    const item = {
      slug: row.slug,
      type: row.type,
      title: row.title,
      excerpt: row.excerpt,
      status: row.status,
      updated_at: row.updated_at,
    };

    let bodyJson = row.body_json;
    if (typeof bodyJson === "string") {
      try { bodyJson = JSON.parse(bodyJson); } catch {}
    }

    parts.push(contentToMarkdown(item, bodyJson));

    // Collect image URLs from body
    const bodyStr = typeof row.body_json === "string" ? row.body_json : JSON.stringify(row.body_json || {});
    const imgMatches = bodyStr.match(/https?:\/\/[^\s"')>]+\.(?:png|jpg|jpeg|gif|webp|svg|avif)/gi);
    if (imgMatches) imgMatches.forEach(u => assets.add(u));
  }

  const header = [
    "# Soma Export",
    `> Exported: ${new Date().toISOString()}`,
    `> Total items: ${rows.length}`,
    "",
    "---",
    "",
  ].join("\n");

  return {
    content: header + parts.join("\n"),
    assets: [...assets],
    count: rows.length,
  };
}

// ── Handler ────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireAuth(req, res)) return;

  try {
    const dbInfo = getDbInfo();
    const format = (req.query?.format || "content").trim().toLowerCase();
    const includeDb = format === "full" && dbInfo.mode === "local";

    const dump = await dumpContent();

    const files = [
      { name: "content.md", data: Buffer.from(dump.content, "utf-8") },
      {
        name: "assets-manifest.json",
        data: Buffer.from(JSON.stringify({
          exportedAt: new Date().toISOString(),
          totalItems: dump.count,
          assets: dump.assets,
        }, null, 2), "utf-8"),
      },
    ];

    // Include the database file only if format=full and local SQLite
    if (includeDb && dbInfo.localPath) {
      const dbPath = join(rootDir, dbInfo.localPath);
      try {
        const dbData = readFileSync(dbPath);
        files.push({ name: "soma.db", data: dbData });
      } catch {
        // DB file not readable — skip it
      }
    }

    const zipBuffer = buildZip(files);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="soma-export-${new Date().toISOString().slice(0, 10)}.zip"`);
    res.setHeader("Content-Length", zipBuffer.length);
    res.status(200);
    res.end(zipBuffer);

  } catch (e) {
    console.error("[export] Error:", e.message);
    res.status(500).json({ error: "Export failed: " + e.message });
  }
}
