---
name: soma
description: Create content for the Soma blog. Use when asked to write an article, story, guide, developer story, or any blog content for soma.vercel.app.
argument-hint: "[content-type] [title]"
---

# Soma Content Creator

You are creating content for **Soma** — a personal publishing platform for AI-assisted deep research, deployed at `https://soma.vercel.app`.

**Writing Voice:** All prose across all content types must strictly match the **Grokking Algorithms standard** (Rule 17 in `AGENTS.md` / `CLAUDE.md`). It is simple without losing complexity, never dumbed down, visual first, and written for the curious, capable mind. Never use em dashes. See *Important Rules* for full details.

## Quick Reference

Match the type to what the reader should walk away able to do. Full rationale with canonical examples lives at `/docs/content-types`; this table must stay consistent with it.

| Content Type | Folder | Route Pattern | When to Use |
|---|---|---|---|
| Story | `src/content/stories/` | `/stories/:slug` | One idea, felt deeply. Opens with something concrete that breaks, earns the principle. Never asks the reader to run code |
| Lesson | `src/content/stories/` (with Lab blocks) | `/stories/:slug` (linked from a course) | A story plus proof: narrative plus collapsed Lab blocks pointing at a `soma-labs` folder and a check command |
| Lab | Lab block inside a lesson | (not a page) | States the exact file, function, and command. The reader must change an input and observe the effect, never read passively |
| Course | `src/content/courses/` | `/courses/:slug` | Ordered lessons where each assumes the previous. No prose of its own; lessons teach |
| Guide | `src/content/guides/` | `/guides/:slug` | Steps followed in order to end somewhere new. Reordering breaks it |
| Doc | `src/content/docs/` | `/docs/:slug` | Lookup answers. Sections stand alone; reordering changes nothing |
| Featured | `src/content/featured/` | `/featured/:slug` | A stage, not a topic: any story strong enough to carry the front page hero |
| Book | `src/content/books/` | `/books/:slug` | One finished work read in chapter order; chapters are stories that only make sense together |
| Series | `src/content/series/` | `/series/:slug` | A log of work released over time; episodes stand alone but gain meaning in sequence |
| Test | `src/content/tests/` | `/tests/:slug` | Proof under time pressure with scoring. Each question maps back to source lessons |
| Podcast Episode | `src/content/podcast/` | `/podcast/:slug` | Ideas better heard than read: segments, guests, player |
| Topic | `src/content/topics/` | `/topics/:slug` | A shelf, not content: groups everything by interest instead of format |

## Content Schema

Every content file is a manuscript, not the publication. You author a typed object (schemas below), validate it with `tsc`, and publish it into the Turso content store with `npm run publish` — the API injects `id` and `href` at serve time, so you only provide `slug` and content fields. Readers never download manuscripts: pages fetch store rows at runtime, private to the owner until flipped public. A manuscript committed to git is implicitly public (forks are public), so publishing always lands private and only the owner's toggle makes anything public.

### Story (`src/content/stories/my-story.ts`)

```ts
import type { ContentBlock } from "@/types";

export const myStory = {
  slug: "my-story",                    // URL-safe, kebab-case
  category: "Perspective",             // Primary category
  subcategory: "Technology // Economics",  // Optional: shown as tag
  title: "Story Title",
  excerpt: "Compelling one-liner summary.",
  image: "https://images.unsplash.com/photo-{ID}?w=1200&h=675&fit=crop",  // Verified Unsplash photo — must match content
  imageAlt: "Descriptive alt text describing the actual photo",
  author: { name: "Author Name", handle: "@handle" },
  date: "June 2024",
  tags: ["Tag1", "Tag2", "Tag3"],
  topics: ["technology", "economics"], // Topic slugs — must match allTopics
  source: { name: "Author — Platform", url: "https://..." },  // Optional — single-source republish
  references: [                       // Optional — multi-source synthesis
    { title: "Source Title", url: "https://...", description: "Optional note" },
  ],

  // Simple layout (used when sections are absent)
  intro: "Opening paragraph that hooks the reader...",
  body: [
    "First paragraph...",
    "Second paragraph...",
  ],
  pullQuote: {                         // Optional — single pull quote for simple layout
    quote: "A memorable quote.",
    attribution: "Person Name",
  },

  // Rich layout (when present, StoryPage renders sections + bento + multi pull quotes)
  bentoHighlights: [
    { label: "KEY POINT", title: "Title", description: "Description." },
  ],
  pullQuotes: [
    { quote: "First impactful quote.", attribution: "Name" },
    { quote: "Second quote." },
  ],
  sections: [
    {
      heading: "Section Heading",
      paragraphs: [
        "Plain string paragraphs work as before.",
        {
          type: "image" as const,
          src: "https://images.unsplash.com/photo-{ID}?w=1200&h=675&fit=crop",
          alt: "Descriptive alt text",
          caption: "Optional caption under the image.",
        },
        {
          type: "horizontalRule" as const,
        },
        {
          type: "videoCallout" as const,
          title: "Further Watching",
          links: [
            { label: "Link label", url: "https://..." },
          ],
        },
        {
          type: "code" as const,
          filename: "example.ts",
          language: "TypeScript",
          code: "const x: number = 42;",
        },
        {
          type: "math" as const,
          expression: "E = mc^2",
          display: true,       // true = block, false = inline
        },
        {
          type: "mermaid" as const,
          diagram: "graph TD\n  A --> B",
          caption: "Optional caption. Diagrams are click-to-expand, Esc to close.",
        },
        {
          type: "youtube" as const,
          videoId: "dQw4w9WgXcQ",
          caption: "Optional caption under the video.",
        },
        {
          type: "chart" as const,
          kind: "line",
          title: "f(x) = x²",
          xLabel: "x",
          yLabel: "f(x)",
          smooth: true,
          series: [
            { name: "f(x)", data: [{ x: -2, y: 4 }, { x: 0, y: 0 }, { x: 2, y: 4 }] },
          ],
        },
        {
          type: "scene3d" as const,
          preset: "bowl",
          gradientAt: { x: 1.5, y: 1.5, label: "∇f = [3, 3]" },
        },
      ],
    },
  ],
};
```

**ContentBlock types (12 total):**

| Block | Fields | Notes |
|---|---|---|
| `paragraph` | `text` | Standard prose — **markdown parsed** (bold, italic, links) |
| `image` | `src`, `alt`, `caption?` | Full-width, rounded border |
| `horizontalRule` | — | Gradient divider |
| `code` | `code`, `filename?`, `language?` | macOS-style header, **syntax highlighted** via highlight.js (github-dark theme) |
| `math` | `expression`, `display?` | KaTeX — block or inline LaTeX. **Prefer LaTeX delimiters in prose** (`\(...\)` inline, `$$...$$` block) — see the Math section below for why. |
| `mermaid` | `diagram`, `caption?` | Click to expand, Esc to close. **Use liberally in course lessons** — flowcharts for concepts, sequence diagrams for processes, graphs for relationships |
| `chart` | `nodes: ChartNode[]`, `title?`, `caption?` | Recharts renderer (code-split). The first chart-family root node in `nodes` selects the chart family (lineChart/areaChart/barChart/scatterChart/pieChart/radialBarChart). All other nodes are composition primitives (axes, series, annotations, bands, error bars, trend lines). Click-to-zoom overlay (Esc to close). **Use when you need real numeric plots** — curves, trajectories, distributions, breakdowns. Mermaid's `xychart` connects points with straight lines; chart blocks render smooth curves. See the Charts section below for the full primitive vocabulary. |
| `scene3d` | `preset` + `gradientAt?`, `cameraPosition?`, `caption?` | Three.js + react-three-fiber renderer (code-split, ~600KB). Currently only `preset: "bowl"` is supported — renders f(x, y) = x² + y² as a 3D paraboloid with orbit controls. `gradientAt: { x, y, label }` draws a red arrow at that point showing the gradient vector [2x, 2y]. **Use when 2D diagrams fail you** — geometric concepts that need rotation, depth, or a vector on a surface. |
| `youtube` | `videoId`, `caption?` | 16:9 responsive embed, nocookie domain |
| `videoCallout` | `title`, `links[]` | Styled external link box |
| `callout` | `variant`, `title?`, `text` | Colored aside — `success` (green), `danger` (red), `warning` (orange), `info` (blue). `text` is markdown. **Use for do/don't coaching, warnings and asides: a pair of `danger` + `success` callouts is the right shape for a weak-vs-strong example.** Never fake a file (`resume-framing-comparison.md`) inside a `code` block to show prose, a table, or a comparison — a `code` block is for code and terminal output only. |
| `lab` | `title`, `path`, `command`, `output?`, `files?`, `step?` | Hands-on experiment the reader drives — flip an input and watch the output/decision path change. Not just a passing test. Links to companion repo `soma-labs` |

