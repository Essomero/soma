#!/usr/bin/env tsx
/**
 * Agent publishing path: .ts manuscript -> content_items row (always private).
 *   npm run publish -- [--type story] [--featured] [--check] <file...>
 * Publishing validates schema and cross-file references, then upserts.
 * Publishing never touches visibility: new rows land private, existing rows
 * keep their status. Going public is a human toggle flip, never a CLI flag.
 * --check runs the full validation (batch shape, required fields, slug
 * uniqueness, DB + batch reference integrity, content gates) and stops
 * before any write.
 */
import { pathToFileURL } from "url";
import { basename, dirname, resolve } from "path";
import { getDb, CREATE_CONTENT_ITEMS, migrateContentItemsIfNeeded } from "./content-db.ts";

type Fields = Record<string, unknown>;

const TYPES = new Set(["story", "guide", "doc", "course", "book", "series", "test", "featured", "podcast", "topic"]);

// Per-type required fields. Missing a required field = a crash at render time.
// These match the non-optional TS interface fields that source files provide
// (id and href are computed by the content index, not checked here).
const REQUIRED: Record<string, string[]> = {
  story: ["slug", "title", "category", "excerpt", "image", "imageAlt", "author", "publishedAt", "intro", "body"],
  guide: ["slug", "title", "category", "excerpt", "image", "imageAlt", "author", "publishedAt", "intro", "body"],
  doc: ["slug", "title", "category", "description", "image", "imageAlt", "author", "publishedAt", "tags", "sections"],
  course: ["slug", "title", "description", "image", "imageAlt", "author", "publishedAt", "lessons"],
  book: ["slug", "title", "description", "image", "imageAlt", "author", "publishedAt", "chapters"],
  series: ["slug", "title", "description", "image", "imageAlt", "author", "publishedAt", "episodes"],
  test: ["slug", "title", "description", "category", "image", "imageAlt", "author", "publishedAt", "sources", "questions"],
  featured: ["slug", "tag", "title", "description", "image", "imageAlt", "author", "publishedAt"],
  podcast: ["id", "title", "image", "imageAlt", "episode", "publishedAt", "duration", "description", "category"],
  topic: ["slug", "title", "description", "icon", "accentColor", "accentBg", "accentText"],
};

// Fields holding slug pointers to other rows, checked against DB + batch.
const REF_FIELDS: Record<string, string> = {
  course: "lessons",
  book: "chapters",
  series: "episodes",
};

function refsOf(type: string, body: Fields): string[] {
  const out: string[] = [];
  if (type === "test") {
    const src = body.source;
    if (src && typeof src === "object" && "slug" in src && typeof src.slug === "string") out.push(src.slug);
    const lessons = body.lessons;
    if (Array.isArray(lessons)) {
      for (const l of lessons) {
        if (l && typeof l === "object" && "storySlug" in l && typeof l.storySlug === "string") out.push(l.storySlug);
      }
    }
    return out;
  }
  const field = REF_FIELDS[type];
  if (!field) return out;
  const list = body[field];
  if (!Array.isArray(list)) return out;
  for (const entry of list) {
    if (entry && typeof entry === "object") {
      const cand = ("storySlug" in entry ? entry.storySlug : ("slug" in entry ? entry.slug : undefined));
      if (typeof cand === "string") out.push(cand);
    }
  }
  return out;
}

// ── Content validation gates ───────────────────────────────────────────────
// Called after required-field checks, before batch.push(). Fail-fast on first
// error. Warnings printed to stderr. Checks ordered cheapest-first.

const VALID_TOPIC_SLUGS = new Set([
  "technology", "economics", "philosophy", "open-source",
  "career", "accessibility", "fact-check", "devops", "startups", "marketing",
]);

const UNSPLASH_RE = /^https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9-]+\?w=\d+&h=\d+&fit=crop$/;
const YT_VID_RE = /^[a-zA-Z0-9_-]{11}$/;

