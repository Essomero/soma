# `tenant_id` Migration Spec

## Purpose

Add multi-tenant support to every data table so `soma-cloud` (the private SaaS wrapper repo) can isolate users by workspace. Self-hosters remain on `tenant_id = 'default'` and never set `x-tenant-id` — fully backward compatible.

## Tables Affected (8)

Each table gets `tenant_id TEXT NOT NULL DEFAULT 'default'`. The column must be NOT NULL so every query works without a tenant filter (self-host default).

| # | Table | Current PK | New PK | Data file(s) |
|---|-------|-----------|--------|-------------|
| 1 | `content_items` | `(type, slug)` | `(tenant_id, type, slug)` | `api/content.js`, `scripts/content-db.ts`, `scripts/init-docker.ts` |
| 2 | `note_articles` | `id` auto-increment | `id` auto-increment (no PK change) | `api/social.js`, `netlify/functions/api.mjs` |
| 3 | `ratings` | `story_slug` | `(tenant_id, story_slug)` | `api/engagement.js`, `functions/api/[[path]].js`, `netlify/functions/api.mjs`, `src/lib/db.ts` |
| 4 | `highlights` | `id` auto-increment | `id` auto-increment (no PK change) | `api/social.js`, `functions/api/[[path]].js`, `netlify/functions/api.mjs`, `src/lib/db.ts` |
| 5 | `comments` | `id` auto-increment | `id` auto-increment (no PK change) | `api/social.js`, `functions/api/[[path]].js`, `netlify/functions/api.mjs`, `src/lib/db.ts` |
| 6 | `progress` | `story_slug` | `(tenant_id, story_slug)` | `api/engagement.js`, `functions/api/[[path]].js`, `netlify/functions/api.mjs`, `src/lib/db.ts` |
| 7 | `test_submissions` | `id` auto-increment | `id` auto-increment (no PK change) | `api/engagement.js`, `functions/api/[[path]].js`, `netlify/functions/api.mjs` |
| 8 | `lab_attempts` | `id` auto-increment | `id` auto-increment (no PK change) | `api/proof.js`, `functions/api/[[path]].js`, `netlify/functions/api.mjs` |

## Exact Column Additions

### 1. content_items

```sql
ALTER TABLE content_items ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
```

Then rebuild the PRIMARY KEY to include `tenant_id` — requires table recreation (SQLite limitation):

```sql
-- Create new table with tenant_id in PK
CREATE TABLE IF NOT EXISTS content_items_new (
  tenant_id TEXT NOT NULL DEFAULT 'default',
  slug TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'private',
  title TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  body_json TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  archived_at TEXT,
  PRIMARY KEY (tenant_id, type, slug)
);

-- Copy existing rows (all go to 'default')
INSERT OR REPLACE INTO content_items_new (tenant_id, slug, type, status, title, excerpt, body_json, meta_json, position, updated_at, archived_at)
  SELECT 'default', slug, type, status, title, excerpt, body_json, meta_json, position, updated_at, archived_at FROM content_items;

-- Swap
DROP TABLE content_items;
ALTER TABLE content_items_new RENAME TO content_items;
```

This is exactly the same pattern the existing `001` migration already uses for the composite key migration. The `_migrations` table will track it as `002`.

### 2. note_articles

```sql
ALTER TABLE note_articles ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
```

### 3. ratings

```sql
-- ALTER won't work on PK table. Recreate with tenant_id in PK.
DROP TABLE IF EXISTS ratings_old;
ALTER TABLE ratings RENAME TO ratings_old;
CREATE TABLE IF NOT EXISTS ratings (
  tenant_id TEXT NOT NULL DEFAULT 'default',
  story_slug TEXT NOT NULL,
  rating INTEGER NOT NULL,
  rated_at TEXT,
  PRIMARY KEY (tenant_id, story_slug)
);
INSERT OR IGNORE INTO ratings (tenant_id, story_slug, rating, rated_at)
  SELECT 'default', story_slug, rating, rated_at FROM ratings_old;
DROP TABLE ratings_old;
```

### 4. highlights

```sql
ALTER TABLE highlights ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
```

### 5. comments

```sql
ALTER TABLE comments ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
```

### 6. progress

