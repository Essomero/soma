import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  FileText,
  Info,
  AlertCircle,
  X,
} from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";

interface ImportResult {
  url: string;
  title: string;
  description: string;
  wordCount: number;
  suggestedType: string;
  suggestedTypeHint: string;
  text: string;
  contentType?: string;
  note?: string;
  error?: string;
}

const TYPE_LABELS: Record<string, string> = {
  story: "Story",
  guide: "Guide",
  doc: "Doc",
  course: "Course",
  book: "Book",
  series: "Series",
  test: "Test",
  featured: "Featured",
  podcast: "Podcast",
  topic: "Topic",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ImportFromUrlModal({ open, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useScrollLock(open);

  const handleFetch = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter a URL first.");
      return;
    }

    try {
      new URL(trimmed);
    } catch {
      setError("Invalid URL. Include the protocol (https://...).");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const r = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error || `HTTP ${r.status}`);
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) handleFetch();
  };

  const copyText = async () => {
    if (!result?.text) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed, nothing more to try
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-xxl pb-xl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-3xl mx-gutter max-h-[calc(100vh-3rem)] flex flex-col bg-surface border border-border-default shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-xl py-lg border-b border-border-default shrink-0">
          <div className="flex items-center gap-md">
            <Globe className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-sora text-sm text-on-surface uppercase tracking-widest">
                Import from URL
              </h2>
              <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">
                Paste a URL to fetch and extract content for drafting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-sm text-on-surface-muted hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-xl py-lg space-y-lg">
          {/* URL Input */}
          <div className="flex gap-md">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://example.com/blog/post"
              className="flex-1 px-md py-md bg-background border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary"
              disabled={loading}
              autoFocus
            />
            <button
              onClick={handleFetch}
              disabled={loading || !url.trim()}
              className="inline-flex items-center gap-sm px-xl py-md bg-primary text-on-primary font-sora text-xs uppercase tracking-widest hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Fetch
                </>
              )}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-md bg-surface-container border border-border-default border-l-4 border-l-error">
              <div className="flex items-start gap-sm">
                <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                <p className="font-dm-sans text-sm text-error">{error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <>
              {/* Metadata grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                <div className="p-md bg-background border border-border-default">
                  <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest mb-xs">
                    Suggested Type
                  </p>
                  <p className="font-sora text-sm text-primary font-bold">
                    {TYPE_LABELS[result.suggestedType] || result.suggestedType}
                  </p>
                  <p className="font-dm-sans text-xs text-on-surface-muted mt-xs line-clamp-2">
                    {result.suggestedTypeHint}
                  </p>
                </div>
                <div className="p-md bg-background border border-border-default">
                  <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest mb-xs">
                    Words
                  </p>
                  <p className="font-sora text-sm text-on-surface font-bold">
                    {result.wordCount.toLocaleString()}
                  </p>
                </div>
                <div className="p-md bg-background border border-border-default">
                  <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest mb-xs">
                    Source
                  </p>
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-dm-sans text-sm text-primary hover:underline inline-flex items-center gap-sm"
                  >
                    Open
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="p-md bg-background border border-border-default">
                  <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest mb-xs">
                    Content-Type
                  </p>
                  <p className="font-dm-sans text-sm text-on-surface truncate">
                    {result.contentType || "—"}
                  </p>
                </div>
              </div>

              {/* Note (PDF/video) */}
              {result.note && (
                <div className="p-md bg-surface-container border border-border-default border-l-4 border-l-warning">
                  <div className="flex items-start gap-sm">
                    <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <p className="font-dm-sans text-sm text-on-surface">{result.note}</p>
                  </div>
                </div>
              )}

              {/* Title & Description */}
              {result.title && (
                <div>
                  <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest mb-sm">
                    Title
                  </p>
                  <p className="font-sora text-base text-on-surface font-bold">{result.title}</p>
                </div>
              )}
              {result.description && (
                <div>
                  <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest mb-sm">
                    Description
                  </p>
                  <p className="font-dm-sans text-sm text-on-surface">{result.description}</p>
                </div>
              )}

              {/* Extracted text */}
              <div>
                <div className="flex items-center justify-between mb-sm">
                  <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">
                    Extracted Text
                  </p>
                  <button
                    onClick={copyText}
                    className="inline-flex items-center gap-xs px-md py-sm text-xs text-on-surface-muted hover:text-primary font-dm-sans transition-colors border border-border-default hover:border-primary"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy Text
                      </>
                    )}
                  </button>
                </div>
                <pre className="max-h-64 overflow-y-auto p-md bg-background border border-border-default font-dm-sans text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
                  {result.text.length > 3000
                    ? result.text.slice(0, 3000) + "\n\n... [truncated to first 3,000 chars in preview. Copy the full text to use as source.]"
                    : result.text}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-md px-xl py-lg border-t border-border-default shrink-0">
          {result ? (
            <>
              <Link
                to={`/admin/new?type=${result.suggestedType}`}
                onClick={() => {
                  sessionStorage.setItem("import-draft", JSON.stringify({
                    title: result.title,
                    description: result.description,
                    text: result.text,
                    url: result.url,
                  }));
                  onClose();
                }}
                className="inline-flex items-center gap-sm px-xl py-md bg-primary text-on-primary font-sora text-xs uppercase tracking-widest hover:bg-primary-hover transition-colors"
              >
                <FileText className="w-4 h-4" />
                Create {TYPE_LABELS[result.suggestedType] || result.suggestedType}
              </Link>
              <p className="font-dm-sans text-xs text-on-surface-muted">
                Opens the content editor with the extracted title, description, and text pre-filled.
              </p>
            </>
          ) : (
            <p className="font-dm-sans text-xs text-on-surface-muted">
              Fetch a URL to get started. The extracted text becomes your source material.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
