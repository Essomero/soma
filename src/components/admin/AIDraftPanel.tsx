import { useState, useRef, useEffect } from "react";
import { Loader2, Sparkles, ArrowRight, AlertCircle, ChevronDown, Lightbulb } from "lucide-react";
import { buildSystemPrompt } from "@/lib/admin-prompts";
import { FALLBACK_COVER } from "@/lib/utils";
import type { ContentType } from "@/lib/admin-prompts";

interface ModelInfo {
  id: string;
  label: string;
  provider: string;
}

interface AIDraftPanelProps {
  onDraft: (draft: AIDraft) => void;
  disabled?: boolean;
  initialInput?: string;
}

export interface AIDraft {
  type: ContentType;
  reasoning: string;
  title: string;
  excerpt: string;
  category: string;
  author: { name: string; handle?: string };
  publishedAt?: string;
  image?: string;
  imageAlt?: string;
  tags?: string[];
  topics?: string[];
  intro: string;
  body?: string[];
  sections?: { heading: string; paragraphs: (string | object)[] }[];
  pullQuotes?: { quote: string; attribution?: string }[];
  bentoHighlights?: { label: string; title: string; description: string }[];
  references?: { title: string; url: string; description?: string }[];
  tipCards?: { icon: string; bgClass: string; iconColorClass: string; title: string; description: string }[];
  tagline?: string;
  lessons?: { title: string; storySlug: string; description?: string }[];
  chapters?: { title: string; storySlug: string; description?: string }[];
  episodes?: { title: string; storySlug: string; description?: string }[];
  docSections?: { number: string; heading: string; anchor: string; items: { question: string; answer: (string | object)[] }[] }[];
  format?: "written" | "oral" | "hybrid";
  estimatedMinutes?: number;
  passingScore?: number;
  sources?: { type: string; storySlug?: string; guideSlug?: string; docSlug?: string; title?: string; url?: string }[];
  questions?: { id: string; type: string; question: string; options?: { id: string; label: string }[]; correctOptionIds?: string[]; explanation?: string }[];
  episode?: string;
  duration?: string;
  summary?: string;
  segments?: { time: string; title: string; description: string }[];
  guests?: { name: string; role: string; description: string }[];
  relatedReading?: { tag: string; title: string }[];
  [key: string]: unknown;
}

