/**
 * Shared seed corpus: the .ts manuscripts in src/content are the versioned
 * source of demo content. Both `npm run seed` (direct DB import) and
 * `npm run export-corpus` (bundled runtime snapshot in api/_corpus.js)
 * read from here, so curation order and field handling stay identical.
 */
import { allStories } from "../src/content/stories/index.ts";
import { allGuides } from "../src/content/guides/index.ts";
import { allDocs } from "../src/content/docs/index.ts";
import { allCourses } from "../src/content/courses/index.ts";
import { allBooks } from "../src/content/books/index.ts";
import { allSeries } from "../src/content/series/index.ts";
import { allTests } from "../src/content/tests/index.ts";
import { allFeatured } from "../src/content/featured/index.ts";
import { allEpisodes } from "../src/content/podcast/episodes/index.ts";
import { allTopics } from "../src/content/topics/index.ts";

export type SeedFields = Record<string, unknown>;

export interface CorpusEntry {
  type: string;
  slug: string;
  title: string;
  excerpt: string;
  body: SeedFields;
  meta: Record<string, unknown>;
  position: number;
}

const COMPUTED = new Set(["id", "href", "isFeatured"]);

export function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function stripComputed(item: SeedFields): SeedFields {
  const out: SeedFields = {};
  for (const [k, v] of Object.entries(item)) {
    if (!COMPUTED.has(k)) out[k] = v;
  }
  return out;
}

export function loadCorpus(): CorpusEntry[] {
  const collections: Array<{ type: string; items: SeedFields[] }> = [
    { type: "story", items: allStories },
    { type: "guide", items: allGuides },
    { type: "doc", items: allDocs },
    { type: "course", items: allCourses },
    { type: "book", items: allBooks },
    { type: "series", items: allSeries },
    { type: "test", items: allTests },
    { type: "featured", items: allFeatured },
    { type: "podcast", items: allEpisodes },
    { type: "topic", items: allTopics },
  ];
  const out: CorpusEntry[] = [];
  for (const { type, items } of collections) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const slug = str(item.slug);
      if (!slug) throw new Error(`${type}[${i}] missing slug`);
      const body = stripComputed(item);
      const title = str(item.title);
      const excerpt = str(item.excerpt) || str(item.description);
      const meta = i === 0 && (type === "story" || type === "guide") ? { featured: true } : {};
      out.push({ type, slug, title, excerpt, body, meta, position: i });
    }
  }
  return out;
}
