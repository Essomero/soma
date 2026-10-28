import { useState, useRef } from "react";
import { Loader2, Sparkles, ArrowRight, AlertCircle, Wand2 } from "lucide-react";
import { buildSystemPrompt } from "@/lib/admin-prompts";

interface AIEditPanelProps {
  /** The current form values serialised as a JSON string for the LLM context. */
  currentJson: string;
  /** Callback with the updated partial AIDraft. Caller merges into form state. */
  onUpdate: (partial: Record<string, unknown>) => void;
}

const MODELS = [
  { id: "deepseek-flash", label: "DeepSeek Flash", provider: "deepseek" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { id: "google/gemini-2.5-flash", label: "Google Gemini Flash", provider: "openrouter" },
];

export default function AIEditPanel({ currentJson, onUpdate }: AIEditPanelProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const abortRef = useRef<AbortController | null>(null);

  const submit = async () => {
    if (!prompt.trim() || status === "sending") return;
    setStatus("sending");
    setError("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const systemPrompt = buildSystemPrompt();
      const userMessage = [
        `You are editing existing content. Below is the current content as JSON.`,
        `Apply this edit request and return the FULL modified content as a JSON object.`,
        `Do NOT change fields the edit request does not mention — keep every field exactly as-is unless the edit requires it.`,
        ``,
        `CURRENT CONTENT:`,
        currentJson,
        ``,
        `EDIT REQUEST:`,
        prompt.trim(),
        ``,
        `Respond with the JSON object only.`,
      ].join("\n");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          userMessage,
          model: model.id,
          provider: model.provider,
          stream: false,
          max_tokens: 8000,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`AI error (${res.status}): ${text}`);
      }

      const body = await res.json();
      const content = body?.choices?.[0]?.message?.content || "";
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("Response did not contain valid JSON");

      const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
      onUpdate(parsed);
      setPrompt("");
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Edit failed");
      setStatus("error");
    }
  };

  return (
    <div className="border border-border-default bg-surface-container rounded-xl overflow-hidden mb-xl">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-md py-sm hover:bg-surface transition-colors"
      >
        <span className="flex items-center gap-2 font-sora text-xs font-semibold text-on-surface uppercase tracking-widest">
          <Wand2 className="w-4 h-4 text-primary" />
          AI Edit
        </span>
        <ArrowRight className={`w-3.5 h-3.5 text-on-surface-muted transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="px-md pb-md space-y-sm">
          <p className="font-dm-sans text-[11px] text-on-surface-muted leading-relaxed">
            Tell the AI what to change in the current content. It returns the full modified content with only your requested changes applied.
          </p>

          {/* Model picker */}
          <div className="flex items-center gap-sm">
            <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-wider">Model</span>
            <div className="flex gap-xs">
              {MODELS.map((m) => (
                <button
                  key={`${m.provider}-${m.id}`}
                  type="button"
                  onClick={() => setModel(m)}
                  className={`px-md py-xs font-sora text-[11px] uppercase tracking-wider border transition-colors ${
                    model.id === m.id && model.provider === m.provider
                      ? "bg-primary text-on-primary border-primary"
                      : "bg-surface text-on-surface-muted border-border-default hover:border-primary"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder='e.g. "Make this more beginner-friendly" or "Add three more sections about deployment"'
            className="w-full p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary resize-y"
          />

          {/* Actions */}
          <div className="flex items-center justify-between gap-sm">
            <div className="flex-1" />
            <button
              type="button"
              onClick={submit}
              disabled={!prompt.trim() || status === "sending"}
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
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}