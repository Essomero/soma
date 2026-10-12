import { useState, useEffect, useCallback } from "react";
import { Globe, Lock } from "lucide-react";

// ── API helpers ────────────────────────────────────────
async function apiGet(slug: string): Promise<boolean> {
  try {
    const r = await fetch(`/api/public?slug=${encodeURIComponent(slug)}`);
    const data = await r.json();
    return !!data.public;
  } catch {
    return false;
  }
}

async function apiSet(slugs: string[], isPublic: boolean): Promise<void> {
  await fetch("/api/public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slugs, public: isPublic }),
  }).catch(() => {});
}

// ── localStorage keys (optimistic UI : API is source of truth) ──
function storyKey(slug: string) { return `public:story:${slug}`; }
function collectionKey(slug: string) { return `public:collection:${slug}`; }

// ── Hook: per-story toggle with parent-collection fallback ─
export function usePublicState(storySlug: string, collectionSlug?: string) {
  const sKey = storyKey(storySlug);
  const cKey = collectionSlug ? collectionKey(collectionSlug) : null;

  const [isPublic, setIsPublic] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Read: API → story override → collection override → default private
  useEffect(() => {
    let cancelled = false;
    apiGet(storySlug).then(serverVal => {
      if (cancelled) return;
      if (serverVal) { setIsPublic(true); setLoaded(true); return; }
      // Fall back to localStorage (may be from pre-API cookie era)
      const storyVal = localStorage.getItem(sKey);
      if (storyVal === "true") {
        // Migrate: localStorage says public but DB doesn't : sync to server
        apiSet([storySlug], true);
        setIsPublic(true);
        setLoaded(true);
        return;
      }
      if (cKey) {
        const collVal = localStorage.getItem(cKey);
        if (collVal === "true") {
          setIsPublic(true);
          setLoaded(true);
          return;
        }
      }
      setIsPublic(false);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [sKey, cKey, storySlug]);

  const toggle = useCallback(() => {
    const next = !isPublic;
    setIsPublic(next);
    localStorage.setItem(sKey, String(next));
    apiSet([storySlug], next);
  }, [isPublic, sKey, storySlug]);

  return { isPublic, toggle, loaded };
}

// ── Hook: collection-level toggle (for series/course pages) ─
export function useCollectionPublicState(collectionSlug: string, episodeSlugs?: string[]) {
  const cKey = collectionKey(collectionSlug);
  const eps = episodeSlugs ?? [];

  const [isPublic, setIsPublic] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet(collectionSlug).then(serverVal => {
      if (cancelled) return;
      if (serverVal) { setIsPublic(true); setLoaded(true); return; }
      const stored = localStorage.getItem(cKey);
      setIsPublic(stored === "true");
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [cKey, collectionSlug]);

  const toggle = useCallback(() => {
    const next = !isPublic;
    setIsPublic(next);
    localStorage.setItem(cKey, String(next));
    // Clear per-story overrides so children inherit the new collection state
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("public:story:")) localStorage.removeItem(k);
    }
    // Set the collection slug + all episode slugs in the DB
    apiSet([collectionSlug, ...eps], next);
  }, [isPublic, cKey, collectionSlug, eps]);

  return { isPublic, toggle, loaded };
}

// ── Button component ──────────────────────────────────
interface PublicToggleButtonProps {
  isPublic: boolean;
  onToggle: () => void;
  className?: string;
  label?: string;
}

export function PublicToggleButton({ isPublic, onToggle, className, label }: PublicToggleButtonProps) {
  const title = isPublic
    ? (label ? `${label} : public` : "Public : click to make private")
    : (label ? `${label} : private` : "Private : click to make public");

  return (
    <button
      onClick={onToggle}
      className={className}
      aria-label={title}
      title={title}
    >
      {isPublic ? (
        <Globe className="w-5 h-5 text-secondary" />
      ) : (
        <Lock className="w-5 h-5 text-accent-orange" />
      )}
    </button>
  );
}

// ── Inline toggle (for collection pages) ──────────────
interface PublicToggleInlineProps {
  isPublic: boolean;
  onToggle: () => void;
  label: string;
}

export function PublicToggleInline({ isPublic, onToggle, label }: PublicToggleInlineProps) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-sm px-xl py-md rounded-lg font-sora text-sm transition-all ${
        isPublic
          ? "bg-secondary/10 border border-secondary/40 text-secondary"
          : "bg-surface-container-low border border-border-default text-on-surface-muted hover:border-primary/40 hover:text-primary"
      }`}
    >
      {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
      {isPublic ? `${label} : Public` : `${label} : Private`}
    </button>
  );
}
