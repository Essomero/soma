import { Mic, Sparkles, Activity, Pencil, Trash2, FileText } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";

export interface VoiceProfileData {
  id: string;
  name: string;
  description: string;
  samples: string[];
  style_prompt: string;
  created_at: string;
  updated_at: string;
}

interface VoiceProfileCardProps {
  profile: VoiceProfileData;
  onEdit: (profile: VoiceProfileData) => void;
  onDelete: (id: string) => void;
  onAnalyze: (id: string) => void;
  busy?: boolean;
}

export default function VoiceProfileCard({
  profile,
  onEdit,
  onDelete,
  onAnalyze,
  busy,
}: VoiceProfileCardProps) {
  const isReady = profile.style_prompt.length > 0;
  const sampleCount = profile.samples.length;
  const isBusy = busy;

  return (
    <div className="p-lg bg-surface border border-border-default flex flex-col gap-md">
      {/* Header: icon + name */}
      <div className="flex items-start justify-between gap-sm">
        <div className="flex items-center gap-md min-w-0">
          <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-sora text-sm font-semibold text-on-surface truncate">
              {profile.name}
            </h3>
            {profile.description && (
              <p className="font-dm-sans text-xs text-on-surface-muted mt-1 line-clamp-1">
                {profile.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-lg text-xs text-on-surface-muted font-dm-sans">
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          {sampleCount} {sampleCount === 1 ? "sample" : "samples"}
        </span>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-sm">
        {isReady ? (
          <span className="inline-flex items-center gap-1 px-sm py-1 text-xs font-medium font-dm-sans bg-success/10 text-success rounded-sm">
            <Sparkles className="w-3 h-3" />
            Ready
          </span>
        ) : sampleCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-sm py-1 text-xs font-medium font-dm-sans bg-warning/10 text-warning rounded-sm">
            <Activity className="w-3 h-3" />
            Needs analysis
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-sm py-1 text-xs font-medium font-dm-sans bg-surface-container text-on-surface-muted rounded-sm">
            No samples
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-sm mt-auto pt-sm border-t border-border-default">
        {!isReady && sampleCount > 0 && (
          <Tooltip label="Generate style analysis from samples">
            <button
              type="button"
              onClick={() => onAnalyze(profile.id)}
              disabled={isBusy}
              className="inline-flex items-center gap-xs px-md py-sm text-xs font-dm-sans font-medium bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isBusy ? "Analyzing..." : "Analyze"}
            </button>
          </Tooltip>
        )}
        {isReady && (
          <Tooltip label="Re-analyze with current samples">
            <button
              type="button"
              onClick={() => onAnalyze(profile.id)}
              disabled={isBusy}
              className="inline-flex items-center gap-xs px-md py-sm text-xs font-dm-sans text-on-surface-muted hover:text-primary border border-border-default disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Re-analyze
            </button>
          </Tooltip>
        )}
        <Tooltip label="Edit profile">
          <button
            type="button"
            onClick={() => onEdit(profile)}
            className="inline-flex items-center gap-xs px-md py-sm text-xs font-dm-sans text-on-surface-muted hover:text-primary border border-border-default"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        </Tooltip>
        <Tooltip label="Delete profile">
          <button
            type="button"
            onClick={() => onDelete(profile.id)}
            className="inline-flex items-center gap-xs px-md py-sm text-xs font-dm-sans text-on-surface-muted hover:text-error border border-border-default ml-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </Tooltip>
      </div>
    </div>
  );
}