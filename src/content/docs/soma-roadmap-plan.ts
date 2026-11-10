import type { DocContent } from "@/types";

export const somaRoadmapPlan: DocContent = {
  slug: "soma-roadmap-plan",
  category: "Architecture // Roadmap",
  title: "Soma Roadmap: What We Build Next",
  description:
    "Everything we build next at Soma: six phases from sovereign export to hosted SaaS, with the dual-repo strategy that keeps the open-source MIT repo the source of truth and the cloud as a thin overlay.",
  image:
    "https://images.unsplash.com/photo-1512758017271-d7b84c2113f1?w=1600&h=900&fit=crop",
  imageAlt: "A spiral notebook with handwritten notes, a coffee cup, and scattered pens on a wooden table",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  publishedAt: "2026-11-10T00:00:00Z",
  tags: ["Architecture", "Roadmap", "Planning", "SaaS", "Open Source"],
  topics: ["technology"],

  sections: [
    {
      number: "·",
      heading: "The Goal",
      anchor: "goal",
      intro:
        "Soma's core loop: read something hard, interrogate it, drill with your hands, prove it out loud, reflect, publish when you're ready. Not school. Evening coffee.",
      items: [
        {
          question: "What are we building toward?",
          answer: [
            "A loop you actually want to repeat. Every piece we add either makes reading more active (Margin tutor), makes proof feel good (Proof graph, Labs runner), removes friction to publish (Import anything, Sovereign export), or keeps the economics sustainable (Hosted SaaS).",
            "The whole product is MIT open source. Your content lives in SQLite you own. SaaS is the same code with a thin cloud layer on top — not a fork, not a second product.",
          ],
        },
      ],
    },

    {
      number: "A",
      heading: "Phase 0 — Sovereign Export",
      anchor: "phase-0-export",
      intro:
        "One-click brain backup. A button in admin that zips your SQLite database plus a markdown dump of everything. Walk away when you want. No lock-in.",
      items: [
        {
          question: "What changed?",
          answer: [
            "Implemented. An Export button in the admin dashboard opens a modal with content stats, a format picker, and CLI fallback instructions. The download streams a zip with a markdown dump of every content item plus an assets manifest. For local SQLite deploys (Docker, Fly.io, Railway), you can also include the raw `soma.db` file. For Turso remote deploys (Vercel, Netlify), a CLI tool with a copyable command handles full backups and large datasets.",
            "Three pieces:\n\n- `api/export.js` — GET handler, auth-gated. Builds a zero-dependency zip containing `content.md` + `assets-manifest.json` (+ `soma.db` for `?format=full` on local SQLite)\n- `scripts/export.ts` — CLI fallback: `npx tsx scripts/export.ts [--with-db]`. Reads `.env` / `.env.local` automatically. No server needed.\n- `ExportModal` — modal in the admin dashboard with content stats, format selection, and copyable CLI commands with checkmark confirmation.\n- `CopyableCode` — reusable UI primitive for inline code blocks with hover-to-copy and checkmark feedback.",
          ],
        },
      ],
    },

    {
      number: "B",
      heading: "Phase 1 — Margin Tutor Modes",
      anchor: "phase-1-margin-tutor",
      intro:
        "Right now the margin AI just answers. We want a tutor sitting next to you: Explain, Simplify, Challenge, Counter-example, Socratic. Each mode is a different system prompt. Session memory per paragraph so the tutor remembers what it just said.",
      items: [
        {
          question: "What changes?",
          answer: [
            "Surprisingly little. The chat gateway (`api/chat.js`) and SSE streaming already work. The Comments component already handles threads. What we add:\n\n- `src/lib/admin-prompts.ts` — five mode prompt templates (Explain, Simplify, Challenge, Counter-example, Socratic), each adapting an existing prompt format\n- `src/hooks/useTextSelection.ts` — a mode selector dropdown in the selection popover\n- `api/chat.js` — accept a `mode` param and pass the right prompt template\n- Schema: add a `mode` column to the `comments` table (nullable, default `explain`)",
            "No new tables. No new API endpoints. The mode is just a different system instruction on the same streaming route.",
          ],
        },
        {
          question: "What does a Socratic mode look like?",
          answer: [
            "When you select a paragraph on TCP retransmission, the tutor should challenge your mental model: 'You said the sender retries after timeout. What happens if the ACK was just delayed, not lost? Two copies in flight. Now what?' It does not answer. It makes you reason.",
            "Session memory is per-page reading session, keyed by `content_items.slug + section_index`. Not global chat.",
          ],
        },
      ],
    },

    {
      number: "C",
      heading: "Phase 2 — Proof Graph v0",
      anchor: "phase-2-proof-graph",
      intro:
        "On private pages, show a quiet summary: \"3 drills · 2 oral proofs · 12 notes.\" Not a scoreboard, not a gate. Just visibility that says \"you've proved this — publish when ready?\"",
      items: [
        {
          question: "What changes?",
          answer: [
            "Extend `api/progress.js` to aggregate per-slug — lab runs, oral scores, highlight count, note count. Show it in two places:\n\n- `/learn` page gets a proof dashboard view\n- Private page header gets an ambient proof badge\n\nThen the `PublicToggle.tsx` copy shifts from \"publish?\" to \"you've proved this — publish when ready?\" when proof exists. No dark patterns, no XP bar.",
          ],
        },
        {
          question: "Do we gate publishing on proof?",
          answer: [
            "Never. Sovereignty means you publish when you want, not when a threshold says so. Proof visibility is a nudge, never a gate. The toggle always works — it just changes its copy when proof exists.",
          ],
        },
      ],
    },

    {
      number: "D",
      heading: "Phase 3 — Labs Runner v0.5",
      anchor: "phase-3-labs-runner",
      intro:
        "Lab blocks today are just metadata — title, path, command. They don't run anything. Target: show expected output vs got, a check button that evaluates via the existing `testEvaluation.ts`.",
      items: [
        {
          question: "What changes?",
          answer: [
            "The lab block component gets an expected-output display, a got-input field, and a check button. The check goes through `src/lib/testEvaluation.ts`, which already grades written answers for `/tests/:slug`. We extend it to validate lab drill output for JavaScript, TypeScript, and SQL drills.\n\nGo and Docker drills stay local clone flow. You run them in `soma-labs` on your machine. We do not run Go in a browser sandbox.",
          ],
        },
        {
          question: "What stays out of scope?",
          answer: [
            "No browser Go/Docker sandbox. No hosted lab infrastructure. Greenfield TypeScript and SQL drills evaluate right in the browser via existing test evaluation. Everything else runs locally. That keeps this phase small.",
          ],
        },
      ],
    },

    {
      number: "E",
      heading: "Phase 4 — Import Anything",
      anchor: "phase-4-import",
      intro:
        "Paste a paper URL, PDF, or YouTube link. The MCP server drafts a manuscript, validates it, publishes it private. Conversion heuristics: YouTube → story, arXiv → doc, blog post → guide.",
      items: [
        {
          question: "What changes?",
          answer: [
            "Extend `server/mcp-server.mjs` with an import tool or extend `manuscript_template` to accept a URL and classify it. The `verify_url` MCP tool already checks HTTP 200 — reuse it for URL validation.\n\nThe pipeline: URL → fetch content → extract text/transcript → classify type → scaffold manuscript with template → validate → publish private. The conversion logic lives in the skill instruction, not in server code.",
          ],
        },
      ],
    },

    {
      number: "F",
      heading: "Phase 5 — Hosted SaaS",
      anchor: "phase-5-saas",
      intro:
        "The roadmap says 'SaaS is deploy config, not a product fork.' But auth polish, billing, and multi-tenant are real code changes. Here is the strategy to build them without forking the public repo.",
      items: [
        {
          question: "What is the core problem?",
          answer: [
            "You cannot fork a public GitHub repo and make the fork private. The only paths for maintaining a closed-source cloud alongside an MIT repo are:\n\n1. **Two repos, public is source of truth** — private cloud repo imports the public one as a submodule and layers cloud features on top. Sentry and Miragon use this.\n2. **Single monorepo with a `cloud/` directory under a different license** — proprietary code lives in the public clone, anyone can read it. GitLab CE/EE and PostHog use this.\n3. **Keep the original private, create a stripped public repo** — Cal.com did this by renaming their original repo to private and creating a new `cal.diy` public repo. You lose stars, issues, and community history.",
          ],
        },
        {
          question: "Which one do we use?",
          answer: [
            "**Two-repo model. Public is the source of truth.**",
            "```\ngithub.com/Essomero/soma        ← PUBLIC  (MIT) — the full platform\ngithub.com/Essomero/soma-cloud   ← PRIVATE       — thin SaaS wrapper\n```\n\n`soma-cloud` is not a fork. It is a separate private repo with a git submodule pointing at `Essomero/soma`. It layers cloud features on top without modifying the public code:",
            "```\nsoma-cloud/\n├── vendor/soma/              ← git submodule pointing at public repo main\n├── cloud-auth/               ← OAuth, magic link, user registration\n├── cloud-billing/            ← Stripe, plan tiers, usage metering\n├── cloud-tenant/             ← workspace provisioning\n├── cloud-proxy/              ← reverse proxy that injects tenant context\n└── docker-compose.yml        ← production SaaS compose file\n```",
          ],
        },
        {
          question: "What goes where?",
          answer: [
            "| Layer | Public (soma) | Private (soma-cloud) |\n|---|---|---|\n| Content platform | All of it. Blocks, types, pages, components | Nothing. Serves the same SPA |\n| Auth | SITE_PASSWORD + HMAC sessions | OAuth, magic link, user registration, MFA |\n| Database | `_db.js` with USE_TURSO toggle | Multi-tenant isolation, per-tenant provisioning |\n| Content CRUD | Full CRUD with public/private gating | Same CRUD with tenant_id filter injected by proxy |\n| AI proxy | Full multi-provider gateway (`api/chat.js`) | Usage metering wrapper |\n| Billing | Nothing | Stripe, plan tiers, seat management |\n| Infrastructure | Docker, fly.io, vercel, netlify, render | K8s manifests, Cloudflare Workers, monitoring |",
          ],
        },
        {
          question: "How does sync work?",
          answer: [
            "Source of truth = the public repo. All core product development happens in `Essomero/soma`. `soma-cloud` pins to a specific `soma` commit via git submodule and bumps it periodically (weekly or monthly). If a PR in `soma` breaks `soma-cloud`, the private repo's CI catches it at bump time.\n\n**No reverse sync ever.** Cloud-specific features stay in `soma-cloud`. If something belongs in both (like a `tenant_id` filter that also helps self-hosters), add it to the public repo deliberately as its own PR.",
          ],
        },
        {
          question: "What one thing should we add to the public repo now?",
          answer: [
            "**`tenant_id` support on every table.** This is the single architectural change that makes the SaaS possible while keeping the public repo fully functional for self-hosters:\n\n```sql\nALTER TABLE content_items ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';\n```\n\nSame pattern on `note_articles`, `comments`, `highlights`, `ratings`, `progress`, `test_submissions`. Self-hosters never set `x-tenant-id` so they stay on the `default` tenant — backward compatible. The cloud sets it from the user's session. This change is safe, boring, and unlocks the entire SaaS architecture.",
          ],
        },
      ],
    },

    {
      number: "G",
      heading: "What We Will Not Build",
      anchor: "wont-build",
      intro:
        "The roadmap calls these out explicitly. Writing them down prevents scope creep.",
      items: [
        {
          question: "What is out of scope?",
          answer: [
            "- **No Notion clone** — no databases, no kanban for learning\n- **No LMS** — no due dates, no cohorts, no streak counters\n- **No hosted Go/Docker sandboxes** — browser eval only for safe drills; real engineering runs locally in `soma-labs`\n- **No second content system** — everything through `content_items` + FTS5 + the same 12 block primitives\n- **No multi-tenant before single-user delight**",
          ],
        },
      ],
    },

    {
      number: "H",
      heading: "Order of Operations",
      anchor: "order",
      intro:
        "Not all phases block on each other. The dependency chain is short.",
      items: [
        {
          question: "What runs in what order?",
          answer: [
            "1. Phase 0 (Sovereign export) or Phase 1 (Margin tutor modes) first — both are small, high-value, and independent\n2. Add `tenant_id` to the public repo before creating `soma-cloud`\n3. Phase 2 (Proof graph) when the progress API feels stable\n4. Phase 3 (Labs runner) + Phase 4 (Import anything) whenever — they depend on nothing\n5. Create `soma-cloud` private repo and build auth, billing on top\n\nPhases 0, 1, 3, and 4 have zero dependencies. Phase 2 depends on the progress API being solid. The entire SaaS track (Phase 5) depends on the `tenant_id` migration landing in the public repo first.",
          ],
        },
      ],
    },
  ],
};
