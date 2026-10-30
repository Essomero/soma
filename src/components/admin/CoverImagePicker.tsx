import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, X, ImageIcon, AlertCircle, Check } from "lucide-react";
import { FALLBACK_COVER } from "@/lib/utils";
import { useScrollLock } from "@/lib/useScrollLock";

interface UnsplashPhoto {
  id: string;
  description: string;
  user: { name: string };
  urls: { small: string; regular: string; raw: string };
}

interface CoverImagePickerProps {
  /** Current image URL */
  image: string;
  /** Current image alt text */
  imageAlt: string;
  /** Called when a new cover is chosen */
  onChange: (image: string, imageAlt: string) => void;
}

/** Construct a standard Unsplash cover URL from the photo ID. */
function coverUrl(photoId: string, width = 1200, height = 675): string {
  return `https://images.unsplash.com/photo-${photoId}?w=${width}&h=${height}&fit=crop`;
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export default function CoverImagePicker({ image, imageAlt, onChange }: CoverImagePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnsplashPhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [searchConfigured, setSearchConfigured] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useScrollLock(open);

  // Focus search input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  // Probe whether Unsplash search is configured on the server
  useEffect(() => {
    if (!open) return;
    fetch("/api/unsplash-config")
      .then((r) => r.json())
      .then((data) => setSearchConfigured(!!data.configured))
      .catch(() => setSearchConfigured(false));
  }, [open]);

  // Close on backdrop click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    // Delay to avoid capturing the opening click
    setTimeout(() => window.addEventListener("mousedown", handleClick), 0);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError("");
    setSearched(true);
    setSelectedId("");

    try {
      const res = await fetch(`/api/unsplash-search?q=${encodeURIComponent(q.trim())}&per_page=24`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Search failed");
      }
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useMemo(
    () => debounce((q: string) => doSearch(q), 400),
    [doSearch]
  );

  const handleSearchInput = (value: string) => {
    setQuery(value);
    if (value.trim().length >= 2) {
      debouncedSearch(value);
    }
  };

  const handleSelect = (photo: UnsplashPhoto) => {
    const url = coverUrl(photo.id);
    const alt = photo.description
      ? photo.description.charAt(0).toUpperCase() + photo.description.slice(1).toLowerCase()
      : "Cover image";
    setSelectedId(photo.id);
    onChange(url, alt);
    setOpen(false);
  };

  return (
    <div className="space-y-sm">
      <label className="font-sora text-sm text-on-surface block">
        Cover Image
      </label>

      {/* Current image preview */}
      <div className="relative w-full aspect-[16/9] max-h-[200px] rounded overflow-hidden bg-surface-container border border-border-default">
        <img
          src={image || FALLBACK_COVER}
          alt={imageAlt || "Cover preview"}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = FALLBACK_COVER;
          }}
        />
      </div>

      {/* URL input + Search button */}
      <div className="flex gap-sm">
        <input
          value={image}
          onChange={(e) => onChange(e.target.value, imageAlt)}
          placeholder="https://images.unsplash.com/photo-..."
          className="flex-1 p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary font-mono text-xs"
        />
        <button
          type="button"
          onClick={() => searchConfigured && setOpen(true)}
          disabled={!searchConfigured}
          title={searchConfigured ? "Search Unsplash for cover images" : "Set UNSPLASH_ACCESS_KEY in your environment to enable image search"}
          className="inline-flex items-center gap-sm px-lg py-md bg-surface border border-border-default text-on-surface font-sora text-xs uppercase tracking-widest hover:bg-surface-container hover:border-outline transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      {/* Image alt text */}
      <input
        value={imageAlt}
        onChange={(e) => onChange(image, e.target.value)}
        placeholder="Alt text — short description of the image"
        className="w-full p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary"
      />

      {/* Search Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            ref={modalRef}
            className="w-full max-w-3xl max-h-[85vh] bg-surface border border-border-default shadow-2xl flex flex-col mx-md"
          >
            {/* Header */}
            <div className="flex items-center gap-md p-lg border-b border-border-default">
              <Search className="w-5 h-5 text-on-surface-muted shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doSearch(query);
                }}
                placeholder="Search Unsplash for cover images..."
                className="flex-1 bg-transparent text-on-surface font-dm-sans text-body-base placeholder:text-on-surface-muted focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-sm text-on-surface-muted hover:text-on-surface transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-lg">
              {/* Search not configured — button is disabled so this is defensive */}
              {!searchConfigured && (
                <div className="flex flex-col items-center justify-center py-xl text-center">
                  <AlertCircle className="w-8 h-8 text-on-surface-muted mb-md" />
                  <p className="font-dm-sans text-sm text-on-surface-muted">Image search is not available</p>
                  <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">
                    Paste a cover URL directly in the field above.
                  </p>
                </div>
              )}

              {/* Loading — skeleton grid matching the results layout */}
              {searchConfigured && loading && (
                <div className="space-y-md">
                  <div className="w-48 h-4 bg-surface-container rounded animate-pulse" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-md">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="aspect-[16/9] rounded bg-surface-container animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="flex flex-col items-center justify-center py-xl text-center">
                  <AlertCircle className="w-8 h-8 text-error mb-md" />
                  <p className="font-dm-sans text-sm text-on-surface-muted">{error}</p>
                    <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">
                    Set UNSPLASH_ACCESS_KEY (or UNSPLASH_APP_ID) in your environment to enable cover search.
                  </p>
                </div>
              )}

              {/* Empty (searched, no results) */}
              {!loading && !error && searched && results.length === 0 && (
                <div className="flex flex-col items-center justify-center py-xl text-center">
                  <ImageIcon className="w-8 h-8 text-on-surface-muted mb-md" />
                  <p className="font-dm-sans text-sm text-on-surface-muted">No results for &ldquo;{query}&rdquo;</p>
                  <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">Try a different search term</p>
                </div>
              )}

              {/* Start state */}
              {!loading && !error && !searched && (
                <div className="flex flex-col items-center justify-center py-xl text-center">
                  <ImageIcon className="w-8 h-8 text-on-surface-muted mb-md" />
                  <p className="font-dm-sans text-sm text-on-surface-muted">Search for a cover image</p>
                  <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">
                    Type a keyword above to search Unsplash
                  </p>
                </div>
              )}

              {/* Results grid */}
              {!loading && !error && results.length > 0 && (
                <>
                  <p className="font-dm-sans text-xs text-on-surface-muted mb-md">
                    {total.toLocaleString()} results &middot; Click an image to select it
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-md">
                    {results.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => handleSelect(photo)}
                        className={`relative aspect-[16/9] rounded overflow-hidden border-2 bg-surface-container group cursor-pointer transition-all hover:ring-2 hover:ring-primary ${
                          selectedId === photo.id
                            ? "border-primary ring-2 ring-primary"
                            : "border-border-default hover:border-outline"
                        }`}
                      >
                        <img
                          src={photo.urls.small}
                          alt={photo.description || "Unsplash photo"}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="font-dm-sans text-[10px] text-white truncate">
                            {photo.user.name}
                          </p>
                        </div>
                        {selectedId === photo.id && (
                          <div className="absolute top-sm right-sm bg-primary rounded-full p-xs">
                            <Check className="w-3 h-3 text-on-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-lg py-sm border-t border-border-default">
              <p className="font-dm-sans text-xs text-on-surface-muted">
                Photos from <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-on-surface">Unsplash</a>
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-sora text-xs text-on-surface-muted hover:text-on-surface uppercase tracking-widest"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}