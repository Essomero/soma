# Soma — Engineering & Contribution Guide

These rules apply to every task in this project.
Bias: caution over speed on non-trivial work. Minimum code that solves the problem.

## Rule 1: Think Before Coding
State assumptions explicitly. If uncertain, verify with code or ask.
Push back when a simpler approach exists.

## Rule 2: Simplicity First
Minimum code that solves the problem. Nothing speculative.
No features beyond what was asked. No abstractions for single-use code.
Test: would a senior engineer say this is overcomplicated? If yes, simplify.

## Rule 3: Surgical Changes
Touch only what you must. Clean up only your own changes.
Do not refactor what is not broken. Match existing style.

## Rule 4: Match Conventions
Conformance > taste inside the codebase.
Follow established patterns across components, schemas, and API handlers.

## Rule 5: Fail Loud
"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.

## Rule 6: No Co-Author on Commits
Do not add "Co-Authored-By" lines for AI assistants on git commits.

## Rule 7: Never Force-Add Gitignored Files
Do not use `git add -f` to commit files in `.gitignore`. If a file is ignored, it stays ignored.

## Rule 8: Plain-Voice Persona for Prose (Grokking Algorithms Standard)
All prose across guides, stories, courses, documentation, and agent-generated lessons must strictly follow the **Grokking Algorithms tone**:

1. **Core mandate**: I should never have to sound smart; I just need to make sure I understand things.
2. **The spine: simplify the language, never the truth**:
   Fewer syllables and fewer prerequisites, not fewer facts.
   Simpler register, same technical depth. A caveat dropped to keep the story tidy is a lie by omission.
3. **The goal is not to make the idea smaller. It is to make the reader feel capable**:
   Refuse to make the reader feel stupid while they learn. Dense prose is not evidence of a hard idea. It is a tax on a reader who was already smart enough.
4. **Take the reader on a journey, never dump content**:
   - **Feel the pain first**: Open with a natural, innocent piece of code or everyday setup that anyone would write, and watch it blow up. The reader must feel the friction before hearing the formal solution.
   - **Never posture for gatekeepers**: Write for a curious builder who wants to understand how the machine actually works.
   - **Ban sterile academic placeholders**: No `foo`, `bar`, or `Shape: Circle | Square`. Use real situations with real stakes (payment gateways, sorting mail, cash registers, network packets).
   - **Intuition before vocabulary**: Make the idea land, then name it. Never open with the term.
   - **Numbers, not scale words**: "Row 31,204 of 40,000" beats "some rows."
   - **Napkin visuals**: Boxes and arrows until it clicks. If a paragraph could be drawn, describe what the drawing would show.
   - **No em dashes**: Never use em dashes anywhere in prose or documentation.
   - **Contractions always**: Don't, it's, you're, can't.
   - **No hedge openers**: No "it's worth noting," no "let's dive in." Start with the claim.

---

# Soma Project Architecture

```bash
npm install     # Install dependencies
npm run dev     # Start local development server (http://localhost:5173)
npm run build   # Type-check and production build
```

## Content Architecture
All content lives in `src/content/` organized by type:
- `src/content/stories/`: Developer stories, engineering deep dives, and course lessons
- `src/content/courses/`: Multi-lesson structured learning paths
- `src/content/guides/`: Practical walkthroughs and technical tutorials
- `src/content/featured/`: Long-form featured articles with bento grids
- `src/content/books/`: Multi-chapter book reading
- `src/content/series/`: Multi-part sequential engineering build logs
- `src/content/docs/`: Architecture references and companion lab setup
- `src/content/tests/`: Diagnostic screen tests with oral question support
- `src/content/podcast/`: Audio episodes, transcripts, and show notes
- `src/content/registry.ts`: Single unified export registry

## Companion Repositories
- **Soma Labs** (`https://github.com/Essomero/soma-labs`): Companion runnable code drills in Go, Deno, Docker Compose, and Node.
- **Son** (`https://github.com/Essomero/son`): Real-time voice agent powering oral interview questions at `http://localhost:7860`.
