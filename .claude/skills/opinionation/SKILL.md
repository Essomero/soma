---
name: opinionation
description: Architecture standard for minimal dependencies, explicit prerequisites, automated install setup, and complete self-contained READMEs.
argument-hint: "[repository or architectural task]"
---

# Opinionation — Minimal Dependencies & Self-Contained Architecture

This skill defines the architectural standard across the Essomero ecosystem (`soma`, `soma-labs`, `son`).
Any autonomous agent or human contributor proposing a new track, service, dependency, or documentation change must adhere to these five rules.

---

## 1. Minimal Dependencies by Default (The Dependency Diet)

Every external dependency is an ongoing tax: bundle size bloat, supply chain attack surface, breaking upgrades, and bitrot.

- **Standard Library First**: Always reach for built-in capabilities before importing external packages:
  - Node.js: use `node:test`, `node:assert`, `node:fs`, `node:crypto`, `node:http`.
  - Go: use standard `testing`, `net/http`, `sync`, `context`.
  - Python: use `unittest`, `dataclasses`, `pathlib`, `http.client`.
  - TypeScript: use native zero-config runners (Deno or Node 22+).
- **The 10-Line Rule**: If a capability can be implemented in 10 to 20 lines of clean, readable code (slugification, debounce, simple query parsing, basic assertion diffs), write the function. Do not pull in an npm package with fifty transitive dependencies.
- **Isolated Workspaces**: In companion repositories (`soma-labs`), dependencies must remain strictly scoped to their individual track folder. Never pollute the root workspace with dependencies that only one lesson needs.

---

## 2. Explicit Prerequisites (Zero Hidden Magic)

Nothing is more frustrating than cloning a repository, running a script, and seeing a cryptic `command not found: foobar` error.

- **Declare Runtimes Up Front**: Every track or feature that requires an external binary (Docker, Go, Deno, SQLite, Python) must explicitly state:
  1. The exact binary name.
  2. The minimum supported version.
  3. The exact operating system install command (macOS Homebrew, Linux curl/apt).
  4. The reason why that specific tool is required.
- **Fail Gracefully**: If an optional runtime is absent, the harness must notify the developer and skip that specific track instead of crashing the entire test suite.

---

## 3. Automated Setup on Repository Install

A developer should not have to run seven manual setup steps to get started.

- **The `postinstall` Doctor**: When `npm install` runs, a diagnostic doctor script should inspect the environment and output a clean table of what is ready and what is missing:
  ```bash
  npm install       # Automatically runs doctor probe
  npm run doctor    # Inspects runtimes and ready tracks at any time
  ```
- **Self-Healing Schemas**: Databases must initialize their own tables idempotently on the first request using `CREATE TABLE IF NOT EXISTS`. Never require a developer to run manual migration SQL scripts just to make the app boot.
- **Zero-Config Local Dev**: In local development (`DEV` mode), authentication gates should default to open or provide simple local bypasses so a contributor can start writing immediately.

---

## 4. Complete, Self-Sufficient READMEs

Every repository README must be completely self-contained. A contributor must never have to search external docs or guess an environment variable to get running.

Every README must include:
1. **One-Line Tagline & Manifesto**: What the project does, why it exists, and who it is for.
2. **1-Click Deploy / Quick Start**: The fastest path from zero to a live working deployment.
3. **Exhaustive Environment Variable Table**: Every single variable must be listed with:
   - Variable name.
   - Purpose and default value.
   - Whether it is required or optional.
   - Exact link or command to generate it.
4. **Step-by-Step Local Setup**: Copy-paste terminal commands from `git clone` to `npm run dev`.
5. **A Verification Command**: A clear command (`npm run build` or `npm test`) that proves the installation was 100% successful.

---

## 5. Grokking Algorithms Tone in All Documentation

Technical depth does not require dense or intimidating prose:

- **Simplify the language, never the truth**: Fewer syllables, not fewer facts.
- **Feel the friction first**: Show the naive code that breaks down before giving the formal solution.
- **Napkin diagrams over abstract jargon**: If an idea has moving parts, describe what a napkin drawing of the boxes and arrows looks like.
- **Zero em dashes**: Keep sentence rhythm clean with colons, parentheses, or short periods.