Use `as const` on the `type` field so TypeScript infers the literal correctly. Mermaid and KaTeX are **dynamically imported** — they only load when a page uses them.

**Math (KaTeX) — prefer LaTeX delimiters in prose, NOT `math` blocks.** The markdown preprocessor in `src/lib/markdown.ts` recognizes two delimiters *inside any prose string*:
- `\(...\)` — inline math, flows with surrounding text
- `$$...$$` — display math, renders centered on its own line

**Correct pattern** (math flows inline within one prose paragraph):
```ts
paragraphs: [
  "Where \\(\\eta\\) is the learning rate, and \\(\\frac{\\partial L}{\\partial w_i}\\) is the gradient.\n\nThe update rule is:\n\n$$w_i \\leftarrow w_i - \\eta \\cdot \\frac{\\partial L}{\\partial w_i}$$\n\nApply it across all weights.",
]
```

**Wrong pattern** (each `math` block becomes its own paragraph — vertical margin from `space-y-md` breaks sentences across lines):
```ts
paragraphs: [
  "Where ",
  { type: "math", expression: "\\eta", display: false },  // separate paragraph
  " is the learning rate, and ",
  { type: "math", expression: "\\frac{\\partial L}{\\partial w_i}", display: false },  // separate paragraph
  " is the gradient.",
]
```

Use the `math` block only when you need a math expression that should NOT be inside any other prose — for example, a section-opener formula that should appear standalone. For everything else, use LaTeX delimiters inside prose strings.

**Money is never math.** A bare `$` pair (`$N$`) is *not* a math delimiter here — the site is full of prices, so only `\(...\)` and `$$...$$` open math. That means `$7,000 to $12,000`, `$500 bug bounty`, `` `/bounty $500` `` and `${{ secrets.X }}` all render as literal text, which is what you want. Write prices plainly; write math with the delimiters above.

**Charts.** The `chart` block uses Recharts (lazy-loaded, code-split). Charts are composed from a `nodes: ChartNode[]` array — the same primitive-tree pattern as `scene3d`. The first chart-family root node in `nodes` picks the chart family; everything else is composition.

**Chart-family roots** (exactly one — must appear in `nodes`):

| Root | Renders |
|---|---|
| `lineChart` | One or more line series. Optional `smooth: true` for monotone curves. |
| `areaChart` | Lines with filled area underneath. `fillOpacity`, `strokeWidth` configurable per series. |
| `barChart` | Vertical bars. Supports multi-series (grouped). |
| `scatterChart` | Points only, no connecting lines. Good for distributions. |
| `pieChart` | Categorical breakdown. Add `category` nodes for slices. |
| `radialBarChart` | Radial bars (progress-style rings). Add `category` nodes for rings. |

**Composition nodes** (all optional, may repeat):

| Node | Fields | Notes |
|---|---|---|
| `xAxis` | `label?`, `min?`, `max?`, `scale?: "linear" \| "log"`, `tickCount?`, `side?: "top" \| "bottom"` | First xAxis binds to the chart's X column. A second xAxis is supported for multi-axis plots. |
| `yAxis` | `label?`, `min?`, `max?`, `scale?: "linear" \| "log"`, `tickCount?`, `side?: "left" \| "right"`, `yAxisId?` | One or two yAxes for multi-axis charts. |
| `series` | `name`, `data: {x, y}[]`, `color?`, `strokeWidth?`, `fillOpacity?`, `pointMarkers?`, `type?: "line" \| "bar" \| "area"`, `yAxisId?` | One node per line/area/bar. `pointMarkers: true` shows dots at every data point. `type` overrides the family root's render type for this series only. |
| `annotation` | `x`, `y`, `label`, `color?` | Labeled dot at (x, y) — used for "best checkpoint" markers, callouts, etc. |
| `referenceLine` | `orientation: "horizontal" \| "vertical"`, `value`, `label?`, `color?`, `strokeDasharray?` | Horizontal/vertical line. Useful for marking "x = optimum" or "loss = target". |
| `band` | `orientation: "horizontal" \| "vertical"`, `from`, `to`, `color?`, `opacity?`, `label?` | Shaded region between two values. Useful for "region of divergence" or "confidence interval". |
| `trendLine` | `from: {x, y}`, `to: {x, y}`, `color?`, `strokeDasharray?`, `label?` | Straight line through two points. Used for regression overlays. |
| `errorBar` | `series`, `direction: "x" \| "y"`, `data: {x, low, high}[]`, `color?`, `width?` | Per-series error bars (barChart / scatterChart). |
| `grid` | `stroke?`, `strokeDasharray?` | Cartesian gridlines. Opt-in — omit for dense plots. |
| `tooltip` | `enabled?` | Default enabled. Use `enabled: false` to disable for clean screenshots. |
| `legend` | `enabled?`, `position?` | Auto-shown for multi-series charts. |
| `category` | `name`, `value`, `color?` | One node per slice (pieChart) or ring (radialBarChart). |

**Example — line chart with annotations and reference line:**

```ts
{
  type: "chart" as const,
  title: "Loss over training steps",
  nodes: [
    { kind: "lineChart", smooth: true },
    { kind: "grid" },
    { kind: "xAxis", label: "Step", min: 0, max: 1000 },
    { kind: "yAxis", label: "Loss", min: 0, max: 5 },
    {
      kind: "series",
      name: "Training loss",
      color: "#47e175",
      data: [{ x: 0, y: 4.5 }, { x: 100, y: 1.2 }, /* ... */],
    },
    {
      kind: "series",
      name: "Validation loss",
      color: "#fde68a",
      data: [{ x: 0, y: 4.6 }, { x: 100, y: 1.4 }, /* ... */],
    },
    { kind: "annotation", x: 350, y: 0.6, label: "best checkpoint", color: "#fde68a" },
    { kind: "referenceLine", orientation: "horizontal", value: 0.5, label: "target loss", color: "#47e175" },
  ],
  caption: "Training converges to the target loss after 350 steps.",
}
```

**Example — pie / radialBar** (use `category` nodes for slices):

```ts
{
  type: "chart" as const,
  title: "Token mix in training data",
  nodes: [
    { kind: "pieChart" },
    { kind: "category", name: "Code", value: 30, color: "#47e175" },
    { kind: "category", name: "Prose", value: 55, color: "#b8c3ff" },
    { kind: "category", name: "Dialog", value: 15, color: "#fde68a" },
  ],
  caption: "Code and prose dominate the training mix.",
}
```

