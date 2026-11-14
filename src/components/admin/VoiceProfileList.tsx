import { useState, useEffect, useCallback } from "react";
import { Plus, Mic, Loader2, X } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";
import VoiceProfileCard, { type VoiceProfileData } from "./VoiceProfileCard";
import VoiceProfileForm from "./VoiceProfileForm";

interface VoiceProfileListProps {
  /** External trigger to refresh (incremented by parent on content change). */
  refreshKey?: number;
}

export default function VoiceProfileList({ refreshKey }: VoiceProfileListProps) {
  const [profiles, setProfiles] = useState<VoiceProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<VoiceProfileData | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/voice-profiles");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load voice profiles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles, refreshKey]);

  const handleSave = async (data: { name: string; description: string; samples: string[] }, analyze: boolean) => {
    if (editingProfile) {
      // Update existing
      const res = await fetch(`/api/voice-profiles/${editingProfile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Update failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      if (analyze) {
        await handleAnalyze(editingProfile.id);
      }
      setShowForm(false);
      setEditingProfile(null);
      await fetchProfiles();
    } else {
      // Create new
      const res = await fetch("/api/voice-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Create failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const created = await res.json();
      if (analyze) {
        await handleAnalyze(created.id);
      }
      setShowForm(false);
      await fetchProfiles();
    }
  };

  const handleAnalyze = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/voice-profiles/${id}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this voice profile? This cannot be undone.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/voice-profiles/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchProfiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  const openEdit = (profile: VoiceProfileData) => {
    setEditingProfile(profile);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingProfile(null);
    setShowForm(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <div className="flex items-center gap-md">
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
            <Mic className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-sora text-sm font-semibold text-on-surface">Voice Profiles</h2>
            <p className="font-dm-sans text-xs text-on-surface-muted mt-1">
              Create a voice profile to rewrite content in the author's style
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-sm px-md py-sm text-sm font-dm-sans font-medium bg-primary text-on-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            New Profile
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-md bg-surface-container border border-border-default border-l-4 border-l-error mb-lg">
          <p className="font-dm-sans text-sm text-error">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="mt-sm text-xs text-on-surface-muted font-dm-sans"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <VoiceProfileFormModal
          editingProfile={editingProfile ? {
            id: editingProfile.id,
            name: editingProfile.name,
            description: editingProfile.description,
            samples: editingProfile.samples,
            style_prompt: editingProfile.style_prompt,
          } : null}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingProfile(null);
          }}
        />
      )}

      {/* Profile cards grid */}
      {loading ? (
        <div className="flex items-center justify-center py-xxl">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : profiles.length === 0 && !showForm ? (
        <div className="py-xxl text-center border border-dashed border-border-default">
          <Mic className="w-8 h-8 mx-auto mb-md text-on-surface-muted" />
          <p className="font-dm-sans text-sm text-on-surface-muted mb-md">
            No voice profiles yet
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-sm text-sm text-primary font-dm-sans"
          >
            <Plus className="w-4 h-4" />
            Create your first voice profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {profiles.map((profile) => (
            <VoiceProfileCard
              key={profile.id}
              profile={profile}
              onEdit={openEdit}
              onDelete={handleDelete}
              onAnalyze={handleAnalyze}
              busy={busyId === profile.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal wrapper ────────────────────────────────────

interface VPFormModalProps {
  editingProfile: {
    id: string;
    name: string;
    description: string;
    samples: string[];
    style_prompt: string;
  } | null;
  onSave: (data: { name: string; description: string; samples: string[] }, analyze: boolean) => Promise<void>;
  onClose: () => void;
}

function VoiceProfileFormModal({ editingProfile, onSave, onClose }: VPFormModalProps) {
  useScrollLock(true);

  return (
    <div
      className="fixed inset-0 z-modal-confirm bg-background/60 backdrop-blur-sm flex items-center justify-center p-xl"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border-default rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="flex justify-end pt-md pr-md">
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-muted hover:text-on-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-lg pb-lg">
          <VoiceProfileForm
            initial={editingProfile}
            onSave={async (data, analyze) => {
              await onSave(data, analyze);
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}