```sql
-- PK table, need recreate
DROP TABLE IF EXISTS progress_old;
ALTER TABLE progress RENAME TO progress_old;
CREATE TABLE IF NOT EXISTS progress (
  tenant_id TEXT NOT NULL DEFAULT 'default',
  story_slug TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, story_slug)
);
INSERT OR IGNORE INTO progress (tenant_id, story_slug, completed, completed_at)
  SELECT 'default', story_slug, completed, completed_at FROM progress_old;
DROP TABLE progress_old;
```

### 7. test_submissions

```sql
ALTER TABLE test_submissions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
```

### 8. lab_attempts

```sql
ALTER TABLE lab_attempts ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
```

## CREATE TABLE Statements (updated for new tables)

Every `CREATE TABLE IF NOT EXISTS` in the codebase must include `tenant_id` so fresh databases ship with it:

### content_items (scripts/content-db.ts, scripts/init-docker.ts, api/content.js)

```sql
CREATE TABLE IF NOT EXISTS content_items (
  tenant_id TEXT NOT NULL DEFAULT 'default',
  slug TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'private',
  title TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  body_json TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  archived_at TEXT,
  PRIMARY KEY (tenant_id, type, slug)
)
```

### note_articles (api/social.js, netlify/functions/api.mjs)

```sql
CREATE TABLE IF NOT EXISTS note_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published_content TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
)
```

### ratings (api/engagement.js, functions/api/[[path]].js, netlify/functions/api.mjs, src/lib/db.ts)

```sql
CREATE TABLE IF NOT EXISTS ratings (
  tenant_id TEXT NOT NULL DEFAULT 'default',
  story_slug TEXT NOT NULL,
  rating INTEGER NOT NULL,
  rated_at TEXT,
  PRIMARY KEY (tenant_id, story_slug)
)
```

### highlights (api/social.js, functions/api/[[path]].js, netlify/functions/api.mjs, src/lib/db.ts)

```sql
CREATE TABLE IF NOT EXISTS highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  story_slug TEXT NOT NULL,
  section_index INTEGER NOT NULL DEFAULT 0,
  paragraph_index INTEGER NOT NULL DEFAULT 0,
  start_offset INTEGER NOT NULL DEFAULT 0,
  end_offset INTEGER NOT NULL DEFAULT 0,
  selected_text TEXT,
  text_hash TEXT,
  color TEXT DEFAULT 'yellow',
  created_at TEXT DEFAULT (datetime('now'))
)
```

### comments (api/social.js, functions/api/[[path]].js, netlify/functions/api.mjs, src/lib/db.ts)

```sql
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  story_slug TEXT NOT NULL,
  body TEXT NOT NULL,
  parent_id INTEGER,
  is_ai INTEGER DEFAULT 0,
  ai_model TEXT,
  mode TEXT,
  highlight_id INTEGER,
  section_index INTEGER,
  paragraph_index INTEGER,
  start_offset INTEGER,
  end_offset INTEGER,
  selected_text TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
)
```

### progress (api/engagement.js, functions/api/[[path]].js, netlify/functions/api.mjs, src/lib/db.ts)

```sql
CREATE TABLE IF NOT EXISTS progress (
  tenant_id TEXT NOT NULL DEFAULT 'default',
  story_slug TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, story_slug)
)
```

### test_submissions (api/engagement.js, functions/api/[[path]].js, netlify/functions/api.mjs)

```sql
CREATE TABLE IF NOT EXISTS test_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  test_slug TEXT NOT NULL,
  answers TEXT NOT NULL,
  evaluation TEXT,
  score INTEGER,
  model TEXT,
  created_at TEXT NOT NULL
)
```

### lab_attempts (api/proof.js, functions/api/[[path]].js, netlify/functions/api.mjs)

```sql
CREATE TABLE IF NOT EXISTS lab_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  content_slug TEXT NOT NULL,
  lab_id TEXT NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 1,
  last_attempt_at TEXT DEFAULT (datetime('now'))
)
```

## Indexes

Existing indexes should either be dropped-and-recreated to include `tenant_id` as the leading column, or new covering indexes added:

```sql
-- lab_attempts
DROP INDEX IF EXISTS idx_lab_attempts_slug;
CREATE INDEX IF NOT EXISTS idx_lab_attempts_tenant_slug ON lab_attempts(tenant_id, content_slug);
-- (unique constraint can stay as-is since (tenant_id, content_slug, lab_id) is the real unique scope)
DROP INDEX IF EXISTS idx_lab_attempts_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lab_attempts_tenant_unique ON lab_attempts(tenant_id, content_slug, lab_id);
```

