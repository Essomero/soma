import { isAuthed, requireAuth } from "./_auth.js";
import { rateLimit } from "./_limits.js";
import { query } from "./_db.js";
import { getTenantId } from "./_tenant.js";
import { apiRouteFromPath } from "../shared/api-routes.js";
import { runChat } from "../shared/chat/core.js";

function envKeys() {
  return {
    deepseek: process.env.DEEPSEEK_API_KEY || "",
    openrouter: process.env.OPENROUTER_API_KEY || "",
    gemini: process.env.GEMINI_API_KEY || "",
    groq: process.env.GROQ_API_KEY || "",
    cerebras: process.env.CEREBRAS_API_KEY || "",
    straitly: process.env.STRAITLY_API_KEY || "",
  };
}

// ── Content-aware test generation ─────────────────────
// Question count scales with content length and type:
//   story: 5 base, +1 per 1000 words over 1000, cap 8
//   guide: 8 base, +1 per 500 words over 1000, cap 12
//   doc:  10 base, +1 per 500 words over 1000, cap 15
//
// Guides and docs get a mix of MCQ + open-ended questions,
// stories get MCQ only.

function calculateQuestionCount(contentType, wordCount) {
  let base, perExtra, max;
  if (contentType === "guide") {
    base = 8; perExtra = 500; max = 12;
  } else if (contentType === "doc") {
    base = 10; perExtra = 500; max = 15;
  } else {
    base = 5; perExtra = 1000; max = 8;
  }
  const extra = Math.max(0, wordCount - 1000);
  return Math.min(base + Math.floor(extra / perExtra), max);
}

function calculateOpenEndedCount(total, contentType) {
  if (contentType === "story") return { open: 0, mcq: total };
  const ratio = contentType === "doc" ? 0.4 : 0.3;
  const open = Math.max(1, Math.round(total * ratio));
  return { open, mcq: total - open };
}

function buildTestPrompt({ questionCount, contentType, includeOpenEnded, mcqCount, openCount }) {
  const typeLabel = contentType === "guide" ? "Guide (tutorial)" : contentType === "doc" ? "Reference documentation" : "Story/article";

  let prompt = `You are a test generator for the Soma learning platform. Generate ${questionCount} questions that test genuine understanding of the provided ${typeLabel}.

Content type: ${typeLabel}

`;

  if (includeOpenEnded) {
    prompt += `Generate a mix of:
- ${mcqCount} multiple-choice questions (test recall and comprehension)
- ${openCount} open-ended questions (test application, reasoning, and deeper understanding)

For multiple-choice questions:
- Have exactly 4 options labeled a, b, c, d
- Have exactly one correct answer
- Include a clear, concise explanation of why the correct answer is right

For open-ended questions:
- Require explanation, comparison, or reasoning (not a single-word answer)
- Include a rubric describing what to look for in a good answer
- Include keyPoints (array of specific concepts a good answer should cover)
- Include a sampleAnswer showing what a strong response looks like

`;
  } else {
    prompt += `Generate ${questionCount} multiple-choice questions.

Each question must:
1. Test comprehension of core concepts, not trivial recall of details
2. Have exactly 4 options labeled a, b, c, d
3. Have exactly one correct answer
4. Include a clear, concise explanation of why the correct answer is right

`;
  }

  prompt += `Return ONLY valid JSON — no markdown formatting, no code fences, no extra commentary.

{
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "What concept does this example demonstrate?",
      "options": [
        {"id": "a", "label": "First option"},
        {"id": "b", "label": "Second option"},
        {"id": "c", "label": "Third option"},
        {"id": "d", "label": "Fourth option"}
      ],
      "correctOptionIds": ["b"],
      "explanation": "Because the principle says so."
    }${includeOpenEnded ? `,
    {
      "id": "q3",
      "type": "open",
      "question": "Explain the tradeoff between X and Y in this context.",
      "rubric": "Look for understanding of the fundamental tension between...",
      "keyPoints": [
        "Correctly identifies factor A",
        "Explains why factor B constrains the choice",
        "Gives a concrete example"
      ],
      "sampleAnswer": "A strong answer would explain that..."
    }` : ""}
  ]
}`;

  return prompt;
}

