# Project Review: Soma

> Generated 2026-11-18 after codebase audit, competitive research, and conversation with the author.
> No bullshit.

---

## 1. What Soma Actually Is

An **AI-native personal learning and publishing platform** you self-host. The core loop:

```
Search → Create note → Write → AI Generate → Publish (private/public)
```

You search a topic, start a note if nothing exists, write freely (markdown, voice), and click one button to generate full structured content (story, guide, course, test, etc.) via AI, then publish it private or flip it public.

It renders rich blocks no other self-hosted platform combines: KaTeX math, Mermaid diagrams, 3D scenes (Three.js), charts (Recharts), YouTube embeds, code with syntax highlighting, callouts, lab blocks.

It is **not** a note-taking app, not a knowledge base, not an LMS, not a blog. It owns a specific intersection: *write or generate learning content with rich visuals, keep it private by default, publish when ready, get AI tutoring on every paragraph.*

---

## 2. Codebase Health

### Stats

| Metric | Value |
|---|---|
| Total commits | 290 |
| Authors | 1 (v1b3m = Benjamin Mayanja, 227 + 63 commits) |
| Age | ~4 months |
| Total source lines | ~44,000 (src/ + api/ + server/) |
| API lines | 3,872 across 16 `.js` files |
| Largest file | `StoryPage.tsx` — 2,220 lines, 30 imports |
| TypeScript errors | 0 (`tsc --noEmit` passes clean) |
| Tests | 3 `.test.js` files (shared/ only) |
| Deploy targets | 7 (Docker, Fly, Railway, Render, Vercel, Netlify, Cloudflare) |
| Deploy configs | 12 (each target + CI + Docker Compose variants) |
| Content files | 52 `.ts` manuscripts in `src/content/` |
| Staged drafts | 7 in `drafts/` (gitignored) |

### What's Strong

**Type system is solid.** `src/types/index.ts` (~500 lines) uses discriminated unions for content blocks (12 types), chart nodes, 3D scene nodes, test questions. Every manuscript validates against these schemas at publish time via 8 validation gates. This is the hardest part to get right and it's done well.

**Multi-provider AI gateway works.** `api/chat.js` + `api/models.js` support DeepSeek, OpenRouter, Gemini, Groq, Cerebras, Straitly through one interface. Streaming, non-streaming, model fallback. The admin prompts (`admin-prompts.ts`) generate structured content matching Soma's schemas. This is the generation pipeline that powers the "Sparkles → generate full content" flow.

**Deploy matrix is real, not aspirational.** Docker Compose (60s demo, file SQLite), Dockerfile (Fly/Railway/Render), Vercel + Turso, Netlify Functions, Cloudflare Pages. `USE_TURSO` flag cleanly splits local vs remote. Each target has its own config and was tested.

**Search → Create → Publish flow is shipped.** The landing search searches FTS5 content + notes simultaneously. No results → "Create a note" button → editor with AI auto-title + voice input → Sparkles button generates full structured content via AIDraftPanel → validate → publish private → flip public. This is not a vision doc; it works.

**Ships what it documents.** The VISION.md roadmap lists "Import Anything" as Phase 4 done — and it is: `api/import.js`, URL paste in admin, MCP `format_paste` tool, arXiv redirect handling. Most projects document vision and ship 40%. Soma ships closer to 70%.

### What's Concerning

**StoryPage.tsx is 2,220 lines with 30 imports.** It inlines comment tree building, AI chat streaming, reply management, highlight handling, progress tracking, mode switching, deletion, and multiple rendering sections. This is the kind of file that silently kills velocity. It works today. It will not work at 4,000 lines.

**3 tests for 44,000 lines.** The publish pipeline (8 validation gates, slug collision, DB writes, cache invalidation), API routes (16 endpoints), DB migrations (tenant_id, mutex), and AI streaming have zero test coverage. The smoke checks (`smoke-api.mjs`, `check-api-routes.mjs`) verify endpoints respond — they don't verify correctness. The shared/ tests test memory and chat core, not the content pipeline.