**Reference example.** `src/content/stories/gradient-descent-explained.ts` is the canonical example — it contains line charts with multi-series, annotations, and reference lines in the gradient descent article. Read those blocks first when authoring.

**Behavior:**

- **Click to zoom.** Any chart opens a fullscreen overlay on click (same pattern as the `mermaid` block). Esc closes. The expanded chart preserves the same nodes, annotations, and reference lines.
- **Theme.** The renderer uses the editorial dark theme by default (TOOLTIP_STYLE surfaces, `#b8c3ff` / `#47e175` / `#4969ed` / `#fde68a` / `#f87171` palette, dashed grid, axis labels in `on-surface-muted`).
- **Smooth curves.** `smooth: true` on the lineChart/areaChart root applies `type="monotone"` so the line passes through the points but doesn't overshoot. Use for math curves. Use the default straight segments for data that is genuinely piecewise-linear.
- **Mermaid vs chart.** Reach for `chart` when you need real numeric plots (axes, grid, ticks, annotations). Reach for `mermaid` when you need conceptual diagrams (flow, sequence, ER). Mermaid's `xychart` connects points with straight lines — chart blocks are the right tool for math plots.

**3D scenes.** The `scene3d` block uses Three.js + react-three-fiber (lazy-loaded, code-split, ~600KB gzipped). Use it when 2D diagrams fail you — geometric concepts that need rotation, depth, or a directional vector on a surface.

Currently only one preset is implemented:

```ts
{
  type: "scene3d" as const,
  preset: "bowl",
  gradientAt: { x: 1.5, y: 1.5, label: "∇f = [3, 3]" },
  cameraPosition: [5, 3, 6],
  caption: "The 3D bowl f(x, y) = x² + y². The red arrow at (1.5, 1.5) is the gradient vector [3, 3] — it points uphill, in the direction of steepest ascent.",
}
```

The `bowl` preset renders f(x, y) = x² + y² as a rotationally symmetric paraboloid. `gradientAt` is optional — when provided, the renderer draws a red ArrowHelper at that point on the surface, pointing in the +gradient direction (uphill). The gradient of f(x, y) = x² + y² is [2x, 2y], and the renderer computes this automatically.

**Behavior:**

- **Drag to rotate.** The camera uses OrbitControls. Click-and-drag rotates the bowl; scroll zooms. Click without dragging opens the fullscreen zoom overlay.
- **Click vs drag.** A 5px threshold distinguishes a click (open zoom) from a drag (rotate). Without this, releasing the mouse after a drag would open the zoom.
- **Click to zoom.** Same overlay pattern as `mermaid` and `chart`. Esc closes. The inline scene is hidden while the zoom overlay is open so labels don't appear twice.
- **Y-axis scaling.** The bowl's y-axis is scaled by 0.4 so the radius-3.5 bowl doesn't dominate the view. The gradient arrow is scaled the same way so it visually aligns with the rendered surface.
- **When to use scene3d vs chart.** Reach for `scene3d` when you need a vector on a 3D surface, orbits, or depth to teach the concept. For most math plots, `chart` is enough. scene3d is heavier (600KB vs 200KB) and only worth the cost when 2D can't communicate the point.

### Companion Labs Architecture (`soma-labs`)

**Purpose: labs are for hands-on work, not passive observation.** A lab exists so the reader *does* something, not so they read something. By the end of a lab the reader should have changed an input and watched the output change: flipped a flag, set a value, run a command, and seen the decision path, type inference, narrowing, or boundary verdict move. A lab that is only a passing test suite (`npm run test:lesson` returning green checkmarks) teaches nothing: it proves the author's code runs, not that the reader understands. Design every lab as an interactive experiment the reader drives; tests are a regression guard behind it, never the lab itself.

**The Golden Rule: Never ship a lab whose only command is `npm test` or `npm run test:lesson`.**
A passing test suite outputs:
```
✔ identity returns the argument's own type
✔ any erases the type
ℹ tests 9 pass 9 fail 0
```
This is a verification check for CI, not an educational experience. The learner is passive, observes assertions someone else wrote, and gains zero tactile intuition.

**How to make a lab genuinely useful and interactive:**

- **Give the reader a knob.** A named input they can change (a value, a flag, a mode, a target shape, an input file) with an observable result that changes with it. If nothing the reader can touch changes anything, it is a static demo, not a lab.
- **Print the mechanism, don't only assert it.** Show the decision path taken, the type inferred, the members checked, the gate evaluated, or the reason a branch was rejected. Make the compiler or runtime machinery visible in the terminal output.
- **Provide three execution modes in `lab.mjs`:**
  1. **Interactive REPL (`npm run lab` or `node lab.mjs`):** Launches an interactive command prompt (`lab> `) where the learner can type commands (e.g. `probe`, `compare`, `check`, `get`, `tour`, `help`, `exit`), enter arbitrary values, and test edge cases.
  2. **Guided Tour (`npm run tour` or `node lab.mjs --tour`):** Walks through the key conceptual scenarios sequentially with formatted decision breakdowns, explaining what each step proves and why alternatives fail.
  3. **Topic-Specific Probes (`npm run lab:<topic>`):** Dedicated commands for specific milestones in the lesson (e.g. `npm run lab:relationship`, `npm run lab:constraints`, `npm run lab:assignability`, `npm run lab:family`, `npm run lab:dispatcher`, `npm run lab:boundary`).
- **Support one-shot CLI commands:** Let learners pass custom arguments on the command line (e.g. `node lab.mjs compare "hello"`, `node lab.mjs get '{"id":1}' name`).
- **Lead the README with the experiment:** The lesson README opens with **How to drive it** (`npm run lab`, `npm run tour`), documenting what knobs to flip and what to observe. Regression tests (`npm test`) are documented as the safety guard, not the lab itself.
- **Reference examples: copy these shapes:**
  - **The interactive lab shape:** `npm run lab` opens a REPL to flip knobs and probe edge cases; `npm run tour -- --pause` steps through guided scenarios; topic probes (`npm run lab:<topic>`) isolate milestones; every run prints the mechanism trace, not just pass/fail.
  - **The TypeScript Interview Fast Track (`soma-labs/fullstack/01-` to `05-`):** `npm run lab` allows interactive type probing; `npm run tour` runs guided diagnostic breakdowns showing inference sites, structural assignability, excess property checks, control-flow narrowing, assertNever exhaustiveness, mapped type loops, and the cast vs schema trust boundary.

**The 4 Pillars of a "Useful" Lab (Never a Space Filler):**

1. **Explicit Function & Code Under Test:** Never show ambiguous inputs like `Input value: "hello"`. State the exact source file (e.g. `src/relationship.ts`), the exact function signatures (`identity<T>(value: T): T`), and the exact line of code at the call site (`const result = identity("hello")`).
2. **Step-by-Step Mechanism Trace:** Trace the internal sequence: parameter match, inference site binding, constraint evaluation, control-flow narrowing, or schema boundary gate. Show what the compiler or runtime is actually doing behind the scenes.
3. **Contrast with Real Failure Modes:** Always contrast against the alternative. Show how `any` erases type safety and causes silent runtime crashes, how `unknown` blocks property access without narrowing, how fresh literals trigger excess property checks while variable references pass, or how destructuring breaks narrowing. The contrast is where the mental model clicks.
4. **Probe-by-Probe & Stepped Execution:** Never force the reader to digest a giant monolithic wall of text. Support running individual probes in isolation (`npm run lab:probe-1`, `npm run lab:probe-2`), interactive stepping with pauses (`npm run lab:step`), and ad-hoc custom testing in the REPL (`npm run lab`).

**Where labs live: `Essomero/soma-labs`:**

