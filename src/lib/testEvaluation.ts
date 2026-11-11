import type {
  TestContent,
  TestQuestion,
  OpenTestQuestion,
  MultipleChoiceTestQuestion,
  TestSource,
  StoryContent,
  GuideContent,
  DocContent,
} from "@/types";
import { contentToMarkdown } from "@/lib/markdown";

// Runtime content lookup injected by the caller (TestPage fetches these
// from /api/content). Empty arrays preserve the "not found" fallbacks.
export interface SourceLookup {
  stories?: StoryContent[];
  guides?: GuideContent[];
  docs?: DocContent[];
}

export type TestUserAnswers = Record<string, string | string[]>;

export interface CustomAiConfig {
  apiKey?: string;
  apiUrl?: string;
  provider?: string;
  model?: string;
}

export interface StoredTestEvaluation {
  evaluation: string;
  model: string;
  provider?: string;
  timestamp: string;
}

export interface ResolvedTestSource {
  title: string;
  kind: "markdown" | "story" | "guide" | "doc" | "link";
  content?: string;
  url?: string;
  href?: string;
  description?: string;
}

/**
 * Resolves any TestSource (inline markdown, linked story/lesson, guide, doc, or external link)
 * into a standardized representation with full markdown content for the LLM.
 */
export function resolveTestSource(source: TestSource, lookup: SourceLookup = {}): ResolvedTestSource {
  if (source.type === "markdown") {
    return {
      title: source.title,
      kind: "markdown",
      content: source.content,
      description: source.description,
    };
  }

  if (source.type === "story") {
    const story = (lookup.stories ?? []).find((s) => s.slug === source.storySlug);
    if (!story) {
      return {
        title: source.title || source.storySlug,
        kind: "story",
        content: `Story not found for slug: ${source.storySlug}`,
        description: source.description,
        href: `/stories/${source.storySlug}`,
      };
    }
    const text = contentToMarkdown({
      title: story.title,
      intro: story.intro,
      body: story.body,
      sections: story.sections,
      references: story.references,
    });
    return {
      title: source.title || story.title,
      kind: "story",
      content: text,
      description: source.description || story.excerpt,
      href: `/stories/${story.slug}`,
    };
  }

  if (source.type === "guide") {
    const guide = (lookup.guides ?? []).find((g) => g.slug === source.guideSlug);
    if (!guide) {
      return {
        title: source.title || source.guideSlug,
        kind: "guide",
        content: `Guide not found for slug: ${source.guideSlug}`,
        description: source.description,
        href: `/guides/${source.guideSlug}`,
      };
    }
    const text = contentToMarkdown({
      title: guide.title,
      intro: guide.intro,
      body: guide.body,
      references: guide.references,
    });
    return {
      title: source.title || guide.title,
      kind: "guide",
      content: text,
      description: source.description || guide.excerpt,
      href: `/guides/${guide.slug}`,
    };
  }

  if (source.type === "doc") {
    const doc = (lookup.docs ?? []).find((d) => d.slug === source.docSlug);
    if (!doc) {
      return {
        title: source.title || source.docSlug,
        kind: "doc",
        content: `Doc not found for slug: ${source.docSlug}`,
        description: source.description,
        href: `/docs/${source.docSlug}`,
      };
    }
    const lines: string[] = [`# ${doc.title}`, "", doc.description, ""];
    for (const sec of doc.sections) {
      lines.push(`## ${sec.heading}`);
      if (sec.intro) lines.push(sec.intro);
      for (const it of sec.items) {
        lines.push(`### ${it.question}`);
        const ans = it.answer
          .map((a) => (typeof a === "string" ? a : ""))
          .filter(Boolean)
          .join("\n\n");
        if (ans) lines.push(ans);
      }
    }
    return {
      title: source.title || doc.title,
      kind: "doc",
      content: lines.join("\n\n"),
      description: source.description || doc.description,
      href: `/docs/${doc.slug}`,
    };
  }

  // External Link
  return {
    title: source.title,
    kind: "link",
    url: source.url,
    description: source.description,
  };
}

/**
 * Sensible human-friendly time buckets.
 * No arbitrary numbers like 123s; candidates see clean numbers:
 * 30s, 45s, 1m (60s), 1m 30s (90s), 2m (120s), 2m 30s (150s), 3m (180s).
 */
