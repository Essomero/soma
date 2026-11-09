import type { FeaturedContent } from "@/types";

export const somaVisionRoadmap: FeaturedContent = {
  slug: "soma-vision-roadmap",
  tag: "FEATURED ARTICLE // SOMA VISION",
  title: "Soma: Reversing the Atrophy of Thought",
  description:
    "Generative AI made producing content trivial and retaining it rare. Soma exists to reverse the atrophy of thought: learning you own, proved out loud, published when ready. Here is where the product is headed and the architecture that gets us there.",
  image:
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&h=900&fit=crop",
  imageAlt:
    "A single coffee cup on a wooden table at dusk beside an open notebook and a soft reading light",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  publishedAt: "2026-11-09T00:00:00Z",
  tagline:
    "Sovereign by default, zero-friction SaaS when you want it, and a learn-prove-publish loop that feels like evening coffee.",
  bentoHighlights: [
    {
      label: "SOVEREIGN BY DEFAULT",
      title: "Your Ideas Live in Your Database",
      description:
        "Open-source at github.com/Essomero/soma. Notes, highlights, tests, and every paragraph sit in edge SQLite you own. One file backup at /app/data/soma.db. Fork stays public, writing stays private.",
    },
    {
      label: "ZERO FRICTION SAAS",
      title: "Open a Tab and Start Thinking",
      description:
        "Same binary across Docker, Vercel + Turso, Fly, Railway, Netlify, Cloudflare. Self-host in 60 seconds or use the hosted workspace. SaaS is deploy config, not a product fork.",
    },
    {
      label: "LEARN, PROVE, PUBLISH",
      title: "Margin Tutor + Hands-on Drills + Oral Verification",
      description:
        "Select any paragraph and ask the margin AI to explain, challenge, or run a Socratic session. Run drills with your own hands in Soma Labs. Then prove it out loud to Son and flip one toggle to publish.",
    },
  ],
  pullQuotes: [
    {
      quote:
        "We refuse to treat AI as a replacement for human cognition. We use it as an aggressive, high-friction multiplier that turns passive consumption into active mastery.",
      attribution: "THE THESIS",
    },
    {
      quote:
        "Think in private on your own terms, prove your understanding out loud, and make public what you wish. This is learning reimagined.",
      attribution: "EVENING COFFEE, NOT SCHOOL",
    },
  ],
  sections: [
    {
      heading: "The Core Thesis: Reversing the Atrophy of Thought",
      paragraphs: [
        "Open your laptop and ask any model to summarize a paper. It does, in three bullets. You nod, copy the summary into a doc, and move on. An hour later, could you explain the second bullet without looking?",
        "That is the new normal. Generative AI made the world remarkably efficient at producing content and dangerously passive at retaining it. We read summaries, scroll feeds, and paste code snippets into voids, mistaking convenience for comprehension. The illusion of competence is at an all-time high while deep retention is at an all-time low.",
        "**Soma exists to reverse this trend.**",
        "We don't replace human cognition. We use AI as an aggressive, high-friction cognitive multiplier. Learning on Soma feels like an evening coffee ritual: warm, inviting, low-pressure, entirely for you, yet backed by rigorous multi-modal proof of understanding.",
        {
          type: "callout" as const,
          variant: "info" as const,
          title: "The enemy we picked",
          text: "Not lack of access to information — we have too much — but lack of proof. Soma's job is to make proof delightful, not punitive.",
        },
      ],
    },
    {
      heading: "What Is Soma Today: An Honest Audit",
      paragraphs: [
        "Soma today is three repos acting as one learning loop: the web app, the drills companion, and the voice agent.",
        "The **web platform** (`Essomero/soma`) is a reading, notebook, and publishing system. Ten content types, twelve block primitives, generic typed manuscripts flow into a runtime Turso or local SQLite store behind FTS5 search. Status is `private | published`. Your fork stays public, your writing stays private until you flip it.",
        "The **deploy matrix** is real: Docker Compose with file SQLite at `/app/data/soma.db` for the 60-second try, Dockerfile for Fly, Railway, Render, Coolify self-host, Vercel + Turso for edge, Netlify Functions, Cloudflare Pages + Functions. `USE_TURSO=true/false` is the sovereignty boundary in `api/_db.js`. One flag cleanly separates local from remote.",
        "The **agent-native authoring** is baked in. An MCP server at `server/mcp-server.mjs` exposes ten tools. Any coding agent reads the bundled skill or drives the MCP server and drafts typed manuscripts into gitignored `drafts/<type>/`, validates, publishes private, and waits for you to flip public.",
        "The **learning primitives v0** work: margin highlights with an unmapped notes drawer so marginalia survives edits, threaded comments with multi-provider AI replies (DeepSeek, OpenRouter, Gemini, Groq, Cerebras, Straitly), notes at `/learn`, oral tests at `/tests/:slug` powered by Son's Kokoro TTS at `http://localhost:7860` with prefetch cache keyed by `questionAudioCacheKey`.",
        {
          type: "mermaid" as const,
          diagram:
            "graph TB\n  subgraph Client[src/]\n    Pages[Pages: Home, Story, Guide, Course, Test, Notes, Admin]\n    Blocks[ContentBlocks: md, math, mermaid, chart, scene3d, lab, youtube]\n    Lib[lib: content.ts, sonClient.ts, highlights.ts, testEvaluation.ts]\n  end\n  subgraph API[api/ + server/]\n    ContentApi[content.js + FTS5]\n    DB[_db.js: Turso remote or local SQLite]\n    Chat[chat.js: multi-provider gateway]\n    NotesApi[notes.js, highlights.js, comments]\n    Progress[progress.js]\n  end\n  subgraph Companion\n    Labs[soma-labs]\n    Son[son @ :7860 Kokoro]\n  end\n  Pages --> Lib --> ContentApi --> DB\n  Lib --> Son\n  Blocks -.-> Labs\n  Pages --> Chat\n  Progress --> DB",
          caption: "Soma today: same types, same blocks, same FTS5 across every deploy target.",
        },
      ],
    },
    {
      heading: "Pillar I: Sovereign by Default",
      paragraphs: [
        "Traditional learning apps hold your thoughts hostage in proprietary clouds. Soma inverts that. You own the whole thing.",
        "The repo is MIT at `github.com/Essomero/soma`. Your content lives in SQLite you control, edge or local file, behind one password you invent. `SQLITE_PATH` defaults to `/app/data/soma.db` inside Docker, mounted as a single-file volume `soma_data`. Copy that file and you backed up your brain. The content store, highlights, comments, notes, progress — all in there. No tracking scripts, no telemetry, zero lock-in.",
        "The `api/_db.js` `getMode()` abstraction is the sovereignty line: `USE_TURSO=false` forces local SQLite even if `TURSO_*` vars leak from host env (Docker isolation), `true` forces Turso remote, unset keeps backward compat for existing Vercel deploys.",
        {
          type: "callout" as const,
          variant: "success" as const,
          title: "What stays",
          text: "File SQLite stays first-class. Docker Compose stays the 60-second demo. `drafts/` stays gitignored and private; only `src/content/` archive files are explicit public history.",
        },
      ],
    },
    {
      heading: "Pillar II: Managed SaaS With Zero Friction",
      paragraphs: [
        "Self-hosting is freedom with friction. Some learners just want to open a tab and start thinking. They shouldn't have to wireshark env vars to get there.",
        "The fix isn't a second codebase. SaaS is the same binary (`server/index.mjs` + `api/*.js`) with different deploy config. Today's self-host flow is `git clone`, set `SITE_PASSWORD`, `docker compose up`. Hosted flow is fork into Vercel, add Turso integration, add `SITE_PASSWORD`, deploy. Both land private rows visible only to the owner behind the password.",
        "The evolution is auth polish, not a rewrite. Single-owner `SITE_PASSWORD` remains self-host default forever. Hosted adds magic-link device sessions behind existing `api/auth.js`, then optional workspaces if signal appears. Entitlements stay thin: free forever for self-host, free tier same on hosted.",
        {
          type: "mermaid" as const,
          diagram:
            "graph LR\n  User --> Either{Deploy}\n  Either -->|Docker| File[(SQLite file at /app/data/soma.db)]\n  Either -->|Vercel+Netlify+CF| Turso[(Turso remote libSQL)]\n  Either -->|Fly/Railway/Render| File\n  File --> Content[content_items + FTS5 + highlights + notes]\n  Turso --> Content\n  Content --> Toggle[Private -> Public toggle]\n  Toggle --> Export[Export zip eject button]",
          caption: "SaaS is deployment, not a second product. Same store, same FTS5, same types.",
        },
      ],
    },
    {
      heading: "Pillar III: Learn It, Prove It, Publish It",
      paragraphs: [
        "This is the core loop. Today it's linear: read, maybe highlight, maybe test. The vision wants a cycle you actually enjoy repeating.",
        {
          type: "mermaid" as const,
          diagram:
            "graph LR\n  Read[Read & Interrogate] --> Drill[Soma Labs Drill]\n  Drill --> Speak[Son Oral Proof]\n  Speak --> Reflect[Notes & Highlights]\n  Reflect --> Publish{Ready?}\n  Publish -- No --> Read\n  Publish -- Yes --> Public[Public Toggle]\n  Public --> Read",
          caption: "Read -> drill with your hands -> prove out loud -> reflect -> publish when you want. No gates.",
        },
        "Four pieces make the loop feel real. Each reuses what exists today.",
      ],
    },
    {
      heading: "Margin AI: Read and Interrogate",
      paragraphs: [
        "Right now the margin AI is simple: `useTextSelection` captures a range, `Comments.tsx` pops a composer, `api/chat.js` streams an explanation from whichever model you picked in `ModelPicker`.",
        "The target is a tutor sitting next to you. Not a chatbot that answers, a tutor that changes how you ask. When you select a paragraph on packet retransmission, the tutor shouldn't just define it. It should challenge your mental model: 'You said TCP retries after timeout. What happens if the ACK was just delayed, not lost? Two copies in flight. Now what?'",
        "Implementation is small. The selection popover gets five modes: Explain, Simplify, Challenge, Counter-example, Socratic. Each mode maps to a system prompt template stored alongside existing prompts in `src/lib/admin-prompts.ts`. We already have `api/chat.js` translating between providers and streaming SSE; mode is just a different system instruction. Session memory is per-page reading session, keyed by `content_items.slug + section_index`, not global chat.",
        {
          type: "callout" as const,
          variant: "info" as const,
          title: "Small change, big feel",
          text: "No new tables, no new API. Same `chat.js` gateway, just richer prompts and a mode selector in the popover.",
        },
      ],
    },
    {
      heading: "Soma Labs: Interactive Drills",
      paragraphs: [
        "A lab block today is metadata: title, `path` pointing into `soma-labs`, `command` to run, optional `output`. It tells you where the drill lives. It doesn't run anything or prove you did it.",
        "The target is drills you run with your own hands, then attach the proof. Phase one needs no infra: extend the lab block renderer to show expected output vs got, add a check command, and evaluate via existing `src/lib/testEvaluation.ts` which already grades written answers for `/tests/:slug`. For Go, Deno, Docker drills, keep the clone-locally flow — don't try to run Go in a browser sandbox.",
      ],
    },
    {
      heading: "Son Voice Agent: Spoken Verification",
      paragraphs: [
        "Written answers are easy to fake. Spoken answers reveal whether you actually internalized the idea. That's why Son exists: a local real-time voice agent running Kokoro-82M TTS with natural inflection, live speech recognition, barge-in, and low latency at `http://localhost:7860`. Soma already drives it through `sonClient.ts` — URL resolution, probing `checkSonAvailability()`, in-memory audio cache, speech cleaning that strips markdown and LaTeX.",
        "Today Son powers only `/tests/:slug`. The vision wants Son anywhere. The components for this already exist: `OralQuestionAudio.tsx` and `OralAnswerInput.tsx`.",
        "Keep Son optional forever. `checkSonAvailability()` returns a status, and when Son is unreachable the page falls back to silent text mode. Degrade silently.",
        {
          type: "callout" as const,
          variant: "warning" as const,
          title: "UX choice: explicit, not ambient",
          text: "Oral proof should be a button you choose, not a popup that listens. Ambient voice risks annoyance. Start explicit.",
        },
      ],
    },
    {
      heading: "The Public Toggle: Publish When Ready",
      paragraphs: [
        "Every Soma page already has the toggle. `PublicToggle.tsx` flips `content_items.status` between `private` and `published` behind an owner guard. Private rows are visible only to the owner, served runtime from `/api/content.js` — not bundled into `dist/`. Flip is instant, no rebuild.",
        "Vision-aligned polish is quiet. On private pages, show a proof summary: drills passed, oral proofs, highlights count, notes. Not a scoreboard, just ambient visibility: '3 drills · 2 oral proofs · 12 notes.' Then the toggle copy shifts from 'publish?' to 'you've proved this — publish when ready?' No dark patterns, no XP bar.",
        "Sovereignty means you publish when you want, not when a threshold says so. Proof visibility is a nudge, never a gate.",
        {
          type: "chart" as const,
          title: "Proof Makes Publishing Stickier",
          nodes: [
            { kind: "barChart" as const },
            { kind: "xAxis" as const, label: "Proof State" },
            { kind: "yAxis" as const, label: "% Who Publish" },
            { kind: "grid" as const },
            {
              kind: "series" as const,
              name: "Publish rate",
              data: [
                { x: 0, y: 18 },
                { x: 1, y: 34 },
                { x: 2, y: 61 },
                { x: 3, y: 78 },
              ],
              color: "#b8c3ff",
            },
          ],
          caption:
            "Hypothesis, not science: when someone can point to drills and oral proofs attached to a note, they ship.",
        },
      ],
    },
    {
      heading: "Evening Coffee, Not School",
      paragraphs: [
        "Soma is deliberately not an LMS. No assignments, no due dates, no cohort mechanics. No screaming streak counters.",
        "You drop in a complex research paper, a piece of classic lit, an architectural blueprint, or a casual weekend curiosity. Soma builds the interactive learning fabric around it through the agent skill pipeline — paste a URL or PDF, the MCP server scaffolds a typed manuscript into gitignored `drafts/<type>/`, validates, publishes private, you preview at `localhost:5173`, then flip when ready.",
        "Oral testing with Son feels like chatting with a sharp, supportive friend over coffee. Less scoring speech, more 'say it better' nudges.",
        "Design guardrails already enforced in `AGENTS.md`: Grokking Algorithms tone (intuition before vocabulary, pain first, real stakes like payment gateways and race conditions, never `foo/bar`, numbers not scale words in 'Row 31,204 of 40,000' style, napkin visuals), typography Sora for display and DM Sans for body with KaTeX math and wide margins, Mermaid diagrams and chart/3D blocks lazy-loaded so bundles stay lean.",
      ],
    },
    {
      heading: "The Road Ahead: Phased With No Regrets",
      paragraphs: [
        "**Phase 0: Sovereign export, 1 to 2 days.** `GET /api/export` zips `soma.db` plus markdown dump and assets manifest. Add to `/admin` menu. Why first? Own-your-brain promise must be provable, not narrative.",
        "**Phase 1: Margin tutor modes, 2 to 3 days.** Extend `admin-prompts.ts` with five mode prompts (Explain, Simplify, Challenge, Counter-example, Socratic). Update selection popover in `Comments.tsx` and `useTextSelection.ts`. Store mode in `comments` table first. Stream via existing `api/chat.js`.",
        "**Phase 2: Proof graph v0, 3 to 5 days.** Enhance `progress.js` to track lab runs, oral scores, highlights per slug. UI in `/learn` and private page headers: quiet summary '3 drills · 2 oral proofs · 12 notes.' No gating, just visibility.",
        "**Phase 3: Labs runner v0.5, 1 week.** Improve lab block renderer with expected vs got, check button that evaluates via `testEvaluation.ts` for JS/TS/SQL. Document local flow for Go/Docker via `soma-labs` clone.",
        "**Phase 4: Import anything, 1 week.** MCP tool `verify_url` already exists. Workflow: paste paper URL/PDF/YouTube -> draft manuscript into `drafts/<type>/` -> validate -> publish private. Conversion lives in skill instruction.",
        "**Phase 5: Hosted SaaS thin layer when loop proves fun.** Single-user hosted equals current Vercel + Turso with auth polish via `api/auth.js` magic link. Meter AI calls from `chat.js` logs. Keep `SITE_PASSWORD` as self-host default. No code fork.",
        {
          type: "callout" as const,
          variant: "danger" as const,
          title: "What we will NOT build",
          text: "No Notion clone (no databases, no kanban for learning). No LMS (no due dates, no cohorts). No hosted Go/Docker sandboxes — browser eval only for safe drills; real engineering runs locally in `soma-labs`. No second content system — everything still through `content_items` + FTS5 + same blocks. No multi-tenant before single-user delight.",
        },
      ],
    },
    {
      heading: "The Evening Coffee Test",
      paragraphs: [
        "How do we know we got it right? A new user should be able to: `docker compose up` or click deploy on Vercel, login, start reading in under 60 seconds. Select a hard paragraph, ask Margin AI to challenge them, have a back-and-forth that leaves them clearer, not just answered. Run a drill with their own hands and see progress reflected quietly. Speak an explanation out loud to Son and get a nudge, not a grade. Decide this is worth sharing, flip one toggle, and have a beautiful public page. Export everything as zip plus markdown in one click and walk away.",
        "If it doesn't feel like evening coffee, we overbuilt.",
        "Soma is bridging the gap between raw information capture and permanent human understanding. By combining the freedom of open-source sovereign data with a polished, zero-friction experience powered by state-of-the-art verification tools, Soma is building the ultimate home for lifelong curiosity.",
      ],
    },
  ],
};
