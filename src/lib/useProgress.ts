import { useState, useEffect, useCallback } from "react";

// Progress persisted to Turso DB via API routes.
// storySlugs scopes the completion set to a specific collection
// (course, book, or series) : the API returns all progress rows and
// we filter client-side so the progress bar counts correctly.
export function useProgress(collectionSlug: string, storySlugs: string[]) {
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/progress")
      .then(r => r.json())
      .then(rows => {
        const all = (rows || [])
          .filter((r: any) => r.completed)
          .map((r: any) => r.story_slug || r.slug);
        setCompleted(all.filter((s: string) => storySlugs.includes(s)));
      })
      .catch(() => {});
  }, [collectionSlug]);

  const toggle = useCallback(async (storySlug: string) => {
    const wasDone = completed.includes(storySlug);
    setCompleted(prev => wasDone ? prev.filter(s => s !== storySlug) : [...prev, storySlug]);
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: storySlug, completed: !wasDone }),
    }).catch(() => {});
  }, [completed]);

  return {
    completed,
    toggle,
    isCompleted: useCallback((slug: string) => completed.includes(slug), [completed]),
    progress: completed.length,
  };
}

// Fetch all read story slugs : used for sorting "unread first"
export function useAllReadSlugs() {
  const [readSlugs, setReadSlugs] = useState<Set<string>>(new Set());
  useEffect(() => {
    fetch("/api/progress").then(r => r.json()).then(rows => {
      setReadSlugs(new Set((rows || []).map((r: any) => r.story_slug || r.slug)));
    }).catch(() => {});
  }, []);
  return readSlugs;
}