export const SENSIBLE_TIME_BUCKETS = [30, 45, 60, 90, 120, 150, 180];

export function snapToSensibleTime(rawSeconds: number): number {
  if (rawSeconds <= 30) return 30;
  for (const bucket of SENSIBLE_TIME_BUCKETS) {
    if (rawSeconds <= bucket) return bucket;
  }
  return Math.ceil(rawSeconds / 30) * 30;
}

export function formatSensibleDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (rem === 0) return `${mins}m`;
  return `${mins}m ${rem}s`;
}

/**
 * Calculates a fair, complexity-aware answering duration for a question.
 *
 * For Audio:
 * - The audio is waited (the answer countdown does not run while audio is speaking).
 * - The answer timer begins after audio completes reading, with a clean sensible time:
 *   e.g. 60s (1m), 90s (1m 30s), 120s (2m).
 *
 * For Text:
 * - Evaluates technical complexity:
 *   - Word count of prompt + options
 *   - Code snippets, SQL clauses, architecture trade-offs
 *   - Reading comprehension buffer
 * - Snaps to a sensible human bucket (30s, 45s, 60s, 90s, 120s, 150s, 180s).
 */
export function calculateComplexityAwareTimeLimit(opts: {
  question: TestQuestion;
  isOral: boolean;
  defaultTimeLimitSeconds?: number;
}): {
  timeLimitSeconds: number; // clean snapped number (30, 45, 60, 90, 120, 150)
  formattedTime: string; // "30s", "45s", "1m", "1m 30s", "2m", etc.
  complexityScore: "low" | "medium" | "high" | "architectural";
} {
  const { question, isOral, defaultTimeLimitSeconds } = opts;

  let baseAnswerSeconds = question.timeLimitSeconds ?? defaultTimeLimitSeconds;

  const promptText = question.question + " " + (question.description || "");
  const promptWords = promptText.trim().split(/\s+/).filter(Boolean).length;
  const optionsText =
    question.type === "multiple-choice"
      ? (question as MultipleChoiceTestQuestion).options.map((o) => o.label).join(" ")
      : "";
  const optionsWords = optionsText.trim().split(/\s+/).filter(Boolean).length;
  const totalWords = promptWords + optionsWords;

  const hasCodeOrSql = /`[^`]+`|\b(SELECT|FROM|WHERE|EXPLAIN|CREATE INDEX|goroutine|channel|mutex|sync\.|p95|UUIDv7)\b/i.test(
    promptText + " " + optionsText,
  );
  const isMultiPart = /(first|second|describe.*explain|walk through|step-by-step|trade-offs|how do you distinguish)/i.test(
    promptText,
  );

  let complexityScore: "low" | "medium" | "high" | "architectural" = "medium";

  if (question.type === "multiple-choice") {
    // Generous time floor for reading prompt + evaluating all 4 technical options
    let mcFloor = 60;
    if (totalWords > 90 || hasCodeOrSql) {
      complexityScore = "high";
      mcFloor = 90;
    } else if (totalWords > 45) {
      complexityScore = "medium";
      mcFloor = 75;
    } else {
      complexityScore = "low";
      mcFloor = 60;
    }
    baseAnswerSeconds = Math.max(baseAnswerSeconds ?? mcFloor, mcFloor);
  } else {
    // Open-ended
    if (isMultiPart || totalWords > 60 || hasCodeOrSql) {
      complexityScore = "architectural";
      if (!baseAnswerSeconds) baseAnswerSeconds = 120;
    } else if (totalWords > 35) {
      complexityScore = "high";
      if (!baseAnswerSeconds) baseAnswerSeconds = 90;
    } else {
      complexityScore = "medium";
      if (!baseAnswerSeconds) baseAnswerSeconds = 60;
    }
  }

  // In Oral mode: audio prompt is waited, so timer is pure answer time snapped to clean bucket
  if (isOral) {
    const snapped = snapToSensibleTime(baseAnswerSeconds);
    return {
      timeLimitSeconds: snapped,
      formattedTime: formatSensibleDuration(snapped),
      complexityScore,
    };
  }

  // In Text mode: add reading time heuristic based on complexity, then snap to clean bucket
  // Dense technical text with code/options reads at ~2.5 words/sec
  const readingSeconds = Math.ceil(totalWords / 2.5);
  const rawTotal = baseAnswerSeconds + (readingSeconds > 5 ? readingSeconds : 0);
  const snapped = snapToSensibleTime(rawTotal);
  return {
    timeLimitSeconds: snapped,
    formattedTime: formatSensibleDuration(snapped),
    complexityScore,
  };
}

export function getFairQuestionTimeLimit(question: TestQuestion, isOral = false): number {
  return calculateComplexityAwareTimeLimit({ question, isOral }).timeLimitSeconds;
}
/**
 * Filler word analysis for verbal speech and oral tests.
 * Evaluates speech disfluencies according to the rule:
 * "A few is fine, but a lot show 'unsure'"
 */
export interface FillerWordAnalysis {
  totalFillers: number;
  totalWords: number;
  densityPercentage: number;
  breakdown: Record<string, number>;
  severity: "clean" | "natural" | "unsure";
  summary: string;
}

const FILLER_PATTERNS: Array<{ regex: RegExp; word: string }> = [
  { regex: /\b(uh+m*|um+)\b/gi, word: "uh/um" },
  { regex: /\ber+\b/gi, word: "er" },
  { regex: /\bah+\b/gi, word: "ah" },
  { regex: /\byeah+\b/gi, word: "yeah" },
  { regex: /\byep\b/gi, word: "yep" },
  { regex: /\byup\b/gi, word: "yup" },
  { regex: /\b(like)\b/gi, word: "like" },
  { regex: /\b(you know)\b/gi, word: "you know" },
  { regex: /\b(kind of|kinda)\b/gi, word: "kind of" },
  { regex: /\b(sort of)\b/gi, word: "sort of" },
  { regex: /\b(dunno)\b/gi, word: "dunno" },
];

export function analyzeFillerWords(text: string): FillerWordAnalysis {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  const breakdown: Record<string, number> = {};
  let totalFillers = 0;

  for (const { regex, word } of FILLER_PATTERNS) {
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      breakdown[word] = (breakdown[word] || 0) + matches.length;
      totalFillers += matches.length;
    }
  }

  const densityPercentage = totalWords > 0 ? (totalFillers / totalWords) * 100 : 0;

  // "A few is fine, but a lot show unsure"
  let severity: "clean" | "natural" | "unsure" = "clean";
  let summary = "Clean delivery with zero filler words.";

  if (totalFillers > 0 && totalFillers <= 3 && densityPercentage <= 2.5) {
    severity = "natural";
    summary = `Natural cadence (${totalFillers} conversational fillers: a few is normal and acceptable).`;
  } else if (totalFillers > 3 || densityPercentage > 2.5) {
    severity = "unsure";
    summary = `Excessive filler usage (${totalFillers} fillers, ${densityPercentage.toFixed(1)}% density). High density signals hesitation and uncertainty.`;
  }

  return {
    totalFillers,
    totalWords,
    densityPercentage,
    breakdown,
    severity,
    summary,
  };
}

/**
 * Builds the system prompt and structured test message for LLM evaluation.
 * Includes all source materials (markdown, stories, guides, docs, & links) and the candidate's responses.
 */
export function buildEvaluationPrompts(test: TestContent, answers: TestUserAnswers, lookup: SourceLookup = {}): {
  systemPrompt: string;
  userMessage: string;
  copyablePrompt: string;
} {
  const systemPrompt = `You are a principal engineer delivering an actionable, concise diagnostic test evaluation.

