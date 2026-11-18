import { useState, useRef, useEffect } from "react";
import {
  Loader2, Sparkles, ArrowRight, AlertCircle,
  ChevronDown, Lightbulb, FileText, Link,
} from "lucide-react";
import { buildSystemPrompt, buildFormatPrompt, buildMetaPrompt } from "@/lib/admin-prompts";
import { FALLBACK_COVER } from "@/lib/utils";

import { ModelPicker } from "@/components/ui/ModelPicker";
import { resolveDefaultModel } from "@/lib/modelPref";
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
  defaultType?: string;
}

export interface AIDraft {
  type: ContentType;
  reasoning: string;
  title: string;
  excerpt: string;
  category: string;
  author: { name: string; handle?: string };
  publishedAt?: string;
  updatedAt?: string;
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

type Mode = "ai-generate" | "format-paste";

export default function AIDraftPanel({ onDraft, disabled, initialInput, defaultType }: AIDraftPanelProps) {
  const [mode, setMode] = useState<Mode>("ai-generate");
  const [input, setInput] = useState(initialInput ?? "");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "formatting" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [preview, setPreview] = useState<{ type?: string; title?: string } | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsReady, setModelsReady] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  // Sync input when initialInput changes
  useEffect(() => {
    if (initialInput !== undefined) setInput(initialInput);
  }, [initialInput]);