## Code Changes Required

### Migration entry (api/content.js)

Add a new `002` migration object to the `MIGRATIONS` array. It must:

1. Detect whether `tenant_id` already exists on `content_items` (skip if yes)
2. Run the `ALTER TABLE` for each of the 8 tables (with PK rebuilds for ratings, progress, content_items)
3. Handle the `ratings` and `progress` recreate pattern safely (rename -> create -> copy -> drop)
4. Register itself in `_migrations`

### CREATE TABLE statements (6 files)

Update every `CREATE TABLE IF NOT EXISTS` across these files to include `tenant_id`:

- `api/content.js` — `CREATE_TABLE` / `MIGRATIONS[001].up`
- `api/social.js` — `CREATE_NOTE_TABLE`, `ensureHighlightsTables`
- `api/engagement.js` — `ensureRatingsTables`, `ensureProgressTables`, `ensureTestsTables`
- `api/proof.js` — `ensureTables`
- `scripts/content-db.ts` — `CREATE_CONTENT_ITEMS`
- `scripts/init-docker.ts` — `const CREATE`
- `functions/api/[[path]].js` — inline CREATE TABLE calls
- `netlify/functions/api.mjs` — inline CREATE TABLE calls
- `src/lib/db.ts` — inline CREATE TABLE calls

### API route changes (10 files)

Every SELECT and INSERT/UPSERT across these files must include `tenant_id`:

**How tenant_id arrives at the API:**

- Self-hosted (`SITE_PASSWORD` auth, no `x-tenant-id` header): `tenant_id = 'default'`
- Cloud (`soma-cloud` proxy): proxy injects `x-tenant-id` header from user session

**Files to modify:**

| File | Routes | Pattern |
|------|--------|---------|
| `api/content.js` | GET/POST/PUT/DELETE content | All queries filter `WHERE tenant_id = ?`; INSERT sets tenant_id |
| `api/social.js` | notes, highlights, comments | All queries add tenant_id filter |
| `api/engagement.js` | ratings, progress, tests | All queries add tenant_id filter |
| `api/proof.js` | proof aggregate | JOIN queries add tenant_id filter |
| `functions/api/[[path]].js` | CF Workers variants | Same pattern |
| `netlify/functions/api.mjs` | Netlify variants | Same pattern |
| `src/lib/db.ts` | SvelteKit API routes | Same pattern |

**Helper approach:**

Add a tenant extraction helper:

```js
// api/_tenant.js
export function getTenantId(req) {
  return req?.headers?.['x-tenant-id'] || 'default';
}
```

Then every handler:

```js
const tenant_id = getTenantId(req);
// ... queries use tenant_id as first param
```

### Uniqueness notes

- `note_articles.slug` was `UNIQUE` — with `tenant_id` the unique constraint should become `UNIQUE(tenant_id, slug)`. Since SLQlite doesn't allow ALTER of unique constraints, the table needs recreation.
- `lab_attempts(content_slug, lab_id)` unique index — recreate as `(tenant_id, content_slug, lab_id)`.

## Implementation Order

1. Add the `002` migration to `api/content.js` (run on boot, handles all 8 tables)
2. Update every `CREATE TABLE IF NOT EXISTS` to include `tenant_id`
3. Add `api/_tenant.js` helper
4. Thread `tenant_id` through every API handler
5. Update the Cloudflare Functions variant (`functions/api/[[path]].js`)
6. Update the Netlify Functions variant (`netlify/functions/api.mjs`)
7. Update the SvelteKit local dev variant (`src/lib/db.ts`)
8. Update `scripts/content-db.ts` and `scripts/init-docker.ts`
9. Run full test suite

## Verification

After migration:

```sql
-- Confirm every table has tenant_id
SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN (
  'content_items','note_articles','ratings','highlights',
  'comments','progress','test_submissions','lab_attempts'
);

-- All existing rows show 'default'
SELECT tenant_id, COUNT(*) FROM content_items GROUP BY tenant_id;
SELECT tenant_id, COUNT(*) FROM ratings GROUP BY tenant_id;
```
