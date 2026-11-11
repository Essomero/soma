import type { StoryContent } from "@/types";

export const somaVisionRoadmap = {
  slug: "soma-vision-roadmap",
  category: "Perspective // Product Vision",
  subcategory: "Technology // Learning",
  title: "Soma: Reversing the Atrophy of Thought",
  excerpt:
    "Generative AI made producing content trivial and retaining it rare. Soma exists to reverse the atrophy of thought: learning you own, proved out loud, published when ready. Here is where the product is headed and the architecture that gets us there.",
  image:
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=675&fit=crop",
  imageAlt:
    "A single coffee cup on a wooden table at dusk beside an open notebook and a soft reading light",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  date: "November 2026",
  publishedAt: "2026-11-09T00:00:00Z",
  tags: ["Soma", "Product Vision", "Learning", "Architecture", "Roadmap"],
  topics: ["technology", "philosophy", "open-source"],

  intro:
    "Generative AI made producing content trivial and retaining it rare. We read summaries, paste snippets into voids, and mistake convenience for comprehension. Illusion of competence is up, retention is down. Soma exists to reverse that: sovereign learning you own, a margin tutor that challenges you, drills you run with your own hands, and oral proof that proves you own it. All on evening coffee terms, not school's. This piece is the honest audit of where Soma is today, where the vision asks it to go, and the architecture that gets us there without throwing anything away.",

  body: [
    "Open your laptop and ask any model to summarize a paper. It does, in three bullets. You nod, copy the summary into a doc, and move on. An hour later, could you explain the second bullet without looking?",
    "That is the new normal. Producing content got cheap. Retaining it got rare. Soma's job is to make retaining it delightful, not punitive.",
  ],

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
        "We don't replace human cognition. We use AI to make the gap between what you think you know and what you actually understand impossible to ignore. The margin tutor challenges your assumptions, Labs tests them with your own hands, Son forces you to prove them out loud. None of this is easy. Understanding never was, and AI can't change that.",
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
        "The **web platform** (`Essomero/soma`) is a reading, notebook, and publishing system. Ten content types (story, guide, course, book, series, doc, featured, test, podcast, topic), twelve block primitives (paragraph, image, code with highlight.js, KaTeX math, Mermaid diagrams, Recharts charts, Three.js 3D scenes, YouTube embeds, callouts, video callouts, lab blocks). Generic typed manuscripts flow into a runtime Turso or local SQLite store behind FTS5 search. Status is `private | published`. Your fork stays public, your writing stays private until you flip it.",
        "The **deploy matrix** is real: Docker Compose with file SQLite at `/app/data/soma.db` for the 60-second try, Dockerfile for Fly, Railway, Render, Coolify self-host, Vercel + Turso for edge, Netlify Functions, Cloudflare Pages + Functions. `USE_TURSO=true/false` is the sovereignty boundary in `api/_db.js`. One flag cleanly separates local from remote.",
        "The **agent-native authoring** is baked in. An MCP server at `server/mcp-server.mjs` exposes ten tools. Any coding agent reads the bundled skill (`SOMA_SKILL.md`) or drives the MCP server and drafts typed manuscripts into gitignored `drafts/<type>/`, validates, publishes private, and waits for you to flip public. Nothing lands in git until you explicitly archive it to `src/content/`.",
        "The **learning primitives v0** work: margin highlights (`api/highlights.js`) with an unmapped notes drawer so marginalia survives edits, threaded comments with multi-provider AI replies (`api/chat.js` — DeepSeek, OpenRouter curated set, Gemini translated to OpenAI SSE, Groq, Cerebras, Straitly), notes at `/learn`, oral tests at `/tests/:slug` powered by Son's Kokoro TTS at `http://localhost:7860` with prefetch cache keyed by `questionAudioCacheKey` (`src/lib/sonClient.ts`) and components `OralQuestionAudio` / `OralAnswerInput`.",
        "What is narrative versus implemented? The margin AI today is select-and-explain. Vision asks for tutor that also challenges, simplifies, counters, and runs Socratic sessions, with memory per reading position. Soma Labs today is a `lab` block with `path / command / output` linking to companion repo `soma-labs`. Vision wants drills you run where you are, with pass/fail binding to `api/progress.js`. Son today lives only on `/tests/:slug` with text fallback. Vision wants Son anywhere. SaaS tier today is 'deploy your fork to Vercel with Turso' — sovereignty, not yet zero-friction hosting with entitlements.",
        {
          type: "mermaid" as const,
          diagram:
            "graph TB\n  subgraph Client[src/]\n    Pages[Pages: Home, Story, Guide, Course, Test, Notes, Admin]\n    Blocks[ContentBlocks: md, math, mermaid, chart, scene3d, lab, youtube]\n    Lib[lib: content.ts, sonClient.ts, highlights.ts, testEvaluation.ts]\n  end\n  subgraph API[api/ + server/]\n    ContentApi[content.js + FTS5]\n    DB[_db.js: Turso remote or local SQLite]\n    Chat[chat.js: multi-provider gateway]\n    NotesApi[notes.js, highlights.js, comments]\n    Progress[progress.js]\n  end\n  subgraph Companion\n    Labs[soma-labs]\n    Son[son @ :7860 Kokoro]\n  end\n  Pages --> Lib --> ContentApi --> DB\n  Lib --> Son\n  Blocks -.-> Labs\n  Pages --> Chat\n  Progress --> DB",
          caption: "Soma today: same types, same blocks, same FTS5 across every deploy target.",
        },
      ],
    },
    {
      heading: "Pillar I: Sovereign by Default (Own Your Brain)",
      paragraphs: [
        "Traditional learning apps hold your thoughts hostage in proprietary clouds. Notes become exports you lose. Soma inverts that. You own the whole thing.",
        "The repo is MIT at `github.com/Essomero/soma`. Your content lives in SQLite you control, edge or local file, behind one password you invent. `SQLITE_PATH` defaults to `/app/data/soma.db` inside Docker, mounted as a single-file volume `soma_data`. Copy that file and you backed up your brain. The content store (`content_items`), highlights, comments, notes, progress — all in there. No tracking scripts, no telemetry, zero lock-in.",
        "The `api/_db.js` `getMode()` abstraction remembers this: `USE_TURSO=false` forces local SQLite even if `TURSO_*` vars leak from host env (Docker isolation), `true` forces Turso remote, unset keeps backward compat for existing Vercel deploys. That switch is the real sovereignty line.",
        "What we harden next: an eject button. `GET /api/export` zips `soma.db` plus a markdown dump of every content_item, highlight, and note, plus an assets manifest. Add it to `/admin` so own-your-brain is provable, not just promised.",
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
        "The evolution is auth polish, not a rewrite. Single-owner `SITE_PASSWORD` remains self-host default forever. Hosted adds magic-link device sessions behind existing `api/auth.js`, then optional workspaces if signal appears. Entitlements stay thin: free forever for self-host, free tier same on hosted, meter only AI calls from `api/chat.js` and Son-cloud if we ever host Son.",
        "Decision: don't build multi-tenant until the retention loop feels like evening coffee. Ship hosted single-user with Turso + Vercel as reference SaaS. Add Stripe only when AI cost justifies it. No code fork between sovereign and hosted.",
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
        "Right now the margin AI is simple: `useTextSelection` captures a range, `Comments.tsx` pops a composer, `api/chat.js` streams an explanation from whichever model you picked in `ModelPicker`. Selection math leans on `src/lib/highlights.ts` anchors so marginalia survives rewrites through the unmapped notes drawer.",
        "The target is a tutor sitting next to you. Not a chatbot that answers, a tutor that changes how you ask. When you select a paragraph on packet retransmission, the tutor shouldn't just define it. It should challenge your mental model: 'You said TCP retries after timeout. What happens if the ACK was just delayed, not lost? Two copies in flight. Now what?'",
        "Implementation is small. The selection popover gets five modes: Explain, Simplify, Challenge, Counter-example, Socratic. Each mode maps to a system prompt template stored alongside existing prompts in `src/lib/admin-prompts.ts`. We already have `api/chat.js` translating between providers and streaming SSE; mode is just a different system instruction. Session memory is per-page reading session, keyed by `content_items.slug + section_index`, not global chat. We can store it in the existing `comments` table with `is_ai=1` — add a `mode` column or reuse `ai_model`. No new table day one. Son TTS for tutor answers reuses existing `prefetchQuestionAudio` and `synthesizeSpeechWithSon` from `sonClient.ts`.",
        {
          type: "callout" as const,
          variant: "info" as const,
          title: "Small change, big feel",
          text: "No new tables, no new API. Same `chat.js` gateway, just richer prompts and a mode selector in the popover. ModelPicker already supports per-provider pinning — add a preferred tutor model pin per user.",
        },
      ],
    },
    {
      heading: "Soma Labs: Interactive Drills You Actually Run",
      paragraphs: [
        "A lab block today is metadata: title, `path` pointing into `soma-labs`, `command` to run, optional `output`. It tells you where the drill lives. It doesn't run anything or prove you did it.",
        "The target is drills you run with your own hands, then attach the proof. Phase one needs no infra: extend the lab block renderer to show expected output vs got, add a check command, and evaluate via existing `src/lib/testEvaluation.ts` which already grades written answers for `/tests/:slug`. For TypeScript and SQL drills, browser-side eval is safe. For Go, Deno, Docker drills, keep the clone-locally flow — don't try to run Go in a browser sandbox.",
        "Phase two adds a browser sandbox for TS/JS/SQL via WebContainers or direct eval. Phase three binds status to `api/progress.js`, which already exists: `{ slug, lesson_id, lab_id, status: attempted | passed, attempts }`. Course pages roll up drill pass rates.",
      ],
    },
    {
      heading: "Son Voice Agent: Spoken Verification",
      paragraphs: [
        "Written answers are easy to fake. Spoken answers reveal whether you actually internalized the idea. That's why Son exists: a local real-time voice agent running Kokoro-82M TTS with natural inflection, live speech recognition, barge-in, and low latency at `http://localhost:7860`. Soma already drives it through `sonClient.ts` — URL resolution from localStorage key `son_backend_url`, probing `checkSonAvailability()` via `/warming` then `/models`, in-memory audio cache keyed by `questionAudioCacheKey`, speech cleaning that strips markdown and LaTeX so TTS reads fluidly, synthesis via POST /speak.",
        "Today Son powers only `/tests/:slug`. The vision wants Son anywhere: you're reading a hard paragraph on cache invalidation, you hit 'Ask Son about this', Son synthesizes a paragraph explanation plus an oral check question generated through the existing `api/tests.js` LLM grading path, you answer out loud, Son nudges rather than grades. The components for this already exist: `OralQuestionAudio.tsx` and `OralAnswerInput.tsx`.",
        "Keep Son optional forever. `checkSonAvailability()` returns a status, and when Son is unreachable the page falls back to silent text mode. Don't couple voice to reading. Degrade silently.",
        {
          type: "callout" as const,
          variant: "warning" as const,
          title: "UX choice: explicit, not ambient",
          text: "Oral proof should be a button you choose, not a popup that listens. Ambient voice risks annoyance. Start explicit, measure whether people reach for it after a tutor challenge.",
        },
      ],
    },
    {
      heading: "The Public Toggle: Publish When Ready",
      paragraphs: [
        "Every Soma page already has the toggle. `PublicToggle.tsx` flips `content_items.status` between `private` and `published` behind an owner guard from `isAuthed`. Private rows are visible only to the owner, served runtime from `/api/content.js` — not bundled into `dist/`. Flip is instant, no rebuild. Archive step `npm run publish-all` copies private rows into `src/content/` TypeScript files for git history — the paper trail of a public mind.",
        "Vision-aligned polish is quiet. On private pages, show a proof summary: drills passed, oral proofs, highlights count, notes. Not a scoreboard, just ambient visibility: '3 drills · 2 oral proofs · 12 notes.' Then the toggle copy shifts from 'publish?' to 'you've proved this — publish when ready?' No dark patterns, no XP bar, no streak screaming.",
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
        "The chart sketches a hypothesis: when someone can point to drills and oral proofs attached to a note, they ship. When it's just a summary they copied, they don't.",
      ],
    },
    {
      heading: "Evening Coffee, Not School",
      paragraphs: [
        "Understanding is hard work. That doesn't change. What changes is the container around it: no deadlines, no streaks, no grades, no school. The friction stays. The pressure goes.",
        "Soma is deliberately not an LMS. No assignments, no due dates, no cohort mechanics. No grade-grind grift: no screaming streak counters, no corporate guilt trips.",
        "You drop in a complex research paper, a piece of classic lit, an architectural blueprint, or a casual weekend curiosity. Soma builds the interactive learning fabric around it through the agent skill pipeline — paste a URL or PDF, the MCP server's `manuscript_template` scaffolds a typed manuscript into gitignored `drafts/<type>/`, `validate_manuscript` checks slug shape and topic validity, `publish_manuscript` lands it private, you preview at `localhost:5173`, then flip when ready.",
        "Oral testing with Son feels like chatting with a sharp, supportive friend over coffee. That means less scoring speech, more 'say it better' nudges. `testEvaluation.ts` gets a friendly mode.",
        "Design guardrails already enforced in `AGENTS.md`: Grokking Algorithms tone (intuition before vocabulary, pain first, real stakes like payment gateways and race conditions under load, never `foo/bar`, numbers not scale words in 'Row 31,204 of 40,000' style, napkin visuals), typography Sora for display and DM Sans for body with KaTeX math and wide margins, Mermaid diagrams and chart/3D blocks lazy-loaded so bundles stay lean, private-first UI where the public toggle never shouts.",
      ],
    },
    {
      heading: "Architecture Map: Today and Next",
      paragraphs: [
        "Same binary, every target. Docker Compose file SQLite for the 60-second demo, Dockerfile for Fly/Railway/Render/Coolify, Vercel + Turso for edge, Netlify and Cloudflare Pages functions as thin proxies into the same adapter in `api/_db.js` and `api/content.js`. Migration is a table, not a fork: `CREATE TABLE IF NOT EXISTS content_items`, `highlights`, `comments`, `notes`, plus FTS5 full-text index managed from application code because Turso's HTTP pipeline doesn't support trigger SQL functions.",
        "The next layer doesn't break current. Extend selection popover to tutor modes, stream through existing `chat.js` multi-provider gateway. Enhance `progress.js` to track lab runs and oral scores per slug. Improve lab renderer to show expected vs got. Keep three-repo split (`soma`, `soma-labs`, `son`) — monorepo would betray sovereign simplicity. Import-anything workflow lives mostly in skill instruction, not in code: better prompts that convert a paper or transcript into typed blocks.",
        {
          type: "mermaid" as const,
          diagram:
            "graph LR\n  subgraph New Optional Layer\n    Tutor[tutor_sessions: slug, mode, history]\n    Proofs[proofs: lab/oral/highlight -> score]\n  end\n  subgraph Enhanced Flow\n    Sel[Text selection] --> Modes{Explain/Simplify/Challenge/Socratic}\n    Modes --> ChatAPI[api/chat with mode prompts]\n    Modes --> SonAny[Son anywhere: TTS Q + oral probe]\n    Lab[Lab block + check] --> ProgressAPI[progress.js enhanced]\n    Proofs --> PublishGate[Publish when you want, nudge not gate]\n  end",
          caption: "Next layer: tutor modes reuse comments table first, proof rolls into progress.js, Son anywhere degrades silently.",
        },
      ],
    },
    {
      heading: "The Road Ahead: Phased With No Regrets",
      paragraphs: [
        "**Phase 0: Sovereign export, 1 to 2 days.** `GET /api/export` zips `soma.db` plus markdown dump and assets manifest. Add to `/admin` menu. Document in README. Why first? Own-your-brain promise must be provable, not narrative.",
        "**Phase 1: Margin tutor modes, 2 to 3 days.** Extend `admin-prompts.ts` with five mode prompts (Explain, Simplify, Challenge, Counter-example, Socratic). Update selection popover in `Comments.tsx` and `useTextSelection.ts`. Store mode in `comments` table first. Stream via existing `api/chat.js`. Son optional TTS for tutor answer reuses `prefetchQuestionAudio` and `synthesizeSpeechWithSon`.",
        "**Phase 2: Proof graph v0, 3 to 5 days.** Enhance `progress.js` to track lab runs, oral scores, highlights per slug. UI in `/learn` and private page headers: quiet summary '3 drills · 2 oral proofs · 12 notes.' No gating, just visibility.",
        "**Phase 3: Labs runner v0.5, 1 week.** Improve lab block renderer with expected vs got, check button that evaluates via `testEvaluation.ts` for JS/TS/SQL. Document local flow for Go/Docker via `soma-labs` clone already described in guides.",
        "**Phase 4: Import anything, 1 week.** MCP tool `verify_url` already exists. New agent workflow: paste paper URL/PDF/YouTube -> MCP drafts manuscript into `drafts/<type>/` -> `validate_manuscript` -> `publish_manuscript` private. Conversion lives in skill instruction, not code — better prompts that turn any source into typed `ContentBlock[]`.",
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
        "How do we know we got it right? A new user should be able to:",
        "1. `docker compose up` or click deploy on Vercel, login, start reading in under 60 seconds.\n2. Select a hard paragraph, ask Margin AI to challenge them, have a back-and-forth that leaves them clearer, not just answered.\n3. Run a drill with their own hands and see progress reflected quietly.\n4. Speak an explanation out loud to Son and get a nudge, not a grade.\n5. Decide this is worth sharing, flip one toggle, and have a beautiful public page with no move to another tool.\n6. Export everything as zip plus markdown in one click and walk away.",
        "If it doesn't feel like evening coffee, we overbuilt.",
        "Soma is bridging the gap between raw information capture and permanent human understanding. By combining the freedom of open-source sovereign data with a polished, zero-friction experience powered by state-of-the-art verification tools, Soma is building the ultimate home for lifelong curiosity.",
      ],
    },
  ],
};