function extractQuizQuestions(raw) {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const cleaned = fenceMatch ? fenceMatch[1].trim() : raw.trim();
  try {
    const parsed = JSON.parse(cleaned);
    const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
    if (!Array.isArray(questions)) return [];
    return questions.filter((q) => {
      if (!q.id || !q.question) return false;
      if (q.type === "open") return true;
      return Array.isArray(q.options) && q.options.length > 0 && Array.isArray(q.correctOptionIds) && q.correctOptionIds.length > 0;
    });
  } catch {
    return [];
  }
}

// ---- ratings ----
let ratingsTablesReady = false;
async function ensureRatingsTables() {
  if (ratingsTablesReady) return;
  await query(`CREATE TABLE IF NOT EXISTS ratings (
    tenant_id TEXT NOT NULL DEFAULT 'default',
    story_slug TEXT NOT NULL,
    rating INTEGER NOT NULL,
    rated_at TEXT,
    PRIMARY KEY (tenant_id, story_slug)
  )`);
  ratingsTablesReady = true;
}

async function handleRatings(req, res) {
  const tenant_id = getTenantId(req);
  await ensureRatingsTables();
  if (req.method === "GET") {
    const slug = req.query.slug;
    if (!isAuthed(req)) {
      if (slug) {
        const vis = await query("SELECT \"public\" FROM public_pages WHERE slug = ?", [slug]).catch(() => []);
        if (!(vis.length > 0 && vis[0].public == 1)) return res.status(404).json({ error: "Not found" });
      } else {
        return res.json(
          (await query("SELECT r.* FROM ratings r JOIN public_pages pp ON pp.slug = r.story_slug WHERE r.tenant_id = ? AND pp.\"public\" = 1", [tenant_id]))[0] || null,
        );
      }
    }
    const result = await query(
      slug ? "SELECT * FROM ratings WHERE tenant_id = ? AND story_slug = ?" : "SELECT * FROM ratings WHERE tenant_id = ?",
      slug ? [tenant_id, slug] : [tenant_id],
    );
    return res.json(result[0] || null);
  }

  if (req.method === "POST") {
    if (!rateLimit(req, res, { key: "ratings-post", limit: 20, windowMs: 60_000 })) return;
    const { slug, rating } = req.body || {};
    if (typeof slug !== "string" || !slug || slug.length > 200) return res.status(400).json({ error: "invalid slug" });
    if (typeof rating !== "number" || !Number.isFinite(rating) || rating < 1 || rating > 5)
      return res.status(400).json({ error: "rating must be 1-5" });
    const now = new Date().toISOString();
    await query(
      "INSERT INTO ratings (tenant_id, story_slug, rating, rated_at) VALUES (?, ?, ?, ?) ON CONFLICT(tenant_id, story_slug) DO UPDATE SET rating = excluded.rating, rated_at = excluded.rated_at",
      [tenant_id, slug, rating, now],
    );
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ---- progress ----
let progressTablesReady = false;
async function ensureProgressTables() {
  if (progressTablesReady) return;
  await query(`CREATE TABLE IF NOT EXISTS progress (
    tenant_id TEXT NOT NULL DEFAULT 'default',
    story_slug TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    PRIMARY KEY (tenant_id, story_slug)
  )`);
  progressTablesReady = true;
}

async function handleProgress(req, res) {
  const tenant_id = getTenantId(req);
  await ensureProgressTables();
  if (!requireAuth(req, res)) return;
  if (req.method === "GET") {
    const slug = req.query.slug;
    const sql = slug ? "SELECT * FROM progress WHERE tenant_id = ? AND story_slug = ?" : "SELECT * FROM progress WHERE tenant_id = ? AND completed = 1";
    const result = await query(sql, slug ? [tenant_id, slug] : [tenant_id]);
    return res.json(result);
  }

  if (req.method === "POST") {
    const { slug, completed } = req.body || {};
    const now = new Date().toISOString();
    await query(
      "INSERT INTO progress (tenant_id, story_slug, completed, completed_at) VALUES (?, ?, ?, ?) ON CONFLICT(tenant_id, story_slug) DO UPDATE SET completed = excluded.completed, completed_at = excluded.completed_at",
      [tenant_id, slug, completed ? 1 : 0, completed ? now : null],
    );
    return res.json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ---- tests ----
let testsTablesReady = false;
async function ensureTestsTables() {
  if (testsTablesReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS test_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id TEXT NOT NULL DEFAULT 'default',
      test_slug TEXT NOT NULL,
      answers TEXT NOT NULL,
      evaluation TEXT,
      score INTEGER,
      model TEXT,
      created_at TEXT NOT NULL
    )
  `);
  testsTablesReady = true;
}

async function handleTests(req, res) {
  const tenant_id = getTenantId(req);
  await ensureTestsTables();

  if (req.method === "GET") {
    if (!requireAuth(req, res)) return;
    const slug = req.query.slug;
    const sql = slug
      ? "SELECT * FROM test_submissions WHERE tenant_id = ? AND test_slug = ? ORDER BY created_at DESC LIMIT 20"
      : "SELECT * FROM test_submissions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 50";
    const rows = await query(sql, slug ? [tenant_id, slug] : [tenant_id]);
    return res.json(rows);
  }

  if (req.method === "POST") {
    // ── Generate a new test from content ──────────────────
    const body = req.body || {};
    if (body.action === "generate") {
      if (!requireAuth(req, res)) return;
      const { contentSlug, contentTitle, contentText, contentType, model, provider, force } = body;
      if (!contentSlug || !contentText) {
        return res.status(400).json({ error: "contentSlug and contentText required" });
      }

      const testSlug = `${contentSlug}-quiz`;

      // Check if test already exists for this content
      const existing = await query(
        "SELECT slug, title, body_json FROM content_items WHERE tenant_id = ? AND type = 'test' AND slug = ?",
        [tenant_id, testSlug],
      );
      if (existing && existing.length > 0) {
        // `force: true` replaces the existing test; otherwise return it
        if (!force) {
          return res.status(200).json({ slug: testSlug, title: existing[0].title, existing: true });
        }
        // Delete old test + its submissions before regenerating
        await query("DELETE FROM content_items WHERE tenant_id = ? AND type = 'test' AND slug = ?", [tenant_id, testSlug]);
        await query("DELETE FROM test_submissions WHERE tenant_id = ? AND test_slug = ?", [tenant_id, testSlug]);
      }

      // Truncate content to fit the chat API's 20k userMessage limit
      const truncated =
        contentText.length > 15000
          ? contentText.slice(0, 15000) + "\n\n[...content truncated for length]"
          : contentText;

      // Scale question count to content length and type
      const wordCount = truncated.split(/\s+/).filter(Boolean).length;
      const questionCount = calculateQuestionCount(contentType || "story", wordCount);
      const { open, mcq } = calculateOpenEndedCount(questionCount, contentType || "story");

      const systemPrompt = buildTestPrompt({
        questionCount,
        contentType: contentType || "story",
        includeOpenEnded: open > 0,
        mcqCount: mcq,
        openCount: open,
      });

      const userMessage = `Content title: ${contentTitle}\n\nContent:\n${truncated}`;

      const chatResult = await runChat({
        body: {
          systemPrompt,
          userMessage,
          model: model || "deepseek-flash",
          provider: provider || "deepseek",
          stream: false,
        },
        keys: envKeys(),
      });

      if (chatResult.kind !== "json") {
        const errMsg = chatResult.body?.error || "unknown error";
        return res.status(502).json({ error: `AI generation failed: ${errMsg}` });
      }

      const raw = chatResult.body.reply || "";
      const questions = extractQuizQuestions(raw);

      if (questions.length === 0) {
        return res.status(422).json({
          error: "Could not parse test questions from AI response. The model may have returned an unexpected format.",
        });
      }

      // Build the TestContent body matching the frontend type
      const typeLabel = contentType === "guide" ? "Guide" : contentType === "doc" ? "Doc" : "Story";
      const sourceKey = contentType === "story" ? "storySlug" : contentType === "guide" ? "guideSlug" : "docSlug";

      const testBody = {
        title: `Quiz: ${contentTitle}`,
        description: `Auto-generated quiz testing your understanding of "${contentTitle}"`,
        category: typeLabel,
        format: "written",
        image: "",
        imageAlt: "",
        author: { name: "Soma", title: "Learning Platform" },
        publishedAt: new Date().toISOString(),
        storySlug: contentType === "story" ? contentSlug : undefined,
        estimatedMinutes: Math.ceil(questions.length * 2),
        passingScore: 80,
        sources: [
          {
            type: contentType,
            [sourceKey]: contentSlug,
            title: contentTitle,
          },
        ],
        questions,
      };

      const now = new Date().toISOString();
      const excerpt = testBody.description;

      await query(
        `INSERT INTO content_items (tenant_id, slug, type, status, title, excerpt, body_json, meta_json, position, updated_at)
         VALUES (?, ?, 'test', 'private', ?, ?, ?, '{}', 0, ?)
         ON CONFLICT(tenant_id, type, slug) DO UPDATE SET
           title = excluded.title, excerpt = excluded.excerpt, body_json = excluded.body_json,
           updated_at = excluded.updated_at`,
        [tenant_id, testSlug, testBody.title, excerpt, JSON.stringify(testBody), now],
      );

      return res.status(201).json({ slug: testSlug, title: testBody.title, existing: false });
    }

    if (!rateLimit(req, res, { key: "tests-post", limit: 20, windowMs: 60_000 })) return;
    const { slug, answers, evaluation, score, model } = body;
    if (!slug || !answers) {
      return res.status(400).json({ error: "slug and answers are required" });
    }
    if (typeof slug !== "string" || slug.length > 200) return res.status(400).json({ error: "invalid slug" });

    const answersStr = typeof answers === "string" ? answers : JSON.stringify(answers);
    if (answersStr.length > 10000) return res.status(400).json({ error: "answers too long" });
    const evalStr =
      typeof evaluation === "string" ? evaluation : evaluation == null ? null : JSON.stringify(evaluation);
    if (evalStr && evalStr.length > 10000) return res.status(400).json({ error: "evaluation too long" });
    if (
      typeof model !== "undefined" &&
      model !== null &&
      (typeof model !== "string" || model.length > 200)
    )
      return res.status(400).json({ error: "invalid model" });
    if (
      typeof score !== "undefined" &&
      score !== null &&
      (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100)
    )
      return res.status(400).json({ error: "invalid score" });
    const now = new Date().toISOString();

    await query(
      `INSERT INTO test_submissions (tenant_id, test_slug, answers, evaluation, score, model, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenant_id, slug, answersStr, evalStr, score ?? null, model || null, now],
    );

    return res.json({ success: true, timestamp: now });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

function getSubRoute(req) {
  return apiRouteFromPath(req.url);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const route = getSubRoute(req);
    if (route === "ratings") return handleRatings(req, res);
    if (route === "progress") return handleProgress(req, res);
    if (route === "tests") return handleTests(req, res);

    // Fallback: if we can't detect, try to infer from query/body
    // but return 404 for truly unknown.
    return res.status(404).json({ error: "Unknown engagement route — use /api/ratings, /api/progress, or /api/tests" });
  } catch (e) {
    console.error("Engagement handler error:", e instanceof Error ? e.message : String(e));
    return res.status(500).json({ error: "Internal server error" });
  }
}
