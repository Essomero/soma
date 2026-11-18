import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Check, AlertCircle } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useAuth } from "@/lib/AuthContext";

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter", docUrl: "https://openrouter.ai/keys" },
  { id: "deepseek", label: "DeepSeek", docUrl: "https://platform.deepseek.com/api_keys" },
  { id: "gemini", label: "Gemini", docUrl: "https://aistudio.google.com/apikey" },
  { id: "groq", label: "Groq", docUrl: "https://console.groq.com/keys" },
  { id: "cerebras", label: "Cerebras", docUrl: "https://cloud.cerebras.ai/" },
  { id: "straitly", label: "Straitly", docUrl: "https://straitly.ai/app/keys" },
];

interface ProviderState {
  hasKey: boolean;
  source: "env" | "dashboard" | null;
}

interface ConfigData {
  providers: Record<string, ProviderState>;
  defaultModel: string | null;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  usePageMeta({ title: "Settings", description: "Manage API keys and default model" });

  const [config, setConfig] = useState<ConfigData | null>(null);
  const [models, setModels] = useState<{ id: string; label: string; provider: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  // Per-provider key inputs
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [defaultModel, setDefaultModel] = useState("");

  useEffect(() => {
    if (!isOwner) return;
    Promise.all([
      fetch("/api/config").then(r => r.json()),
      fetch("/api/models").then(r => r.json()),
    ]).then(([cfg, m]) => {
      setConfig(cfg);
      setDefaultModel(cfg.defaultModel || "");
      setModels(m.models || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isOwner]);

  const handleKeyChange = useCallback((provider: string, value: string) => {
    setKeyInputs(prev => ({ ...prev, [provider]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatus(null);

    // Build providers object: only include non-empty keyInputs as new values
    const providers: Record<string, string | null> = {};
    for (const p of PROVIDERS) {
      const input = keyInputs[p.id];
      if (input !== undefined) {
        providers[p.id] = input.trim() || null;
      }
    }

    const body: Record<string, unknown> = {};
    if (Object.keys(providers).length > 0) body.providers = providers;
    if (defaultModel) body.defaultModel = defaultModel;

    try {
      const r = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const err = await r.text();
        throw new Error(err || "Save failed");
      }

      // Re-fetch to get actual state (PUT returns { ok: true } — no key material)
      const configResp = await fetch("/api/config");
      if (configResp.ok) {
        const fresh = await configResp.json();
        setConfig(fresh);
        if (fresh.defaultModel) setDefaultModel(fresh.defaultModel);
      }
      setKeyInputs({});
      setStatus({ ok: true, msg: "Settings saved." });
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String(e.message) : "Could not save settings.";
      setStatus({ ok: false, msg });
    } finally {
      setSaving(false);
    }
  }, [keyInputs, defaultModel]);

  if (!isOwner) {
    return (
      <div className="pt-32 max-w-readme mx-auto px-gutter md:px-margin-desktop">
        <p className="text-on-surface-muted">You need to be logged in as the site owner to access settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pt-32 max-w-readme mx-auto px-gutter md:px-margin-desktop">
        <div className="animate-pulse space-y-lg">
          <div className="h-8 w-48 bg-surface-container-high rounded" />
          <div className="h-4 w-96 bg-surface-container-high rounded" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-surface-container-high rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-xxl max-w-readme mx-auto px-gutter md:px-margin-desktop">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-sm text-on-surface-muted hover:text-on-surface transition-colors mb-lg font-sora text-label-caps"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <AccentBar variant="small" className="mb-md" />
      <h1 className="font-sora text-headline-md text-on-surface mb-sm">Settings</h1>
      <p className="font-dm-sans text-on-surface-muted mb-xxl">
        Configure AI provider API keys and default model. Keys are stored in your database.
        Environment variables are used as fallback when no key is set here.
      </p>

      {status && (
        <div className={`flex items-center gap-md px-lg py-md rounded-lg mb-xl ${
          status.ok ? "bg-success/10 text-success border border-success/20" : "bg-danger/10 text-danger border border-danger/20"
        }`}>
          {status.ok ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="font-dm-sans text-sm">{status.msg}</span>
        </div>
      )}

      {/* Default model — single dropdown at top */}
      {models.length > 0 && (
        <div className="bg-surface-container-low rounded-xl border border-border-default p-xl mb-lg">
          <label className="font-sora text-label-caps text-on-surface block mb-sm">Default model</label>
          <p className="font-dm-sans text-sm text-on-surface-muted mb-md">
            Used for margin AI, content generation, and test creation when no specific model is chosen.
          </p>
          <select
            value={defaultModel}
            onChange={e => setDefaultModel(e.target.value)}
            className="w-full sm:w-80 bg-surface border border-border-default rounded-lg px-md py-sm text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">No default — pick per action</option>
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Provider cards */}
      <div className="space-y-lg">
        {PROVIDERS.map(p => {
          const state = config?.providers?.[p.id];
          const inputVal = keyInputs[p.id] !== undefined ? keyInputs[p.id] : "";
          const hasInput = inputVal.length > 0;
          const hasExistingKey = state?.hasKey;
          const source = state?.source;

          return (
            <div key={p.id} className="bg-surface-container-low rounded-xl border border-border-default p-xl">
              <div className="flex items-center justify-between mb-md">
                <div className="flex items-center gap-md">
                  {/* Status indicator */}
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    hasExistingKey ? "bg-success" : "bg-on-surface-muted/30"
                  }`} />
                  <h2 className="font-sora text-label-caps text-on-surface">{p.label}</h2>
                  {source && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      source === "env"
                        ? "text-accent-blue-neon border-accent-blue-neon/30 bg-accent-blue-neon/5"
                        : "text-accent-orange border-accent-orange/30 bg-accent-orange/5"
                    }`}>
                      {source === "env" ? "from env" : "from dashboard"}
                    </span>
                  )}
                </div>
                <a
                  href={p.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-accent-blue-neon hover:underline font-sora"
                >
                  Get key
                </a>
              </div>

              <input
                type="password"
                value={inputVal}
                onChange={e => handleKeyChange(p.id, e.target.value)}
                placeholder={hasExistingKey ? "Enter new key to override" : "Paste your API key"}
                className="w-full bg-surface border border-border-default rounded-lg px-md py-sm font-mono text-sm text-on-surface placeholder-on-surface-muted/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          );
        })}
      </div>

      {/* Save */}
      <div className="mt-xxl flex items-center gap-md">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-sm px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}