**47 local branches, no merged PR workflow.** The branching strategy suggests lots of parallel WIP that may not converge. 8 remote branches suggest features built and pushed but not merged. Combined with one person doing all the work, this means integration risk lives in the author's head.

**Scope surface is wide for one person.** Voice profiles, 3D scenes, charts, SSO, multi-tenant table prep, STT/TTS, oral testing via Son, proof graph, export, import-anything, FTS5 search, 7 deploy targets, 10 content types, validation gates. Each is real code. Each needs maintenance. One person can build all this. One person cannot deeply maintain all this while adding more.

**No adoption signal.** Zero GitHub issues from external users. Zero PRs. Zero community. The site (soma.mayanja.dev) and Dev.to post exist, but there's no feedback loop from people who aren't the author. The project is well-built in a vacuum.

---

## 3. Competitive Landscape

### Direct Competitors (closest overlap)

| Project | Stars | Age | What it does | Where Soma differs |
|---|---|---|---|---|
| **SilverBullet** | ~2k+ | 3+ years | Self-hosted markdown wiki with plugs (Lua scripting). Mature, stable. | No content types, no publishing pipeline, no AI tutoring, no rich blocks (no 3D, no charts, no KaTeX), no generation. It's a wiki, not a learning platform. |
| **HomeKB** | ~14 | Months | Local-first markdown KB with Rust engine, semantic search (sqlite-vec), MCP server for AI agents. | File-based, no publishing, no content types, no rendering pipeline, no AI generation. Serves AI agents reading your notes, not human learners. |
| **Cortex** | New | Months | Self-hosted markdown KB with 3D knowledge graph + MCP. | Knowledge base focus, no publishing, no learning content types, no AI tutor. The 3D graph is for navigation, not content. |
| **WriteFreely** | ~4.9k | 9+ years | Markdown publishing platform for writers. Mature, fediverse. | Blogging only. No learning primitives, no rich blocks, no AI, no private-by-design toggle. Different category. |

### Adjacent Competitors (partial overlap)

| Project | Overlap | Gap |
|---|---|---|
| **OpenTutor** | Self-hosted AI learning, block-based content | Upload-first (PDF → flashcards), not search-first. Python/Next.js. No publishing, no rich rendering (math, 3D, mermaid). |
| **Perplexity Pages** | Search → AI generates formatted page | Proprietary, hosted, no self-host, no custom blocks, no private toggle. Can't own your data. |
| **Obsidian Publish** | Markdown → web publishing | $10/mo, proprietary, static export only, no interactivity, no AI, no rich blocks. |
| **Notion** | All-in-one workspace + AI | Proprietary, hosted, no self-host, no learning-specific content types, lock-in. |
| **Coursewright** | Markdown course publishing | Static site generation only. No runtime, no AI, no rich blocks, no private toggle. |

### Where Soma Is Defensible

1. **Self-hosted + AI generation + rich rendering** — no other project combines these three. SilverBullet is self-hosted with great rendering but no AI generation. OpenTutor has AI generation but no rich rendering or publishing. Perplexity has generation + rendering but isn't self-hosted.

2. **Private-by-default publishing pipeline** — the `drafts → validate → publish-private → owner flips → archive` workflow is well-designed. Writing stays in your DB, not in git. Forks stay public, content stays private. This is the right architecture for "own your brain."

3. **Agent-native from day one** — MCP server with 10 tools, bundled skill files (SOMA_SKILL.md, OPINIONATION_SKILL.md), publishing workflow designed for AI agents. Most projects bolt on AI later. Soma was designed for it.

4. **10 content types with schema validation** — most self-hosted platforms dump everything into "notes" or "pages." Soma distinguishes stories, guides, courses, books, series, docs, featured, tests, podcast, topics, each with its own schema and rendering. This matters for learning content.

### Where Soma Is Vulnerable

