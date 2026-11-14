import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { ModelPicker } from "./ModelPicker";

// ── Types ─────────────────────────────────────────────

interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  free?: boolean;
}

export interface ContentTestButtonProps {
  contentText: string;
  contentTitle: string;
  slug: string;
  contentType: "story" | "guide" | "doc";
  /** Slug of an existing test already linked to this content, if any */
  existingTestSlug?: string;
  models: ModelInfo[];
  selectedModel: string;
  selectedProvider: string;
  aiReady: boolean;
  onModelChange: (model: string, provider: string) => void;
}

// ── Component ─────────────────────────────────────────

export default function ContentTestButton({
  contentText,
  contentTitle,
  slug,
  contentType,
  existingTestSlug,
  models,
  selectedModel,
  selectedProvider,
  aiReady,
  onModelChange,
}: ContentTestButtonProps) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiUnavailable = !aiReady || models.length === 0;

  const generateTest = useCallback(async (forceRegenerate = false) => {
    if (!slug || generating || regenerating) return;
    setError(null);

    // Navigate to existing test unless forcing regeneration
    if (existingTestSlug && !forceRegenerate) {
      navigate(`/tests/${existingTestSlug}`);
      return;
    }

    if (forceRegenerate) {
      setRegenerating(true);
    } else {
      setGenerating(true);
    }

    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          contentSlug: slug,
          contentTitle,
          contentText,
          contentType,
          model: selectedModel,
          provider: selectedProvider,
          force: forceRegenerate,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Generation failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      navigate(`/tests/${data.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate test");
      if (forceRegenerate) setRegenerating(false);
      else setGenerating(false);
    }
  }, [slug, generating, regenerating, existingTestSlug, navigate, contentTitle, contentText, contentType, selectedModel, selectedProvider]);

  const busy = generating || regenerating;

  return (
    <div>
      <div className="flex items-center gap-sm flex-wrap">
        {/* Primary action: generate or take test */}
        <button
          onClick={() => generateTest(false)}
          disabled={busy || aiUnavailable}
          className={`inline-flex items-center gap-sm px-xl py-md rounded-lg font-sora text-sm transition-all
            ${busy ? "bg-primary/10 border border-primary/30 text-primary" : existingTestSlug ? "bg-secondary/10 border border-secondary/40 text-secondary" : "bg-primary/10 border border-primary/30 text-primary"}
            disabled:opacity-40 disabled:cursor-not-allowed`}
          title={
            aiUnavailable
              ? "Add an AI provider key to enable test generation"
              : existingTestSlug
                ? "Take the test linked to this content"
                : "Generate a test from this content"
          }
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : existingTestSlug ? (
            <ExternalLink className="w-4 h-4" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
          <span>
            {generating ? "Generating..." : regenerating ? "Regenerating..." : existingTestSlug ? "Take test" : "Test me"}
          </span>
        </button>

        {/* Model picker */}
        <ModelPicker
          models={models}
          selectedModel={selectedModel}
          selectedProvider={selectedProvider}
          onChange={onModelChange}
          disabled={busy || aiUnavailable}
          unavailable={aiUnavailable}
          className="shrink-0"
        />

        {/* Regenerate (only when a test already exists) */}
        {existingTestSlug && (
          <button
            onClick={() => generateTest(true)}
            disabled={busy || aiUnavailable}
            className="inline-flex items-center gap-sm px-xl py-md rounded-lg font-sora text-sm transition-all bg-primary/15 border border-primary/40 text-primary hover:bg-primary/20 hover:border-primary/60 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Replace the existing test with new questions"
          >
            {regenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{regenerating ? "Generating..." : "New test"}</span>
          </button>
        )}
      </div>

      {error && <p className="font-dm-sans text-xs text-error mt-sm">{error}</p>}
    </div>
  );
}