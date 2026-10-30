import { useState } from "react";
import { AlertTriangle, Archive, Loader2, X, Trash2 } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";

interface ConfirmModalProps {
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  /** When set, the user must type this exact string before confirm enables. */
  confirmText?: string;
  /** Label on the confirm button (default "Delete"). */
  confirmLabel?: string;
  /** Label shown on the confirm button while loading (default "Deleting..."). */
  loadingLabel?: string;
  /** False renders an archive-style confirm (violet icon/label) instead of destructive. */
  destructive?: boolean;
}

export default function ConfirmModal({
  title = "Are you sure?",
  message,
  onConfirm,
  onCancel,
  loading,
  confirmText,
  confirmLabel = "Delete",
  loadingLabel = "Deleting...",
  destructive = true,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState("");
  const canConfirm = !confirmText || typed === confirmText;
  const ConfirmIcon = destructive ? Trash2 : Archive;

  useScrollLock(true);

  return (
    <div
      className="fixed inset-0 z-modal-confirm bg-background/60 backdrop-blur-sm flex items-center justify-center p-xl"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="bg-surface border border-border-default rounded-lg p-lg max-w-sm w-full shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-sm mb-lg">
          <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${destructive ? "bg-error/10 border-error/20" : "bg-primary/10 border-primary/20"}`}>
            <AlertTriangle className={`w-4 h-4 ${destructive ? "text-error" : "text-primary"}`} />
          </div>
          <div>
            <h3 className="font-sora text-sm text-on-surface mb-xs">{title}</h3>
            <p className="font-dm-sans text-xs text-on-surface-muted">{message}</p>
          </div>
        </div>

        {confirmText && (
          <div className="mb-lg">
            <label className="font-sora text-xs text-on-surface-muted uppercase tracking-widest block mb-sm">
              Type <span className="text-on-surface font-bold">{confirmText}</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={loading}
              placeholder={confirmText}
              autoFocus
              className="w-full bg-surface border border-border-default px-md py-sm text-sm font-mono text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:border-primary disabled:opacity-50"
            />
          </div>
        )}

        <div className="flex justify-end gap-xs">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-md py-sm rounded-md font-sora text-xs bg-surface-container border border-border-default text-on-surface-muted hover:bg-surface-container-high transition-colors disabled:opacity-50 inline-flex items-center gap-xs"
          >
            <X className="w-3 h-3 shrink-0 relative -top-px" /> Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !canConfirm}
            className={`px-md py-sm rounded-md font-sora text-xs inline-flex items-center gap-xs transition-opacity disabled:opacity-40 disabled:cursor-not-allowed ${
              destructive
                ? "bg-error text-on-primary hover:opacity-90"
                : "bg-primary text-on-primary hover:opacity-90"
            }`}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <ConfirmIcon className="w-3 h-3 shrink-0 relative -top-px" />}
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}