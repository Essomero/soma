import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Check, ArrowRight, Save, Loader2, AlertCircle } from "lucide-react";
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

/**
 * Verify a provider key by calling its models endpoint.
 * Returns null on success, or an error message on failure.
 */
async function verifyKey(provider: string, key: string): Promise<string | null> {
  const endpoints: Record<string, string> = {
    openrouter: "https://openrouter.ai/api/v1/models",
    deepseek: "https://api.deepseek.com/models",
    gemini: `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    groq: "https://api.groq.com/openai/v1/models",
    cerebras: "https://api.cerebras.ai/v1/models",
    straitly: "https://api.straitly.ai/v1/models",
  };
  const url = endpoints[provider];
  if (!url) return "Unknown provider";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(url, {
      headers: provider === "gemini" ? {} : { Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (r.ok) return null;
    if (r.status === 401) return "Invalid key — check it and try again";
    if (r.status === 403) return "Key does not have access to this provider";
    return `Provider returned ${r.status} — check your key`;
  } catch {
    return "Could not reach provider — check your network";
  }
}

function DismissBar({ dismiss, dismissPermanent }: { dismiss: () => void; dismissPermanent: () => void }) {
  return (
    <div className="flex items-center gap-md pt-lg mt-lg border-t border-border-default">
      <span className="font-dm-sans text-xs text-on-surface-muted">
        Configure anytime in <button onClick={() => { dismiss(); window.location.href = "/settings"; }} className="underline hover:text-on-surface transition-colors">Settings</button>
      </span>
      <span className="text-on-surface-muted/30 text-xs mx-xs">|</span>
      <button onClick={dismissPermanent} className="font-sora text-xs text-on-surface-muted hover:text-on-surface underline transition-colors">
        Don't show again
      </button>
      <span className="text-on-surface-muted/30 text-xs">|</span>
      <button onClick={dismiss} className="font-sora text-xs text-on-surface-muted hover:text-on-surface transition-colors">
        Dismiss
      </button>
    </div>
  );
}

export default function OnboardingModal() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedModelProvider, setSelectedModelProvider] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [keyVerified, setKeyVerified] = useState(false);
  const [done, setDone] = useState(false);
  const [skipKeyStep, setSkipKeyStep] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    Promise.all([
      fetch("/api/config").then(r => r.json()),
      fetch("/api/models").then(r => r.json()),
    ])
      .then(([cfg, m]) => {
        const modelList = m.models || [];
        setModels(modelList);

        const provs = cfg?.providers || {};
        const hasAnyKey = Object.values(provs).some((p: any) => p.hasKey);
        const hasDefault = !!cfg?.defaultModel;

        // If default is already set, skip onboarding entirely
        if (hasDefault && hasAnyKey) return;

        if (hasAnyKey && !hasDefault) {
          // Keys exist (from env or dashboard) but no default model — skip to model picker
          setSkipKeyStep(true);
          setStep(2);
          setShow(true);
        } else {
          // No keys at all — full flow
          setShow(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleVerify = async () => {
    if (!apiKey.trim()) return;
    setVerifying(true);
    setVerifyError(null);
    const err = await verifyKey(selectedProvider, apiKey.trim());
    if (err) {
      setVerifyError(err);
      setVerifying(false);
    } else {
      setKeyVerified(true);
      setVerifying(false);
      setStep(2);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (!skipKeyStep) {
        body.providers = { [selectedProvider]: apiKey.trim() };
      }
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
  };

  const dismissPermanent = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  if (!show) return null;

  const providerModels = models.filter(m => m.provider === selectedProvider);
  const totalSteps = skipKeyStep ? 1 : 3;
  const stepOffset = skipKeyStep ? 0 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container-low border border-border-default rounded-2xl shadow-2xl max-w-lg w-full mx-4">
        {/* Header with stepper dots */}
        {!done && (
          <div className="flex items-center justify-between p-xl border-b border-border-default">
            <div className="flex items-center gap-lg">
              {skipKeyStep ? (
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-sora text-sm font-bold bg-primary text-on-primary">
                  <Check className="w-4 h-4" />
                </div>
              ) : (
                [0, 1, 2].map(i => (
                  <div key={i} className="flex items-center gap-lg">
                    <button
                      type="button"
                      disabled={i >= step && !keyVerified && i > step + 1}
                      onClick={() => {
                        // Can only go back to completed steps or forward to next if key verified
                        if (i < step) setStep(i);
                        else if (i === step + 1 && (step === 1 ? keyVerified : true)) setStep(i);
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-sora text-sm font-bold transition-colors ${
                        i < step ? "bg-success text-on-success cursor-pointer hover:opacity-80" :
                        i === step ? "bg-primary text-on-primary" :
                        "bg-surface-variant text-on-surface-muted cursor-not-allowed"
                      }`}
                    >
                      {i < step ? <Check className="w-4 h-4" /> : i + 1}
                    </button>
                    {i < 2 && (
                      <div className={`w-12 h-0.5 transition-colors ${i < step ? "bg-success" : "bg-border-default"}`} />
                    )}
                  </div>
                ))
              )}
            </div>
            <button onClick={dismiss} className="text-on-surface-muted hover:text-on-surface transition-colors shrink-0 ml-md">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

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
                  ? `Default model set to ${selectedModel}.`
                  : "Configuration saved."}
                You can change these anytime in Settings.
              </p>
              <button onClick={dismiss} className="px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest rounded-lg hover:bg-primary-hover transition-colors">
                Start exploring
              </button>
            </div>
          ) : skipKeyStep ? (
            <>
              <h2 className="font-sora text-headline-sm text-on-surface mb-sm">Choose a default model</h2>
              <p className="font-dm-sans text-sm text-on-surface-muted mb-lg">
                You have API keys configured but no default model set.
                Pick one below so AI features don't prompt you every time.
              </p>
              {models.length > 0 ? (
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
                  No models available. Check your provider keys in Settings.
                </p>
              )}
              <div className="flex items-center justify-end gap-md">
                <button
                  onClick={handleSave}
                  disabled={saving || !selectedModel}
                  className="inline-flex items-center gap-sm px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving..." : "Set default model"}
                </button>
              </div>
              <DismissBar dismiss={dismiss} dismissPermanent={dismissPermanent} />
            </>
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
                    onClick={() => { setSelectedProvider(p.id); setApiKey(""); setKeyVerified(false); setVerifyError(null); setStep(1); }}
                    className={`flex items-center gap-md px-lg py-md rounded-xl border transition-all font-sora text-sm ${
                      selectedProvider === p.id
                        ? "bg-primary/15 border-primary text-on-surface"
                        : "bg-surface-container-high border-border-default text-on-surface-muted hover:border-primary/50 hover:text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <DismissBar dismiss={dismiss} dismissPermanent={dismissPermanent} />
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
                onChange={e => { setApiKey(e.target.value); setKeyVerified(false); setVerifyError(null); }}
                placeholder="Paste your API key"
                className="w-full bg-surface border border-border-default rounded-lg px-md py-md font-mono text-sm text-on-surface placeholder-on-surface-muted/50 focus:outline-none focus:border-primary transition-colors mb-lg"
                autoFocus
              />

              {verifyError && (
                <div className="flex items-start gap-md px-lg py-md rounded-lg mb-lg bg-danger/10 border border-danger/20">
                  <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                  <p className="font-dm-sans text-sm text-danger">{verifyError}</p>
                </div>
              )}

              {keyVerified && (
                <div className="flex items-center gap-md px-lg py-md rounded-lg mb-lg bg-success/10 border border-success/20">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <p className="font-dm-sans text-sm text-success">Key verified — provider responded successfully.</p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button onClick={() => setStep(0)} className="font-sora text-sm text-on-surface-muted hover:text-on-surface transition-colors">
                  Back
                </button>
                <button
                  onClick={keyVerified ? () => setStep(2) : handleVerify}
                  disabled={!apiKey.trim() || verifying}
                  className="inline-flex items-center gap-sm px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : keyVerified ? (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    "Verify key"
                  )}
                </button>
              </div>
              <DismissBar dismiss={dismiss} dismissPermanent={dismissPermanent} />
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
                  No models returned by this provider. You can set a default later in Settings.
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
              <DismissBar dismiss={dismiss} dismissPermanent={dismissPermanent} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}