import { useState, useRef, useEffect } from "react";
import { Loader2, Sparkles, AlertCircle, Wand2, ChevronDown, Lightbulb } from "lucide-react";
import { buildSystemPrompt } from "@/lib/admin-prompts";
import Tooltip from "@/components/ui/Tooltip";
import { ModelPicker } from "@/components/ui/ModelPicker";

interface ModelInfo {
  id: string;
  label: string;
  provider: string;
}

interface AIEditPanelProps {
  /** The current form values serialised as a JSON string for the LLM context. */
  currentJson: string;
  /** Callback with the updated partial AIDraft. Caller merges into form state. */
  onUpdate: (partial: Record<string, unknown>) => void;
}

/**
 * Quick-action preset instructions for common content refinements.
 * Adapted from the rejections app's RefinePanel presets, reworded for
 * soma's writing tone (Grokking Algorithms standard).
 *
 * Clicking a preset fills the prompt so the user can see what's being
 * sent before clicking Apply Edit.
 */
const CONTENT_EDIT_PRESETS: { label: string; instruction: string }[] = [
  {
    label: 'Strip AI tells',
    instruction: `Strip every AI tell from this content. Find and delete these patterns:

HEDGE OPENERS — throat-clearing before the actual point:
- "In today's digital landscape" / "In the modern world of X" / "As technology evolves"
- "It's worth noting that" / "Let's dive in" / "In this article, we will" / "This section covers"
- "It is important to understand" / "It is crucial to" / "We need to consider"

FILLER INTENSIFIERS — words that add heat, not light:
- "very" / "really" / "incredibly" / "extremely" / "highly" (when describing yourself or your work)
- "truly" / "actually" / "literally" / "essentially"
- "quite" / "rather" / "somewhat"

EMPTY BUZZWORDS:
- "cutting-edge" / "next-generation" / "world-class" / "best-in-class"
- "robust" / "seamless" / "mission-critical" / "game-changer" / "paradigm shift"
- "leveraging" / "driving" / "empowering" / "supercharging" (when followed by a buzzword combo)

RULE-OF-THREE STACKS — three items of the same grammatical type used as decoration:
- Three adjectives stacked ("scalable, secure, performant")
- Three bullet points for a single point that could be one sentence
- Three examples where one or two would do

ACADEMIC REGISTER — formal language where plain English works:
- "endeavor" / "utilize" / "commence" / "facilitate" / "leverage" (as verb)
- "demonstrate" / "exhibit" / "ascertain" / "delineate"
- Use "use" not "utilize", "start" not "commence", "show" not "demonstrate"

EM DASHES — used as stylistic pauses. Keep em dashes in compound modifiers ("user-facing API") and numeric ranges. Replace every stylistic pause em dash with a period or comma.

Keep every fact. Do NOT introduce new AI tells while cleaning up the old ones.`,
  },
  {
    label: 'Tighten prose',
    instruction: `Rewrite the content at roughly half its current length. The goal: cut words, keep meaning.

Rules:
- Cut every adverb that doesn't carry information ("very", "really", "quite", "extremely", "essentially")
- Cut appositives that restate what the noun already says
- Merge sentences: if two sentences share a subject, combine them
- Cut weak verbs: replace "X is used to Y" with "X does Y"
- Cut prepositional phrases: "the architecture of the system" -> "the system architecture"
- Cut meta-commentary: "This section explains how" -> remove, just explain
- Cut hedging: "you can think of it as" -> just say what it is
- Cut signposting: "First, let's look at" -> just state the thing

Keep every factual claim. Keep the same voice. If the result reads like notes, you cut too much — merge, don't mince.`,
  },
  {
    label: 'Conversational tone',
    instruction: `Rewrite this content to meet the Grokking Algorithms standard. The goal: simplify the language, never the truth.

TONE:
- Fewer syllables and fewer prerequisites, not fewer facts
- Simpler register, same technical depth
- Contractions always: don't, it's, you're, can't
- No hedge openers: no "it's worth noting," no "let's dive in." Start with the claim
- No em dashes anywhere
- Ban sterile academic placeholders: no foo/bar/baz. Use real situations with real stakes

STRUCTURE:
- Feel the pain first: open with the natural thing anyone would write, then watch it blow up. The reader must feel the friction before hearing the formal solution
- Intuition before vocabulary: make the idea land, then name it. Never open with the term
- Numbers, not scale words: "Row 31,204 of 40,000" beats "some rows"

Keep every fact. If a caveat helps the reader avoid a trap, keep it — simplification is not omission.`,
  },
  {
    label: 'Sharpen the hook',
    instruction: `Rewrite only the opening (the first paragraph or intro). The goal: grab attention immediately.

Apply the "feel the pain first" pattern: show a natural thing a reader would write or do, then let it fail. The reader must feel the friction before hearing the formal solution.

Avoid:
- Abstract generalities: "In today's world of X" / "As developers, we often face Y"
- Definitional openers: "X is a technique for" / "Y refers to"
- Promise without tension: "This post will show you how to"
- Reference to the post itself: "In this article" / "This section covers"

Prefer:
- A concrete scenario the reader recognizes
- A short piece of code or setup that looks correct but breaks
- The wrong question leading to the right one
- The reader's own pain stated plainly

Leave the rest of the content unchanged.`,
  },
];

