# Publish Validation Gates — Implementation

Automated checks in `scripts/publish-content.ts` that fail `npm run publish -- --check` (or real publish) when a manuscript violates content rules.

## Architecture

All 8 content checks live in a single `validateContent(f, type, body)` function called after required-field validation but before `batch.push()` in the main loop:

```typescript
    // Run content validation gates (image URLs, videoIds, em dashes, topics,
    // code fence integrity, source URLs, alt text, lab detection).
    validateContent(f, type, body);

    batch.push({ type, slug, body, file: f });
```

The function is fail-fast: it throws an `Error` on the first violation with the filename and field path. Warnings are printed to `console.warn()` (non-blocking).

Two additional checks run after the batch is assembled (before writing):

- **Slug uniqueness per type** — duplicate slug in the same type across files is an error.
- **Reference integrity** — every slug pointer (course `lessons[].storySlug`, book `chapters[].slug`, series `episodes[].storySlug`, test `source.slug` / `lessons[].storySlug`) is checked against the DB + current batch. This covers what the original spec called "Check 9."

## Checks (8 content gates + 2 assembly gates)

### 1. Image URL format (all types)

Scans:
- `body.image` — the manuscript's lead image
- `body.sections[].paragraphs[].src` — inline image blocks (type === "image")

Must match: `/^https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9-]+\?w=\d+&h=\d+&fit=crop$/`

Fail: `"${f}: image does not match Unsplash photo URL pattern (expected https://images.unsplash.com/photo-{ID}?w=...&h=...&fit=crop)"`

All images on Soma come from Unsplash with explicit width, height, and crop parameters. The regex allows hyphens in the photo ID (real Unsplash IDs like `1499750310107-5fef28a66643` contain hyphens).

Note: `body.bentoHighlights[].image` does **not** exist in the type system (`BentoCardData` only has `label`, `title`, `description`), so it is not scanned.

### 2. YouTube videoId format

Scans `body.sections[].paragraphs[]` for objects with `type === "youtube"`.

`videoId` must match: `/^[a-zA-Z0-9_-]{11}$/`

Fail: `"${f}: invalid YouTube videoId '${id}' in sections[${si}].paragraphs[${pi}] — must be 11 alphanumeric chars"`

### 3. No em dashes or en dashes (prose fields)

Scans these specific fields recursively (not via generic recursive walk — the paths are enumerated for clarity and performance):

- `title`, `description`, `excerpt`, `intro`, `category`
- `body[]` entries (string paragraphs)
- `sections[].heading`, `sections[].intro`
- `sections[].paragraphs[]` (string entries; also `paragraph` and `callout` ContentBlock `.text`)
- `sections[].items[].question`, `sections[].items[].answer[]` (doc type)
- `pullQuote.quote`, `pullQuotes[].quote`
- `bentoHighlights[].title`, `bentoHighlights[].description`
- `callout.text`

**Not scanned:**
- Code blocks (strings starting with `` ``` `` or `---`, ContentBlock `code` type `.code` field)
- URLs
- `author.name`, `tags[]`, `topics[]` (metadata fields)

Both em dash `—` (U+2014) and en dash `–` (U+2013) are flagged.

Fail: `"${f}: ${fieldPath} contains em dash (—) — use a plain dash or rephrase"`
Fail: `"${f}: ${fieldPath} contains en dash (–) — use a plain dash or rephrase"`

### 4. Topic slug validity

Every entry in `body.topics[]` must be a slug from the `VALID_TOPIC_SLUGS` set (inline constant in `publish-content.ts`, matching `src/content/topics/index.ts`).

Valid: `technology`, `economics`, `philosophy`, `open-source`, `career`, `accessibility`, `fact-check`, `devops`, `startups`, `marketing`

Fail: `"${f}: topics[${ti}] = '${slug}' is not a valid topic slug"`

### 5. Code fence integrity (all types)

Extended from the original doc/guide answer-array check to cover all string arrays that may contain fenced code blocks:

- `body[]` (story/guide/featured body string array)
- `sections[].paragraphs[]` (story/guide/featured paragraphs)
- `sections[].items[].answer[]` (doc/guide answers — original check)

Logic: Track fence open/close state across adjacent array entries. An odd count of `` ``` `` in a string means the fence opens or closes mid-entry. This is only legal if the fence opens at the start of the string or closes at the end of the string — any other position means the fence is split across entries.

Fail: `"${f}: split code fence in body[${bi}] — opening \`\`\` and closing \`\`\` must be in the same array entry"`
Fail variants for nested/stray/unclosed fences in each region.

### 6. Plain-text lab warning

Scans `sections[].paragraphs[]` for string entries containing both `` ``` `` and `npm run`. These patterns suggest an inline lab command that should be a `{ type: "lab" }` ContentBlock instead.

**Warning only** (does not fail). Printed to `console.warn`.

WARN: `"${f}: WARNING: sections[${si}].paragraphs[${pi}] contains what looks like an inline lab command — use a { type: "lab" } block instead"`

### 7. Source/reference URL format

Validates:
- `body.source?.url` — must be a valid absolute URL with `http:` or `https:` protocol
- `body.references[].url` — same check

Validation uses `new URL(url)`. If parsing fails or the protocol is not HTTP/HTTPS, an error is thrown.

Fail: `"${f}: source.url '${url}' is not a valid absolute URL"`
Fail: `"${f}: references[${ri}].url '${url}' must be http or https"`

### 8. Image alt text present

Checks:
- `body.image` exists → `body.imageAlt` must be non-empty
- `body.sections[].paragraphs[].src` (image block type) → paired `.alt` must be non-empty

Note: The top-level check is partially redundant with the required-field check (which also catches `imageAlt` being missing or empty). Both fire; the required-field check runs first and throws before `validateContent` runs.

Fail: `"${f}: image has no alt text (imageAlt is empty)"`
Fail: `"${f}: sections[${si}].paragraphs[${pi}].src has no alt text"`

### Assembly Gate A: Slug uniqueness

After batch assembly, checks that no two files in the same publish share the same `type:slug` pair (except story+featured, which share a slug for the hero stage — the composite PK allows coexistence).

### Assembly Gate B: Reference integrity

After batch assembly, resolves every slug pointer from `refsOf()` against the DB + current batch slugs. If a referenced slug doesn't exist in either, the publish fails.

This is the implementation of what the spec called "Check 9 (course lesson slug existence)," generalized to all reference types.

## Order of checks

Cheapest first (static string analysis before deeper traversal):

1. Image URL format (string regex)
2. YouTube videoId (string regex)
3. No em/en dashes (string search)
4. Topic slug validity (set lookup)
5. Code fence integrity (fence state tracking)
6. Plain-text lab warning (string search — WARN only)
7. Source/reference URL format (URL constructor)
8. Image alt text presence (empty check)
— then assembly gates —
A. Slug uniqueness per type (set membership)
B. Reference integrity (DB query + batch set)

## Verification

The implementation was verified with a test file containing intentional violations for each gate. Each check produced the expected error message and exit code 1.

Existing drafts that pass:
- `drafts/story/why-i-built-soma.ts` — check OK
- `drafts/doc/import-test-urls.ts` — check OK

Drafts missing required fields (`publishedAt`) are caught before the content gates run.
