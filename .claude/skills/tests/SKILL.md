---
name: tests
description: Create diagnostic tests, grade submissions, and iterate tests in a feedback loop for Soma. Use when asked to build tests, evaluate answers, or generate follow-up tests based on candidate gaps.
argument-hint: "[create|grade|iterate] [topic or slug]"
---

# Soma Test Creator & Evaluator

Use this skill to author diagnostic tests, evaluate test responses, and generate targeted follow-up tests in a continuous learning feedback loop.

## Quick Reference

| Action | Command / Usage | Primary Output |
|---|---|---|
| **Create** | Generate a new diagnostic test | `src/content/tests/<slug>.ts` + register in `index.ts` |
| **Grade** | Evaluate candidate answers against source material | Markdown diagnostic report with practical guidance |
| **Iterate** | Build a follow-up test targeted at identified gaps | New test focusing on misconceptions from prior test |

---

## Content Schema (`src/content/tests/my-test.ts`)

Every test file exports a `TestContent` object.

```ts
import type { TestContent } from "@/types";

export const myTest: TestContent = {
  slug: "distributed-systems-resilience",
  title: "Distributed Systems Resilience & Consensus",
  description: "Test your understanding of Raft leader election, split-brain mitigation, and distributed transaction semantics under network partitions.",
  category: "Architecture",
  subcategory: "Distributed Systems // Reliability",
  image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=675&fit=crop",
  imageAlt: "Server rack blinking LEDs in a modern data center",
  author: {
    name: "Soma Editorial",
    handle: "@soma",
  },
  date: "September 2026",
  tags: ["Distributed Systems", "Raft", "Consensus", "Resilience"],
  topics: ["technology"],
  estimatedMinutes: 12,
  defaultTimeLimitSeconds: 60, // Default time per question if unspecified
  passingScore: 75,

  // Sources: can be existing stories, guides, docs, raw markdown, or external links
  sources: [
    {
      type: "story",
      storySlug: "ip-32-raft", // References existing story/lesson
      description: "Core consensus invariants and log replication rules",
    },
    {
      type: "markdown",
      title: "Network Partition Handling Primer",
      description: "Rules for quorum calculation during split-brain events",
      content: `### Split Brain and Majority Quorums\n\nIn a cluster of N nodes, any valid majority quorum requires at least:\n\n$$Q = \\lfloor N / 2 \\rfloor + 1$$\n\nIf a network partition isolates a cluster into partitions of size A and B where neither has $Q$ nodes, neither partition may commit new log entries.`,
    },
    {
      type: "link",
      title: "In Search of an Understandable Consensus Algorithm (Ongaro & Ousterhout)",
      url: "https://raft.github.io/raft.pdf",
      description: "The original Raft paper specification",
    },
  ],

  // Questions: timed, one question at a time
  questions: [
    {
      id: "q1",
      type: "multiple-choice",
      question: "In a 5-node Raft cluster, a network partition divides the nodes into {Node 1, Node 2} and {Node 3, Node 4, Node 5}. Which partition can elect a leader and commit new entries?",
      timeLimitSeconds: 45, // 30s, 45s, 90s, etc.
      options: [
        { id: "a", label: "Neither partition can commit because all 5 nodes must acknowledge." },
        { id: "b", label: "The {3, 4, 5} partition, because it contains a strict majority (3 of 5 nodes)." },
        { id: "c", label: "The {1, 2} partition if Node 1 was already the incumbent leader." },
        { id: "d", label: "Both partitions continue independently and reconcile via vector clocks." },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation: "A majority quorum in a 5-node cluster requires 3 nodes (5/2 + 1 = 3). Only the partition with 3 nodes can achieve quorum to win an election or commit log entries.",
    },
    {
      id: "q2",
      type: "open",
      question: "Explain what happens when an old leader on the minority side of a partition receives a client write request, and what happens when the partition heals.",
      timeLimitSeconds: 90, // Longer for written response
      placeholder: "Describe the lifecycle of the uncommitted entry on the minority leader...",
      rubric: "Candidate must explain: (1) minority leader accepts write locally and attempts AppendEntries, (2) fails to reach quorum so entry is never committed, (3) on partition heal, higher term leader forces minority leader to overwrite its uncommitted entries with the authoritative log.",
      keyPoints: [
        "Uncommitted log entry",
        "Failed AppendEntries RPC quorum",
        "Term comparison on reconnection",
        "Log overwrite / roll back uncommitted suffix",
      ],
      sampleAnswer: "The minority leader appends the entry to its local log and sends AppendEntries RPCs to its peers. Because it cannot reach a majority quorum (at least 3 nodes), it cannot commit the entry or respond with success to the client. When the partition heals, the minority leader detects a heartbeat with a higher term from the majority leader, steps down to follower status, and rewinds its uncommitted entries to match the leader's authoritative log.",
    },
  ],
};
```

---

## Workflow 1: Creating a New Test

When authoring a new test:

1. **Pick or author source materials first**:
   - Reference existing stories or lessons (`type: "story"`, `storySlug: "..."`) from `src/content/stories/`.
   - Reference existing guides (`type: "guide"`, `guideSlug: "..."`) or docs (`type: "doc"`, `docSlug: "..."`).
   - If covering new ground, provide concise, highly concrete Markdown documents under `type: "markdown"`.
   - Add authoritative reference links under `type: "link"`.

2. **Formulate balanced questions**:
   - Aim for 5-8 questions per test.
   - Mix multiple-choice (testing invariants, traps, definitions, edge cases) with open-ended questions (testing synthesis, reasoning, tradeoffs, failure modes).
   - Set realistic `timeLimitSeconds` per question:
     - `30s`: quick invariant checks, definition matches, formula verifications.
     - `45s`: scenario-based multiple choice requiring mental simulation.
     - `90s`: open-ended text answers requiring 2-4 sentences of architectural reasoning.

3. **Write explicit rubrics for open questions**:
   - Always supply `rubric` (the ground truth criteria for the LLM evaluator).
   - Supply `keyPoints` (must-mention concepts or vocabulary).
   - Supply `sampleAnswer` (the exemplar answer).

4. **Register in `src/content/tests/index.ts`**:
   - Import the test and add it to `allTests`.
   - Run `npm run build` to verify TypeScript types and bundle integrity.

---

## Workflow 2: Grading Tests

When evaluating candidate responses (via the in-app evaluator or LLM prompt):

1. **Ground in source materials**:
   - Check if the candidate's answers cite or align with the specific principles in the source materials.
   - Note discrepancies between what the source material states and what the candidate assumed.

2. **Structure the feedback**:
   - **Mastery Score (0-100)**: Calculate a weighted score.
   - **Executive Summary**: 2 paragraphs highlighting strengths, recurring patterns, and core gaps.
   - **Per-Question Feedback**:
     - Question: restate the prompt (one line).
     - Status: `✅ Correct`, `⚠️ Partially Correct`, or `❌ Incorrect`.
     - Response: one sentence on what the candidate selected or wrote.
     - **What went right**: the accurate part, or `Nothing` if fully incorrect.
     - **What went wrong**: the specific misconception or flaw, or `Nothing` if fully correct.
     - **Practical Guidance on Improvement**: concrete mental models, code patterns, or specific sections to review.
   - **Top 3 High-Leverage Drills**: concrete, actionable next steps for the engineer to practice immediately.

---

## Workflow 3: The Iterative Feedback Loop

The goal of diagnostic testing is continuous mastery. When generating a follow-up test:

1. **Read previous evaluation results**:
   - Inspect the candidate's previous score and missed questions from `api/tests` or past test reports.
   - Identify the exact conceptual failure mode (e.g. confused isolation level `REPEATABLE READ` with `SERIALIZABLE`, or missed split-brain quorum math).

2. **Generate a targeted drill test**:
   - Create a focused 3-5 question test specifically targeting the candidate's weak areas.
   - Link the source material directly to the sections the candidate struggled with.
   - Gradually increase difficulty: start with a clarifying multiple-choice check, followed by an open-ended scenario forcing them to apply the corrected mental model.

---

## Tone and Style (Rule 17)

All test questions, explanations, and feedback must follow Rule 17:
- Plain-voice persona: technical end to end, easy to digest.
- Intuition before vocabulary.
- Numbers, not vague scale words ("3 of 5 nodes", not "most nodes").
- No em dashes. Use commas, colons, or parentheses instead.
- Concrete over abstract.
