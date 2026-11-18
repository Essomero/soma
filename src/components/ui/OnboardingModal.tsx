import { useState, useEffect } from "react";
import { X, Check, ArrowRight, Save, Loader2, Key, BoxSelect } from "lucide-react";
import { ModelPicker } from "./ModelPicker";

const DISMISS_KEY = "soma.onboarding.dismissed";

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "gemini", label: "Gemini" },
  { id: "groq", label: "Groq" },
  { id: "cerebras", label: "Cerebras" },
  { id: "straitly", label: "Straitly" },
];

interface ModelInfo {
  id: string;
  label: string;
  provider: string;
}

export default function OnboardingModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedModelProvider, setSelectedModelProvider] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    Promise.all([
      fetch("/api/config").then(r => r.json()),
      fetch("/api/models").then(r => r.json()),
    ])
      .then(([cfg, m]) => {
        const hasAnyKey = cfg?.providers && Object.values(cfg.providers).some((p: any) => p.hasKey);
        if (!hasAnyKey) {
          setModels(m.models || []);
          setShow(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        providers: { [selectedProvider]: apiKey.trim() },
      };
      if (selectedModel) body.defaultModel = selectedModel;
      await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setDone(true);
    } catch {}
    setSaving(false);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  if (!show) return null;

  const providerModels = models.filter(m => m.provider === selectedProvider);
  const totalSteps = 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-low border border-border-default rounded-2xl shadow-2xl max-w-lg w-full mx-4">
        {/* Header with stepper dots */}
        <div className="flex items-center justify-between p-xl border-b border-border-default">
          <div className="flex items-center gap-lg">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-sora text-sm font-bold transition-colors ${
                  i < step ? "bg-success text-on-success" :
                  i === step ? "bg-primary text-on-primary" :
                  "bg-surface-variant text-on-surface-muted"
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < totalSteps - 1 && (
                  <div className={`w-12 h-0.5 transition-colors ${
                    i < step ? "bg-success" : "bg-border-default"
                  }`} />
                )}
              </div>
            ))}
          </div>
          {!done && (
            <button onClick={dismiss} className="text-on-surface-muted hover:text-on-surface transition-colors shrink-0 ml-md">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-xl">
          {done ? (
            <div className="text-center py-lg">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-lg">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h2 className="font-sora text-headline-sm text-on-surface mb-sm">You are all set</h2>
              <p className="font-dm-sans text-sm text-on-surface-muted mb-xl">
                {selectedModel
                  ? `${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} is configured with your default model.`
                  : `${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} is configured.`}
                You can change these anytime in Settings.
              </p>
              <button onClick={dismiss} className="px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest rounded-lg hover:bg-primary-hover transition-colors">
                Start exploring
              </button>
            </div>
          ) : step === 0 ? (
            <>
              <h2 className="font-sora text-headline-sm text-on-surface mb-sm">Pick a provider</h2>
              <p className="font-dm-sans text-sm text-on-surface-muted mb-lg">
                Content creation and AI tutoring need an API key. Choose a provider to get started.
              </p>
              <div className="grid grid-cols-2 gap-md">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProvider(p.id); setStep(1); }}
                    className={`flex items-center gap-md px-lg py-md rounded-xl border transition-all font-sora text-sm ${
                      selectedProvider === p.id
                        ? "bg-primary/10 border-primary text-on-surface"
                        : "bg-surface border-border-default text-on-surface-muted hover:border-primary/50 hover:text-on-surface"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                      selectedProvider === p.id ? "bg-primary" : "bg-on-surface-muted/30"
                    }`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          ) : step === 1 ? (
            <>
              <h2 className="font-sora text-headline-sm text-on-surface mb-sm">Enter your API key</h2>
              <p className="font-dm-sans text-sm text-on-surface-muted mb-lg">
                Paste your {PROVIDERS.find(p => p.id === selectedProvider)?.label} key below. 
                It will be stored in your database and never exposed.
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Paste your API key"
                className="w-full bg-surface border border-border-default rounded-lg px-md py-md font-mono text-sm text-on-surface placeholder-on-surface-muted/50 focus:outline-none focus:border-primary transition-colors mb-lg"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(0)} className="font-sora text-sm text-on-surface-muted hover:text-on-surface transition-colors">
                  Back
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!apiKey.trim()}
                  className="inline-flex items-center gap-sm px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-sora text-headline-sm text-on-surface mb-sm">Choose a default model</h2>
              <p className="font-dm-sans text-sm text-on-surface-muted mb-lg">
                This is the model used for content generation and AI tutoring. 
                You can override it per-action later.
              </p>
              {providerModels.length > 0 ? (
                <div className="mb-lg">
                  <ModelPicker
                    models={models}
                    selectedModel={selectedModel}
                    selectedProvider={selectedModelProvider}
                    onChange={(id, provider) => {
                      setSelectedModel(id);
                      setSelectedModelProvider(provider);
                    }}
                  />
                </div>
              ) : (
                <p className="font-dm-sans text-sm text-on-surface-muted mb-lg">
                  No models available for this provider. You can set a default later in Settings.
                </p>
              )}
              <div className="flex items-center justify-between">
                <button onClick={() => setStep(1)} className="font-sora text-sm text-on-surface-muted hover:text-on-surface transition-colors">
                  Back
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-sm px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Finish setup"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}