- **Separation of concerns:** NEVER create lab source code folders in the blog repository (`soma`). The blog repository only contains prose, story metadata, and course definitions.
- **TypeScript Course Labs use Native `.ts` with Deno:** NEVER ship a TypeScript course lab in `.mjs`. Reading about interfaces, generics, constraints, and mapped types while looking at untyped `.mjs` files creates cognitive dissonance. Use native `.ts` driven directly by Deno (`deno run -A lab.ts`, `deno test`, `deno check`) for instant execution with zero build configuration.
- **Universal 1:1 synchronization:** Any lab anywhere in the content (an in-text milestone workbench or a practice problem lab) must be in exact lockstep across both codebases:
  1. **The Blog (`readme`):** renders the `LabBlock` (`type: "lab" as const`) with an accurate `path`, a specific interactive `command` (e.g. `npm run lab:relationship`), the real explanatory `output` trace (showing decisions, inferences, and alternative comparisons), and `files` (`action: "inspect"` or `"modify"`, with `language: "typescript"` for TS tracks).
  2. **The Companion Repo (`soma-labs`):** contains the corresponding directory with its own self-contained environment:
     - Its own `docker-compose.yml` with live volume mounting (`.:/app`) so changes propagate immediately.
     - Its own `Dockerfile`.
     - Its own `README.md` led by how to drive the interactive lab (`npm run lab`, `npm run tour`), plus explicit **Tear Down & Cleanup** instructions (`docker compose down --volumes --remove-orphans`) to prevent dangling containers.
     - `lab.ts` (or `lab.mjs` for Node-only tracks) implementing the interactive REPL, guided tour, and topic probes.
     - Code files matching the `LabBlock` files array.
     - Tests as the regression guard (`tests/lab.test.ts` plus existing passing lesson tests) to ensure automated CI coverage while the interactive experiment remains the primary learning vehicle.
- **Never batch separately:** update the blog story and the companion repo together in lockstep for each lab. Verify both with `node scripts/verify-fullstack-sync.mjs`, and confirm prior labs are still in sync, before starting a new one.
- **Zero test collision:** existing passing lesson tests must remain intact and keep passing. Practice-problem labs get distinct tests that fail initially with realistic diagnostics.
- **Anti-Pattern Guard: NEVER emulate labs in markdown strings:** NEVER write a lab as a plain text string (e.g. `"**Lab: toggl/...**\n\n```js\n..."`). It bypasses the interactive `<LabBlock>` component and renders static markdown instead of the collapsible bar, file tabs with `INSPECT`/`MODIFY` badges, copy buttons, and the terminal box. Every lab MUST be a first-class `{ type: "lab" as const, id, title, path, command, output, files }` object in the `paragraphs` array.
- **Anti-Pattern Guard: a passing test is not a lab:** NEVER ship a lab whose only artifact is a suite that goes green. If the reader has no input to change and no visible effect to observe, rewrite it as an interactive driven experiment with a REPL and guided tour before publishing.
**Markdown in prose:** All string paragraphs (both plain strings and `paragraph` blocks) are parsed as inline markdown via `marked`. This means `**bold**`, `*italic*`, `[links](url)`, and `` `code` `` render correctly. Content imported from `.md` files or Obsidian notes keeps its formatting.

**Superscript citations (all content types):** Use `<sup><a href=\"#ref-N\">N</a></sup>` at factual claims throughout the body to link to the `references` section at the bottom. This applies to stories, guides, and featured articles — any content that cites sources or statistics. References render as numbered clickable cards with anchor IDs (`#ref-1`, `#ref-2`, etc.). The `.prose sup a` CSS styles them as tight, professional superscripts.

**Rich vs simple:** When `sections` + `bentoHighlights` + `pullQuotes` are present, StoryPage renders the full rich layout (sidebar, bento grid, section headings, styled pull quotes). When absent, it falls back to `intro` + `body[]` + single `pullQuote`. Both work — content drives the rendering.

**Story `sections[].paragraphs[]` formatting — CRITICAL:**

Each entry in `paragraphs` is rendered as ONE markdown block. The most common bug: splitting a code block across multiple array entries (one per line). This renders as separate `<p>` tags instead of a single `<pre>` block, breaking syntax highlighting and layout.

**Rules for code blocks in paragraphs:**

- **A code block (triple backticks + content + closing backticks) must be a single string entry.** Never split it across multiple array entries.
- **Use `\n` for newlines** inside a code block, `\n\n` to separate code from surrounding prose within the same string.
- **Tables, bullet lists, and code blocks in `paragraphs`** follow the same pattern as `body[]` in guides: each block is one entry, with `\n` joining inner rows and `\n\n` separating from adjacent prose.

**Correct pattern:**
```ts
paragraphs: [
  "Prose paragraph one.",
  "Prose with **bold** and a [link](url).",
  "```sh\nnpm install x402-sh\nnode setup.js\n```",
  "Prose after the code block.",
  "A multi-paragraph entry with a second fenced block:\n\n```javascript\nconst x = 42;\nconsole.log(x);\n```\n\nA short bullet list in the same entry:\n\n- First item\n- Second item",
]
```

**Wrong pattern (causes broken rendering — DO NOT):**
```ts
paragraphs: [
  "Prose paragraph one.",
  "```sh",                  // separate entry — renders as <p>, not <pre>
  "npm install x402-sh",    // separate entry — renders as <p>, not a code line
  "node setup.js",          // separate entry
  "```",                    // separate entry
  "Prose after the code block.",
]
```

When in doubt, look at how E2 (`src/content/stories/x402-sh-2-hands-on.ts`) and E4 (`src/content/stories/x402-sh-4-from-zero-to-first-paid-api-call.ts`) format their `sections[].paragraphs[]` arrays — both follow the correct pattern.

### Course (`src/content/courses/my-course.ts`)

Courses are ordered lesson lists where each lesson references an existing story by slug.

```ts
import type { CourseContent } from "@/types";

