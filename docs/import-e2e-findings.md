# Import E2E Testing — Issues Found

## Infrastructure Issues

### 1. Vite dev middleware missing `import` handler
**File:** `vite.config.ts`
**Symptom:** `/api/import` requests fell through to `api/content.js` as the `else` fallback → "slug, type and body required" error.
**Fix:** Added `else if (name === "import") localHandlerCache[name] = (await import("./api/import.js")).default;`
**Scope:** Dev server only. Production on Vercel/Netlify was unaffected.

### 2. Route table missing `import` entry
**File:** `shared/api-routes.js`
**Symptom:** CI check (`scripts/check-api-routes.mjs`) failed: "api/ has function files the route table does not list: import" and "client calls /api/import, which the route table does not define".
**Fix:** Added `import: "import"` to `ROUTE_HANDLERS` and `"import"` to `HANDLER_FILES`.

### 3. Netlify function missing `import` route handler
**File:** `netlify/functions/api.mjs`
**Symptom:** Same CI check reported "netlify/functions/api.mjs has no branch for route 'import'".
**Fix:** Added `if (route === "import")` block that dynamically imports `api/import.js`, following the same pattern as the `export` route.

### 4. `admin-btn` / `admin-link` CSS classes undefined
**File:** `src/pages/AdminDashboardPage.tsx`
**Symptom:** 14 instances of these classes across the dashboard — zero CSS definitions exist. All styling came from inline Tailwind utilities.
**Fix:** Removed the dead class names from all elements.

## UI/UX Issues

### 5. Select trigger missing keyboard focus indicator
**File:** `src/components/ui/Select.tsx`
**Symptom:** The native `<select>` had `focus:outline-none focus:border-primary`, but the new custom Select component had no visible focus style. Keyboard users tabbing through filters got no feedback.
**Fix:** Added `focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/30`.

### 6. `rounded-lg` on Select dropdown mismatched project aesthetic
**File:** `src/components/ui/Select.tsx`
**Symptom:** The dropdown list used `rounded-lg` (8px) while the project uses sharp corners everywhere.
**Fix:** Removed `rounded-lg`.

## Import Workflow Issues

