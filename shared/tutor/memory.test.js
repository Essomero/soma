import test from "node:test";
import assert from "node:assert/strict";

import { collectPriorTurns } from "./memory.js";

const highlights = [
  {
    sectionIndex: 2,
    comments: [
      { id: 1, isAi: true, mode: "challenge", body: "What if the ACK was delayed?" },
      { id: 2, isAi: false, body: "User note" },
      {
        id: 3,
        isAi: true,
        aiAction: "socratic",
        body: "Why retry twice?",
        replies: [{ id: 4, isAi: true, mode: "explain", body: "Because two losses stack." }],
      },
      { id: -99, isAi: true, mode: "challenge", body: "Unposted draft" },
      { id: 5, isAi: true, mode: "explain", body: "   " },
    ],
  },
  {
    sectionIndex: 3,
    comments: [{ id: 6, isAi: true, mode: "explain", body: "Other section" }],
  },
];

test("collects posted AI turns from the requested section only", () => {
  const turns = collectPriorTurns(highlights, 2);
  assert.deepEqual(turns, [
    { mode: "challenge", body: "What if the ACK was delayed?" },
    { mode: "socratic", body: "Why retry twice?" },
    { mode: "explain", body: "Because two losses stack." },
  ]);
});

test("caps the number of turns to the most recent", () => {
  const turns = collectPriorTurns(highlights, 2, 2);
  assert.deepEqual(turns.map((t) => t.body), [
    { mode: "socratic", body: "Why retry twice?" }.body,
    { mode: "explain", body: "Because two losses stack." }.body,
  ]);
});

test("handles missing input", () => {
  assert.deepEqual(collectPriorTurns(undefined, 1), []);
  assert.deepEqual(collectPriorTurns([], 1), []);
});
