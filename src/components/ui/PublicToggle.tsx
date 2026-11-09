import { useState, useEffect, useCallback } from "react";
import { Globe, Lock } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import { invalidateContentCache } from "@/lib/content";

// ── API helpers ────────────────────────────────────────
type ApiSlug = string | { slug: string; type?: string };

async function apiGet(slug: string, type?: string): Promise<boolean> {
  try {
    const q = type
      ? `slug=${encodeURIComponent(slug)}&type=${encodeURIComponent(type)}`
      : `slug=${encodeURIComponent(slug)}`;
    const r = await fetch(`/api/public?${q}`);
    const data = await r.json();
    return !!data.public;
  } catch {
    return false;
  }
}

async function apiSet(slugs: ApiSlug[], isPublic: boolean): Promise<void> {
  // Accept strings for backwards compat, but new code passes {slug,type}
  await fetch("/api/public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slugs, public: isPublic }),
  }).catch(() => {});
  invalidateContentCache();
}

// ── localStorage keys (optimistic UI : API is source of truth) ──
function storyKey(slug: string, type: string = "story") { return `public:${type}:${slug}`; }
function collectionKey(slug: string) { return `public:collection:${slug}`; }

// ── Hook: per-story toggle with parent-collection fallback ─
export function usePublicState(storySlug: string, collectionSlug?: string, contentType: string = "story") {
  const sKey = storyKey(storySlug, contentType);
  const cKey = collectionSlug ? collectionKey(collectionSlug) : null;

  const [isPublic, setIsPublic] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Read: API → story override → collection override → default private
  useEffect(() => {
    let cancelled = false;
    apiGet(storySlug, contentType).then(serverVal => {
      if (cancelled) return;
      if (serverVal) { setIsPublic(true); setLoaded(true); return; }
      // Fall back to localStorage (may be from pre-API cookie era)
      const storyVal = localStorage.getItem(sKey) ?? localStorage.getItem(`public:story:${storySlug}`);
      if (storyVal === "true") {
        // Migrate: localStorage says public but DB doesn't : sync to server
        apiSet([{ slug: storySlug, type: contentType }], true);
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
  }, [sKey, cKey, storySlug, contentType]);

  const toggle = useCallback(() => {
    const next = !isPublic;
    setIsPublic(next);
    localStorage.setItem(sKey, String(next));
    apiSet([{ slug: storySlug, type: contentType }], next);
  }, [isPublic, sKey, storySlug, contentType]);

  return { isPublic, toggle, loaded };
}

// ── Hook: collection-level toggle (for series/course pages) ─
export function useCollectionPublicState(collectionSlug: string, episodeSlugs?: string[], collectionType: string = "series") {
  const cKey = collectionKey(collectionSlug);
  const eps = episodeSlugs ?? [];

  const [isPublic, setIsPublic] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet(collectionSlug, collectionType).then(serverVal => {
      if (cancelled) return;
      if (serverVal) { setIsPublic(true); setLoaded(true); return; }
      const stored = localStorage.getItem(cKey);
      setIsPublic(stored === "true");
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [cKey, collectionSlug, collectionType]);

  const toggle = useCallback(() => {
    const next = !isPublic;
    setIsPublic(next);
    localStorage.setItem(cKey, String(next));
    // Clear per-story overrides so children inherit the new collection state
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith("public:")) localStorage.removeItem(k);
    }
    // Set the collection slug + all episode slugs in the DB (type-aware)
    // Episodes are stories; collection uses collectionType
    const payload: ApiSlug[] = [
      { slug: collectionSlug, type: collectionType },
      ...eps.map((s) => ({ slug: s, type: "story" as const })),
    ];
    apiSet(payload, next);
  }, [isPublic, cKey, collectionSlug, eps, collectionType]);

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
    <Tooltip label={title} align="start">
      <button
        onClick={onToggle}
        className={className}
        aria-label={title}
      >
        {isPublic ? (
          <Globe className="w-5 h-5 text-secondary" />
        ) : (
          <Lock className="w-5 h-5 text-accent-orange" />
        )}
      </button>
    </Tooltip>
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