CRITICAL LENGTH & FORMAT RULES:
- Keep your ENTIRE evaluation under 900 words total.
- This is a punchy diagnostic summary of what went right, what went wrong, and how to improve, NOT an article, essay, or textbook.
- Do NOT reproduce long quotes, background narratives, or worked formulas from the source materials. The only text you may reproduce is the question prompt itself.
- For each question, output the question, the candidate response, then 4 concise bullets (~60 words total per question):
  (1) Response summary (1 sentence),
  (2) What went right (1 sentence on the accurate part, or "Nothing" if fully incorrect),
  (3) What went wrong (1 sentence on the exact misconception, or "Nothing" if fully correct),
  (4) How to improve (1 sentence giving the concrete rule, invariant, or architectural fix).
- Avoid filler, throat-clearing, or repetition.
- Do not use em dashes.

Format your response strictly using this Markdown structure:
# Test Evaluation: ${test.title}

## Score & Executive Diagnosis
- **Calculated Mastery Score:** [X] / 100
- **Level Assessment:** [Needs Work / Competent / Senior]
- **Summary:** [2-3 direct sentences on overall performance and the primary knowledge gap.]

## Question-by-Question Breakdown
[For each question in order:]
### Question [N]: [Topic] : [Status: ✅ Correct / ⚠️ Partial / ❌ Incorrect] ([X]/10)
- **Question:** [The question prompt itself, copied verbatim from the payload and condensed to one line if needed]
- **Response:** [1 concise sentence: what the candidate selected or wrote, or if timed out]
- **What went right:** [1 sentence: the specific part of the answer that was accurate, or "Nothing" if fully incorrect]
- **What went wrong:** [1 sentence: the specific misconception or flaw, or "Nothing" if fully correct]
- **How to improve:** [1 sentence: the concrete rule, invariant, or fix to master]

