<p align="center">
  <img src="public/icon-soma.png" alt="Soma icon" width="128" />
</p>

# Soma

> AI-accelerated learning you own. Markdown-native, visual, works with whatever you already use.

New here? [**Fork the repo**](https://github.com/Essomero/soma/fork), [import it into Vercel](https://vercel.com/new), add one password, deploy. 60 seconds, done. [Full walkthrough below](#step-0-fork-soma).

---

I love to learn. I wanted one centralized place to learn. I'm a visual learner. I love markdown, graphs, illustrations, and maths laid out beautifully.

For years Obsidian was my go-to. I still use it for local notes. But it never cut it for shareability, online access from every device, or rendering on the web. It's built for the Obsidian app, not for web content. Their AI integrations are also built for note-taking, not for learning workflows.

I built Soma (*Luganda: to read, study, learn*) to close that gap.

Soma is one centralized place to learn. AI-accelerated learning you own, that works with whatever you're already using. Point any LLM or coding agent at the repo, it loads the bundled skill and starts creating or editing content on its own. There's also an MCP server shipped with the repo. It works entirely on the web and deploys to Vercel in 60 seconds. All you need is an API key to your favorite model and it gets working fast.

**And it's beautiful.** I love beautiful content. Every page is designed for readers who learn by looking. Mermaid diagrams beside KaTeX math beside interactive 3D scenes beside runnable code blocks. If it reads like markdown, Soma renders it. The bundled agent skill converts any source into a Soma page.

Soma holds anything readable: books, essays, courses, guides, stories, tests, podcast transcripts, leisure reads. All in one place you own. Bring what you already read, open it on phone, tablet, or desktop, and share it with one toggle when you want. Nothing locks you in. Copy any page as markdown or export a PDF for print.

---

## The Three-Repo Suite: Read, Build, and Speak

Soma is designed as a modular trio of repositories:

```
┌──────────────────────────────────────────────────────────┐
│                     Soma (Web App)                       │
│  • Reading, private notebook (/learn), and publishing    │
│  • Agent skills for content creation                     │
│  • Edge SQLite (Turso) notes, highlights, and auth       │
│  • Deploys to Vercel in 60s                             │
└──────────────┬───────────────────────────┬───────────────┘
               │ Deep links                │ Oral Q&A
               ▼                           ▼
┌──────────────────────────────┐ ┌─────────────────────────┐
│     Soma Labs (Drills)       │ │   Son (Audio Q&A Agent) │
│                              │ │                         │
│ • Polyglot code exercises    │ │ • Real-time voice agent │
│ • Go, Deno, Docker Compose   │ │ • Kokoro TTS (local)    │
│ • TypeScript, Postgres plans │ │ • Live speech & barge-in│
│ • Cloned locally on your rig │ │ • Oral screen interviews│
└──────────────────────────────┘ └─────────────────────────┘
```

1. **`soma` (The Platform)**: The reader, personal notebook, agent skill system, content engine, and serverless edge API.
2. **`soma-labs` (The Drills Companion)**: Polyglot engineering workspace. Every technical course links directly to a runnable folder (Go worker pools, Postgres window functions, TypeScript type gymnastics, HogQL permissions) that you clone once and run locally.
3. **`son` (The Audio Q&A Voice Agent)**: A local real-time voice agent running Kokoro TTS and speech recognition at `http://localhost:7860`. Powers the oral technical screening tests in Soma (`/tests/:slug`), speaking questions aloud and evaluating spoken answers in real time.

---

## Editorial Voice: Simplicity Without Losing Complexity

> "Simplify the language, never the truth. Fewer syllables and fewer prerequisites, not fewer facts."

Soma is written in the **Grokking Algorithms tone**:
- **Intuition before vocabulary**: Hand the reader something physical to hold first, then give it its formal technical name.
- **Feel the pain first**: Open with an innocent, everyday piece of code or realistic setup, and watch where it breaks down. The reader feels the friction in their gut before hearing the formal solution.
- **Napkin diagrams and real stakes**: No sterile academic placeholders (`foo`, `bar`, `Shape: Circle | Square`). Every concept uses real systems: payment gateways, race conditions under load, packet drops, database lock contention.
- **Zero posturing**: No gatekeeping language or interview posturing. Built for curious engineers and independent thinkers who want to understand how the machine actually works.
- **Enforced on AI agents**: The bundled agent skills (`.claude/skills/soma/` and `SOMA_SKILL.md`) instruct any AI model to write in this exact register. When an agent creates a course or guide, it simplifies the language without dropping the systems physics.
---

## Core Capabilities

### 1. Author, Create & Edit Content In-App (or with Agents)
Soma ships a full content studio at **`/admin`** (owner login required). Every content type can be created and edited directly in the browser: stories, guides, docs, featured articles, courses, books, series, tests, and podcast episodes.
- **Type-aware forms**: Each type gets its own field set (intro, body, sections, pull quotes, bento highlights, tip cards, lessons/chapters/episodes, doc sections, test sources and questions, podcast segments and guests).
- **Every block mapped**: The block editor handles all 12 content block types — paragraph, image, horizontal rule, video callout, callout, code, math (KaTeX), Mermaid, YouTube, chart, 3D scene, and lab — plus free-form JSON editing for the complex ones.
- **Edit / Preview / Save**: Switch between editing and a live page preview, then save as private or publish in one click. Cancel returns you to wherever you came from.
- **Agent-Powered Publishing**: The repository ships two dedicated agent skills plus a content MCP server:
  - **Content Skill (`.claude/skills/soma`, `.agents/skills/soma`, `SOMA_SKILL.md`)**: Instructs any AI agent (Claude Code, Cursor, Windsurf, Cline, Aider, omp) to draft, type-check, and publish courses, stories, guides, books, and diagnostic tests in the *Grokking Algorithms* voice.
  - **Opinionation Skill (`.claude/skills/opinionation`, `.agents/skills/opinionation`, `OPINIONATION_SKILL.md`)**: Enforces minimal dependencies, explicit prerequisites, automated install setup, and self-contained README standards across code and companion labs.
  - **Content MCP Server (`server/mcp-server.mjs`)**: The same workflow (draft, validate, publish private, verify URLs, archive) exposed as 11 stdio tools; registered in `.mcp.json` for clients that read it.
- **Zero-friction publishing pipeline**: Ask your agent: *"Write a 4-lesson guide on WebSockets with companion drills."* The agent drafts the typed TypeScript manuscript in gitignored `drafts/<type>/`, links companion lab folders where a course needs drills, and publishes it to the store as a private row: previewable at your dev server, nothing committed. You flip the visibility toggle when it is ready; the agent then archives the manuscript to `src/content/` and commits that single file. Got an existing book, essay, or leisure read? Ask the agent to convert it: any markdown-style source becomes a Soma page.
### 2. Think on Paper, but Digital
- **Tactile typography**: Built with Sora (display), DM Sans (body), and KaTeX (mathematics) with wide reading margins.
- **Marginalia that survives edits**: Highlight any passage to leave private notes or questions. If you edit or rewrite the text later, an unmapped notes drawer preserves your annotations so your marginalia never drifts or vanishes.
- **No lock-in, beautiful paper**: Copy any page as markdown in one click. Dedicated `/print` routes format any article, book, or full course into clean, paginated layouts for physical paper printing or PDF export.

### 3. Interact with AI Anywhere in the Reading Experience
- **Inline margin AI**: Select any paragraph, derivation, or code snippet to ask an AI model to explain, challenge, or simplify the text directly in the margin.
- **Context-aware discussions**: AI assistants participate in thread discussions with full article context.
- **Multi-provider model gateway**: Plug in your own keys for OpenRouter, DeepSeek, Google Gemini, Groq, or Cerebras to switch models on the fly.

### 4. Real-Time Oral Audio Q&A (Powered by Son, Optional)
- **Voice-driven technical tests**: In diagnostic screen tests (`/tests/:slug`), Son reads questions aloud with natural inflection using local Kokoro-82M TTS.
- **Spoken candidate answers**: Answer technical questions with your voice via live speech recognition.
- **Barge-in and low latency**: Natural voice conversation without sending audio through proprietary cloud services.
- **Son is optional and independent**: Soma works fully without it. When Son is unreachable at `http://localhost:7860`, tests fall back to silent text mode. Son itself runs standalone and never needs Soma.

### 5. Your Library, Anywhere
- **Private notebook (`/learn`)**: A distraction-free markdown studio with instant KaTeX math, tables, callouts, and Mermaid diagrams. Draft notes, import books, or keep leisure reads. Accessible on mobile, tablet, or desktop. For full typed content (stories, guides, courses, tests, podcasts), use the `/admin` studio instead.
- **In your own infrastructure**: Powered by Vercel Serverless Functions and Turso (libSQL / edge SQLite). 100% sovereign data. Free tier forever, zero telemetry, and zero tracking scripts.
- **Make public what you wish**: Private by default behind your site password. A single click on the margin lock/globe toggle publishes any note, book, story, or entire course to the public web.

---

## Quick Start (Deploy in Minutes)

Three moves: fork, import, deploy. Your notes — and every story, guide, course, and test — live in your database, never in git, so nothing here can touch anyone else's writing. Your fork stays public (GitHub gives you no choice there); your writing stays private until you flip it public.

### Step 0: Fork Soma

[**Fork `Essomero/soma`**](https://github.com/Essomero/soma/fork) (accept the defaults). This is your copy: it stays linked for one-click updates later. No git needed. Agents publish into your database, not into the fork, so unfinished work never touches GitHub.

### Step 1: Import Your Fork Into Vercel

In Vercel, [Add New → Project](https://vercel.com/new) → **Import** your `soma` fork (pick the one under your account, not `Essomero/soma`). Importing uses your fork as-is: Vercel creates no new repo.

On the configure page, open **Environment Variables** and add one variable:

| Variable | Value | Notes |
|---|---|---|
| `SITE_PASSWORD` | Any strong string you invent (e.g. `openssl rand -base64 32`) | Your private studio login. Toggle the lock icon to mark it Sensitive |

Do this before pressing Deploy: deploying without it breaks login and forces a redeploy to fix. Do not add any `VITE_*` variables: those are local-development only and baking them into Vercel would expose your database token in the shipped JavaScript.

Further down the same page, under Optional Integrations, click **Add** on the **Turso** card. Vercel provisions the database and injects its URL and token into your project on its own: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`, no copying. The suggested resource name is random (e.g. `database-celeste-arrow`): it is only a label in the dashboards, so accept it or rename it, the app does not care.

Then press Deploy. Tables initialize automatically on the first API request: no migrations, no SQL to run by hand.

Prefer to use a database you already own, or want it under your own Turso account? Skip the card and paste its URL and token as `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` yourself, instead. Either path lands in the same place.

### Step 1.5: Publish demo content

Your database starts empty. The first production build (`npm run build`) publishes every `.ts` content file (the essays, guides, course, and tests in this repo) as private rows — nothing goes public on its own. Flip rows to `published` one by one (per slug: `UPDATE content_items SET status='published' WHERE slug='...'`) or all at once (`UPDATE content_items SET status='published'`). Your own writing stays private until you say otherwise.

`npm run publish-all` remains for manual refresh/repair (needs Turso credentials in `.env.local`). If a deployment ever looks empty, log in as owner and open `/api/diag`: it reports database reachability and row counts using booleans and numbers only — no secret values, nothing to copy.

### Step 2: (Optional) Add AI Keys

Without keys, reading, writing, and publishing work as is. Add any one key below and three features light up on your published pages:

- **Margin AI:** select any paragraph on a story, guide, or doc and ask it to explain the passage or distill it to its point.
- **Comment replies:** answer a reader's comment with one click, using the article as context.
- **Test grading:** diagnostic tests (`/tests/:slug`) grade written answers and return scored feedback. Without a key the grade button stays quiet and tells you which env var to set.

Add keys in Vercel under Project Settings > Environment Variables, then redeploy. Locally, copy `.env.example` to `.env.local` and fill the same names. You only need one; add more to unlock more models in the picker.

| Env var | What you get | Where to get it |
|---|---|---|
| `OPENROUTER_API_KEY` | One key for Claude, GPT, Gemini, Llama, and Qwen through a single router | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `DEEPSEEK_API_KEY` | Direct DeepSeek models | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) |
| `GEMINI_API_KEY` | Direct Google Gemini models | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY` | Fast Llama and Mixtral inference | [console.groq.com/keys](https://console.groq.com/keys) |
| `CEREBRAS_API_KEY` | Fast Cerebras inference | [cloud.cerebras.ai](https://cloud.cerebras.ai/) |
| `STRAITLY_API_KEY` | Multi-model gateway (100+ models) | [straitly.ai/app/keys](https://straitly.ai/app/keys) |

---

## Private First, Public on Demand

Your fork is public by design (GitHub forks of public repos cannot go private), so Soma never puts your writing in git. Notes, highlights, publishing toggles, and every story, guide, course, and test live in your Turso database. Pulling our updates never touches your words, and your private pieces are invisible to everyone — including anyone browsing your fork — until you flip them public.

When we ship fixes, open your fork on GitHub. If it shows "This branch is behind", click **Sync fork**, then Update branch. That is the whole update: no terminal, no git commands. If your Vercel project is connected to the repo, it redeploys on its own. Otherwise press Redeploy in the Vercel dashboard.

One habit keeps merges clean forever: published manuscripts get archived as new files under `src/content/` with new slugs — never edit the seed files in place. Everything you write in `/learn` or publish as private is already safe in your database either way.

---

## How to Create and Edit Content In-App

No terminal required. Log in as owner and open **`/admin`**:

1. **Create**: Hit "New" in the top bar, pick a content type (story, guide, course, book, series, doc, featured, test, podcast), and fill the type-aware form. Complex structures have dedicated editors: sections get the full block editor, courses/books/series get lesson/chapter/episode editors, tests get a source and question editor, docs get section/Q&A editors.
2. **Preview before saving**: Switch to Preview to see the page as readers will, then save from preview directly — no need to go back through edit mode.
3. **Edit existing content**: Any published or private row in `/admin` opens for editing. Public pages also show an owner-only **Edit** button when you're logged in.
4. **Save as Private or Publish**: Private rows are visible only to you behind the site password. Flip to published to make the row public instantly — no rebuild, no redeploy. Cancel returns you to the page you came from.

From any content page, the same flow is one click away: an owner-only Edit button (and Print Edition link) appears in the page actions when you are logged in.

## How AI Agents Generate and Publish Content

Because Soma bundles agent skills, you can use any coding assistant to manage your publication:

```bash
# Example with Claude Code / Cursor / Windsurf / Cline
"Add a new 4-lesson guide on WebRTC peer connection fundamentals"
```

1. The agent reads `.claude/skills/soma/SKILL.md` (or `.agents/skills/soma/SKILL.md`), or drives the bundled MCP server below instead.
2. It drafts the structured TypeScript manuscript in a staging file outside git, following the exact schema (`slug`, `title`, `sections`, `bentoHighlights`, `pullQuote`).
3. It publishes the manuscript with `npm run publish` — validated, private, previewable at your local dev server. Nothing is committed.
4. You flip the row to **public** with one click in the Studio or on the page: instant, no rebuild, no redeploy. Unpublishing is the same click back.
5. It archives the published manuscript under `src/content/` and commits that single file, so git holds the version history of public work and nothing else.

### MCP Server (Agent Tooling)

Soma ships a Model Context Protocol server (`server/mcp-server.mjs`) that agents can drive instead of reading the skill or scraping the site. It is registered in `.mcp.json` already, so clients that honor a project `.mcp.json` pick it up automatically; any MCP client can register it manually with `node server/mcp-server.mjs` (stdio, no secrets to configure: it reads `.env` like everything else).

The tools mirror the SOMA_SKILL.md workflow, and each shells out to the repo's own entry points so behavior stays the single source of truth:

| Tool | What it does |
|---|---|
| `content_types` | The 10 content types, folders, routes, when to use each |
| `topics` | Valid topic slugs for the `topics:` field |
| `manuscript_template` | Starter typed manuscript for a type + the publish lifecycle |
| `existing_content` | Store rows (slug, type, status) for slug-uniqueness and discovery |
| `get_content` | Full store row incl. body for a slug (alternative to browsing the site) |
| `store_row` | The mandated post-publish confirmation: slug, type, status |
| `drafts` | Staged manuscripts under gitignored `drafts/` |
| `validate_manuscript` | Runs the exact publish checks (`--check`) with no write |
| `publish_manuscript` | Validates + upserts as private; never touches visibility |
| `verify_url` | HEAD/GET check for every image, video, and external link URL |

The trust model matches the rest of the repo: the server is spawned by the agent client on the owner's machine, so no token is needed (unlike the browser-facing `local-agent` sidecar). `publish_manuscript` is the only write; everything else is read-only. Going public stays a human toggle flip, never a tool call.

---

## Running the Complete Suite Locally

### Prerequisites
- **Node.js**: v20+ (`node --version`)
- **npm** (ships with Node.js)
- A free Turso database URL and token (from [Turso](https://turso.tech))

### Step-by-Step Setup
```bash
# 1. Clone the web platform
git clone https://github.com/Essomero/soma.git
cd soma

# 2. Install dependencies
npm install

# 3. Configure local environment
cp .env.example .env.local
# Populate TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, and SITE_PASSWORD

# 4. Verify installation
npm run build   # Type-checks and builds the production bundle
```

### Two Dev Modes (Read This Before `npm run dev`)

Soma has two local modes. Pick deliberately:

- **`npm run dev` (no setup):** the frontend proxies `/api` to the production deployment. Use it to browse and write UI code with zero configuration. Warning: notes, highlights, and toggles you create go to the live production database. Never use this mode for testing data flows.
- **`npm run dev:local` plus `npm run server` (your own database):** the frontend proxies `/api` to `http://localhost:3001`, served from your own Turso database. The API server reads `.env.local` on its own and warns at startup if the Turso vars are missing. Use it for anything that writes data:
```bash
npm run server    # terminal 1: local edge API on :3001
npm run dev:local # terminal 2: frontend on :5173 wired to :3001
```

### First-Run Smoke Test

After starting the dev server, confirm the loop works end to end:

1. Open `http://localhost:5173/learn` and log in with your `SITE_PASSWORD`.
2. Write one note and save it. Tables self create on the first API request.
3. Flip the lock/globe toggle on the note and open it in a private window to confirm public access.

### Companion Repositories Setup
Running drills? Start with [Lab Setup](https://soma.mayanja.dev/docs/lab-setup): one companion workspace you clone once, then every lesson gives you the folder and verification command.

```bash
# Companion Labs (open-ended polyglot drills)
git clone https://github.com/Essomero/soma-labs.git
cd soma-labs
npm install       # Automatically runs the doctor probe for available runtimes
npm test          # Runs all drills available on your machine

# Real-Time Voice Agent (Son)
git clone https://github.com/Essomero/son.git
cd son
uv sync
son start server  # Runs at http://localhost:7860 to power oral tests
```

---

## Writing & Publishing Workflow

New to the content model? Read [Content Types](https://soma.mayanja.dev/docs/content-types) first: one page explaining what each type is for, with a canonical example of each.

1. **Private Scratchpad (`/learn`)**: Open **Learn** in the navigation. Draft rough notes, paste snippets, or outline ideas with live KaTeX math and Mermaid diagrams.
2. **Margin Highlights & In-App AI**: Select any text to attach annotations, ask the inline AI model for clarifications, or store thoughts.
3. **Oral Practice (`/tests`)**: Run diagnostic technical screens with Son reading questions and scoring spoken answers.
4. **Agent-Drafted Pieces**: Ask any coding assistant for a story, guide, course, or test. It lands as a private row in your database — open its page to preview, iterate through the agent, and flip it public only when you say so. No terminal, ever.
5. **One-Click Publishing**: Flip the lock/globe toggle in the margin on any article or note. It is instantly visible to the public without requiring your site password. Unpublishing is the same click, just as instant. A course, series, or book toggle publishes the whole collection at once, and the Studio (`/learn`, bottom of the page) has a global switch that flips everything at once, with a confirmation step.
6. **Physical Print & PDF**: Use `/print` routes (such as `/courses/:slug/print` or `/stories/:slug/print`) for distraction-free printing or PDF generation.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Typography**: Sora (display), DM Sans (body), KaTeX (math), Highlight.js (syntax)
- **Visuals**: Three.js / React Three Fiber, Mermaid.js
- **Audio & Voice Agent**: Son (Kokoro-82M TTS, Web Speech / Parakeet STT, Pipecat, Silero VAD)
- **Backend**: Vercel Serverless Functions (`/api/*`)
- **Database**: Turso (libSQL / edge SQLite) with self-healing automatic schema creation
- **Hands-On Labs**: Deno and Node.js (open to any language: see soma-labs)

---

## License

MIT License. Built for independent thinkers, engineers, and lifelong learners.
