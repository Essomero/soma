<p align="center">
  <img src="public/icon-soma.png" alt="Soma icon" width="128" />
</p>

# Soma

> Think on paper but digital. Learn anything at your pace, in your own infrastructure, and make public what you wish.

New here? Three moves: [**fork the repo**](https://github.com/Essomero/soma/fork), [import it into Vercel](https://vercel.com/new), add one password, click Add on the Turso card, deploy. [Full walkthrough below](#step-0-fork-soma).

---

Soma (*Luganda: to read, study, learn*) is an AI-native learning, publishing, and writing platform. It combines the tactile focus of paper with sovereign edge infrastructure, in-app AI interaction, oral audio Q&A, and autonomous agent publishing.

Most publishing tools force a trade:
- **Blogging platforms** (Ghost, Substack) push you to publish for an audience before you have understood the topic yourself.
- **Note-taking apps** (Notion, Obsidian) keep thoughts trapped in proprietary clouds or require fragile sync setups with clumsy export pipelines.

Soma gives you a private notebook, an AI agent publishing engine, an editorial reading experience, hands-on code drills, real-time voice screening, and an offline print press in a single architecture that lives entirely in your own infrastructure.

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

### 1. Agent-Powered Content & Architecture (Ships with Bundled Skills)
Soma is designed from the ground up to collaborate with AI coding agents. The repository ships with two dedicated agent skills:
- **Content Skill (`.claude/skills/soma`, `.agents/skills/soma`, `SOMA_SKILL.md`)**: Instructs any AI agent (Claude Code, Cursor, Windsurf, Cline, Aider, omp) to draft, type-check, and publish courses, stories, guides, books, and diagnostic tests in the *Grokking Algorithms* voice.
- **Opinionation Skill (`.claude/skills/opinionation`, `.agents/skills/opinionation`, `OPINIONATION_SKILL.md`)**: Enforces minimal dependencies, explicit prerequisites, automated install setup, and self-contained README standards across code and companion labs.

- **Zero-friction publishing pipeline**: Ask your agent: *"Write a 4-lesson guide on WebSockets with companion drills."* The agent creates typed TypeScript schema files under `src/content/`, links companion lab folders, verifies `npm run build`, and your git push deploys it to the world.
### 2. Think on Paper, but Digital
- **Tactile typography**: Built with Sora (display), DM Sans (body), and KaTeX (mathematics) with wide reading margins.
- **Marginalia that survives edits**: Highlight any passage to leave private notes or questions. If you edit or rewrite the text later, an unmapped notes drawer preserves your annotations so your marginalia never drifts or vanishes.
- **Offline physical print edition**: Dedicated `/print` routes format any article, book, or full course into clean, paginated layouts for physical paper printing or PDF export.

### 3. Interact with AI Anywhere in the Reading Experience
- **Inline margin AI**: Select any paragraph, derivation, or code snippet to ask an AI model to explain, challenge, or simplify the text directly in the margin.
- **Context-aware discussions**: AI assistants participate in thread discussions with full article context.
- **Multi-provider model gateway**: Plug in your own keys for OpenRouter, DeepSeek, Google Gemini, Groq, or Cerebras to switch models on the fly.

### 4. Real-Time Oral Audio Q&A (Powered by Son, Optional)
- **Voice-driven technical tests**: In diagnostic screen tests (`/tests/:slug`), Son reads questions aloud with natural inflection using local Kokoro-82M TTS.
- **Spoken candidate answers**: Answer technical questions with your voice via live speech recognition.
- **Barge-in and low latency**: Natural voice conversation without sending audio through proprietary cloud services.
- **Son is optional and independent**: Soma works fully without it. When Son is unreachable at `http://localhost:7860`, tests fall back to silent text mode. Son itself runs standalone and never needs Soma.

### 5. Write Notes & Access Anywhere
- **Private notebook (`/learn`)**: A distraction-free markdown studio with instant KaTeX math, tables, callouts, and Mermaid diagrams. Accessible on mobile, tablet, or desktop.
- **In your own infrastructure**: Powered by Vercel Serverless Functions and Turso (libSQL / edge SQLite). 100% sovereign data. Free tier forever, zero telemetry, and zero tracking scripts.
- **Make public what you wish**: Private by default behind your site password. A single click on the margin lock/globe toggle publishes any note, story, or entire course to the public web.

---

## Quick Start (Deploy in Minutes)

Three moves: fork, import, deploy. Your notes — and every story, guide, course, and test — live in your database, never in git, so nothing here can touch anyone else's writing. Your fork stays public (GitHub gives you no choice there); your writing stays private until you flip it public.

### Step 0: Fork Soma

[**Fork `Essomero/soma`**](https://github.com/Essomero/soma/fork) (accept the defaults). This is your copy: it stays linked for one-click updates later. No git needed. Agents publish into your database, not into the fork, so drafts never touch GitHub.

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

Your fork is public by design (GitHub forks of public repos cannot go private), so Soma never puts your writing in git. Notes, highlights, publishing toggles, and every story, guide, course, and test live in your Turso database. Pulling our updates never touches your words, and your drafts are invisible to everyone — including anyone browsing your fork — until you flip them public.

When we ship fixes, open your fork on GitHub. If it shows "This branch is behind", click **Sync fork**, then Update branch. That is the whole update: no terminal, no git commands. If your Vercel project is connected to the repo, it redeploys on its own. Otherwise press Redeploy in the Vercel dashboard.

One habit keeps merges clean forever: published manuscripts get archived as new files under `src/content/` with new slugs — never edit the seed files in place. Everything you write in `/learn` or publish as a draft is already safe in your database either way.

---

## How AI Agents Generate and Publish Content

Because Soma bundles agent skills, you can use any coding assistant to manage your publication:

```bash
# Example with Claude Code / Cursor / Windsurf / Cline
"Add a new 4-lesson guide on WebRTC peer connection fundamentals"
```

1. The agent reads `.claude/skills/soma/SKILL.md` (or `.agents/skills/soma/SKILL.md`).
2. It drafts the structured TypeScript manuscript in a staging file outside git, following the exact schema (`slug`, `title`, `sections`, `bentoHighlights`, `pullQuote`).
3. It publishes the manuscript as a **draft** with `npm run publish` — validated, private, previewable at your local dev server. Nothing is committed.
4. On your approval it flips the row to **published**: instant, no rebuild, no redeploy. Unpublishing is the same one-word change back.
5. It archives the published manuscript under `src/content/` and commits that single file, so git holds the version history of public work and nothing else.

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

New to the content model? Read [Content Types](https://soma.vercel.app/docs/content-types) first: one page explaining what each type is for, with a canonical example of each.

1. **Private Scratchpad (`/learn`)**: Open **Learn** in the navigation. Draft rough notes, paste snippets, or outline ideas with live KaTeX math and Mermaid diagrams.
2. **Margin Highlights & In-App AI**: Select any text to attach annotations, ask the inline AI model for clarifications, or store thoughts.
3. **Oral Practice (`/tests`)**: Run diagnostic technical screens with Son reading questions and scoring spoken answers.
4. **Agent-Drafted Pieces**: Ask any coding assistant for a story, guide, course, or test. It lands as a private draft in your database — preview it locally, iterate, and flip it public only when you say so.
5. **One-Click Publishing**: Flip the lock/globe toggle in the margin on any article or note. It is instantly visible to the public without requiring your site password. Unpublishing is the same click, just as instant.
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
