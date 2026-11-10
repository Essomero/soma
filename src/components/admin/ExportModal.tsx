import { useState, useEffect } from "react";
import { Download, X, Loader2, FileText, Database, Info, Terminal } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";
import CopyableCode from "@/components/ui/CopyableCode";

interface ExportModalProps {
  onClose: () => void;
}

interface DbInfo {
  mode: "local" | "remote";
  turso: boolean;
  localPath: string | null;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [contentCount, setContentCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<"content" | "full">("content");
  const [downloading, setDownloading] = useState(false);

  useScrollLock(true);

  // Fetch content stats and DB info on mount
  useEffect(() => {
    async function load() {
      try {
        const [dbRes, contentRes] = await Promise.all([
          fetch("/api/diag").catch(() => null),
          fetch("/api/content").catch(() => null),
        ]);

        if (dbRes?.ok) {
          const dbData = await dbRes.json();
          setDbInfo({
            mode: dbData.env?.dbMode || "remote",
            turso: !!dbData.env?.hasDbUrl,
            localPath: dbData.env?.localPath || null,
          });
          // For local DB, default to full backup
          if (dbData.env?.dbMode === "local") setFormat("full");

          // Extract content counts from store
          const store = dbData.store || {};
          let total = 0;
          let pub = 0;
          for (const [key, val] of Object.entries(store)) {
            if (key.startsWith("content:")) {
              total += Number(val);
              if (key === "content:published") pub = Number(val);
            }
          }
          if (total > 0) {
            setContentCount(total);
            setPublishedCount(pub);
          }
        }

        if (contentRes?.ok) {
          const rows = await contentRes.json();
          if (Array.isArray(rows)) {
            setContentCount(rows.length);
            setPublishedCount(rows.filter((r: any) => r.status === "published").length);
          }
        }
      } catch {
        // Stats are a nice-to-have — modal still works without them
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const isRemote = dbInfo?.mode === "remote";

  const handleDownload = () => {
    setDownloading(true);
    // Use a hidden link to trigger the download so the browser handles it
    const link = document.createElement("a");
    link.href = `/api/export?format=${format}`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Close after a brief moment so the download starts
    setTimeout(() => {
      setDownloading(false);
      onClose();
    }, 500);
  };

  return (
    <div
      className="fixed inset-0 z-modal-confirm bg-background/60 backdrop-blur-sm flex items-center justify-center p-xl"
      onClick={downloading ? undefined : onClose}
    >
      <div
        className="bg-surface border border-border-default rounded-lg max-w-md w-full shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-lg border-b border-border-default">
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Download className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-sora text-sm text-on-surface">Export your content</h2>
          </div>
          <button
            onClick={onClose}
            disabled={downloading}
            className="p-sm text-on-surface-muted hover:text-on-surface transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-lg space-y-lg">
          {/* Stats summary */}
          {loading ? (
            <div className="flex items-center gap-md p-md bg-surface-container rounded animate-pulse">
              <div className="w-12 h-8 bg-surface-container-high rounded" />
              <div className="flex-1 space-y-sm">
                <div className="h-3 bg-surface-container-high rounded w-24" />
                <div className="h-2 bg-surface-container-high rounded w-32" />
              </div>
            </div>
          ) : contentCount > 0 ? (
            <div className="p-md bg-surface-container rounded">
              <p className="font-sora text-sm text-on-surface mb-xs">
                {contentCount} item{contentCount !== 1 ? "s" : ""}
              </p>
              <p className="font-dm-sans text-xs text-on-surface-muted">
                {publishedCount} published &middot; {contentCount - publishedCount} private
              </p>
            </div>
          ) : null}

          {/* Format selection */}
          {!isRemote ? (
            /* Local SQLite — both formats are real options */
            <div className="space-y-sm">
              <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">
                Format
              </p>
              <button
                onClick={() => setFormat("content")}
                className={`w-full flex items-start gap-md p-md rounded transition-colors text-left ${
                  format === "content"
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-surface-container hover:bg-surface-container-high border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  format === "content" ? "bg-primary/20" : "bg-surface-container-high"
                }`}>
                  <FileText className={`w-4 h-4 ${format === "content" ? "text-primary" : "text-on-surface-muted"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-sora text-sm ${format === "content" ? "text-on-surface" : "text-on-surface-muted"}`}>
                    Content (markdown)
                  </p>
                  <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">
                    Every content item as markdown plus an assets manifest.
                  </p>
                </div>
              </button>
              <button
                onClick={() => setFormat("full")}
                className={`w-full flex items-start gap-md p-md rounded transition-colors text-left ${
                  format === "full"
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-surface-container hover:bg-surface-container-high border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  format === "full" ? "bg-primary/20" : "bg-surface-container-high"
                }`}>
                  <Database className={`w-4 h-4 ${format === "full" ? "text-primary" : "text-on-surface-muted"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-sora text-sm ${format === "full" ? "text-on-surface" : "text-on-surface-muted"}`}>
                    Full backup (includes DB)
                  </p>
                  <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">
                    Everything in content plus the raw SQLite database file.
                  </p>
                </div>
              </button>
            </div>
          ) : (
            /* Remote (Turso) — only content format is available via browser */
            <div className="space-y-sm">
              <p className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">
                Format
              </p>
              <div className="w-full flex items-start gap-md p-md rounded bg-primary/10 border border-primary/30">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-sora text-sm text-on-surface">Content (markdown)</p>
                  <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">
                    Every content item as markdown plus an assets manifest.
                  </p>
                  <div className="flex items-start gap-xs mt-xs">
                    <Info className="w-3 h-3 text-on-surface-muted shrink-0 mt-0.5" />
                    <div>
                      <p className="font-dm-sans text-xs text-on-surface-muted">
                        If the download times out, use the CLI instead.
                      </p>
                      <CopyableCode command="npx tsx scripts/export.ts" className="mt-xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* CLI callout — full backup with DB */}
              <div className="p-md bg-surface-container rounded border border-border-default">
                <div className="flex items-start gap-sm">
                  <Terminal className="w-4 h-4 text-on-surface-muted shrink-0 mt-xs" />
                  <div className="space-y-sm flex-1 min-w-0">
                    <p className="font-dm-sans text-xs text-on-surface-muted">
                      Your database is remote (Turso). For a full backup that includes the database file, run the CLI locally:
                    </p>
                    <CopyableCode command="npx tsx scripts/export.ts --with-db" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-xs p-lg border-t border-border-default">
          <button
            onClick={onClose}
            disabled={downloading}
            className="px-md py-sm rounded-md font-sora text-xs bg-surface-container border border-border-default text-on-surface-muted hover:bg-surface-container-high transition-colors disabled:opacity-50 inline-flex items-center gap-xs"
          >
            <X className="w-3 h-3 shrink-0 relative -top-px" />
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-md py-sm rounded-md font-sora text-xs bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-xs"
          >
            {downloading ? (
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
            ) : (
              <Download className="w-3 h-3 shrink-0 relative -top-px" />
            )}
            {downloading ? "Downloading..." : "Download export"}
          </button>
        </div>
      </div>
    </div>
  );
}