export const myCourse: CourseContent = {
  slug: "my-course",
  title: "Course Title",
  description: "What the learner will understand by the end.",
  image: "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1600&h=900&fit=crop",
  imageAlt: "Descriptive alt text describing the actual photo",
  author: { name: "Author Name" },
  date: "June 2026",
  topics: ["technology"],
  tagline: "Optional subtitle displayed under the description.",
  lessons: [
    {
      title: "Lesson 1 — Foundations",
      storySlug: "some-existing-story",
      description: "What this lesson covers.",
    },
  ],
};
```

**Lessons reference stories by slug** — the story must already exist in `src/content/stories/`. The course page renders a numbered lesson list linking to each story. Stories don't need to be modified; any existing story can be part of multiple courses.

#### Lesson recap + summary pattern (required for course lessons)

Every lesson story that is part of a multi-lesson course **must** open with a recap of the previous lesson and close with a summary of itself. This applies whether the lesson lives in `src/content/stories/` and is referenced by slug from `src/content/courses/`, or is part of any other ordered learning path.

**Why:** new content can feel overwhelming. A recap orients the reader before new material; a summary lets them self-quiz on what they just covered. Without both, readers hit a lesson cold and leave without anchoring what they learned.

**Recap scope rule:** Each lesson's recap reactivates **only the prior-lesson concepts this lesson actually uses in its body**. It is not a general "what was in lesson N-1" summary. If the lesson never references singular-value decomposition, the recap doesn't reintroduce SVD. The recap should let the reader re-activate just enough mental context to follow the first section without flipping back.

**Two required sections** in `sections[]`:

```ts
sections: [
  {
    heading: "{N}.1 Recap of Lesson {N-1} — only the parts you'll use here",
    paragraphs: [
      "Two-to-four sentences reactivating exactly the prior-lesson concepts this lesson builds on. References back without re-teaching. Tells the reader where they are in the journey and what mental context they need for the first content section."
    ],
  },

  // ... the lesson's actual content sections (N.2, N.3, ...)

  {
    heading: "What You Just Learned",
    paragraphs: [
      "Five bullet-style takeaways, each one sentence. Lists the names, the numbers, and the picture so the reader can self-quiz on what THIS lesson covered. This is independent of the recap — recap reactivates prior context, summary locks in the current lesson."
    ],
  },

  {
    heading: "Practice Problems",
    // ... existing practice problems stay here
  },
]
```

**Where they sit:**
- The recap is the **first** entry in `sections[]`, before any content section. It is numbered `{N}.1`, and all other sections shift up by one.
- The summary is the **last** entry in `sections[]` (after all content sections, including any final "what's next" section), but **before** the practice problems. Practice is active recall; summary is the safety net before practice.

**Exception for the first lesson:** the very first lesson in a course has no recap — there is nothing to recap. It still gets a summary at the end.

**Renumbering impact:** when adding a new lesson into the middle of an existing course, every subsequent lesson's recap heading gets renumbered automatically (because the recap's `{N}` matches the lesson's own section numbering). Internal section numbers like `3.2`, `3.3`, ... also shift by one within each affected lesson.

**Renumbering impact on the recap heading template:** the template above uses `{N}.1 Recap of Lesson {N-1}` — the `{N}` matches the lesson's own number (e.g., `3.1 Recap of Lesson 2` is the recap in Lesson 3). When lessons are renumbered, update the recap heading too.

**Reference implementation:** the `fine-tuning-open-weights` course (6 lessons, `src/content/courses/fine-tuning-open-weights.ts`) is the canonical example. Every lesson in that course has a `N.1 Recap of Lesson N-1` section at the start and a `What You Just Learned` section at the end.

### Guide (`src/content/guides/my-guide.ts`)

Guides render full GFM (GitHub-Flavored Markdown) in the body with rich visual elements — featured images, bento highlights, and interleaved pull quotes. **Guides are not blunt walls of text.** They should match the visual richness of stories.

**Body rendering rules:**
- `intro` — inline markdown only (`**bold**`, `*italic*`, `[links](url)`, `` `code` ``). Rendered inside a `<p>` tag with drop-cap.
- `body[]` — each entry is a markdown **block**. Entries are joined with `\n\n` and rendered through `mdBlock()` (full GFM).
- **Tables** — must be a **single body entry** with rows joined by `\n`. Never split table rows across separate array entries.
- **Contiguous lists** — put in a **single body entry** with `\n` between items.
- **Headings** — `## Section` or `### Subsection` work. A heading can be its own entry.
- **Blockquotes** — `> quotable text` renders as a styled prose blockquote. Use liberally to break up text walls.
- **Links** — `[link text](url)` for inline source citations and references.

**Rich content fields (optional but strongly encouraged):**
- `bentoHighlights` — 3 insight cards rendered between the intro and body. Each card has `label`, `title`, `description`. Cards give readers a quick overview of key takeaways.
- `pullQuotes` — N styled pull quotes interleaved evenly throughout the body. The first uses `variant="gradient-bar"` (large, with gradient top border); subsequent ones use `variant="border-left"` (left-border blockquote). When pullQuotes is present, body is split into N+1 roughly equal chunks with quotes between them.

**Pull quote interleaving:** When `pullQuotes` has N entries, the body array is split into N+1 roughly equal chunks. Each chunk renders as a contiguous markdown document. Pull quotes appear between chunks. No pull quotes → the body renders as a single continuous markdown document.

```ts
export const myGuide = {
  slug: "my-guide",
  category: "Technical Guide // Topic",
  title: "Guide Title",
  excerpt: "Compelling one-liner summary.",
  image: "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1200&h=675&fit=crop",
  imageAlt: "Descriptive alt text",
  author: { name: "Author Name", title: "Role" },
  date: "June 2024",
  tags: ["Tag1", "Tag2"],
  intro: "Opening paragraph with **bold** and [links](url) — inline markdown only.",
  body: [
    "## Section Heading",

    "Paragraph text with **bold**, *italic*, and `code`. Each paragraph is its own entry.",

    "> A blockquote to break up the text wall. Use these at key pivot points in the narrative.",

    "A bullet list in a single entry:\n\n- First item\n- Second item\n- Third item",

    "A table in a single entry:\n\n| Col A | Col B |\n|---|---|\n| Val 1 | Val 2 |",

    "## Another Section",

    "More prose with [links to sources](https://example.com).",
  ],

  // Rich content — add these for every guide
  bentoHighlights: [
    {
      label: "KEY INSIGHT",
      title: "First Takeaway",
      description: "Concise description of the most important thing to know.",
    },
    {
      label: "KEY INSIGHT",
      title: "Second Takeaway",
      description: "Another critical fact or statistic the reader should remember.",
    },
    {
      label: "KEY INSIGHT",
      title: "Third Takeaway",
      description: "A third essential point that rounds out the overview.",
    },
  ],

  pullQuotes: [
    {
      quote: "The strongest, most quotable line from the first section of the guide.",
    },
    {
      quote: "A memorable truth from the middle of the guide — the reality check.",
    },
    {
      quote: "A closing insight that readers will remember long after they leave the page.",
    },
  ],
};
```

**Aesthetic principles for guides:**
- **No blunt content.** Every guide should have a featured image, 3 bento highlights, and at least 2-3 pull quotes.
- **Break up text walls.** Use `> blockquotes` in the body, `![images](url)` where appropriate, and `[links](url)` to sources.
- **Pull quotes should be the strongest lines.** Don't write new text for pull quotes — lift the best, most memorable sentences from the body itself.
- **Bento cards are the elevator pitch.** A reader who only sees the bento cards should walk away with the guide's 3 most important takeaways.
- **Use superscript citations.** At key factual claims, add `<sup><a href=\"#ref-N\">N</a></sup>` linking to the numbered references section at the bottom. This gives articles a professional, well-sourced feel. References render as clickable cards with numbered anchors (`#ref-1`, `#ref-2`, etc.).

**Markdown supported in body (full GFM via `marked.parse`):**
- `## Headings` through `######`
- `**bold**`, `*italic*`, `~~strikethrough~~`
- `- Unordered` and `1. Ordered` lists
- `| Tables | with | alignment |`
- `` `inline code` `` and fenced code blocks with language
- `> Blockquotes`
- `---` horizontal rules
- `[Links](url)` and `![Images](url)`

### Featured Article (`src/content/featured/my-featured.ts`)

The featured file imports shared content from the story file. There is **one source of truth** for sections, bentoHighlights, and pullQuotes.

```ts
import type { FeaturedContent } from "@/types";
import { myStory } from "@/content/stories/my-story";

export const myFeatured: FeaturedContent = {
  slug: "my-featured", // MUST match the story slug
  tag: "FEATURED ARTICLE // CATEGORY",
  title: myStory.title,
  description: myStory.excerpt,
  image: "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1600&h=900&fit=crop",  // Wider hero image
  imageAlt: myStory.imageAlt,
  author: myStory.author,
  date: myStory.date,
  tagline: "Optional tagline under hero heading.",
  // Imported from story — single source of truth
  bentoHighlights: myStory.bentoHighlights,
  pullQuotes: myStory.pullQuotes,
  sections: myStory.sections,
};
```

## How to Add Content

### Architecture Rule: Data Drives Components

The project uses React for component composition — pages compose sub-components (BentoCard, PullQuote, sections) based on what the content data provides. **There are no hardcoded content maps or per-article fixed layouts.** Every page reads from the content registry and renders accordingly.

