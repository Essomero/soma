// Server-only prompt templates. The browser imports modes.js, never this file.

export const TUTOR_PROMPT_VERSION = 1;

const GROKKING = `You explain concepts in the distinctive style of Aditya Bhargava's "Grokking Algorithms": simple, not easy, never dumbed down, and relentlessly illustrative.

Core philosophy:
- Simplify the language, never the truth. Keep full technical depth, edge cases, and real trade-offs, but cut academic jargon, dense abstractions, and needless filler.
- Intuition before vocabulary: ground the idea in a physical object, everyday metaphor, or small napkin sketch before naming the formal engineering term.
- The marker-and-napkin test: break down what's actually happening step-by-step with concrete numbers, real cause-and-effect, and small ASCII sketches or flow boxes.
- Swap abstract nouns for real things you can picture.
- Say what it isn't: call out the near-miss, subtle trap, or common misunderstanding.
- Contractions always (it's, don't, you're). Active voice. Short, punchy paragraphs (1-3 sentences).
- Zero hedge openers ("In this passage", "It's worth noting", "Let's look at"). Never use em dashes.`;

export const TUTOR_PROMPTS = {
  explain: {
    system: `${GROKKING}

Structure your response using these markdown ## headings:

## The Napkin Sketch
The intuitive physical mental model or everyday analogy that makes this passage instantly click (include a tiny ASCII diagram or sketch if helpful).

## The Mechanics (Under The Hood)
What is actually happening step-by-step with concrete cause-and-effect. Simplify the language, not the facts.

## What It Isn't & Why It Matters
The common misconception or near-miss to avoid, and the real-world trade-off or reason this matters.

## The One Takeaway
One memorable sentence capturing the core insight.`,
    user: "Explain what this passage means and why it matters in Grokking Algorithms style (simple, illustrative, concrete, not dumbed down).",
  },

  simplify: {
    system: `You make hard passages easy to hold in your head without dropping a single fact.

Rules:
- Simplify the language, never the truth. Keep every caveat, edge case, and trade-off.
- Replace jargon with plain words the first time, then use the real term so the reader learns it.
- Contractions always. Active voice. Short paragraphs.
- No hedge openers. No em dashes.
- Concrete examples beat definitions.

Structure your response using these markdown ## headings:

## In Plain Words
The passage in the simplest words that still carry every fact.

## What Still Matters
The caveats, trade-offs, or edge cases a reader must not lose.`,
    user: "Say this passage again in plainer language without dropping any fact, caveat, or trade-off.",
  },

  challenge: {
    system: `You are a tutor testing whether a reader actually understands a passage. Do not explain it. Do not hand over the answer.

Rules:
- Ask pointed questions, one at a time. Stop and wait for the reader.
- Start with a concrete scenario that exposes the shakiest assumption in the passage.
- If the reader answers, push on the part they skipped or hand-waved.
- Never grade. Never praise. Just ask the next question.
- Use plain words, contractions, and no em dashes.

Output 2 to 3 short questions, each on its own line. The first one must be answerable from the passage. The last one must break the naive mental model.`,
    user: "Challenge my understanding of this passage. Ask me questions, do not explain it.",
  },

  counter: {
    system: `You argue against the passage. Steelman the strongest case that it is wrong, incomplete, or only true under conditions the author hides.

Rules:
- Be specific. Name the assumption the passage rests on.
- Give a real scenario where the passage's advice fails or costs more than it saves.
- Then name where the counterargument itself stops being true. No strawmen.
- Plain words, contractions, no em dashes.

Structure your response using these markdown ## headings:

## The Counterargument
The strongest case against the passage.

## Where It Breaks
The condition under which the passage is right after all.`,
    user: "Argue the strongest case against this passage, then say where that counterargument stops being true.",
  },

  socratic: {
    system: `You are a Socratic tutor. You do not explain. You ask.

Rules:
- Ask one question at a time. Then stop.
- Each question should expose an assumption, a missing step, or a consequence the reader has not considered.
- Never answer your own question. Never summarize the passage.
- If the reader is stuck, ask a smaller question, not a hint.
- Plain words, contractions, no em dashes.

Return a single question, nothing else.`,
    user: "Ask me one question that makes me reason about this passage.",
  },
};

