// MCP server for the Soma repo: content-authoring tools on stdio.
//   node server/mcp-server.mjs        (via the "soma" entry in .mcp.json)
//
// Speaks the Model Context Protocol over stdio: one JSON-RPC 2.0 object per
// line on stdin, one per line on stdout (JSONL). Agents use the tools below
// to drive the SOMA_SKILL.md workflow without reading the skill or scraping
// the site: draft manuscript -> validate -> publish (private) -> confirm
// store row -> verify URLs -> archive with the exact commit command.
//
// stdout is the protocol channel ONLY. Diagnostics go to stderr; never log
// to stdout. The server is read-only except for two deliberate writes:
// publish_manuscript (upserts store rows; always private) and
// archive_manuscript (copies a published manuscript into src/content/).
//
// Tools shell out to the repo's own entry points (scripts/publish-content.ts
// with --check for validation, the Turso store for reads) so behavior is
// always the single source of truth; nothing is reimplemented here.

import { createInterface } from "node:readline";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readdirSync, statSync, copyFileSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

import { CONTENT_TYPES, TOPICS, TEMPLATES, ROUTE_BASE, WORKFLOW_NOTE } from "./mcp-content-data.mjs";

const run = promisify(execFile);
const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const TYPES = new Set(CONTENT_TYPES.map((t) => t.type));
const TSX_BIN = join(rootDir, "node_modules", ".bin", "tsx");

// ── Env (same loader as scripts/content-db.ts / server/api-dev.mjs) ────────
for (const file of [".env.local", ".env"]) {
  const path = join(rootDir, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

let dbClient = null;
function getDb() {
  if (dbClient) return dbClient;
  const url = process.env.TURSO_DATABASE_URL || process.env.TURSO_DB;
  const authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN;
  if (!url || !authToken) {
    throw new Error("Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN (see .env.example), set them in .env or .env.local");
  }
  dbClient = createClient({ url, authToken });
  return dbClient;
}

function requireStr(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}
function requireArr(value, name) {
  if (!Array.isArray(value) || !value.length || !value.every((f) => typeof f === "string" && f)) {
    throw new Error(`${name} must be a non-empty array of file paths`);
  }
  return value.map((f) => resolve(f));
}

// ── Tool implementations ────────────────────────────────────────────────────

function contentTypesText() {
  const rows = CONTENT_TYPES.map((t) => `| ${t.type} | \`${t.folder}\` | \`${t.route}\` | ${t.when} |`).join("\n");
  return `Content types (publishable manuscript kinds):

| Type | Archive folder | Route | When to use |
|---|---|---|---|
${rows}

Lesson = a story whose \`sections[].paragraphs[]\` include \`{ type: "lab" }\` blocks pointing at the soma-labs repo; a Lab is not a page of its own.

Every manuscript is written as a typed object in \`drafts/<type>/<slug>.ts\` (gitignored), published into the Turso store as a private row, then archived to \`src/content/<type>/<slug>.ts\` after the owner flips it public. A manuscript committed to git is implicitly public; unpublished writing must never touch src/content/.`;
}

function topicsText() {
  return `Valid topic slugs (\`topics: [...]\` must only use these):

${TOPICS.map((t) => `- \`${t.slug}\` - ${t.title}: ${t.description}`).join("\n")}

Source of truth: src/content/topics/index.ts (allTopics).`;
}

function templateText(type) {
  const t = CONTENT_TYPES.find((c) => c.type === type);
  if (!t) throw new Error(`unknown type ${type}; valid: ${TYPES.size ? [...TYPES].join(", ") : "none"}`);
  const body = TEMPLATES[type];
  if (!body) throw new Error(`no template for ${type}`);
  return `Starter ${type} manuscript (fields match src/types/index.ts):

\`\`\`ts
${body}
\`\`\`

${WORKFLOW_NOTE.replace("{route}", t.route)}`;
}

async function queryRows(sql, args = []) {
  const db = getDb();
  try {
    return (await db.execute({ sql, args })).rows;
  } catch (e) {
    throw new Error(`store query failed: ${e.message}`);
  }
}