- **`StoryPage`** is the universal story renderer. It adapts to the data: stories with `sections`, `bentoHighlights`, and `pullQuotes` get a rich layout with sidebar and structured sections. Stories with only `intro` + `body[]` get the simple reading layout. Both are valid.
- **`GenericFeaturedPage`** renders any `FeaturedContent` store row at `/featured/:slug`.
- **`StoriesIndexPage`** uses `isFeatured` (set with `--featured` at publish time) for the hero card. No hardcoded story IDs.
- **Every featured article MUST have a corresponding story row** with the same slug, so it appears in `/stories` listings.

### Step 1: Draft the manuscript (never in git)
Author the typed object in a staging file outside git (e.g. `drafts/story/my-story.ts`; `drafts/` is gitignored). Unpublished writing MUST NOT touch `src/content/`: the fork is public, and anything committed there is world-readable on push. The `src/content/<type>/` files are the versioned archive of *published* work plus the seed corpus — read-only except when archiving.

### Step 2: Publish it (private, always)
```bash
npm run publish -- drafts/story/my-story.ts
# validates schema fields, slug uniqueness, and cross-file references
# (course lessons, book chapters, test sources) against the DB + batch,
# then upserts the row as private. Publishing never touches visibility.
```
Multi-file batches publish atomically: `npm run publish -- drafts/story/a.ts drafts/story/b.ts drafts/course/c.ts`. References must resolve in the DB or the same batch. `--featured` moves the `isFeatured` flag to that row. Type inference reads the parent directory name; files outside a typed dir MUST pass `--type` explicitly.

The task is NOT done when the `.ts` file exists. The UI reads the store, never the files. Confirm the row before yielding:

```bash
npx tsx -e "import('./scripts/content-db.ts').then(async ({getDb}) => { const db = await getDb(); const r = await db.execute({ sql: 'SELECT slug, status FROM content_items WHERE slug = ?', args: ['my-story'] }); console.log(JSON.stringify(r.rows)); })"
# expect a row with "status":"private". Missing row or script error means the piece never landed: fix and re-run, never report it as done.
```
### Step 3: Preview the private piece locally
```bash
npm run dev
```
Plain `npm run dev` serves the API inline (owner view, private rows included), so one terminal is enough. Open `http://localhost:5173/stories/{slug}` (or `/guides/...`, `/featured/...`). Iterate by re-running `npm run publish`. (`npm run server` + `npm run dev:local` remains as the two-terminal alternative.)

### Step 3b: No-CLI path (owner never touches a terminal)
The owner never runs commands. Ask any coding assistant for the piece; it stages the manuscript through its own tooling. You open the page URL, preview it as the owner, and flip the toggle when ready. Publishing into the store is the agent's job; sharing it with the world is yours.

### Step 4: Go public — owner flips the toggle, never a command
Only the owner shares, and only with the visibility toggle. Open the private piece and flip private → public — the flip is instant, no rebuild, no redeploy. Unpublishing is the same toggle back (reversible, immediate). A course, series, or book toggle flips the whole collection at once: the collection plus every lesson, episode, or chapter in one action. The Studio (`/learn`, bottom of the page) has a global switch that flips *everything* at once, with a count and a confirmation step. There is no CLI flag for going public; putting it in the store and sharing it are separate acts on purpose.

### Step 5: Commit the manuscript (published work only)
Copy the staged file to its archive home (`src/content/stories/my-story.ts`, matching the slug) and commit:
```bash
git add src/content/stories/my-story.ts
git commit -m "Add [type]: [title]"
git push
```
Never `git add -A`: a blind add sweeps unfinished work into the public fork. Commit only the published manuscript. The page is live at `https://soma.vercel.app/stories/my-story` the moment the row flips to published — the commit is version history, not deployment.

## Image URLs

Images must use verified Unsplash numeric IDs. See **Content Verification** above for the mandatory workflow. Never use Picsum seeds (return random/unrelated photos) or alphanumeric page slugs (404 on the CDN).

| Use Case | Dimensions | URL Pattern |
|---|---|---|
| Story/guide card | 1200×675 (16:9) | `https://images.unsplash.com/photo-{NUMERIC_ID}?w=1200&h=675&fit=crop` |
| Hero / immersive | 1600×900 (16:9) | `https://images.unsplash.com/photo-{NUMERIC_ID}?w=1600&h=900&fit=crop` |

**Backup strategy:** If you can't find a working Unsplash ID, reuse a verified ID from a previous article (the guitar course has 4 working IDs). A verified existing photo is better than an untested new one.

**alt text:** Always write descriptive alt text for the specific photo. Don't leave it as a generic placeholder.

## ⚠️ Content Verification — MANDATORY BEFORE PUBLISHING

**Every URL in content files MUST be verified with curl before `npm run publish`. No exceptions.** Broken URLs, guessed IDs, and untested embeds ship broken content to readers. This is the #1 source of bugs in this project and it is completely preventable. The publish script validates schema and references, but only you can verify that an image actually loads.

### Pre-Publish Checklist

Before `npm run publish`, run these checks and confirm all pass:

```bash
# 1. Verify every Unsplash image URL
curl -sI "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1200&h=675&fit=crop" | grep HTTP

# 2. Verify every YouTube embed
curl -sI "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={VIDEO_ID}" | grep HTTP

# 3. Verify every external link (PBS, references, etc.)
curl -sI "{URL}" | grep HTTP

# 4. Verify the draft renders locally (server + dev:local running, draft published)
open http://localhost:5173/stories/{slug}
```

All must return `HTTP/2 200`. If any return 404, 503, or timeout — **do not publish**. Fix the URL first.

### Unsplash images — correct workflow