  // Fetch available models and configured default on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/models").then(r => r.json()),
      fetch("/api/config").then(r => r.json()).catch(() => ({ defaultModel: null })),
    ])
      .then(([modelData, configData]) => {
        const list: ModelInfo[] = modelData.models ?? [];
        setModels(list);
        setModelsReady(true);
        if (list.length > 0) {
          // Priority: configured default → saved pref → first available
          const configuredDefault = configData?.defaultModel;
          const pref = configuredDefault && list.some((m) => m.id === configuredDefault)
            ? configuredDefault
            : resolveDefaultModel(list, "deepseek-flash");
          const m = pref ? list.find((x) => x.id === pref) : list[0];
          if (m) {
            setSelectedModel(m.id);
            setSelectedProvider(m.provider);
          }
        }
      })
      .catch(() => {
        setModels([]);
        setModelsReady(true);
      });
  }, []);

  const selected = models.find((m) => m.id === selectedModel && m.provider === selectedProvider);
  const aiUnavailable = !modelsReady || models.length === 0;

  // ── AI Generate ───────────────────────────────────────────────────────

  const generateWithAI = async () => {
    if (!input.trim() || disabled || aiUnavailable) return;
    setStatus("generating");
    setError("");
    setReasoning("");
    setPreview(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const typeHint = defaultType ? ` (content type: ${defaultType})` : "";
      const VALID_TYPES: Record<string, true> = { story: true, guide: true, doc: true, course: true, book: true, series: true, test: true, featured: true, podcast: true };
      const typeFilter = defaultType && VALID_TYPES[defaultType] ? [defaultType as ContentType] : undefined;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(typeFilter),
          userMessage: `Create${typeHint} content based on this idea:\n\n${input.trim()}\n\nRespond with the JSON object only.`,
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
            if (!previewed) {
              const js = accumulated.indexOf("{");
              const je = accumulated.lastIndexOf("}");
              if (js >= 0 && je > js) {
                try {
                  const partial = JSON.parse(accumulated.slice(js, je + 1));
                  if (partial.type || partial.title) {
                    setPreview({ type: partial.type, title: partial.title });
                    previewed = true;
                  }
                } catch {
                  // incomplete JSON
                }
              }
            }
          } catch {
            // incomplete SSE frame
          }
        }
      }

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

  // ── Format Paste (two-phase: deterministic body + LLM metadata) ────

  const formatPaste = async () => {
    const content = input.trim();
    const srcUrl = url.trim();
    if (!content && !srcUrl) return;
    setStatus("formatting");
    setError("");
    setReasoning("");
    setPreview(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const contentType = (defaultType || "story") as ContentType;

      // If we have a URL but no content, fetch the URL content first
      let formatContent = content;
      let formatUrl = srcUrl;
      if (srcUrl && !content) {
        const importRes = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: srcUrl }),
        });
        const importData = await importRes.json();
        if (importRes.ok && importData.text) {
          formatContent = importData.text;
          formatUrl = importData.url || srcUrl;
        }
      }

      if (!formatContent.trim()) {
        throw new Error("No content to format.");
      }

      // ── Phase 1: Deterministic body conversion ──────────────────────
      setReasoning("Parsing content...");
      const bodyRes = await fetch("/api/format-paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: formatContent,
          url: formatUrl || undefined,
          type: defaultType || "story",
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const bodyData = await bodyRes.json();
      if (!bodyRes.ok) throw new Error(bodyData.error || "Body conversion failed");

      // ── Phase 2: LLM metadata extraction (preview only) ────────────
      setReasoning("Extracting metadata...");
      const preview = formatContent.trim().slice(0, 3000);
      const metaRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: buildMetaPrompt(),
          userMessage: `Extract metadata from this content preview:\n\n---\n${preview}\n---\n\n${formatUrl ? `\nSource URL: ${formatUrl}` : ""}`,
          model: selectedModel,
          provider: selectedProvider,
          stream: false,
          max_tokens: 2000,
        }),
        signal: controller.signal,
      });

      let meta = { title: "", excerpt: "", tags: ["Imported"] as string[], sources: [] as { name: string; url: string }[], image: "", imageAlt: "" };
      if (metaRes.ok) {
        const metaBody = await metaRes.json();
        const metaText = typeof metaBody === "string" ? metaBody : metaBody?.choices?.[0]?.message?.content || metaBody?.content || "";
        const jsonStart = metaText.indexOf("{");
        const jsonEnd = metaText.lastIndexOf("}");
        if (jsonStart >= 0 && jsonEnd > jsonStart) {
          try { meta = JSON.parse(metaText.slice(jsonStart, jsonEnd + 1)); } catch {}
        }
      }

      // ── Phase 3: Merge ──────────────────────────────────────────────
      const draft: AIDraft = {
        type: contentType,
        reasoning: "Formatted from source content",
        title: meta.title || bodyData.title || "Untitled",
        excerpt: meta.excerpt || bodyData.excerpt || "",
        category: "Imported",
        author: { name: "Imported" },
        // Prefer deterministic library's cover image (always correctly extracted).
        // LLM metadata may hallucinate URLs — only use when library found nothing.
        image: /^https?:\/\//i.test(bodyData.image || "") ? bodyData.image! : (meta.image && /^https?:\/\//i.test(meta.image) ? meta.image! : FALLBACK_COVER),
        imageAlt: bodyData.imageAlt || meta.imageAlt || "Content cover image",
        tags: meta.tags?.length ? meta.tags : ["Imported"],
        topics: [],
        intro: "",
        sources: meta.sources?.length
          ? meta.sources.map((s: { name?: string; url?: string }) => ({ type: "web", title: s.name || "", url: s.url || "" }))
          : formatUrl ? [{ type: "web", title: "Imported", url: formatUrl }] : [],
      };

      if (bodyData.body) {
        draft.body = bodyData.body;
      } else if (bodyData.sections) {
        draft.sections = bodyData.sections;
      }

      // Post-process: group numbered list items with their sub-paragraphs
      if (draft.body?.length) {
        const grouped: string[] = [];
        let current: string[] = [];
        for (const entry of draft.body) {
          if (/^\d+\.\s/.test(entry)) {
            if (current.length > 0) grouped.push(current.join("\n\n"));
            current = [entry];
          } else if (current.length > 0) {
            current.push(entry);
          } else {
            grouped.push(entry);
          }
        }
        if (current.length > 0) grouped.push(current.join("\n\n"));
        draft.body = grouped;
      }

      setStatus("done");
      onDraft(draft);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setError(err instanceof Error ? err.message : "Format failed");
      setStatus("error");
    }
  };

  // ── Common ────────────────────────────────────────────────────────────

  const isBusy = status === "generating" || status === "formatting";

  const handleAction = () => {
    if (isBusy || disabled) return;
    if (mode === "ai-generate") generateWithAI();
    else formatPaste();
  };

  const hasInput = mode === "ai-generate"
    ? !!input.trim()
    : !!input.trim() || !!url.trim();

  const generateDisabled = !hasInput || isBusy || disabled || (mode === "ai-generate" && aiUnavailable);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-md">
      {/* Mode toggle */}
      <div className="flex border border-border-default rounded-md overflow-hidden">
        <button
          onClick={() => { setMode("ai-generate"); setError(""); setPreview(null); }}
          className={`flex-1 flex items-center justify-center gap-sm px-lg py-md text-label-caps uppercase tracking-widest transition-colors ${
            mode === "ai-generate"
              ? "bg-primary text-on-primary"
              : "bg-surface text-on-surface-muted hover:text-on-surface"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Generate
        </button>
        <button
          onClick={() => { setMode("format-paste"); setError(""); setPreview(null); }}
          className={`flex-1 flex items-center justify-center gap-sm px-lg py-md text-label-caps uppercase tracking-widest transition-colors ${
            mode === "format-paste"
              ? "bg-primary text-on-primary"
              : "bg-surface text-on-surface-muted hover:text-on-surface"
          }`}
        >
          <FileText className="w-4 h-4" />
          Format Paste
        </button>
      </div>

      {/* Input area */}
      {mode === "ai-generate" ? (
        <div>
          <label className="font-sora text-label-caps text-on-surface block mb-sm">
            What do you want to create?
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your idea in plain language... e.g. 'A guide to deploying TypeScript projects on Cloudflare Workers with D1 and R2'"
            className="w-full min-h-[120px] p-lg bg-surface border border-border-default text-on-surface font-dm-sans text-body-base placeholder:text-on-surface-muted focus:outline-none focus:border-primary resize-y"
            disabled={isBusy || disabled}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAction();
              }
            }}
          />
          <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">
            Press {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to generate
          </p>
        </div>
      ) : (
        <div className="space-y-md">
          <div>
            <label className="font-sora text-label-caps text-on-surface block mb-sm">
              Paste markdown content
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste markdown content here... headings, code blocks, images, blockquotes all preserved."
              className="w-full min-h-[200px] p-lg bg-surface border border-border-default text-on-surface font-dm-sans text-body-base placeholder:text-on-surface-muted focus:outline-none focus:border-primary resize-y font-mono text-sm"
              disabled={isBusy || disabled}
            />
          </div>
          <div className="flex items-center gap-md">
            <div className="flex-1 h-px bg-border-default" />
            <span className="font-dm-sans text-xs text-on-surface-muted">or</span>
            <div className="flex-1 h-px bg-border-default" />
          </div>
          <div>
            <label className="font-sora text-label-caps text-on-surface block mb-sm">
              Or fetch from a URL
            </label>
            <div className="flex gap-md">
              <div className="flex-1 relative">
                <Link className="absolute left-md top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-muted" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/blog/post"
                  className="w-full pl-xl pr-md py-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary"
                  disabled={isBusy || disabled}
                />
              </div>
            </div>
            <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">
              Enter a URL to fetch and format. If you paste markdown above, the URL becomes the source attribution.
            </p>
          </div>
        </div>
      )}

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-md">
        {mode === "ai-generate" && (
          <ModelPicker
            models={models}
            selectedModel={selectedModel}
            selectedProvider={selectedProvider}
            onChange={(id, provider) => {
              setSelectedModel(id);
              setSelectedProvider(provider);
            }}
            disabled={isBusy || disabled}
            unavailable={aiUnavailable}
          />
        )}

        <button
          onClick={handleAction}
          disabled={generateDisabled}
          className="inline-flex items-center gap-sm px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === "ai-generate" ? (
            <Sparkles className="w-4 h-4" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          {isBusy
            ? (mode === "ai-generate" ? "Generating..." : "Formatting...")
            : (mode === "ai-generate" ? "Generate Content" : "Format")}
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

      {/* Formatting progress */}
      {status === "formatting" && (
        <div className="flex items-center gap-md p-lg bg-surface-container border border-border-default">
          <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
          <div>
            <p className="font-sora text-sm text-on-surface">Formatting content...</p>
            <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">
              Converting markdown to Soma manuscript format. Content preserved as-is.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="flex items-start gap-md p-lg bg-surface-container border border-border-default border-l-4 border-l-error">
          <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-sora text-sm text-error font-medium">
              {mode === "ai-generate" ? "Generation failed" : "Format failed"}
            </p>
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