1. **Perplexity can add self-hosted.** They have the generation and rendering. "Export as self-hosted package" is one product pivot away from being a direct competitor with 100x the resources.

2. **SilverBullet can add AI generation.** They have the self-hosted infrastructure and plugin system. An "AI course generator" plug is a matter of community effort, not architecture.

3. **The "self-hosted learning" niche may be too small to sustain.** The Venn diagram of "cares enough to self-host" ∩ "wants AI-generated learning content" ∩ "needs rich blocks (3D, math, charts)" ∩ "wants to publish/share content" is real but narrow. Growth depends on finding people at its center.

---

## 4. Progress Toward Vision

The author's stated vision: *search a topic, let AI generate content on the fly, explore in a beautiful shareable layout.*

### Shipped (70%)

| Feature | Status | Notes |
|---|---|---|
| Search → create note | ✅ Shipped | LandingSearch + SearchResultsPage both have it |
| Notes with markdown | ✅ Shipped | NotesEditorPage, 422 lines, auto-title, voice input |
| AI generate full content from note | ✅ Shipped | AIDraftPanel (593 lines) + AdminNewPage sourceNote flow |
| Beautiful rich rendering | ✅ Shipped | ContentBlocks handles 12 types: math, 3D, mermaid, chart, code, youtube, callouts, lab |
| Private-by-default | ✅ Shipped | status enum: private/published, all content starts private |
| Instant public toggle | ✅ Shipped | PublicToggle component, no rebuild needed |
| Margin AI tutor | ✅ Shipped | Select text → explain/challenge/simplify/socratic (5 modes) |
| Multi-provider AI gateway | ✅ Shipped | DeepSeek, OpenRouter, Gemini, Groq, Cerebras, Straitly |
| Multi-platform deploy | ✅ Shipped | 7 targets with working configs |
| Content validation | ✅ Shipped | 8 validation gates, FTS5 search |
| MCP server for agents | ✅ Shipped | 10 tools, stdio |
| Voice input (STT) | ✅ Shipped | Landing search + notes editor |
| Browser-native TTS | ✅ Shipped | useWebSpeech, useChromeTts |
| Import anything | ✅ Shipped | URL paste in admin, MCP format_paste, arXiv handling |

### Not Shipped (30%)

| Feature | Status | Notes |
|---|---|---|
| **Search → generate page (no note step)** | ❌ Missing | Current path: search → create note → write → sparkles → admin → generate. Should be: search → "Generate" → done. |
| **In-line generated page preview** | ❌ Missing | Generation goes through admin UI, not preview inline with search results. |
| **Generated content caching / dedup** | ❌ Missing | Same topic generates a new draft every time. No cache keyed by query. |
| **Progress / proof graph** | ❌ Missing | proof.js exists, useProof.ts exists, but no unified view of "I understand X." |
| **Lab runner v0.5** | ❌ Missing | LabBlock exists, testEvaluation.ts exists, but no browser-run check button. |
| **Export / own-your-brain button** | ❌ Missing | api/export.js exists but no UI to trigger it from /admin. |
| **Son everywhere** | ❌ Missing | Son works on `/tests/:slug` only. Margin AI has text-only tutor modes. |

The critical gap is **friction**: the "search → generate" flow takes 3 clicks and a page transition through the admin UI when it should take 1. The rendering, generation, and publishing infrastructure is all there. The UX that strings them together into "search a topic, get a page" is not.

---

## 5. Risks

### Technical

- **StoryPage.tsx at 2,220 lines** will become unmaintainable before 3,000. It does rendering, state management, API calls, and tree manipulation in one file. Refactor sooner than later.
- **Zero test coverage on the content pipeline** means regressions are silent. The 8 validation gates, slug collision resolutidon, DB write + cache invalidation, and AI generation parsing are all untested. A bad AI response can silently corrupt content.
- **47 local branches** suggest integration debt. Features built in isolation may conflict when merged.
- **7 deploy targets** is maintenance tax. Each new feature needs testing across Docker/Vercel/Netlify/Cloudflare/ etc. Consider deprecating the 3 lowest-traffic targets.

