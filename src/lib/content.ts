import { useEffect, useState } from "react";

// ── Runtime content store ──────────────────────────────────
// Replaces static `import { allX } from "@/content/registry"` for every
// prose content type. Rows come from /api/content.js, which returns
// registry-identical shapes (full authored body + computed id/href),
// gated owner-or-published server-side. Nothing here is bundled.
//
// Pages keep their domain types (StoryContent, CourseContent, ...): the
// hooks are generic and the API contract guarantees the shape.

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) {
    const err = new Error(`content fetch failed: ${r.status}`) as Error & { status: number };
    err.status = r.status;
    throw err;
  }
  return r.json() as Promise<T>;
}

const listCache = new Map<string, Promise<unknown[]>>();
const itemCache = new Map<string, Promise<unknown>>();

/**
 * Drop cached content after a mutation (save, publish toggle, delete).
 * Without this, navigation after an edit serves the stale row: both the
 * single-item and list caches hold the pre-save promise forever.
 */
export function invalidateContentCache(): void {
  listCache.clear();
  itemCache.clear();
}


/** Single item by type+slug. Rejects with status 404 when missing or private. */
export function fetchContentItem<T>(type: string, slug: string): Promise<T> {
  const key = `${type}/${slug}`;
  let p = itemCache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = get<T>(`/api/content?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`);
    itemCache.set(key, p);
    p.catch(() => itemCache.delete(key));
  }
  return p;
}

/** All items of a type, ordered by position. Owner session sees private rows too. */
export function fetchContentList<T>(type: string, q?: string): Promise<T[]> {
  const key = q ? `${type}?q=${q}` : type;
  let p = listCache.get(key) as Promise<T[]> | undefined;
  if (!p) {
    const url = `/api/content?type=${encodeURIComponent(type)}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
    p = get<T[]>(url);
    listCache.set(key, p);
    p.catch(() => listCache.delete(key));
  }
  return p;
}

export interface ContentState<T> {
  data: T | null;
  notFound: boolean;
  loading: boolean;
}

/** Drop-in for pages that rendered synchronously from the registry. */
export function useContentList<T>(type: string): ContentState<T[]> {
  const [state, setState] = useState<ContentState<T[]>>({ data: null, notFound: false, loading: true });
  useEffect(() => {
    let live = true;
    fetchContentList<T>(type).then(
      (data) => live && setState({ data, notFound: false, loading: false }),
      () => live && setState({ data: null, notFound: true, loading: false }),
    );
    return () => { live = false; };
  }, [type]);
  return state;
}

/** Drop-in for :slug detail pages. */
export function useContentItem<T>(type: string, slug: string | undefined): ContentState<T> {
  const [state, setState] = useState<ContentState<T>>({ data: null, notFound: false, loading: true });
  useEffect(() => {
    if (!slug) {
      setState({ data: null, notFound: true, loading: false });
      return;
    }
    let live = true;
    fetchContentItem<T>(type, slug).then(
      (data) => live && setState({ data, notFound: false, loading: false }),
      () => live && setState({ data: null, notFound: true, loading: false }),
    );
    return () => { live = false; };
  }, [type, slug]);
  return state;
}

/** Generic card mapper : replaces per-folder toArticleCard helpers. */
export function toCard(item: {
  slug: string; title: string; excerpt: string; href: string;
  category?: unknown; image?: unknown; imageAlt?: unknown;
  author?: unknown; date?: unknown; tags?: unknown;
}) {
  const rawAuthor = item.author as { name?: unknown; handle?: unknown } | undefined;
  const author = rawAuthor && typeof rawAuthor.name === "string"
    ? { name: rawAuthor.name, handle: typeof rawAuthor.handle === "string" ? rawAuthor.handle : undefined }
    : undefined;
  return {
    id: item.slug,
    category: typeof item.category === "string" ? item.category : "",
    title: item.title,
    excerpt: item.excerpt,
    image: typeof item.image === "string" ? item.image : "",
    imageAlt: typeof item.imageAlt === "string" ? item.imageAlt : "",
    href: item.href,
    author,
    date: typeof item.date === "string" ? item.date : "",
    tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
  };
}

// ── Client-side sorting ──────────────────────────────────
// Convention: content recency reads the authored date fields
// (`added`, then `date`), same as the stories/courses/books indexes
// always did. Missing or unparsable dates sort as oldest.
export type SortKey = "newest" | "oldest" | "title";

interface Sortable {
  added?: unknown;
  date?: unknown;
  title?: unknown;
  position?: unknown;
}

export function contentTime(item: Sortable): number {
  const raw = item.added || item.date;
  const t = typeof raw === "string" || typeof raw === "number" ? Date.parse(String(raw)) : NaN;
  return Number.isFinite(t) ? t : 0;
}

function contentPosition(item: Sortable): number {
  return typeof item.position === "number" ? item.position : 0;
}

function contentTitle(item: Sortable): string {
  return typeof item.title === "string" ? item.title : "";
}

/** Newest first by authored date, seed position breaking ties. */
export function sortContent<T extends Sortable>(items: readonly T[], sort: SortKey): T[] {
  const arr = [...items];
  if (sort === "oldest") {
    arr.sort((a, b) => contentTime(a) - contentTime(b) || contentPosition(a) - contentPosition(b));
  } else if (sort === "title") {
    arr.sort((a, b) => contentTitle(a).localeCompare(contentTitle(b), undefined, { sensitivity: "base" }) || contentPosition(a) - contentPosition(b));
  } else {
    arr.sort((a, b) => contentTime(b) - contentTime(a) || contentPosition(a) - contentPosition(b));
  }
  return arr;
}
