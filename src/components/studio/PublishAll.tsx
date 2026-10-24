import { useState, useEffect, useCallback } from "react";
import { Globe, Lock, Loader2 } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface Row {
  slug: string;
  status: string;
}

// Owner-only bulk visibility: flips every content row at once via the
// batched /api/public endpoint (which mirrors each slug into both the
// route gate and the content status). Learn notes are untouched — they
// keep their per-note toggles.
export default function PublishAll() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<null | boolean>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/content");
      const list = r.ok ? await r.json() : [];
      setRows(Array.isArray(list) ? list.map((d: Row) => ({ slug: d.slug, status: d.status })) : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyAll = async (makePublic: boolean) => {
    setWorking(true);
    try {
      await fetch("/api/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: rows.map((r) => r.slug), public: makePublic }),
      }).catch(() => {});
      await load();
    } finally {
      setWorking(false);
      setConfirm(null);
    }
  };

  const published = rows.filter((r) => r.status === "published").length;

  return (
    <section className="mt-giant pt-giant border-t border-border-default">
      <h2 className="font-sora text-article-title text-on-surface">Publishing</h2>
      <p className="font-dm-sans text-body-base text-on-surface-variant max-w-2xl mt-sm mb-lg">
        {loading ? (
          "Counting pieces…"
        ) : rows.length === 0 ? (
          "Nothing in the content store yet."
        ) : (
          <>{published} of {rows.length} pieces public. One click flips them all — instantly, no rebuild.</>
        )}
      </p>
      {!loading && rows.length > 0 && (
        <div className="flex flex-wrap gap-md">
          <button
            onClick={() => setConfirm(true)}
            disabled={working || published === rows.length}
            className="inline-flex items-center gap-xs px-xl py-md rounded-none font-sora text-sm font-bold bg-primary text-on-primary border-2 border-inverse-surface shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
          >
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Make everything public
          </button>
          <button
            onClick={() => setConfirm(false)}
            disabled={working || published === 0}
            className="inline-flex items-center gap-xs px-xl py-md rounded-none font-sora text-sm font-bold bg-surface text-on-surface border-2 border-inverse-surface shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
          >
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Make everything private
          </button>
        </div>
      )}
      {confirm !== null && (
        <ConfirmModal
          title={confirm ? "Make everything public?" : "Make everything private?"}
          message={confirm
            ? `${rows.length - published} private piece(s) will become visible to everyone, instantly.`
            : `${published} public piece(s) will become owner-only, instantly.`}
          onConfirm={() => applyAll(confirm)}
          onCancel={() => setConfirm(null)}
          loading={working}
        />
      )}
    </section>
  );
}
