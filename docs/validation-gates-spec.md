# Publish Validation Gates — Implementation Spec

Add automated checks to `scripts/publish-content.ts` that fail `npm run publish` (or `--check`) when content violates SOMA_SKILL.md rules.

## Architecture

All checks live in a single function called after required-field validation but before `batch.push()`. Each check iterates over the manuscript body's fields and throws an `Error` with the filename and field path on violation.

Signature:

```typescript
function validateContent(f: string, type: string, body: Fields): void
```

Called in the main loop at:

```typescript
for (const field of REQUIRED[type] || [...]) { ... }  // existing
validateContent(f, type, body);                          // new — insert here
batch.push({ type, slug, body, file: f });               // existing
```

## Checks (9 total)

### 1. Image URL format (all types)

Scan every string field whose value looks like an image URL:
- `body.image`
- `body.imageAlt` (paired check — see item 8)
- `body.sections[].paragraphs[].src` (image block)
- `body.bentoHighlights[].image` (if present)

Must match: `https://images.unsplash.com/photo-\d+?w=\d+&h=\d+&fit=crop`

Fail: `"${f}: ${fieldPath} does not match Unsplash photo URL pattern (expected https://images.unsplash.com/photo-{ID}?w=...&h=...&fit=crop)"`

### 2. YouTube videoId format

Scan `body.sections[].paragraphs[]` for objects with `type === "youtube"`.

`videoId` must match: `^[a-zA-Z0-9_-]{11}$`

Fail: `"${f}: invalid YouTube videoId '${id}' in section ${section} — must be 11 alphanumeric chars"`

### 3. No em dashes (all string fields)

Recursively scan all string values (including nested objects/arrays) for the Unicode em dash character `—` (U+2014). Also check for en dash `–` (U+2013) in prose fields (exclude code blocks and URLs).

Fields to scan:
- `title`, `description`, `excerpt`, `intro`, `category`, `subcategory`
- `body[]` entries (paragraphs)
- `sections[].heading`, `sections[].intro`
- `sections[].paragraphs[]` entries (both strings and `code` block `.code` fields)
- `sections[].items[].question`, `sections[].items[].answer[]` (doc)
- `pullQuote`, `pullQuotes[].quote`
- `bentoHighlights[].title`, `bentoHighlights[].description`
- `callout.text`

Do NOT scan:
- Code blocks (`.code` in code blocks, fenced code in strings)
- URLs
- `author.name`, `tags[]`, `topics[]` (metadata fields)

Fail: `"${f}: ${fieldPath} contains em dash (—) — use a plain dash or rephrase"`

### 4. Topic slug validity

Every entry in `body.topics[]` must be a valid topic slug from `src/content/topics/index.ts` (the `allTopics` array).

Currently valid: `technology`, `economics`, `philosophy`, `open-source`, `career`, `accessibility`, `fact-check`, `devops`, `startups`, `marketing`

Fail: `"${f}: topics[${i}] = '${slug}' is not a valid topic slug"`

Source the list from a shared constant or inline the array. The topics rarely change.

### 5. Code fences not split across entries (story paragraphs)

Same check already added for `doc`/`guide` `answer` arrays. Extend to:

- `body.body[]` (guide/story body array)
- `body.sections[].paragraphs[]` (story paragraphs)

Logic: for each string entry, count ` ``` ` occurrences. Odd count = fence opens in one entry and closes in another → fail.

Fail: `"${f}: split code fence — opening \`\`\` and closing \`\`\` must be in the same array entry (section ${s}, entry ${i})"`

### 6. No plain-text labs

In story `sections[].paragraphs[]`, detect strings that contain lab-like content that should be a `{ type: "lab" as const }` object. Heuristic: string contains both `` ``` `` and the word `command` or `lab` in a pattern that suggests an inline lab.

Simpler approach: check that if any string entry contains `` ``` `` followed by `npm run`, it's probably a lab command that belongs in a proper `LabBlock`. Flag for review (WARN, not FAIL).

WARN: `"${f}: section ${s} entry ${i} contains what looks like an inline lab command — use a { type: \"lab\" } block instead"`

### 7. Source/reference URL format

Scan:
- `body.source?.url` (must be a valid absolute URL)
- `body.references[].url` (must be valid absolute URL)

Validation: try `new URL(url)`. Must have `http:` or `https:` protocol.

Fail: `"${f}: source.url '${url}' is not a valid absolute URL"`

### 8. Image alt text present

Every image source must have a non-empty alt text. Check pairs:

- `body.image` → `body.imageAlt` must be non-empty
- `body.sections[].paragraphs[].src` (image block) → paired `.alt` must be non-empty

Empty alt is allowed only if the image is purely decorative (not our case — all content images are editorial).

Fail: `"${f}: image at ${fieldPath} has no alt text"`

### 9. Course lesson slug existence (DB query)

Only for `type === "course"`. Check that every `body.lessons[].storySlug` resolves to an existing row in the content store.

Requires DB access (already connected). Query: `SELECT slug FROM content_items WHERE type='story' AND slug=?`

Fail: `"${f}: lessons[${i}].storySlug '${slug}' does not match any existing story"`

## Testing

1. Create a test manuscript with intentional violations for each check.
2. Run `node scripts/publish-content.ts --check test-file.ts` — expect failure with the specific error message.
3. Fix violations, re-run — expect pass.

## Order of checks

Run cheapest checks first (static string analysis) before expensive ones (DB queries):

1. Image URL format
2. YouTube videoId
3. No em dashes
4. Topic slug validity
5. Code fence integrity
6. Plain-text lab warning
7. Image alt text presence
8. Source/reference URL format
9. Course lesson slug existence (DB query)