export default function AIEditPanel({ currentJson, onUpdate }: AIEditPanelProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");
  const [reasoning, setReasoning] = useState("");

  // Model list: fetched from /api/models, like test evaluation and draft panels.
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsReady, setModelsReady] = useState(false);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const abortRef = useRef<AbortController | null>(null);

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

  // Abort any in-flight edit stream on unmount so the loop doesn't
  // keep the JS thread busy after the component is gone (e.g. switching
  // from edit to preview mode).
  useEffect(() => () => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const selected = models.find((m) => m.id === selectedModel && m.provider === selectedProvider);
  const aiUnavailable = !modelsReady || models.length === 0;

  const submit = async () => {
    if (!prompt.trim() || status === "sending" || !selected) return;
    setStatus("sending");
    setError("");
    setReasoning("");

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const systemPrompt = buildSystemPrompt();
      const userMessage = [
        "You are editing existing content. Below is the current content as JSON.",
        "Apply this edit request and return the FULL modified content as a JSON object.",
        "Do NOT change fields the edit request does not mention — keep every field exactly as-is unless the edit requires it.",
        "",
        "CURRENT CONTENT:",
        currentJson,
        "",
        "EDIT REQUEST:",
        prompt.trim(),
        "",
        "Respond with the JSON object only.",
      ].join("\n");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          userMessage,
          model: selected.id,
          provider: selected.provider,
          stream: true,
          max_tokens: 8000,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`AI error (${res.status}): ${text}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      let accumulatedReasoning = "";
      let finalContent = "";

      // Throttle reactive state updates: render at most every ~80ms,
      // otherwise the component re-renders on every SSE line and the
      // whole ContentForm tree (including previewDraft) janks.
      let throttleTimer: ReturnType<typeof setTimeout> | null = null;
      const flushReasoning = () => {
        setReasoning(accumulatedReasoning);
        throttleTimer = null;
      };

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
              if (!throttleTimer) {
                throttleTimer = setTimeout(flushReasoning, 80);
              }
            }
            const c = delta?.content || "";
            accumulated += c;
          } catch {
            // incomplete frame
          }
        }
      }
      // Flush any remaining pending reasoning
      if (throttleTimer) {
        clearTimeout(throttleTimer);
        throttleTimer = null;
      }
      setReasoning(accumulatedReasoning);

      // Parse the final JSON from accumulated content
      finalContent = accumulated;
      finalContent = finalContent.replace(/```json\s*/gi, "").replace(/```\s*$/gm, "").trim();
      const jsonStart = finalContent.indexOf("{");
      const jsonEnd = finalContent.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error(
          `Response did not contain valid JSON.\n\nRaw response:\n${finalContent.slice(0, 2000)}`,
        );
      }

      const parsed = JSON.parse(finalContent.slice(jsonStart, jsonEnd + 1));
      onUpdate(parsed);
      setPrompt("");
      setStatus("idle");
      setReasoning("");
      abortRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Edit failed");
      setStatus("error");
      abortRef.current = null;
    }
  };

  return (
    <div className="border border-border-default bg-surface-container rounded-xl mb-xl">
      {/* Header toggle */}
      <div className="rounded-t-xl overflow-hidden">
      <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : ""}>
        <button
          type="button"
          onClick={() => setPanelOpen(!panelOpen)}
          disabled={aiUnavailable}
          className="w-full flex items-center justify-between px-md py-sm hover:bg-surface transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex items-center gap-2 font-sora text-xs font-semibold text-on-surface uppercase tracking-widest">
            <Wand2 className="w-4 h-4 text-primary" />
            AI Edit
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-on-surface-muted transition-transform ${panelOpen ? "rotate-180" : ""}`} />
        </button>
      </Tooltip>
      </div>

      {panelOpen && (
        <div className="px-md pb-md space-y-sm">
          <p className="font-dm-sans text-[11px] text-on-surface-muted leading-relaxed">
            Tell the AI what to change, or pick a quick action below.
          </p>

          {/* Quick-action presets */}
          <div className="flex flex-wrap gap-xs">
            {CONTENT_EDIT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setPrompt(preset.instruction)}
                className={`px-sm py-xs text-[10px] font-sora uppercase tracking-widest border transition-colors ${
                  prompt === preset.instruction
                    ? "bg-primary/10 text-primary border-primary/40"
                    : "bg-surface text-on-surface-muted border-border-default hover:border-primary/40 hover:text-on-surface"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom model dropdown */}
          <div className="flex items-center gap-sm">
            <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-wider shrink-0">Model</span>
            <ModelPicker
              models={models}
              selectedModel={selectedModel}
              selectedProvider={selectedProvider}
              onChange={(id, provider) => {
                setSelectedModel(id);
                setSelectedProvider(provider);
              }}
              unavailable={aiUnavailable}
              className="px-md py-xs font-sora text-xs"
            />
          </div>

          {/* Input */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            disabled={aiUnavailable}
            placeholder='e.g. "Make this more beginner-friendly" or "Add three more sections about deployment"'
            className="w-full p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary resize-y disabled:opacity-40"
          />

          {/* Actions */}
          <div className="flex items-center justify-between gap-sm">
            <div className="flex-1" />
            <button
              type="button"
              onClick={submit}
              disabled={!prompt.trim() || status === "sending" || !selected || aiUnavailable}
              className="inline-flex items-center gap-1.5 px-md py-sm bg-primary text-on-primary font-sora text-xs font-semibold uppercase tracking-widest hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === "sending" ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Editing…</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Apply Edit</>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-sm bg-error/10 border border-error/30 rounded text-xs font-dm-sans text-on-surface">
              <AlertCircle className="w-3.5 h-3.5 text-error shrink-0 mt-0.5" />
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}

          {reasoning && (
            <details className="group">
              <summary className="flex items-center gap-md cursor-pointer list-none p-md bg-surface border border-border-default border-l-4 border-l-primary hover:bg-surface-container transition-colors">
                <Lightbulb className="w-4 h-4 text-primary shrink-0" />
                <span className="font-sora text-xs font-semibold text-on-surface">Model thinking</span>
                <ChevronDown className="w-3.5 h-3.5 text-on-surface-muted ml-auto transition-transform group-open:rotate-180" />
              </summary>
              <div className="max-h-48 overflow-y-auto p-md bg-surface border-x border-b border-border-default">
                <p className="font-dm-sans text-xs text-on-surface-muted whitespace-pre-wrap leading-relaxed">
                  {reasoning}
                </p>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}