function validateContent(f: string, type: string, body: Fields): void {
  // ── 1. Image URL format ─────────────────────────────────────────────────
  if (typeof body.image === "string" && body.image) {
    if (!UNSPLASH_RE.test(body.image)) {
      throw new Error(
        `${f}: image does not match Unsplash photo URL pattern ` +
        `(expected https://images.unsplash.com/photo-{ID}?w=...&h=...&fit=crop)`
      );
    }
  }
  // Inline images inside sections.paragraphs
  const sections = body.sections;
  if (Array.isArray(sections)) {
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si] as Record<string, unknown> | undefined;
      if (!sec || typeof sec !== "object") continue;
      const paragraphs = sec.paragraphs;
      if (!Array.isArray(paragraphs)) continue;
      for (let pi = 0; pi < paragraphs.length; pi++) {
        const p = paragraphs[pi];
        if (!p || typeof p !== "object") continue;
        const block = p as Record<string, unknown>;
        if (block.type === "image" && typeof block.src === "string" && block.src) {
          if (!UNSPLASH_RE.test(block.src)) {
            throw new Error(
              `${f}: sections[${si}].paragraphs[${pi}].src does not match ` +
              `Unsplash photo URL pattern`
            );
          }
        }
      }
    }
  }

  // ── 2. YouTube videoId format ───────────────────────────────────────────
  if (Array.isArray(sections)) {
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si] as Record<string, unknown> | undefined;
      if (!sec || typeof sec !== "object") continue;
      const paragraphs = sec.paragraphs;
      if (!Array.isArray(paragraphs)) continue;
      for (let pi = 0; pi < paragraphs.length; pi++) {
        const p = paragraphs[pi];
        if (!p || typeof p !== "object") continue;
        const block = p as Record<string, unknown>;
        if (block.type === "youtube") {
          const vid = block.videoId;
          if (typeof vid !== "string" || !YT_VID_RE.test(vid)) {
            throw new Error(
              `${f}: invalid YouTube videoId '${String(vid)}' in ` +
              `sections[${si}].paragraphs[${pi}] — must be 11 alphanumeric chars`
            );
          }
        }
      }
    }
  }

  // ── 3. No em dashes / en dashes in prose fields ─────────────────────────
  function checkDash(val: unknown, label: string): void {
    if (typeof val !== "string") return;
    if (val.includes("\u2014")) {
      throw new Error(
        `${f}: ${label} contains em dash (—) — use a plain dash or rephrase`
      );
    }
    if (val.includes("\u2013")) {
      throw new Error(
        `${f}: ${label} contains en dash (–) — use a plain dash or rephrase`
      );
    }
  }
  // Top-level prose
  checkDash(body.title, "title");
  checkDash(body.description, "description");
  checkDash(body.excerpt, "excerpt");
  checkDash(body.intro, "intro");
  checkDash(body.category, "category");
  // body[] entries (guide/story body string array)
  const bodyArr = body.body;
  if (Array.isArray(bodyArr)) {
    for (let bi = 0; bi < bodyArr.length; bi++) {
      checkDash(bodyArr[bi], `body[${bi}]`);
    }
  }
  // sections[].heading, sections[].intro
  if (Array.isArray(sections)) {
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si] as Record<string, unknown> | undefined;
      if (!sec || typeof sec !== "object") continue;
      checkDash(sec.heading, `sections[${si}].heading`);
      checkDash(sec.intro, `sections[${si}].intro`);
      // sections[].paragraphs[] (string entries; skip ContentBlock.code types)
      const paragraphs = sec.paragraphs;
      if (Array.isArray(paragraphs)) {
        for (let pi = 0; pi < paragraphs.length; pi++) {
          const p = paragraphs[pi];
          if (typeof p === "string") {
            // Skip fenced code blocks — they may contain dashes legitimately
            if (p.startsWith("```") || p.startsWith("---")) continue;
            checkDash(p, `sections[${si}].paragraphs[${pi}]`);
          } else if (p && typeof p === "object") {
            const obj = p as Record<string, unknown>;
            // For paragraph-type ContentBlock, check the text
            if (obj.type === "paragraph" && typeof obj.text === "string") {
              checkDash(obj.text, `sections[${si}].paragraphs[${pi}].text`);
            }
            // For callout blocks, check text
            if (obj.type === "callout" && typeof obj.text === "string") {
              checkDash(obj.text, `sections[${si}].paragraphs[${pi}].text`);
            }
          }
        }
      }
      // sections[].items[].question / answer[] (doc type)
      const items = sec.items;
      if (Array.isArray(items)) {
        for (let ii = 0; ii < items.length; ii++) {
          const item = items[ii] as Record<string, unknown> | undefined;
          if (!item || typeof item !== "object") continue;
          checkDash(item.question, `sections[${si}].items[${ii}].question`);
          const answers = item.answer;
          if (Array.isArray(answers)) {
            for (let ai = 0; ai < answers.length; ai++) {
              const a = answers[ai];
              if (typeof a === "string") {
                if (a.startsWith("```") || a.startsWith("---")) continue;
                checkDash(a, `sections[${si}].items[${ii}].answer[${ai}]`);
              } else if (a && typeof a === "object") {
                const obj = a as Record<string, unknown>;
                if (obj.type === "paragraph" && typeof obj.text === "string") {
                  checkDash(obj.text, `sections[${si}].items[${ii}].answer[${ai}].text`);
                }
              }
            }
          }
        }
      }
    }
  }
  // pullQuote / pullQuotes[].quote
  if (body.pullQuote && typeof body.pullQuote === "object") {
    checkDash((body.pullQuote as Record<string, unknown>).quote, "pullQuote.quote");
  }
  const pullQuotes = body.pullQuotes;
  if (Array.isArray(pullQuotes)) {
    for (let pi = 0; pi < pullQuotes.length; pi++) {
      const pq = pullQuotes[pi] as Record<string, unknown> | undefined;
      if (pq && typeof pq === "object") {
        checkDash(pq.quote, `pullQuotes[${pi}].quote`);
      }
    }
  }
  // bentoHighlights[].title / description
  const bentos = body.bentoHighlights;
  if (Array.isArray(bentos)) {
    for (let bi = 0; bi < bentos.length; bi++) {
      const b = bentos[bi] as Record<string, unknown> | undefined;
      if (b && typeof b === "object") {
        checkDash(b.title, `bentoHighlights[${bi}].title`);
        checkDash(b.description, `bentoHighlights[${bi}].description`);
      }
    }
  }
  // callout.text in (featured etc.) — not nested in sections
  if (typeof body.callout === "object" && body.callout) {
    checkDash((body.callout as Record<string, unknown>).text, "callout.text");
  }

  // ── 4. Topic slug validity ──────────────────────────────────────────────
  const topics = body.topics;
  if (Array.isArray(topics)) {
    for (let ti = 0; ti < topics.length; ti++) {
      const slug = topics[ti];
      if (typeof slug === "string" && !VALID_TOPIC_SLUGS.has(slug)) {
        throw new Error(
          `${f}: topics[${ti}] = '${slug}' is not a valid topic slug`
        );
      }
    }
  }

  // ── 5. Code fence integrity (all types with body/sections/answers) ───────
  // Stories, featured, guides: body[] and sections[].paragraphs[]
  if (Array.isArray(bodyArr)) {
    let inFence = false;
    for (let bi = 0; bi < bodyArr.length; bi++) {
      const entry = bodyArr[bi];
      if (typeof entry !== "string") continue;
      const openCount = (entry.match(/```/g) || []).length;
      if (openCount % 2 !== 0) {
        if (entry.startsWith("```")) {
          if (inFence) throw new Error(
            `${f}: nested or broken code fence in body[${bi}] — a closing \`\`\` is inside another fence`
          );
          inFence = true;
        } else if (entry.endsWith("```")) {
          if (!inFence) throw new Error(
            `${f}: stray closing \`\`\` in body[${bi}] — no matching opening fence in a prior entry`
          );
          inFence = false;
        } else {
          throw new Error(
            `${f}: split code fence in body[${bi}] — opening \`\`\` and closing \`\`\` must be in the same array entry`
          );
        }
      }
    }
    if (inFence) throw new Error(
      `${f}: unclosed code fence in body — a \`\`\` opens but never closes`
    );
  }
  // sections[].paragraphs[] split fences (same logic as body[])
  if (Array.isArray(sections)) {
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si] as Record<string, unknown> | undefined;
      if (!sec || typeof sec !== "object") continue;
      const paragraphs = sec.paragraphs;
      if (!Array.isArray(paragraphs)) continue;
      let inFence = false;
      for (let pi = 0; pi < paragraphs.length; pi++) {
        const entry = paragraphs[pi];
        if (typeof entry !== "string") continue;
        const openCount = (entry.match(/```/g) || []).length;
        if (openCount % 2 !== 0) {
          if (entry.startsWith("```")) {
            if (inFence) throw new Error(
              `${f}: nested or broken code fence in sections[${si}].paragraphs[${pi}] — a closing \`\`\` is inside another fence`
            );
            inFence = true;
          } else if (entry.endsWith("```")) {
            if (!inFence) throw new Error(
              `${f}: stray closing \`\`\` in sections[${si}].paragraphs[${pi}] — no matching opening fence in a prior entry`
            );
            inFence = false;
          } else {
            throw new Error(
              `${f}: split code fence in sections[${si}].paragraphs[${pi}] — opening \`\`\` and closing \`\`\` must be in the same paragraph entry`
            );
          }
        }
      }
      if (inFence) throw new Error(
        `${f}: unclosed code fence in sections[${si}].paragraphs — a \`\`\` opens but never closes`
      );
    }
  }
  // Doc/guide sections[].items[].answer[] (existing logic, now inside validateContent)
  if (Array.isArray(sections)) {
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si] as Record<string, unknown> | undefined;
      if (!sec || typeof sec !== "object") continue;
      const items = sec.items;
      if (!Array.isArray(items)) continue;
      for (let ii = 0; ii < items.length; ii++) {
        const item = items[ii] as Record<string, unknown> | undefined;
        if (!item || typeof item !== "object") continue;
        const answers = item.answer;
        if (!Array.isArray(answers)) continue;
        let inFence = false;
        for (let ai = 0; ai < answers.length; ai++) {
          const a = answers[ai];
          if (typeof a !== "string") continue;
          const openCount = (a.match(/```/g) || []).length;
          if (openCount % 2 !== 0) {
            if (a.startsWith("```")) {
              if (inFence) throw new Error(
                `${f}: nested or broken code fence in sections[${si}].items[${ii}].answer[${ai}]`
              );
              inFence = true;
            } else if (a.endsWith("```")) {
              if (!inFence) throw new Error(
                `${f}: stray closing \`\`\` in sections[${si}].items[${ii}].answer[${ai}]`
              );
              inFence = false;
            } else {
              throw new Error(
                `${f}: split code fence in sections[${si}].items[${ii}].answer[${ai}] - opening \`\`\` and closing \`\`\` must be in the same answer entry`
              );
            }
          }
        }
        if (inFence) throw new Error(
          `${f}: unclosed code fence in sections[${si}].items[${ii}].answer — a \`\`\` opens but never closes`
        );
      }
    }
  }

  // ── 6. Plain-text lab warning ────────────────────────────────────────────
  if (Array.isArray(sections)) {
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si] as Record<string, unknown> | undefined;
      if (!sec || typeof sec !== "object") continue;
      const paragraphs = sec.paragraphs;
      if (!Array.isArray(paragraphs)) continue;
      for (let pi = 0; pi < paragraphs.length; pi++) {
        const entry = paragraphs[pi];
        if (typeof entry === "string" && entry.includes("```") && /npm run/.test(entry)) {
          console.warn(
            `${f}: WARNING: sections[${si}].paragraphs[${pi}] contains what looks like an inline lab command — ` +
            `use a { type: "lab" } block instead`
          );
        }
      }
    }
  }

  // ── 7. Source/reference URL format ───────────────────────────────────────
  const src = body.source;
  if (src && typeof src === "object") {
    const srcUrl = (src as Record<string, unknown>).url;
    if (typeof srcUrl === "string" && srcUrl) {
      try {
        const u = new URL(srcUrl);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          throw new Error(
            `${f}: source.url '${srcUrl}' must be http or https`
          );
        }
      } catch {
        throw new Error(
          `${f}: source.url '${srcUrl}' is not a valid absolute URL`
        );
      }
    }
  }
  const refs = body.references;
  if (Array.isArray(refs)) {
    for (let ri = 0; ri < refs.length; ri++) {
      const ref = refs[ri] as Record<string, unknown> | undefined;
      if (!ref || typeof ref !== "object") continue;
      const refUrl = ref.url;
      if (typeof refUrl === "string" && refUrl) {
        try {
          const u = new URL(refUrl);
          if (u.protocol !== "http:" && u.protocol !== "https:") {
            throw new Error(
              `${f}: references[${ri}].url '${refUrl}' must be http or https`
            );
          }
        } catch {
          throw new Error(
            `${f}: references[${ri}].url '${refUrl}' is not a valid absolute URL`
          );
        }
      }
    }
  }

  // ── 8. Image alt text present ────────────────────────────────────────────
  if (typeof body.image === "string" && body.image) {
    if (!body.imageAlt || typeof body.imageAlt !== "string" || !body.imageAlt.trim()) {
      throw new Error(`${f}: image has no alt text (imageAlt is empty)`);
    }
  }
  if (Array.isArray(sections)) {
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si] as Record<string, unknown> | undefined;
      if (!sec || typeof sec !== "object") continue;
      const paragraphs = sec.paragraphs;
      if (!Array.isArray(paragraphs)) continue;
      for (let pi = 0; pi < paragraphs.length; pi++) {
        const p = paragraphs[pi];
        if (!p || typeof p !== "object") continue;
        const block = p as Record<string, unknown>;
        if (block.type === "image" && typeof block.src === "string" && block.src) {
          if (!block.alt || typeof block.alt !== "string" || !(block.alt as string).trim()) {
            throw new Error(
              `${f}: sections[${si}].paragraphs[${pi}].src has no alt text`
            );
          }
        }
      }
    }
  }

  // Check 9 (course lesson slug existence) is handled by refsOf + DB check
  // after the batch is assembled. Not duplicated here.
}