### 7. ImportFromUrlModal useScrollLock hardcoded to `true`
**File:** `src/components/admin/ImportFromUrlPanel.tsx`
**Symptom:** `useScrollLock(true)` was a literal — the lock only cleaned up on unmount. Any re-render that changed the value (none today since it's a literal) would be silently ignored.
**Fix:** Changed to `useScrollLock(open)` — modal receives `open={showImport}` prop from parent.

### 8. "Create [Type]" button discards fetched content
**Files:** `src/components/admin/ImportFromUrlPanel.tsx`, `src/pages/AdminNewPage.tsx`
**Symptom:** Clicking "Create Story" navigated to `/admin/new?type=story` but the extracted title, description, and text were lost. User had to Copy Text → Close → Navigate → Paste.
**Fix #1:** ImportFromUrlPanel stores extracted data in `sessionStorage.setItem("import-draft", JSON.stringify({title, description, text, url}))` before navigation.
**Fix #2:** AdminNewPage reads from sessionStorage on mount, injects into the AI prompt.

### 9. React Strict Mode double-render consumes sessionStorage
**File:** `src/pages/AdminNewPage.tsx`
**Symptom:** React Strict Mode calls the component function twice on mount. The first call's `useMemo` read sessionStorage and cleared it with `removeItem`. The second call found nothing → empty prompt.
**Fix:** Moved `sessionStorage.removeItem("import-draft")` from `useMemo` to a `useEffect([])` — the data is read during render (survives Strict Mode) and cleaned up after the render is committed.

### 10. `?type=` query param ignored
**Files:** `src/pages/AdminNewPage.tsx`, `src/components/admin/AIDraftPanel.tsx`
**Symptom:** Import navigated to `/admin/new?type=doc` but the page ignored the query param. AI had to re-classify the content type from scratch.
**Fix #1:** AdminNewPage reads `URLSearchParams` from `location.search` and passes `defaultType` to AIDraftPanel.
**Fix #2:** AIDraftPanel injects type hint into the AI prompt: "Create (content type: doc) content...".
**Fix #3:** When `defaultType` is set, the system prompt is narrowed to only that content type's schema (instead of all 10), saving context window for actual content generation.

### 11. `type` query param not used for AIDraftPanel
**File:** `src/components/admin/AIDraftPanel.tsx`
**Symptom:** Added `defaultType` prop to AIDraftPanel. The generate call injects type hint into the user message.
**Fix:** Added `defaultType?: string` to `AIDraftPanelProps`, included in the user message as `(content type: ${defaultType})`.

## MCP / API Issues

### 12. MCP `import_content` returns flat text instead of structured JSON
**File:** `server/mcp-server.mjs`
**Symptom:** The API endpoint returns structured JSON (`{url, title, description, wordCount, suggestedType, text}`), but the MCP tool returned a flat string. Agents parsing it lost structured access.
**Fix:** Changed `importContent()` return to `JSON.stringify({url, status, title, description, wordCount, suggestedType, text, ...})`.

### 13. Extraction logic duplicated across two files
**Files:** `api/import.js`, `server/mcp-server.mjs`
**Symptom:** `extractMeta`, `extractPlainText`, `classifyUrl` were copy-pasted (~150 lines). Inevitable drift.
**Fix:** Extracted to shared module `server/lib/extract-html.mjs`. Both files import from it.

## Content Extraction Issues

### 14. HTML extraction lost all structure
**File:** `server/lib/extract-html.mjs`
**Symptom:** `extractPlainText` used regex-based HTML stripping that removed all headings, links, lists — producing flat prose. The AI received unstructured text and couldn't map source sections to doc sections.
**Fix:** Replaced with `turndown` library — converts HTML to proper Markdown with `##` headings, links, lists, code blocks, and blockquotes preserved.

### 15. arXiv abstract page vs full paper content
**File:** `server/lib/extract-html.mjs`
**Symptom:** arXiv URLs like `https://arxiv.org/abs/1706.03762` only returned the abstract page (~8K chars of metadata). The full paper content wasn't available via that URL.
**Fix:** Added `resolveArxivUrl()` that redirects abstract URLs to the HTML version (`/abs/1706.03762` → `/html/1706.03762`), giving ~44K chars with all 7 paper sections.

## AI Generation Issues

### 16. Text truncation too aggressive (4K → 15K)
**File:** `src/pages/AdminNewPage.tsx`
**Symptom:** The import-draft prompt truncated extracted text to 4000 characters. For a 44K-char arXiv paper, only the abstract and first paragraph of Introduction were sent to the AI.
**Fix:** Increased to 15000 characters. Limits: API enforces 20K char limit on `userMessage`. Input header text ~200 chars → 15K of content fits comfortably.

### 17. System prompt included all 10 content type schemas
**File:** `src/components/admin/AIDraftPanel.tsx`
**Symptom:** `buildSystemPrompt()` without arguments includes schemas for all content types. When `defaultType` is known, this wastes thousands of tokens on irrelevant schema definitions.
**Fix:** Pass `buildSystemPrompt(defaultType ? [defaultType as ContentType] : undefined)` to narrow prompt to the relevant type only.

### 18. Field descriptions didn't recurse into nested children
**File:** `src/lib/content-schema.ts`
**Symptom:** `buildFieldDescriptions` only iterated ONE level deep. For doc `sections`, it showed `items (object[], required): Q&A pairs` but didn't show `items.question` and `items.answer` — the AI had to guess field names. The AI's reasoning showed: "Need determine item schema? Not explicitly given for items."
**Fix:** Made `buildFieldDescriptions` recursive — it now walks all nesting levels so every nested field's name and type is visible.
**Affects all types.** Checked each:
- **Story:** `sections[].paragraphs` — 2 levels, simple ✓
- **Guide:** `sections[].paragraphs`, `tipCards[].icon/title/description/bgClass/iconColorClass` — 2-3 levels ✓
- **Doc:** `sections[].items[].{question, answer}` — 3 levels ✓ (was broken, now fixed)
- **Course/Book/Series:** `lessons/chapters/episodes[].{title, storySlug, description}` — 2 levels ✓
- **Featured:** `sections[].paragraphs`, `pullQuotes[]`, `bentoHighlights[]` — 2 levels ✓
- **Test:** `sources[]`, `questions[].options[]` — up to 3 levels ✓
- **Podcast:** `segments[].{time, title, description}`, `guests[].{name, role, description}` — 2 levels ✓

### 19. Example not included in system prompt
**File:** `src/lib/content-schema.ts`
**Symptom:** `buildExamplePrompt` existed but was never called in `buildSystemPrompt`. The AI never saw a working example of the output structure.
**Fix:** Added `Example:\n${buildExamplePrompt(s.type)}` to the system prompt after each type's field descriptions.

### 20. Doc sections mapping — `draft.sections` → `docSections`
**File:** `src/components/admin/ContentForm.tsx`
**Symptom:** The AI generates `draft.sections` (matching the general AIDraft field), but ContentForm renders `values.docSections` for doc type. The sections were generated but landed in the wrong variable — invisible.
**Fix:** `initFromDraft` now checks: if `draft.type === "doc"` and `draft.sections` is populated, map it to `docSections`.

### 21. Guard caught empty content but silently crashed
**File:** `src/components/admin/AIDraftPanel.tsx`
**Symptom:** The empty-content guard set `setStatus("idle")` instead of `setStatus("error")` — the error banner only renders for "error" status. The generation appeared to silently fail with no feedback.
**Fix:** Removed the guard — ContentForm already shows `+ Add section` when sections are empty, which is sufficient visual feedback.

## Content Type Audit

Each content type checked for similar nested-field issues after the recursive `buildFieldDescriptions` fix:

| Type | Deepest nesting | Issue? | Status |
|------|----------------|--------|--------|
| Story | 2 levels: `sections[].paragraphs` | No deep nesting | ✅ Clean |
| Guide | 3 levels: `tipCards[].icon, title, description` | Shows all fields | ✅ Clean |
| Doc | 3 levels: `sections[].items[].{question, answer}` | Was broken | ✅ Fixed |
| Course | 2 levels: `lessons[].title, storySlug, description` | Simple | ✅ Clean |
| Book | 2 levels: `chapters[].title, storySlug, description` | Simple | ✅ Clean |
| Series | 2 levels: `episodes[].title, storySlug, description` | Simple | ✅ Clean |
| Featured | 2 levels: `sections[].paragraphs` | No deep nesting | ✅ Clean |
| Test | 3 levels: `questions[].options[].{id, label}` | Shows all fields | ✅ Clean |
| Podcast | 2 levels: `segments[].{time, title, description}` | Shows all fields | ✅ Clean |

All types now have complete nested field descriptions in the system prompt. No other types had the same `sections`→`docSections` mapping issue since they all use the same `values.sections` field name as the AIDraft type.
