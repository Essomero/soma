import { useState, useRef } from "react";
import { Loader2, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { buildSystemPrompt } from "@/lib/admin-prompts";
import type { ContentType } from "@/lib/admin-prompts";

interface AIDraftPanelProps {
  onDraft: (draft: AIDraft) => void;
  disabled?: boolean;
}

export interface AIDraft {
  type: ContentType;
  reasoning: string;
  title: string;
  excerpt: string;
  category: string;
  author: { name: string; handle?: string };
  date: string;
  image?: string;
  imageAlt?: string;
  tags?: string[];
  topics?: string[];
  intro: string;
  body?: string[];
  sections?: { heading: string; paragraphs: string[] }[];
  pullQuotes?: { quote: string; attribution?: string }[];
  bentoHighlights?: { label: string; title: string; description: string }[];
  references?: { title: string; url: string; description?: string }[];
  tipCards?: { icon: string; bgClass: string; iconColorClass: string; title: string; description: string }[];
  tagline?: string;
  lessons?: { title: string; storySlug: string; description?: string }[];
  chapters?: { title: string; storySlug: string; description?: string }[];
  episodes?: { title: string; storySlug: string; description?: string }[];
  // doc
  docSections?: { number: string; heading: string; anchor: string; items: { question: string; answer: string[] }[] }[];
  // test
  format?: "written" | "oral" | "hybrid";
  estimatedMinutes?: number;
  passingScore?: number;
  sources?: { type: string; storySlug?: string; guideSlug?: string; docSlug?: string; title?: string; url?: string }[];
  questions?: { id: string; type: string; question: string; options?: { id: string; label: string }[]; correctOptionIds?: string[]; explanation?: string }[];
  // podcast
  episode?: string;
  duration?: string;
  summary?: string;
  segments?: { time: string; title: string; description: string }[];
  guests?: { name: string; role: string; description: string }[];
  relatedReading?: { tag: string; title: string }[];
  [key: string]: unknown;
}

export default function AIDraftPanel({ onDraft, disabled }: AIDraftPanelProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [partial, setPartial] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    if (!input.trim() || disabled) return;
    setStatus("generating");
    setError("");
    setPartial("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(),
          userMessage: `Create content based on this idea:\n\n${input.trim()}\n\nRespond with the JSON object only.`,
          model: "straitly/deepseek/deepseek-v4-1-flash",
          stream: true,
          max_tokens: 8000,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`AI service error (${res.status}): ${errBody}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

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
            const content = parsed.choices?.[0]?.delta?.content || "";
            accumulated += content;
            setPartial(accumulated);
          } catch {
            // incomplete JSON line, skip
          }
        }
      }

      // Parse the accumulated JSON
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

      {status === "generating" && (
        <div className="flex items-start gap-md p-lg bg-surface-container border border-border-default">
          <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-sora text-sm text-on-surface mb-sm">Generating draft...</p>
            {partial && (
              <pre className="font-dm-sans text-xs text-on-surface-muted whitespace-pre-wrap line-clamp-6 overflow-hidden">
                {partial}
              </pre>
            )}
          </div>
          <button
            onClick={() => {
              abortRef.current?.abort();
              setStatus("idle");
            }}
            className="font-sora text-xs text-on-surface-muted hover:text-on-surface underline"
          >
            Cancel
          </button>
        </div>
      )}

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

      {status === "idle" && (
        <button
          onClick={generate}
          disabled={!input.trim() || disabled}
          className="inline-flex items-center gap-sm px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" />
          Generate Draft
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
