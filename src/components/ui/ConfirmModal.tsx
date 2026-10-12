import { AlertTriangle, Loader2, X, Trash2 } from "lucide-react";

interface ConfirmModalProps {
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  title = "Are you sure?",
  message,
  onConfirm,
  onCancel,
  loading,
}: ConfirmModalProps) {
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
          <div className="w-8 h-8 rounded-full bg-error/10 border border-error/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-error" />
          </div>
          <div>
            <h3 className="font-sora text-sm text-on-surface mb-xs">{title}</h3>
            <p className="font-dm-sans text-xs text-on-surface-muted">{message}</p>
          </div>
        </div>
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
            disabled={loading}
            className="px-md py-sm rounded-md font-sora text-xs bg-error text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-xs"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin shrink-0" /> : <Trash2 className="w-3 h-3 shrink-0 relative -top-px" />}
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