### Product

- **No users = no signal.** The biggest risk is building features nobody needs. The code is good. The vision is coherent. But without someone who isn't the author using it, every prioritization decision is a guess.
- **Perplexity/Google/OpenAI are moving toward exactly this.** AI-generated, beautifully formatted learning content is the obvious direction for all three. Soma's moat is self-hosting + private-by-default. That's a real moat but a narrow one.
- **The "generate from note" flow is undiscoverable.** A new user lands on the search bar, types a topic, sees "Start a note about X." They write a note. Then what? The Sparkles button is an icon with no label. The admin page is behind a login. The flow works but the user won't find it.

### Business

- **Zero revenue, zero users, zero community.** At 4 months this is fine. At 12 months it is a problem.
- **Single person, no bus factor.** The entire architecture, deploy pipeline, content schemas, and vision live in one head. Documentation is good (README, VISION, AGENTS, SOMA_SKILL) but not sufficient for handoff.

---

## 6. Recommendations

### Now (this week)

1. **Add a "Generate" button to search results.** When the search finds no exact match, offer "Generate a page about this" alongside "Create a note." Should go through the AI draft pipeline and show a preview directly, not route through admin.

2. **Label the Sparkles button.** "Generate full content" beats an icon. Users don't discover features through iconography.

3. **Delete 2 deploy configs.** Pick the 3 you actually test. Docker Compose (local), Vercel (hosted), and one more. Drop the rest. The maintenance tax is real and you have no users on those platforms yet.

### This month

4. **Find 3 people who aren't you and watch them use it.** Sit next to them. Don't explain anything. See where they get stuck. Every minute of this is worth 10 hours of building.

5. **Write tests for the publish pipeline.** The content publish flow (validate → slug dedup → DB write → cache invalidate → note append) is the most critical path in the app and has zero tests. One regression here and a user loses work.

6. **Refactor StoryPage.tsx.** Split into: a page shell, a content renderer, a comment tree component, and a tutor panel. The rendering logic is fine. The blob of state management and tree manipulation is the problem.

### This quarter

7. **Build the one-click "search → generate → preview → save" flow.** This is the core vision and the biggest gap. Remove the note intermediate step. Search a topic → AI generates a structured page with rich blocks → preview it → save private. That's the product.

8. **Ship the export button.** `/admin` needs an "Export everything" option. If "own your brain" is the thesis, the eject button must be visible and one click.

9. **Ship the proof graph.** The bones are there (`proof.js`, `useProof.ts`, `progress.js`). Surface it in `/learn`: "You read 3 stories, passed 2 labs, proved 1 concept." This is what makes Soma a learning platform and not a blog.

### Will not build

- Offline mode
- Mobile app
- Real-time collaboration
- Multi-tenant before single-user delight
- Code runner for Go/Docker in browser (leave that to `soma-labs`)
- LMS features (grades, cohorts, due dates)

---

## 7. Verdict

Soma is a **well-executed solo project with a real, narrow, defensible niche and a clear gap between what's built and what the user experiences.**

The rendering engine, content model, AI gateway, and publishing pipeline are the hard parts, and they're built well. The infrastructure supports 7 deploy targets, validates content at publish time, generates structured manuscripts from freeform notes, streams AI answers, renders 3D scenes and math and diagrams in the same page, and keeps everything private by default.

The gap is **UX friction in the core loop.** The "search → generate → read" flow takes too many clicks and goes through too many screens. The bones are there. The connective tissue is not.

The competitive position is defensible but narrow. Nobody combines self-hosting + AI generation + rich rendering + private publishing. But each piece individually has stronger competitors, and the total addressable market for all four combined is unproven.

**Month 4 score:** Strong code, good architecture, clear vision, no users.
**Month 5 priority:** Users over features. Friction over surface area. One deploy path over 7.