async function main() {
  const rawArgs = process.argv.slice(2);
  let typeOverride = "";
  let featured = false;
  let checkOnly = false;
  const files: string[] = [];
  for (let i = 0; i < rawArgs.length; i++) {
    const a = rawArgs[i];
    if (a === "--type") typeOverride = rawArgs[++i] || typeOverride;
    else if (a === "--featured") featured = true;
    else if (a === "--check") checkOnly = true;
    else if (a.startsWith("--")) throw new Error(`unknown flag ${a}`);
    else files.push(a);
  }
  if (!files.length) throw new Error("usage: npm run publish -- [--type story] [--featured] <file...>:");

  const db = await getDb();
  await db.execute(CREATE_CONTENT_ITEMS);
  await migrateContentItemsIfNeeded(db);
  await db.execute(CREATE_CONTENT_ITEMS);

  // Load batch first so cross-file refs resolve within one publish.
  const batch: Array<{ type: string; slug: string; body: Fields; file: string }> = [];
  for (const f of files) {
    const full = resolve(f);
    const mod = await import(pathToFileURL(full).href);
    const values = Object.values(mod).filter((v) => v && typeof v === "object" && "slug" in (v as object));
    if (values.length !== 1) throw new Error(`${f}: expected exactly one slug-bearing export, found ${values.length}`);
    const body = values[0] as Fields;
    const slug = body.slug;
    if (typeof slug !== "string" || !slug) throw new Error(`${f}: export has no usable slug`);
    const dirType = basename(dirname(full));
    // Per-file inference wins: `drafts/<type>/<slug>.ts` batches mix types
    // freely. --type is the fallback for files outside a typed dir.
    const type = TYPES.has(dirType) ? dirType : typeOverride;
    if (!type) throw new Error(`${f}: cannot infer type from dir '${dirType}', pass --type`);
    if (!TYPES.has(type)) throw new Error(`${f}: unknown type ${type}`);
    for (const field of REQUIRED[type] || ["slug", "title"]) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        throw new Error(`${f}: ${type} missing required field '${field}'`);
      }
    }

    // Run content validation gates (image URLs, videoIds, em dashes, topics,
    // code fence integrity, source URLs, alt text, lab detection).
    validateContent(f, type, body);

    batch.push({ type, slug, body, file: f });
  }

  // Slug uniqueness per type: duplicate within same type is error.
  // story+featured intentionally share the same slug for hero stage (composite PK allows coexistence).
  const seenPerType = new Map<string, { file: string }>();
  const batchSlugsAll = new Set<string>();
  for (const b of batch) {
    const key = `${b.type}:${b.slug}`;
    const prev = seenPerType.get(key);
    if (prev && prev.file !== b.file) {
      throw new Error(`duplicate slug ${b.slug} in type ${b.type}: ${prev.file} and ${b.file}`);
    }
    seenPerType.set(key, { file: b.file });
    batchSlugsAll.add(b.slug);
  }
  // Reference integrity against DB + batch (presence in any type counts).
  for (const b of batch) {
    for (const ref of refsOf(b.type, b.body)) {
      if (batchSlugsAll.has(ref)) continue;
      const hit = await db.execute({ sql: "SELECT slug FROM content_items WHERE slug = ? LIMIT 1", args: [ref] });
      if (!hit.rows.length) throw new Error(`${b.file}: ${b.type} references unknown slug '${ref}'`);
    }
  }

  // --check stops here: batch is loaded and validated, nothing written.
  if (checkOnly) {
    console.log(`check OK: ${batch.length} manuscript(s) valid`);
    return;
  }

  // Single visibility gate: content_items.status controls public access.
  const now = new Date().toISOString();
  for (const b of batch) {
    const title = typeof b.body.title === "string" ? b.body.title : "";
    const desc = b.body.excerpt ?? b.body.description;
    const excerpt = typeof desc === "string" ? desc : "";
    const posRow = await db.execute({ sql: "SELECT COALESCE(MAX(position), -1) AS m FROM content_items WHERE type = ?", args: [b.type] });
    const existing = await db.execute({ sql: "SELECT position, status FROM content_items WHERE type = ? AND slug = ?", args: [b.type, b.slug] });
    const rawMax = posRow.rows[0]?.m;
    const existingStatus = existing.rows.length && typeof existing.rows[0]?.status === "string" ? existing.rows[0].status : "";
    const effectiveStatus = existingStatus === "published" ? "published" : "private";
    const meta = featured ? { featured: true } : {};
    const position = existing.rows.length
      ? (typeof existing.rows[0]?.position === "number" ? (existing.rows[0]?.position as number) : 0)
      : (typeof rawMax === "number" ? rawMax + 1 : 0);
    if (featured) {
      await db.execute({ sql: "UPDATE content_items SET meta_json = '{}' WHERE type = ?", args: [b.type] });
    }
    await db.execute({
      sql: `INSERT INTO content_items (slug, type, status, title, excerpt, body_json, meta_json, position, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(type, slug) DO UPDATE SET status=excluded.status,
              title = excluded.title, excerpt = excluded.excerpt, body_json = excluded.body_json,
              meta_json = excluded.meta_json, position = excluded.position, updated_at = excluded.updated_at`,
      args: [b.slug, b.type, effectiveStatus, title, excerpt, JSON.stringify(b.body), JSON.stringify(meta), position, now],
    });
    console.log(`published ${b.type} ${b.slug} <- ${b.file} [${effectiveStatus}]`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
