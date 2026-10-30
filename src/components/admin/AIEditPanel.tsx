import { useState, useRef, useEffect } from "react";
import { Loader2, Sparkles, AlertCircle, Wand2, ChevronDown, Check, Lightbulb } from "lucide-react";
import { buildSystemPrompt } from "@/lib/admin-prompts";
import Tooltip from "@/components/ui/Tooltip";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

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
    <div className="border border-border-default bg-surface-container rounded-xl overflow-hidden mb-xl">
      {/* Header toggle */}
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

      {panelOpen && (
        <div className="px-md pb-md space-y-sm">
          <p className="font-dm-sans text-[11px] text-on-surface-muted leading-relaxed">
            Tell the AI what to change in the current content. It returns the full modified content with only your requested changes applied.
          </p>

          {/* Custom model dropdown */}
          <div className="flex items-center gap-sm">
            <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-wider shrink-0">Model</span>
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                disabled={aiUnavailable}
                className="inline-flex items-center gap-sm px-md py-xs font-sora text-xs border border-border-default bg-surface text-on-surface hover:border-primary transition-colors disabled:opacity-40"
              >
                {selected ? selected.label : modelsReady ? "No models available" : "Loading models..."}
                <ChevronDown className="w-3.5 h-3.5 text-on-surface-muted shrink-0" />
              </button>
              {menuOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-surface border border-border-default shadow-xl min-w-[260px] max-h-[300px] overflow-y-auto">
                  {models.map((m) => {
                    const isActive = m.id === selectedModel && m.provider === selectedProvider;
                    return (
                      <button
                        key={`${m.provider}-${m.id}`}
                        type="button"
                        onClick={() => { setSelectedModel(m.id); setSelectedProvider(m.provider); setMenuOpen(false); }}
                        className={`w-full text-left px-md py-sm font-dm-sans text-sm transition-colors hover:bg-surface-container flex items-center justify-between ${
                          isActive ? "text-primary bg-surface-container font-semibold" : "text-on-surface-variant"
                        }`}
                      >
                        <span className="truncate">{m.label}</span>
                        {isActive && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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