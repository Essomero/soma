# Soma

> Think on paper but digital. Learn anything at your pace, in your own infrastructure, and make public what you wish.

New here? Do [Step 0: free Turso database](#step-0-create-a-free-turso-database) below (2 minutes, no installs), then [**fork the repo**](https://github.com/Essomero/soma/fork) and import your fork in Vercel. Importing uses your fork as-is: no new repo is created.

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

Order matters: create the free Turso database first (Step 0), because the Deploy button asks for its credentials.

### Step 0: Create a Free Turso Database

Turso hosts your edge SQLite database. The free tier covers personal use. Two paths, same result:

**Path A: Browser dashboard (no installs, any OS).**
1. Sign up at [turso.tech](https://turso.tech) (GitHub login works).
2. Open Databases and create one named `soma-db`. Pick the region closest to you; the default is fine.
3. Open the database. The Overview page shows a Connect section with the Database URL and a copy button. Copy it. That is your `TURSO_DB`.
4. Click **Create Token** right below the URL. A dialog shows the token and the URL together. Copy both immediately: the token is shown once and never again. If you close the dialog first, create a fresh token.

**Path B: Command line.**
```bash
# macOS:
brew install tursodatabase/tap/turso
# Linux / Windows (WSL):
curl -sSfL https://get.tur.so/install.sh | bash

turso auth signup
turso db create soma-db --group <nearest-region>   # omit --group to accept the default
turso db show soma-db --url       # copy to TURSO_DB
turso db tokens create soma-db   # copy to TURSO_TOKEN
```

Verify it answers before you deploy:
```bash
turso db shell soma-db "select 1;"
# expect: a single row with the value 1
```

Tables initialize automatically on the first API request after deploy. No migrations, no SQL to run by hand.

### Step 1: Fork Soma, Then Import Your Fork Into Vercel

Forking gives you your own linked copy in one click, no git needed. Importing uses that copy as-is: Vercel creates no new repo. And since AI agents publish by adding files to your repo, your fork doubles as their workspace. A fork also stays linked for one-click updates later.

1. [**Fork `Essomero/soma`**](https://github.com/Essomero/soma/fork) (accept the defaults).
2. In Vercel, Add New → Project → **Import** your `soma` fork (pick the one under your account, not `Essomero/soma`).
3. Add the three env vars from Step 2 and press Deploy.

### Step 2: Fill In Your 3 Required Environment Variables

Paste the values from Step 0:

| Variable | Value | Notes |
|---|---|---|
| `TURSO_DB` | URL from Step 0 (e.g. `libsql://soma-db-....turso.io`) | Paste exactly, including the `libsql://` prefix |
| `TURSO_TOKEN` | Token from Step 0 | Mark Sensitive in Vercel afterwards (Project Settings, Environment Variables) |
| `SITE_PASSWORD` | Any strong string you invent (e.g. `openssl rand -base64 32`) | Your private studio login. Mark Sensitive too |

### Step 3: (Optional) Add AI Keys

To enable the inline margin AI assistant and research chat, add one or more provider keys in your Vercel project settings:

- `OPENROUTER_API_KEY` (unified router for Claude, GPT, Gemini, Llama)
- `DEEPSEEK_API_KEY` (DeepSeek direct API)
- `GROQ_API_KEY` (ultra-fast Llama inference)
- `GEMINI_API_KEY` (Google Gemini)

---

## Keeping Your Deployment Updated

Your fork stays linked to `Essomero/soma`. Your notes, highlights, and publishing toggles live in your Turso database, never in git, so pulling our updates never touches your writing.

When we ship fixes, open your fork on GitHub. If it shows "This branch is behind", click **Sync fork**, then Update branch. That is the whole update: no terminal, no git commands. If your Vercel project is connected to the repo, it redeploys on its own. Otherwise press Redeploy in the Vercel dashboard.

One habit keeps merges clean forever: agents publish by adding new files under `src/content/`, so keep your own pieces as new files with new slugs instead of editing ours. Everything you write in `/learn` is already safe in your database either way.

---

## How AI Agents Generate and Publish Content

Because Soma bundles agent skills, you can use any coding assistant to manage your publication:

```bash
# Example with Claude Code / Cursor / Windsurf / Cline
"Add a new 4-lesson guide on WebRTC peer connection fundamentals under src/content/guides/"
```

1. The agent reads `.claude/skills/soma/SKILL.md` (or `.agents/skills/soma/SKILL.md`).
2. It outputs the structured TypeScript content file following the exact schema (`slug`, `title`, `sections`, `bentoHighlights`, `pullQuote`).
3. It registers the item in the folder aggregator (`index.ts`).
4. It runs `npm run build` to guarantee zero broken links or type errors.
5. Push to GitHub: Vercel builds and deploys your new content automatically.

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
# Populate TURSO_DB, TURSO_TOKEN, and SITE_PASSWORD

# 4. Verify installation
npm run build   # Type-checks and builds the production bundle
```

### Two Dev Modes (Read This Before `npm run dev`)

Soma has two local modes. Pick deliberately:

- **`npm run dev` (no setup):** the frontend proxies `/api` to the production deployment. Use it to browse and write UI code with zero configuration. Warning: notes, highlights, and toggles you create go to the live production database. Never use this mode for testing data flows.
- **`npm run dev:local` plus `npm run server` (your own database):** the frontend proxies `/api` to `http://localhost:3001`, served from your own Turso database. Use it for anything that writes data:
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
4. **One-Click Publishing**: Flip the lock/globe toggle in the margin on any article or note. It is instantly visible to the public without requiring your site password.
5. **Physical Print & PDF**: Use `/print` routes (such as `/courses/:slug/print` or `/stories/:slug/print`) for distraction-free printing or PDF generation.

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