async function existingContent(type) {
  const rows = await queryRows(
    type
      ? "SELECT slug, type, title, status, position FROM content_items WHERE type = ? ORDER BY position DESC LIMIT 500"
      : "SELECT slug, type, title, status, position FROM content_items ORDER BY type, position DESC LIMIT 500",
    type ? [type] : [],
  );
  if (!rows.length) return `No content_items rows${type ? ` for type ${type}` : ""} in the store.`;
  return `Store rows (${rows.length}${rows.length >= 500 ? "+" : ""}):\n\n${rows
    .map((r) => `- \`${r.slug}\` | ${r.type} | ${String(r.title).slice(0, 60)} | ${r.status} | pos ${r.position}`)
    .join("\n")}`;
}

async function storeRow(slug) {
  const rows = await queryRows("SELECT slug, type, status, title, position, updated_at FROM content_items WHERE slug = ?", [slug]);
  if (!rows.length) return `No row for '${slug}' in the store. The piece never landed: run publish_manuscript first.`;
  const r = rows[0];
  return `Row confirmed: ${JSON.stringify(r, null, 2)}`;
}

async function getContent(slug) {
  const rows = await queryRows("SELECT slug, type, status, title, excerpt, body_json, meta_json, position, updated_at FROM content_items WHERE slug = ?", [slug]);
  if (!rows.length) return `No row for '${slug}' in the store.`;
  const r = rows[0];
  const body = JSON.parse(String(r.body_json));
  const meta = JSON.parse(String(r.meta_json));
  return `${r.slug} (${r.type}, ${r.status}, pos ${r.position})\n${r.title}\n${r.excerpt}\n\nbody_json:\n${JSON.stringify(body, null, 2)}\n\nmeta_json:\n${JSON.stringify(meta, null, 2)}`;
}

async function drafts(type) {
  const wanted = type ? [type] : [...TYPES];
  const out = [];
  for (const t of wanted) {
    const dir = join(rootDir, "drafts", t);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".ts")) continue;
      const st = statSync(join(dir, name));
      out.push(`- drafts/${t}/${name} (${st.size} B, ${st.mtime.toISOString().slice(0, 10)})`);
    }
  }
  return out.length ? `Manuscripts staged in drafts/ (gitignored, unpublished):\n\n${out.join("\n")}` : "No staged drafts.";
}

async function runPublish(args) {
  try {
    const { stdout, stderr } = await run(TSX_BIN, ["scripts/publish-content.ts", ...args], {
      cwd: rootDir,
      timeout: 120_000,
      maxBuffer: 20 * 1024 * 1024,
    });
    return `${stdout}${stderr}`.trim();
  } catch (e) {
    const detail = [e.stdout, e.stderr, e.message].filter(Boolean).join("\n").trim();
    throw new Error(detail || String(e));
  }
}

async function validateManuscript(files) {
  const full = files.map((f) => resolve(f));
  for (const f of full) if (!existsSync(f)) throw new Error(`no such file: ${f}`);
  const out = await runPublish(["--check", ...full]);
  return `${out}\n\nValidation passed: the manuscript(s) are publish-ready. Next: publish_manuscript, then store_row to confirm.`;
}

async function publishManuscript({ files, type, featured }) {
  const full = files.map((f) => resolve(f));
  for (const f of full) if (!existsSync(f)) throw new Error(`no such file: ${f}`);
  if (type && !TYPES.has(type)) throw new Error(`unknown type ${type}; valid: ${[...TYPES].join(", ")}`);
  const args = [];
  if (type) args.push("--type", type);
  if (featured) args.push("--featured");
  args.push(...full);
  const out = await runPublish(args);
  return `${out}\n\nRows land private and publishing never touches visibility. Confirm each slug with store_row.`;
}

async function verifyUrl(url) {
  const head = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(15_000) });
  if ([405, 403, 501].includes(head.status)) {
    const body = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(30_000) });
    return `GET ${body.status} ${body.ok ? "OK" : "FAILED"} (final: ${body.url})`;
  }
  return `HEAD ${head.status} ${head.ok ? "OK" : "FAILED"} (final: ${head.url})`;
}

async function archiveManuscript(type, slug) {
  if (!TYPES.has(type) || !ROUTE_BASE[type]) throw new Error(`unknown type ${type}`);
  const src = join(rootDir, "drafts", type, `${slug}.ts`);
  const dest = join(rootDir, "src", "content", type, `${slug}.ts`);
  if (!existsSync(src)) throw new Error(`no staged draft at drafts/${type}/${slug}.ts`);
  const rows = await queryRows("SELECT slug, type, status, title FROM content_items WHERE slug = ?", [slug]);
  if (!rows.length) throw new Error(`no store row for '${slug}': publish_manuscript it first (and the owner must flip it public) before archiving.`);
  const row = rows[0];
  if (row.type !== type) throw new Error(`store row for '${slug}' is type ${row.type}, not ${type}`);
  if (existsSync(dest)) throw new Error(`refusing to overwrite existing ${dest}; the archive copy already exists.`);
  copyFileSync(src, dest);
  return [
    `Archived drafts/${type}/${slug}.ts -> ${dest} (status: ${row.status}).`,
    `Commit the single file now:`,
    `  git add ${dest}`,
    `  git commit -m "Add ${type}: ${row.title}"`,
    `Never git add -A: a blind add sweeps unfinished work into the public fork.`,
  ].join("\n");
}

// ── Tool registry ───────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "content_types",
    description: "List the 10 publishable content types (story, guide, doc, course, book, series, test, featured, podcast, topic) with archive folder, route pattern, and when to use each. Call this first when starting a content task.",
    inputSchema: { type: "object", properties: {}, required: [] },
    run: async () => contentTypesText(),
  },
  {
    name: "topics",
    description: "List valid topic slugs for the topics: field. A manuscript's topics must only use these.",
    inputSchema: { type: "object", properties: {}, required: [] },
    run: async () => topicsText(),
  },
  {
    name: "manuscript_template",
    description: "Get a starter TypeScript manuscript object for a type (fields match src/types/index.ts), plus the publish lifecycle. Use it to scaffold drafts/<type>/<slug>.ts.",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string", description: "Content type: story, guide, doc, course, book, series, test, featured, podcast, topic" } },
      required: ["type"],
    },
    run: async ({ type }) => templateText(requireStr(type, "type")),
  },
  {
    name: "existing_content",
    description: "List rows in the content store (slug, type, title, status, position). Optional type filter. Use to check slug uniqueness before drafting and to see what is already live.",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string", description: "Optional content type filter" } },
      required: [],
    },
    run: async ({ type }) => existingContent(type ? requireStr(type, "type") : undefined),
  },
  {
    name: "store_row",
    description: "Confirm a slug's row in the content store: slug, type, status, title, position, updated_at. A manuscript task is NOT done until this confirms the row exists (private).",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "Content slug" } },
      required: ["slug"],
    },
    run: async ({ slug }) => storeRow(requireStr(slug, "slug")),
  },
  {
    name: "get_content",
    description: "Read a full content row from the store, including body_json and meta_json. Use to review what a slug actually contains (the alternative to browsing the site).",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "Content slug" } },
      required: ["slug"],
    },
    run: async ({ slug }) => getContent(requireStr(slug, "slug")),
  },
  {
    name: "drafts",
    description: "List staged manuscripts under drafts/ (gitignored) by type. Optional type filter.",
    inputSchema: {
      type: "object",
      properties: { type: { type: "string", description: "Optional content type filter" } },
      required: [],
    },
    run: async ({ type }) => drafts(type ? requireStr(type, "type") : undefined),
  },
  {
    name: "validate_manuscript",
    description: "Validate staged manuscript(s) without writing: runs the exact publish checks (required fields, slug shape, uniqueness, cross-file references against the store) and stops before any DB write. Pass the same files you plan to publish together (a course and its lesson stories must resolve within one batch). Call before publish_manuscript.",
    inputSchema: {
      type: "object",
      properties: { files: { type: "array", items: { type: "string" }, description: "Manuscript paths, e.g. [\"drafts/story/my-slug.ts\"]" } },
      required: ["files"],
    },
    run: async ({ files }) => validateManuscript(requireArr(files, "files")),
  },
  {
    name: "publish_manuscript",
    description: "Publish one or more staged manuscripts into the content store. Validates, then upserts rows as PRIVATE (publishing never touches visibility; only the owner's toggle makes content public). Type is inferred from the parent directory (drafts/<type>/), or pass --type for files outside a typed dir. --featured moves the featured flag. Verify each slug with store_row afterwards.",
    inputSchema: {
      type: "object",
      properties: {
        files: { type: "array", items: { type: "string" }, description: "Manuscript paths, e.g. [\"drafts/story/my-slug.ts\"]" },
        type: { type: "string", description: "Optional type override for files outside a typed dir" },
        featured: { type: "boolean", description: "Set the featured flag on the row(s)" },
      },
      required: ["files"],
    },
    run: async (input) => publishManuscript({ files: requireArr(input.files, "files"), type: input.type ?? undefined, featured: Boolean(input.featured) }),
  },
  {
    name: "verify_url",
    description: "Check an image, YouTube embed, or external link returns HTTP 200 via HEAD (falls back to GET). The skill REQUIRES every image/video/link URL in a manuscript to be verified before publishing; guessed Unsplash IDs and video IDs are the #1 source of broken content.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", description: "Absolute URL to verify" } },
      required: ["url"],
    },
    run: async ({ url }) => verifyUrl(requireStr(url, "url")),
  },
  {
    name: "archive_manuscript",
    description: "After the owner flips a piece public, copy the staged draft to its archive home src/content/<type>/<slug>.ts and return the exact git commit command (never git add -A). Refuses to overwrite an existing archive copy or to archive an unpublished/typed-mismatch row.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Content type matching the draft's parent dir" },
        slug: { type: "string", description: "Content slug" },
      },
      required: ["type", "slug"],
    },
    run: async ({ type, slug }) => archiveManuscript(requireStr(type, "type"), requireStr(slug, "slug")),
  },
];

const toolsList = TOOLS.map(({ run: _run, ...schema }) => schema);

// ── JSON-RPC 2.0 over stdio ─────────────────────────────────────────────────

const readline = createInterface({ input: process.stdin, crlfDelay: Infinity });

function send(msg) {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}
function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}
function replyError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

readline.on("line", async (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (!msg || typeof msg !== "object" || typeof msg.method !== "string") return;

  const { id, method } = msg;
  if (method === "initialize") {
    const version = (msg.params && typeof msg.params.protocolVersion === "string" && msg.params.protocolVersion) || "2025-03-26";
    reply(id, {
      protocolVersion: version,
      capabilities: { tools: {} },
      serverInfo: { name: "soma", version: "1.0.0" },
    });
    return;
  }
  if (method.startsWith("notifications/")) return; // initialized, cancelled, ...
  if (method === "ping") return reply(id, {});
  if (method === "tools/list") return reply(id, { tools: toolsList });
  if (method === "tools/call") {
    const name = msg.params?.name;
    const input = (msg.params?.arguments && typeof msg.params.arguments === "object" ? msg.params.arguments : {});
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) return replyError(id, -32602, `unknown tool: ${name}`);
    try {
      const text = await tool.run(input);
      reply(id, { content: [{ type: "text", text: String(text) }] });
    } catch (e) {
      reply(id, { content: [{ type: "text", text: String(e && e.message ? e.message : e) }], isError: true });
    }
    return;
  }
  if (id !== undefined) replyError(id, -32601, `method not found: ${method}`);
});

process.stderr.write(`soma MCP server ready: ${TOOLS.length} tools (${TOOLS.map((t) => t.name).join(", ")})\n`);