import test from "node:test";
import assert from "node:assert/strict";

import { buildActionPrompt } from "./actions.js";
import { isTutorMode, TUTOR_MODES } from "./modes.js";
import { buildTutorPrompt } from "./prompts.js";
import { runChat } from "../chat/core.js";

const context = {
  selectedText: "The sender retries after a timeout.",
  articleTitle: "TCP Retransmission",
  articleExcerpt: "Packets can be lost. TCP retries with a backoff.",
};

test("mode metadata covers the five tutor modes", () => {
  assert.deepEqual(
    TUTOR_MODES.map((m) => m.id),
    ["explain", "simplify", "challenge", "counter", "socratic"],
  );
  assert.equal(isTutorMode("socratic"), true);
  assert.equal(isTutorMode("answer"), false);
});

test("each tutor mode produces a distinct prompt", () => {
  const users = new Set();
  for (const { id } of TUTOR_MODES) {
    const built = buildTutorPrompt({ mode: id, context });
    assert.equal(typeof built.systemPrompt, "string");
    assert.match(built.systemPrompt, /HIGHLIGHTED TEXT/);
    assert.match(built.systemPrompt, /The sender retries after a timeout\./);
    users.add(built.userMessage);
  }
  assert.equal(users.size, TUTOR_MODES.length);
});

test("tutor prompt validates mode and selected text", () => {
  assert.equal(buildTutorPrompt({ mode: "nope", context }).error, "unknown mode");
  assert.equal(buildTutorPrompt({ mode: "explain", context: {} }).error, "selectedText is required");
});

test("prior tutor turns are included", () => {
  const built = buildTutorPrompt({
    mode: "challenge",
    context: {
      ...context,
      priorTurns: [
        { mode: "explain", body: "The sender waits for an ACK." },
        { mode: "challenge", body: "What if the ACK was delayed?" },
      ],
    },
  });
  assert.match(built.systemPrompt, /PRIOR TUTOR TURNS/);
  assert.match(built.systemPrompt, /What if the ACK was delayed\?/);
});

test("article and comment actions validate their required context", () => {
  assert.equal(buildActionPrompt({ action: "article-explain", context: {} }).error, "articleBody is required");
  assert.equal(buildActionPrompt({ action: "article-summary", context: {} }).error, "articleBody is required");
  assert.equal(buildActionPrompt({ action: "comment-reply", context: {} }).error, "commentBody is required");
  assert.equal(buildActionPrompt({ action: "highlight-reply", context: {} }).error, "commentBody is required");
  assert.equal(buildActionPrompt({ action: "nope" }).error, "unknown action");
});

test("article explain uses the shared Grokking prompt", () => {
  const built = buildActionPrompt({
    action: "article-explain",
    context: { articleTitle: "TCP", articleBody: "Retries happen." },
  });
  assert.match(built.systemPrompt, /Grokking Algorithms/);
  assert.match(built.systemPrompt, /--- ARTICLE ---/);
  assert.match(built.systemPrompt, /Retries happen\./);
});

test("comment reply carries thread context", () => {
  const built = buildActionPrompt({
    action: "comment-reply",
    context: {
      commentBody: "This feels wrong.",
      articleTitle: "TCP",
      articleExcerpt: "Retries happen.",
      threadContext: "[User]: This feels wrong.",
    },
  });
  assert.match(built.userMessage, /THREAD CONTEXT/);
  assert.match(built.userMessage, /This feels wrong/);
});

test("gateway uses the server prompt and ignores a client systemPrompt", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await runChat({
    body: {
      action: "tutor",
      mode: "socratic",
      context,
      systemPrompt: "CLIENT INJECTION",
      model: "deepseek-flash",
      stream: false,
    },
    keys: { deepseek: "key" },
    fetchImpl,
  });

  assert.equal(result.kind, "json");
  const systemMessage = calls[0].messages.find((m) => m.role === "system").content;
  const userMessage = calls[0].messages.find((m) => m.role === "user").content;
  assert.doesNotMatch(systemMessage, /CLIENT INJECTION/);
  assert.match(systemMessage, /Socratic tutor/);
  assert.match(userMessage, /one question/);
});

test("gateway rejects an unknown action", async () => {
  const result = await runChat({
    body: { action: "nope", context: {}, model: "deepseek-flash" },
    keys: { deepseek: "key" },
    fetchImpl: () => {
      throw new Error("should not fetch");
    },
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.error, "unknown action");
});