1. Search Unsplash: `https://unsplash.com/s/photos/{search-terms}`
2. Pick a photo and visit its page: `https://unsplash.com/photos/{PAGE_SLUG}`
3. **Extract the numeric ID** from the page source (it's in the `<img>` src as `photo-{NUMERIC_ID}-{HEX_HASH}`)
4. **Test it**: `curl -sI "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1200&h=675&fit=crop"` → must return 200
5. Only use verified numeric IDs. **Never guess IDs, never use alphanumeric page slugs on the CDN.**

If the Unsplash CDN is down (503) or the ID is wrong (404), use a **known working ID** from a previously verified article. The guitar course has 4 verified IDs; reuse them if stuck.

### YouTube embeds — correct workflow

1. Search YouTube for the exact video
2. Copy the video ID from `youtube.com/watch?v={ID}`
3. **Test it**: `curl -sI "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={ID}"` → must return 200
4. **Never guess IDs.** An unverified embed shows a broken player.

### Mermaid diagrams — syntax rules

Mermaid is rendered client-side via dynamic import. To verify:
1. `npm run build` — catches TypeScript syntax errors
2. Open the article locally and confirm the diagram renders (not a red error box)
3. **Node labels**: use plain text in square brackets `[Like This]` — NOT quoted `["Like This"]`. Avoid colons, HTML tags, and backticks inside labels. Quoted labels with special characters silently fail at runtime.
4. **Style directives**: use hex colors without the `#` prefix in quotes: `style A fill:#b8c3ff22,stroke:#b8c3ff`

### External links (videoCallout, references, source)

1. `curl -sI "{URL}"` → must return 200 or 30x
2. Verify the page contains the content you're referencing
3. Prefer stable URLs (PBS, institutional archives) over transient ones

### Source attribution — two patterns

**Single-source republish** (copied/adapted from one place — Twitter thread, blog post):
```ts
source: { name: "Author Name — Platform", url: "https://..." }
```
Renders a "Source:" badge at the top of the article. Use when the content primarily comes from one source.

**Multi-source synthesis** (original research drawing from many sources):
```ts
references: [
  { title: "Article Title", url: "https://...", description?: "Optional note" },
  ...
]
```
Renders a numbered "References" grid at the bottom of the article. Use for original research, deep-dives, and synthesis pieces. Both fields can coexist — a republished article may also cite additional references.

## Available Components

When building new pages, use these existing composable components:

### Layout
- **`Layout`** — Header + Outlet + Footer (already wraps all routes)
- **`Header`** — Brand + nav tabs + search icon (Cmd+K)
- **`ReadMENav`** — Homepage content-type tabs
- **`Footer`** — Minimal brand + copyright

### UI Primitives
- **`AccentBar`** — Gradient horizontal bar (`variant="small"|"editorial"`)
- **`Tag`** — Category badge (`variant="primary"|"secondary"|"accent"|"brand"`)
- **`Button`** — CTA button (`variant="primary"|"outline"|"ghost"|"brand"|"white"`, `size="sm"|"md"|"lg"`, optional `href` renders as Link)
- **`PullQuote`** — Styled blockquote (`variant="gradient-bar"|"border-left"|"border-y"`)
- **`CodeBlock`** — Terminal-style code display
- **`TipCard`** — Icon + heading + description (takes LucideIcon)
- **`ShareButtons`** — Social sharing (`variant="column"|"row"|"small-circle"`)
- **`AudioPlayer`** — Sticky podcast player bar
- **`LoadMore`** — Paginated "Load N more" button (`initialCount`, `increment`, `total`, render-prop children)
- **`CommandPalette`** — Cmd+K search overlay

### Cards
- **`ArticleCard`** — Image + category + title + excerpt
- **`StoryCard`** — "More Stories" card with author and tag overlay
- **`PodcastCard`** — Square card with play overlay
- **`ContentBlocks`** — Renders mixed content blocks (paragraphs, images, video callouts, horizontal rules)
- **`BentoCard`** — Highlight box (label + title + description)

### Sections
- **`HeroSection`** — Homepage featured story hero (12-col grid, CTA)
- **`ImmersiveHero`** — 85vh article hero with image + gradient overlay
- **`ProfileOverview`** — Location/social/website/orgs bar
- **`SidebarAbout`** — "About Soma" sidebar card
- **`SidebarToc`** — Sticky table of contents with scroll-spy
- **`AuthorBio`** — Author avatar + name + bio card

### Hooks/Utils
- **`ScrollToTop`** — Scrolls to top on new navigation, restores saved position on back/forward
- **`useSearch`** — Open/close the command palette
- **`cn()`** — Tailwind class merger (from `@/lib/utils`)

## Content Lifecycle

Stories (and courses) have an optional `archived: true` flag:

- **Active** (default) — appears on index pages, topic pages, and search. Sorted newest-first on listing pages.
- **Archived** (`archived: true`) — hidden from main listings. Still accessible by direct URL, appears on topic pages and search. Listed on the `/archive` page, grouped by year.

New articles appear first in any list — index pages sort by date descending.

## Routing

All routes are defined in `src/App.tsx`. The generic `:slug` routes auto-handle new content:
- `/stories/:slug` → `StoryPage` (renders any StoryContent)
- `/guides/:slug` → `GuideContentPage` (renders any GuideContent)
- `/featured/:slug` → `GenericFeaturedPage` (renders any FeaturedContent from the `allFeatured` array)
- `/topics/:slug` → `TopicDetailPage`

**Note:** `FeaturedArticlePage` is a hardcoded layout specific to `featured/nvda-accessibility`. It does NOT handle arbitrary slugs. All new featured articles route through `GenericFeaturedPage`, which reads the slug from the URL, looks up the matching `FeaturedContent` in `allFeatured`, and renders it dynamically.

Some featured paths (e.g., `featured/della-voice`, `featured/building-autonomy-ai`) route to `StoryPage` — they are stories rendered under the `/featured/` URL prefix.

Other routes:
- `/` → HomePage
- `/stories` → StoriesIndexPage
- `/guides` → GuidesIndexPage
- `/podcast` → PodcastPage
- `/topics` → TopicsPage
- `/courses` → CoursesIndexPage
- `/courses/:slug` → CourseDetailPage
- `/archive` → ArchivePage (archived stories by year)
- `/search?q=` → SearchResultsPage

## Design Tokens

The dark editorial theme uses these Tailwind classes:

| Token | Value |
|---|---|
| Background | `bg-background` (#10141a) |
| Surface | `bg-surface` (#151b23) |
| Primary | `text-primary` (#b8c3ff) |
| Secondary | `text-secondary` (#47e175) |
| Accent | `text-brand` (#4969ed) |
| Font (headings) | `font-sora` |
| Font (body) | `font-dm-sans` |
| Max width | `max-w-readme` (1540px) |
| Gradient text | `text-gradient` (blue→green) |

## Examples

### Example 1: Create a new developer story

**User asks:** "Write a story about Jane Doe who built an open source accessibility tool"

**Agent actions:**
1. Draft `drafts/story/jane-doe.ts` with the Story schema (outside git)
2. Verify URLs with curl (Pre-Publish Checklist)
3. `npm run publish -- drafts/story/jane-doe.ts` — row lands private
4. Preview at `http://localhost:5173/stories/jane-doe`, iterate (re-publish edits; visibility never changes)
5. Owner flips the toggle to public — live instantly
6. Archive: `cp drafts/story/jane-doe.ts src/content/stories/jane-doe.ts`, commit that file only
7. Done — live at `/stories/jane-doe`

### Example 2: Create a technical guide

**User asks:** "Write a guide about setting up CI/CD with GitHub Actions"

**Agent actions:**
1. Draft `drafts/guide/github-actions-cicd.ts` with the Guide schema (outside git)
2. Use a verified Unsplash photo ID (see Image Strategy above), curl-verify it
3. `npm run publish -- drafts/guide/github-actions-cicd.ts` — private, preview, iterate
4. Owner flips the toggle to public
5. Archive the manuscript, commit that file only
6. Done — live at `/guides/github-actions-cicd`

### Example 3: Create a featured article

**User asks:** "Featured article about the future of WebAssembly"

**Agent actions:**
1. **Draft the story manuscript first**: `drafts/story/wasm-future.ts` with full rich content (sections, bentoHighlights, pullQuotes, topics)
2. **Draft the featured manuscript**: `drafts/featured/wasm-future.ts` — same sections/bento/quotes, plus featured-only metadata (tag, tagline, hero image). A featured article MUST have a matching story row with the same slug
3. `npm run publish -- drafts/story/wasm-future.ts drafts/featured/wasm-future.ts` — batch validates both as private
4. Preview both routes locally, iterate
5. Owner flips both toggles to public
6. Archive both manuscripts, commit those files only. Homepage hero derives from the featured row automatically

## Important Rules

1. **Featured articles must be explicitly asked for.** Never create featured rows unless the user directly requests them. The homepage hero derives from the featured store automatically. Adding a story means publishing the manuscript as a private row, nothing more.
2. **Verify every URL before publishing** (curl images, YouTube embeds, and external links). No exceptions. See Content Verification section.
3. **Never delete or modify existing content files** unless explicitly asked.
4. **Validation lives in `npm run publish`** (schema, slug uniqueness, cross-references). `npm run build` must still pass, but it only type-checks app code now — content ships through the store, not the bundle.
5. **Slugs must be unique** across all content types.
6. **Images must use verified Unsplash numeric IDs** (never Picsum seeds or guessed IDs). If stuck, reuse a known working ID.
7. **Never touch `src/content/` aggregators or seed files.** The `index.ts` files and seed corpus are read-only (`npm run seed` owns them). The only file you add under `src/content/` is the archive copy of a *published* manuscript, with owner approval.
8. **Use the existing components** (don't create new ones unless the design requires it).
9. **Match the tone: plain, direct, concrete (Grokking Algorithms voice).** Rule 17 in `CLAUDE.md` / `AGENTS.md` is mandatory across ALL content types (guides, stories, featured, courses, docs):
   - **Audience and posture:** You are not writing to sound smart, and you are not writing for elite graduates or an academic club. You are writing for the curious mind that is still meek yet capable. Meet the reader where they are with complete respect. Never talk down to them; never patronize.
   - **Take the reader on a journey, never dump content:** Do not shove concepts down the reader's brain. If the reader feels like they are reading an interview prep syllabus, a reference catalog, or a curriculum checklist, the writing has failed.
   - **Feel the pain first:** Open with a natural, innocent piece of code or everyday setup that anyone would write, and watch it blow up. The reader must feel the friction, confusion, and absurdity in their gut before hearing the formal solution.
   - **Strict ban on interview-audition framing:** Never mention "what the interviewer is probing", "candidates fail here", "in the interview cycle", or "senior engineers know this". That turns an exciting craft into an audition test. Write for a builder who wants to understand how the machine actually works.
   - **Ban sterile academic placeholders:** No `Shape: Circle | Square`, no `Foo | Bar`. Use real situations with real stakes (payment gateways, shopping carts, checkout states, network packets).
   - **The goal is not to make the idea smaller; it is to make the reader feel capable:** Bhargava never pretends recursion or dynamic programming is easy. He refuses to make you feel stupid while you learn it. Dense prose is not evidence of a hard idea; it is a tax on a reader who was already smart enough.
   - **The spine: simplify the language, never the truth:** Fewer syllables and fewer prerequisites, not fewer facts. Simpler register, same technical depth. A caveat dropped to keep the story tidy is a lie by omission. If binary search needs sorted input, that invariant stays. If an algorithm has worst-case risks, state them plainly.
   - **Intuition before vocabulary:** Make the idea land, then name it. Never open with the term. "An image is a stack of layers, and each one never changes" earns the phrase *content-addressed*, not the reverse.
   - **Everyday objects and napkin sketches first:** Hand the reader something physical to hold before handing them vocabulary. If you cannot draw it on a napkin with boxes, arrows, lockers, or sticky notes, it is still an abstraction.
   - **The side-by-side walkthrough:** Stand next to the reader. Point at line 14 together. Look over the compiler's shoulder. Show what the compiler sees and drops when it reads your code.
   - **Swap abstract nouns for things:** "Five servers that have to agree on who is in charge" beats "a distributed consensus problem."
   - **Say what it isn't:** Name the near-miss the reader probably has in mind, and the difference. Contrast is where the mental model clicks.
   - **Mark the hand-waving:** If a step only works because you waved at it, say which step. Never hide the trick.
   - **One idea per paragraph:** 1 to 3 sentences. Split compound sentences.
   - **Pacing and rhythm:** Vary sentence length on purpose. A punchy three-word sentence after a long one lands.
   - **Concrete numbers over scale words:** "Row 31,204 of 40,000", not "some rows." "3 of 5 nodes", not "most nodes." Say roughly or work it out loud.
   - **Contractions always:** it's, don't, you'll, can't.
   - **No hedge openers:** No "it's worth noting," no "let's dive in," no "rite of passage" or roadmap announcements. Start with the claim.
   - **STRICT BAN ON EM DASHES (`—`):** Never use em dashes anywhere in content, titles, headings, tables, or pull quotes. Use commas, colons, parentheses, or separate sentences instead.
   - **Dry humor, at most once per section:** Never at the reader's expense.
   - **Length and density are separate axes:** A course lesson can run 7-15KB and still read lean. Grokking Algorithms is a full book and never makes you re-read a sentence. Keep the length and worked depth, but strip the friction out of every sentence.
10. **NEVER compress or summarize source content.** When adapting an article from a source (Twitter thread, blog post, etc.), preserve ALL the original content: every section, every paragraph, every code block, every image. The platform is a reading experience, not a summary service. Format it beautifully, but keep everything. If the original has inline images, include them as ContentBlock images.
11. **Course lessons must be rich and substantial.** Each lesson should be 7-15KB of prose: worked examples with full explanations, multiple code samples, practice problems at the end. Never deliver a "cheat sheet" as a lesson. Substantial is not the same as dense: keep the length, and write it so a reader never has to re-read a sentence. Include:
    - **Multiple worked examples** (3-5 per lesson) with step-by-step reasoning
    - **Mermaid diagrams** for visual explanations (architecture, flows, concept maps). Reference: `docs/mermaid-reference.md` (30 diagram types, syntax, and examples). Use liberally.
    - **Rich prose** that teaches, not just reference material
    - **Practice problems** with hints and solutions. Write each hint and each solution as its own paragraph, starting with the marker on a line of its own: `**Hint:**` and `**Solution:**` (or `*Hint:*` / `*Solution & Fix:*`). StoryPage splits them out of the question and renders them as separate collapsed panels, so the answer is never in the reader's face. A block where the marker is absent from the start of a line stays inline prose, so keep the marker on its own line.
    - **Runnable labs must be hands-on.** When a lesson ships a lab (`LabBlock`), the companion code must let the reader change an input and watch the output change (see *Companion Labs Architecture* above). A green test suite on its own is not a lab.
    - **Code blocks** with syntax highlighting (specify language: TypeScript, OCaml, Python, Bash)
12. **Commit messages** follow format: `"Add [type]: [title]"` (archive commits for published manuscripts only — private pieces are never committed).
13. **No manuscript task is done until its row is verified in the store.** Authoring the `.ts` file is half the job. Every new manuscript MUST be published with `npm run publish` plus a `SELECT slug, status` confirmation in the same task, every time. Never report a story as created or live based on the file alone. A missed publish is a silent no-op: the file sits in git while the UI shows nothing.
## Kill Criteria for Content (don't publish if)

The mechanical layer (schemas, formatting, verification) is what makes a post publishable. The judgment layer is what makes a post worth publishing. Apply these kill tests **before** writing the post. If any fires, don't write it — even if the format is perfect and the URLs are verified.

- **You can't articulate the moat.** Why this post and not someone else's? "It covers X" isn't enough. What does it say that isn't already in the canonical sources for X? If the answer is "nothing," the post is replication. Replication is the content-judgment equivalent of the x402.sh moat kill — a well-formatted clone of what's already out there.

- **The post is replicating.** If a reader can get the same content from the official docs, a major blog post, or the project's README, the post adds zero. The Soma reader is a builder — they already have access to canonical sources. They came for what isn't canonical: your judgment, your integration, your kill decision, your data. Not your paraphrase.

- **The title outpaces the content.** If the headline is more interesting than what's under it, the post is selling something it can't deliver. A clickbait title on a competent body is forgivable. A clickbait title on a competent title with competent body — the headline is the lie.

- **You'd hide the post.** If you'd be embarrassed sharing the link in six months, the post shouldn't exist. The bar is "still worth reading in 6+ months" — durable content, not dated content.

- **The post is meta-navel-gazing.** "What I learned about X" is only publishable if X is a real outcome (kill decision, moat analysis, business result). "What I learned about writing" or "what I learned about the writing process" is journaling, not content. The Soma reader came for the outcome, not the process.

- **The post is too long for what it says.** If the actual insight fits in 500 words but you're writing 3,000, the padding is visible. Cut to the bone. If 500 words aren't enough, the post is probably two posts — write the one with the actual insight, kill the other.

- **You'd skip reading it.** If a friend sent you this post cold, would you read it? Be honest. If the answer is no, the post is your process, not the reader's experience.