## Key Areas for Improvement
- [Priority 1: Most critical conceptual gap and how to master it]
- [Priority 2: Second priority gap and recommended practice]
- [Priority 3: Concrete drill or takeaway]`;

  // Build the source materials section using resolved sources
  const sourceSections: string[] = [];
  test.sources.forEach((source, idx) => {
    const resolved = resolveTestSource(source, lookup);
    if (resolved.kind === "link") {
      sourceSections.push(`### Source ${idx + 1} (External Reference Link): ${resolved.title}
- **URL:** ${resolved.url}
${resolved.description ? `- **Description:** ${resolved.description}` : ""}`);
    } else {
      sourceSections.push(`### Source ${idx + 1} (${resolved.kind.toUpperCase()}: ${resolved.title})
${resolved.description ? `*${resolved.description}*\n` : ""}${resolved.href ? `*Platform Link: ${resolved.href}*\n` : ""}
\`\`\`markdown
${resolved.content || ""}
\`\`\``);
    }
  });

  const sourcesText = sourceSections.length > 0
    ? sourceSections.join("\n\n")
    : "No source materials provided for this test.";

  // Build the questions and candidate responses section
  const questionSections: string[] = [];

  test.questions.forEach((q, idx) => {
    const rawAnswer = answers[q.id];
    const qNum = idx + 1;

    if (q.type === "multiple-choice") {
      const mc = q as MultipleChoiceTestQuestion;
      const selectedIds = Array.isArray(rawAnswer)
        ? rawAnswer
        : typeof rawAnswer === "string" && rawAnswer
        ? [rawAnswer]
        : [];

      const selectedOptionsText = selectedIds.length > 0
        ? selectedIds
            .map((id) => {
              const opt = mc.options.find((o) => o.id === id);
              return opt ? `[Option ${opt.id.toUpperCase()}] ${opt.label}` : id;
            })
            .join("; ")
        : "[No option selected / Timed out]";

      const correctOptionsText = mc.correctOptionIds
        .map((id) => {
          const opt = mc.options.find((o) => o.id === id);
          return opt ? `[Option ${opt.id.toUpperCase()}] ${opt.label}` : id;
        })
        .join("; ");

      const optionsList = mc.options
        .map((opt) => `- (${opt.id.toUpperCase()}) ${opt.label}${opt.explanation ? ` (*Note: ${opt.explanation}*)` : ""}`)
        .join("\n");

      questionSections.push(`#### Question ${qNum} (Multiple Choice - ${mc.allowMultiple ? "Multi-select" : "Single-select"})
- **Prompt:** ${mc.question}
${mc.description ? `- **Context:** ${mc.description}\n` : ""}- **Available Options:**
${optionsList}
- **Correct Key:** ${correctOptionsText}
${mc.explanation ? `- **Explanation:** ${mc.explanation}\n` : ""}- **Candidate Selected:** ${selectedOptionsText}`);
    } else {
      const openQ = q as OpenTestQuestion;
      const answerText = typeof rawAnswer === "string" && rawAnswer.trim()
        ? rawAnswer.trim()
        : "[No written answer provided / Timed out]";

      questionSections.push(`#### Question ${qNum} (Open-Ended Response)
- **Prompt:** ${openQ.question}
${openQ.description ? `- **Context:** ${openQ.description}\n` : ""}${openQ.rubric ? `- **Rubric / Expected Insights:** ${openQ.rubric}\n` : ""}${openQ.keyPoints && openQ.keyPoints.length > 0 ? `- **Key Concepts to Address:** ${openQ.keyPoints.join(", ")}\n` : ""}${openQ.sampleAnswer ? `- **Reference Sample Answer:** ${openQ.sampleAnswer}\n` : ""}- **Candidate Answer:**
"""
${answerText}
"""`);
    }
  });

  const questionsText = questionSections.join("\n\n---\n\n");

  // Analyze all open-ended answers for verbal disfluencies/fillers
  const allOpenText = Object.entries(answers)
    .map(([qid, val]) => {
      const q = test.questions.find((item) => item.id === qid);
      return q && q.type === "open" && typeof val === "string" ? val : "";
    })
    .filter(Boolean)
    .join(" ");

  const fillerAnalysis = analyzeFillerWords(allOpenText);
  const breakdownStr =
    Object.entries(fillerAnalysis.breakdown)
      .map(([w, c]) => `"${w}": ${c}`)
      .join(", ") || "None";

  const customInstructions = test.evaluationInstructions
    ? `\n\n### Author Custom Evaluation Notes:\n${test.evaluationInstructions}`
    : "";

  const userMessage = `## TEST DETAILS
- **Title:** ${test.title}
- **Category:** ${test.category}${test.subcategory ? ` // ${test.subcategory}` : ""}
- **Description:** ${test.description}
${customInstructions}

