import { useState, useEffect } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

interface VoiceProfileFormData {
  name: string;
  description: string;
  samples: string[];
}

interface VoiceProfileFormProps {
  /** Existing profile to edit, or null for create mode. */
  initial?: {
    id: string;
    name: string;
    description: string;
    samples: string[];
    style_prompt: string;
  } | null;
  onSave: (data: VoiceProfileFormData, analyze: boolean) => Promise<void>;
  onCancel: () => void;
}

export default function VoiceProfileForm({ initial, onSave, onCancel }: VoiceProfileFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [samplesText, setSamplesText] = useState(
    initial?.samples?.join("\n---\n") || "",
  );
  const [saving, setSaving] = useState(false);
  const [analyzeAfterSave, setAnalyzeAfterSave] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!initial;

  const parseSamples = (): string[] => {
    return samplesText
      .split(/---/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const samples = parseSamples();
    if (!name.trim()) {
      setError("Profile name is required");
      return;
    }
    if (samples.length < 1) {
      setError("Add at least one writing sample (separate multiple samples with ---)");
      return;
    }

    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), samples }, analyzeAfterSave);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface border border-border-default p-lg">
      <div className="flex items-center justify-between mb-lg">
        <h3 className="font-sora text-sm font-semibold text-on-surface">
          {isEditing ? "Edit Voice Profile" : "Create Voice Profile"}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-on-surface-muted hover:text-on-surface"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-lg">
        {/* Name */}
        <div>
          <label className="block font-dm-sans text-xs font-medium text-on-surface-muted mb-sm uppercase tracking-wider">
            Profile Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Benjamin's Voice"
            className="w-full px-md py-sm bg-surface-container border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block font-dm-sans text-xs font-medium text-on-surface-muted mb-sm uppercase tracking-wider">
            Description <span className="text-on-surface-muted">(optional)</span>
          </label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe this voice"
            className="w-full px-md py-sm bg-surface-container border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary"
          />
        </div>

        {/* Samples */}
        <div>
          <label className="block font-dm-sans text-xs font-medium text-on-surface-muted mb-sm uppercase tracking-wider">
            Writing Samples
          </label>
          <p className="font-dm-sans text-xs text-on-surface-muted mb-sm">
            Paste one or more writing samples. Separate each sample with <code className="text-primary">---</code> on its own line. 3-5 short paragraphs works best.
          </p>
          <textarea
            value={samplesText}
            onChange={(e) => setSamplesText(e.target.value)}
            placeholder={`Paste a writing sample here...

---

Paste another sample here...

---

And another...`}
            rows={10}
            className="w-full px-md py-sm bg-surface-container border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary resize-y font-mono"
            required
          />
          <p className="font-dm-sans text-xs text-on-surface-muted mt-sm">
            {parseSamples().length} sample{parseSamples().length !== 1 ? "s" : ""} detected
          </p>
        </div>

        {/* Style prompt preview (edit mode only) */}
        {initial?.style_prompt && (
          <div>
            <label className="block font-dm-sans text-xs font-medium text-on-surface-muted mb-sm uppercase tracking-wider">
              Style Prompt <span className="text-on-surface-muted">(generated by analysis)</span>
            </label>
            <pre className="w-full p-md bg-surface-container border border-border-default text-on-surface-muted font-mono text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
              {initial.style_prompt.slice(0, 1000)}
              {initial.style_prompt.length > 1000 ? "..." : ""}
            </pre>
          </div>
        )}

        {/* Analyze checkbox */}
        <label className="flex items-center gap-md cursor-pointer">
          <input
            type="checkbox"
            checked={analyzeAfterSave}
            onChange={(e) => setAnalyzeAfterSave(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="font-dm-sans text-sm text-on-surface">
            Analyze samples after saving (generate style prompt)
          </span>
        </label>

        {error && (
          <div className="p-md bg-surface-container border border-border-default border-l-4 border-l-error">
            <p className="font-dm-sans text-sm text-error">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-md pt-sm border-t border-border-default">
          <button
            type="button"
            onClick={onCancel}
            className="px-xl py-md text-sm font-dm-sans text-on-surface-muted hover:text-on-surface border border-border-default"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-sm px-xl py-md text-sm font-dm-sans font-medium bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {isEditing ? "Update Profile" : "Create Profile"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}