export function buildTutorPrompt({ mode, context = {} }) {
  const prompt = TUTOR_PROMPTS[mode];
  if (!prompt) return { error: "unknown mode" };

  const selectedText = clip(context.selectedText, 2000).trim();
  if (!selectedText) return { error: "selectedText is required" };

  const title = clip(context.articleTitle, 200).trim();
  const excerpt = clip(context.articleExcerpt, 4000).trim();
  const priorTurns = formatPriorTurns(context.priorTurns);

  const systemPrompt = `${prompt.system}

--- HIGHLIGHTED TEXT ---
"${selectedText}"

--- ARTICLE CONTEXT ---
${title ? `Title: ${title}\n` : ""}${excerpt}
--- END CONTEXT ---${priorTurns ? `\n\n--- PRIOR TUTOR TURNS ---\n${priorTurns}\n--- END TURNS ---` : ""}`;

  return { systemPrompt, userMessage: prompt.user };
}

export function buildArticleExplainPrompt(context = {}) {
  const title = clip(context.articleTitle, 200).trim();
  const body = clip(context.articleBody, 12000).trim();
  if (!body) return { error: "articleBody is required" };

  return {
    systemPrompt: `${TUTOR_PROMPTS.explain.system}\n\n--- ARTICLE ---\n# ${title}\n\n${body}\n--- END ARTICLE ---`,
    userMessage: "Explain what this article is about and why it matters in Grokking Algorithms style.",
  };
}

export function buildArticleSummaryPrompt(context = {}) {
  const title = clip(context.articleTitle, 200).trim();
  const body = clip(context.articleBody, 12000).trim();
  if (!body) return { error: "articleBody is required" };

  const systemPrompt = `You are a helpful assistant. Write a concise summary of the article below. Rules:
- Start with a # title and a 2-3 sentence overview under ## Overview
- Then 3-5 sections with ## headings covering the key topics
- Under each section: 1-2 short paragraphs OR 3-5 tight bullet points, not both
- Be specific: mention names, numbers, features, trade-offs
- No fluff, no "in conclusion" wrap-up paragraph
- Total output: roughly the length of a detailed tweet thread`;

  return {
    systemPrompt,
    userMessage: `Please summarize this article:\n\n# ${title}\n\n${body}`,
  };
}

export function buildCommentReplyPrompt(context = {}) {
  const body = clip(context.commentBody, 4000).trim();
  if (!body) return { error: "commentBody is required" };

  const title = clip(context.articleTitle, 200).trim();
  const excerpt = clip(context.articleExcerpt, 8000).trim();
  const thread = clip(context.threadContext, 6000).trim();

  const systemPrompt = `You are a helpful assistant replying to a comment on the article "${title}". Use the article content below as context for your reply.

--- ARTICLE ---
${excerpt}
--- END ARTICLE ---

Write a concise, friendly reply. Reference specific parts of the article when relevant. Use markdown formatting.`;

  return {
    systemPrompt,
    userMessage: `Reply to this comment:\n\n${body}${thread ? `\n\n--- THREAD CONTEXT (read bottom-to-top) ---\n${thread}\n--- END THREAD ---` : ""}`,
  };
}

export function buildHighlightReplyPrompt(context = {}) {
  const body = clip(context.commentBody, 4000).trim();
  if (!body) return { error: "commentBody is required" };

  const highlightedText = clip(context.highlightedText, 2000).trim();
  if (!highlightedText) return { error: "highlightedText is required" };

  const title = clip(context.articleTitle, 200).trim();
  const excerpt = clip(context.articleExcerpt, 4000).trim();
  const thread = clip(context.threadContext, 6000).trim();

  const systemPrompt = `You are a helpful assistant replying to a comment on a highlighted passage. Use the context below. Write a concise, friendly reply. Reference the highlighted text when relevant. Use markdown formatting.

--- HIGHLIGHTED TEXT ---
"${highlightedText}"

--- ARTICLE EXCERPT ---
${title ? `Title: ${title}\n` : ""}${excerpt}
--- END CONTEXT ---`;

  return {
    systemPrompt,
    userMessage: `Reply to this comment:\n\n${body}${thread ? `\n\n--- THREAD CONTEXT (read bottom-to-top) ---\n${thread}\n--- END THREAD ---` : ""}`,
  };
}

function clip(value, max) {
  return String(value ?? "").slice(0, max);
}

function formatPriorTurns(turns) {
  if (!Array.isArray(turns) || turns.length === 0) return "";
  return turns
    .slice(-5)
    .map((turn) => `[${clip(turn.mode, 20) || "tutor"}]: ${clip(turn.body, 1000)}`)
    .join("\n");
}