## SOURCE MATERIALS
The test questions are based on the following documents and references. Evaluate the candidate's answers directly against this material:

${sourcesText}

## CANDIDATE VERBAL FLUENCY & FILLER ANALYSIS (AI SCREENER METRIC)
- **Total Open-Answer Words:** ${fillerAnalysis.totalWords}
- **Detected Fillers:** ${fillerAnalysis.totalFillers} (${breakdownStr})
- **Filler Density:** ${fillerAnalysis.densityPercentage.toFixed(1)}%
- **Status:** ${fillerAnalysis.severity.toUpperCase()} (${fillerAnalysis.summary})
- **Scoring Invariant:** A few fillers (1-3) is fine and natural. However, an excessive frequency of fillers ("uhs, yeahs, ums, likes") demonstrates lack of confidence and uncertainty, just as actual AI screeners penalize. Deduct score and provide concrete delivery feedback if severity is marked "unsure".

## CANDIDATE RESPONSES
Here are the candidate's submitted responses for each question:

${questionsText}

Please produce a concise diagnostic evaluation summary under 900 words following the requested template. For every question, restate the question prompt, summarize the response, then give what went right, what went wrong, and how to improve. Do not write an article.`;
  const copyablePrompt = `${systemPrompt}

================================================================================
EVALUATION REQUEST AND TEST PAYLOAD
================================================================================