export default function AIDraftPanel({ onDraft, disabled, initialInput }: AIDraftPanelProps) {
  const [input, setInput] = useState(initialInput ?? "");
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [preview, setPreview] = useState<{ type?: string; title?: string } | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsReady, setModelsReady] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync input when initialInput changes (e.g. navigating from a different note)
  useEffect(() => {
    if (initialInput !== undefined) setInput(initialInput);
  }, [initialInput]);

  // Fetch available models on mount
  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        const list: ModelInfo[] = data.models ?? [];
        setModels(list);
        setModelsReady(true);
        if (list.length > 0) {
          setSelectedModel(list[0].id);
          setSelectedProvider(list[0].provider);
        }
      })
      .catch(() => {
        setModels([]);
        setModelsReady(true);
      });
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const selected = models.find((m) => m.id === selectedModel && m.provider === selectedProvider);
  const aiUnavailable = !modelsReady || models.length === 0;

  const generate = async () => {
    if (!input.trim() || disabled || aiUnavailable) return;
    setStatus("generating");
    setError("");
    setReasoning("");
    setPreview(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(),
          userMessage: `Create content based on this idea:\n\n${input.trim()}\n\nRespond with the JSON object only.`,
          model: selectedModel,
          provider: selectedProvider,
          stream: true,
          max_tokens: 8000,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        const hint = errText.includes("not configured")
          ? `${selectedProvider} key not configured — pick another model from the dropdown.`
          : `AI service error (${res.status}): ${errText}`;
        throw new Error(hint);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let accumulatedReasoning = "";
      let previewed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            const rc = delta?.reasoning_content;
            if (rc) {
              accumulatedReasoning += rc;
              setReasoning(accumulatedReasoning);
            }
            const content = delta?.content || "";
            accumulated += content;
            // Attempt to parse the full structure as fields arrive.
            // Once parsed, show live type/title preview without raw JSON.
            if (!previewed) {
              const js = accumulated.indexOf("{");
              const je = accumulated.lastIndexOf("}");
              if (js >= 0 && je > js) {
                try {
                  const partial = JSON.parse(accumulated.slice(js, je + 1));
                  if (partial.type || partial.title) {
                    setPreview({ type: partial.type, title: partial.title });
                    previewed = true; // one shot: first valid parse captures the preview
                  }
                } catch {
                  // incomplete JSON — keep streaming
                }
              }
            }
          } catch {
            // incomplete SSE frame
          }
        }
      }

      // Parse final accumulated JSON
      const jsonStart = accumulated.indexOf("{");
      const jsonEnd = accumulated.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("AI response did not contain valid JSON");
      }
      const jsonStr = accumulated.slice(jsonStart, jsonEnd + 1);
      const draft = JSON.parse(jsonStr) as AIDraft;
      if (!draft.type || !draft.title) {
        throw new Error("AI response missing required fields (type, title)");
      }
      // Models sometimes put an image *description* instead of a URL (or
      // omit image entirely). Never let that reach the page: swap in the
      // fallback cover so cards render, and keep a real alt description.
      if (!/^https?:\/\//i.test(draft.image || "")) {
        draft.image = FALLBACK_COVER;
      }
      if (!draft.imageAlt || draft.imageAlt.length > 80 || /^https?:\/\//i.test(draft.imageAlt)) {
        draft.imageAlt = "Article cover image";
      }
      setStatus("done");
      onDraft(draft);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError(err instanceof Error ? err.message : "Generation failed");
      setStatus("error");
    }
  };

  return (
    <div className="space-y-md">
      <div>
        <label className="font-sora text-label-caps text-on-surface block mb-sm">
          What do you want to create?
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your idea in plain language... e.g. 'A guide to deploying TypeScript projects on Cloudflare Workers with D1 and R2'"
          className="w-full min-h-[120px] p-lg bg-surface border border-border-default text-on-surface font-dm-sans text-body-base placeholder:text-on-surface-muted focus:outline-none focus:border-primary resize-y"
          disabled={status === "generating" || disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              generate();
            }
          }}
        />
        <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">
          Press {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to generate
        </p>
      </div>

      {/* Model picker + Generate button row */}
      <div className="flex flex-wrap items-center gap-md">
        {/* Model picker dropdown */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            disabled={aiUnavailable || status === "generating" || disabled}
            className="inline-flex items-center gap-sm px-md py-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm hover:border-primary transition-colors disabled:opacity-40"
          >
            {selected ? selected.label : modelsReady ? "No models available" : "Loading models..."}
            <ChevronDown className="w-4 h-4 text-on-surface-muted" />
          </button>
          {menuOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-surface border border-border-default shadow-brutal max-h-60 overflow-y-auto">
              {models.map((m) => (
                <button
                  key={`${m.provider}/${m.id}`}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setSelectedProvider(m.provider);
                    setMenuOpen(false);
                  }}
                  className={`block w-full text-left px-lg py-sm font-dm-sans text-sm transition-colors hover:bg-surface-container ${
                    m.id === selectedModel && m.provider === selectedProvider
                      ? "text-primary bg-surface-container"
                      : "text-on-surface-variant"
                  }`}
                >
                  <span className="font-sora text-xs text-on-surface-muted uppercase mr-sm">{m.provider}</span>
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={!input.trim() || status === "generating" || disabled || aiUnavailable}
          className="inline-flex items-center gap-sm px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === "generating" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {status === "generating" ? "Generating..." : "Generate Content"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Generating progress */}
      {status === "generating" && (
        <div className="p-lg bg-surface-container border border-border-default space-y-md">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-md">
              <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-sora text-sm text-on-surface">Generating content...</p>
                {preview && (
                  <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">
                    {preview.type && <span className="uppercase tracking-widest mr-sm">{preview.type}</span>}
                    {preview.title && <span>{preview.title}</span>}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                abortRef.current?.abort();
                setStatus("idle");
                setReasoning("");
                setPreview(null);
              }}
              className="font-sora text-xs text-on-surface-muted hover:text-on-surface underline"
            >
              Cancel
            </button>
          </div>

          {reasoning && (
            <details className="group">
              <summary className="flex items-center gap-md cursor-pointer list-none p-md bg-surface border border-border-default border-l-4 border-l-primary hover:bg-surface-container transition-colors">
                <Lightbulb className="w-4 h-4 text-primary shrink-0" />
                <span className="font-sora text-xs text-on-surface-muted uppercase tracking-widest flex-1">
                  Thinking
                </span>
                <ChevronDown className="w-4 h-4 text-on-surface-muted transition-transform group-open:rotate-180" />
              </summary>
              <div className="max-h-48 overflow-y-auto p-md border-x border-b border-border-default bg-surface">
                <p className="font-dm-sans text-xs text-on-surface-muted whitespace-pre-wrap leading-relaxed">
                  {reasoning}
                </p>
              </div>
            </details>
          )}
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="flex items-start gap-md p-lg bg-surface-container border border-border-default border-l-4 border-l-error">
          <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-sora text-sm text-error font-medium">Generation failed</p>
            <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">{error}</p>
          </div>
          <button
            onClick={() => setStatus("idle")}
            className="font-sora text-xs text-on-surface-muted hover:text-on-surface underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}