${userMessage}`;

  return { systemPrompt, userMessage, copyablePrompt };
}

/**
 * Invokes /api/chat with streaming support to evaluate the test.
 */
export async function evaluateTestWithLLM(opts: {
  test: TestContent;
  answers: TestUserAnswers;
  model: string;
  provider?: string;
  apiKey?: string;
  apiUrl?: string;
  lookup?: SourceLookup;
  onToken?: (token: string, accumulated: string) => void;
  onReasoning?: (reasoning: string, accumulatedReasoning: string) => void;
}): Promise<string> {
  const { systemPrompt, userMessage } = buildEvaluationPrompts(opts.test, opts.answers, opts.lookup);

  const payload: Record<string, unknown> = {
    systemPrompt,
    userMessage,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    model: opts.model,
    stream: true,
    max_tokens: 4000,
  };
  if (opts.provider) payload.provider = opts.provider;
  if (opts.apiKey) payload.apiKey = opts.apiKey;
  if (opts.apiUrl) payload.apiUrl = opts.apiUrl;

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `Evaluation request failed (HTTP ${res.status}): ${errorBody || res.statusText}`,
    );
  }

  // Handle SSE streaming response
  const reader = res.body?.getReader();
  if (!reader) {
    const fallback = await res.json().catch(() => ({}));
    return fallback.choices?.[0]?.message?.content || "";
  }

  const decoder = new TextDecoder();
  let accumulated = "";
  let accumulatedReasoning = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const dataStr = trimmed.slice(6);
      if (dataStr === "[DONE]") break;

      try {
        const parsed = JSON.parse(dataStr);
        const deltaObj = parsed.choices?.[0]?.delta;
        const delta = deltaObj?.content || "";
        const reasoningDelta = deltaObj?.reasoning_content || "";

        if (reasoningDelta) {
          accumulatedReasoning += reasoningDelta;
          opts.onReasoning?.(reasoningDelta, accumulatedReasoning);
        }
        if (delta) {
          accumulated += delta;
          opts.onToken?.(delta, accumulated);
        }
      } catch {
        // SSE partial line, ignore
      }
    }
  }

  return accumulated;
}

const ANSWERS_KEY_PREFIX = "soma_test_answers_";
const EVAL_KEY_PREFIX = "soma_test_eval_";
const CUSTOM_AI_KEY = "soma_custom_ai_config";

export function getStoredAnswers(slug: string): TestUserAnswers {
  try {
    const raw = localStorage.getItem(`${ANSWERS_KEY_PREFIX}${slug}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredAnswers(slug: string, answers: TestUserAnswers): void {
  try {
    localStorage.setItem(`${ANSWERS_KEY_PREFIX}${slug}`, JSON.stringify(answers));
  } catch {}
}

export function getStoredEvaluation(slug: string): StoredTestEvaluation | null {
  try {
    const raw = localStorage.getItem(`${EVAL_KEY_PREFIX}${slug}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredEvaluation(
  slug: string,
  evaluation: string,
  model: string,
  provider?: string,
): void {
  try {
    const payload: StoredTestEvaluation = {
      evaluation,
      model,
      provider,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(`${EVAL_KEY_PREFIX}${slug}`, JSON.stringify(payload));
  } catch {}
}

export interface TestSessionState {
  status: "idle" | "in_progress" | "completed" | "expired";
  startedAt?: number;
  expiresAt?: number;
}

const SESSION_KEY_PREFIX = "soma_test_session_";

export function getStoredSession(slug: string): TestSessionState | null {
  try {
    const raw = localStorage.getItem(`${SESSION_KEY_PREFIX}${slug}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredSession(slug: string, session: TestSessionState): void {
  try {
    localStorage.setItem(`${SESSION_KEY_PREFIX}${slug}`, JSON.stringify(session));
  } catch {}
}

export function clearStoredTestAnswers(slug: string): void {
  try {
    localStorage.removeItem(`${ANSWERS_KEY_PREFIX}${slug}`);
  } catch {}
}

export function clearStoredTest(slug: string): void {
  try {
    localStorage.removeItem(`${ANSWERS_KEY_PREFIX}${slug}`);
    localStorage.removeItem(`${EVAL_KEY_PREFIX}${slug}`);
    localStorage.removeItem(`${SESSION_KEY_PREFIX}${slug}`);
  } catch {}
}

export function getStoredCustomAiConfig(): CustomAiConfig | null {
  try {
    const raw = localStorage.getItem(CUSTOM_AI_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredCustomAiConfig(config: CustomAiConfig): void {
  try {
    localStorage.setItem(CUSTOM_AI_KEY, JSON.stringify(config));
  } catch {}
}

export async function saveTestSubmissionToDb(opts: {
  slug: string;
  answers: TestUserAnswers;
  evaluation?: string;
  score?: number;
  model?: string;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
    return res.ok;
  } catch (e) {
    console.warn("Could not save test to database:", e);
    return false;
  }
}

export async function fetchTestSubmissionsFromDb(slug: string): Promise<Record<string, unknown>[]> {
  try {
    const res = await fetch(`/api/tests?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return [];
    return (await res.json()) as Record<string, unknown>[];
  } catch {
    return [];
  }
}
