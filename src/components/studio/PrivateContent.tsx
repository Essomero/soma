import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, Eye, Loader2, X } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import { PublicToggleButton, usePublicState } from "@/components/ui/PublicToggle";

const TYPES = ["story", "guide", "doc", "course", "book", "series", "test", "featured", "podcast", "topic"];

// Minimal per-type required fields : mirrors scripts/publish-content.ts.
const REQUIRED: Record<string, string[]> = {
  story: ["slug", "title"],
  guide: ["slug", "title"],
  doc: ["slug", "title"],
  course: ["slug", "title", "lessons"],
  book: ["slug", "title", "chapters"],
  series: ["slug", "title", "episodes"],
  test: ["slug", "title", "questions"],
  featured: ["slug", "title"],
  podcast: ["slug", "title"],
  topic: ["slug", "title"],
};

interface PrivateRow {
  slug: string;
  type: string;
  status: string;
  title: string;
  updatedAt: string;
  href: string;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseManuscript(text: string, type: string): { slug: string; title: string; excerpt: string; body: Record<string, unknown> } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Not valid JSON. Paste the manuscript object as JSON (agents can emit it directly).");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Manuscript must be a single JSON object.");
  }
  const body = data as Record<string, unknown>;
  const slug = body.slug;
  if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Manuscript needs a slug field: lowercase letters, numbers, hyphens.");
  }
  for (const field of REQUIRED[type] || ["slug", "title"]) {
    const v = body[field];
    if (v === undefined || v === null || v === "") {
      throw new Error(`${type} manuscript is missing required field '${field}'.`);
    }
  }
  const title = typeof body.title === "string" ? body.title : slug;
  const desc = body.excerpt ?? body.description;
  return { slug, title, excerpt: typeof desc === "string" ? desc : "", body };
}

function PrivateCard({ row, onChanged }: { row: PrivateRow; onChanged: () => void }) {
  const { isPublic, toggle } = usePublicState(row.slug);
  return (
    <article className="group flex flex-col border-2 border-inverse-surface bg-surface rounded-none overflow-hidden">
      <div className="block flex-1 p-lg flex flex-col">
        <p className="font-sora text-metadata-tag text-on-surface-muted uppercase tracking-widest mb-md">
          {row.type} // updated {formatDate(row.updatedAt)} {isPublic ? "// public" : "// private"}
        </p>
        <h3 className="font-sora text-xl text-on-surface mb-md">{row.title || row.slug}</h3>
        <div className="flex items-center gap-xs mt-auto">
          <Tooltip label="Preview as the owner (visitors cannot see private pieces)">
            <Link
              to={row.href}
              className="inline-flex items-center gap-xs px-md py-xs rounded-md font-sora text-[10px] uppercase tracking-widest text-on-surface-muted hover:text-primary hover:bg-surface-container transition-colors"
            >
              <Eye className="w-3 h-3" /> Preview
            </Link>
          </Tooltip>
          <PublicToggleButton isPublic={isPublic} onToggle={() => { toggle(); onChanged(); }} />
        </div>
      </div>
    </article>
  );
}

function ManuscriptDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState("story");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError(null);
    let parsed;
    try {
      parsed = parseManuscript(text, type);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid manuscript.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: parsed.slug, type, title: parsed.title, excerpt: parsed.excerpt, body: parsed.body }),
      });
      if (!r.ok) {
        const d: unknown = await r.json().catch(() => ({}));
        const detail = d && typeof d === "object" && "error" in d && typeof d.error === "string" ? d.error : `Save failed (HTTP ${r.status}).`;
        throw new Error(detail);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-background/80" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-auto border-2 border-inverse-surface bg-surface p-xl shadow-brutal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-sora text-xl text-on-surface">New private piece from manuscript</h2>
          <button onClick={onClose} aria-label="Close" className="text-on-surface-muted hover:text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="font-dm-sans text-sm text-on-surface-variant mb-md">
          Paste the JSON manuscript your agent produced (same shape as the TypeScript schemas, as JSON).
          Required fields for {type}: {(REQUIRED[type] || []).join(", ")}.
        </p>
        <label className="block font-sora text-metadata-tag uppercase tracking-widest text-on-surface-muted mb-xs">
          Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full mb-md px-md py-sm border border-border-default bg-surface-container font-dm-sans text-sm text-on-surface"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label className="block font-sora text-metadata-tag uppercase tracking-widest text-on-surface-muted mb-xs">
          Manuscript JSON
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'{ "slug": "my-story", "title": "My Story", ... }'}
          rows={10}
          className="w-full mb-md px-md py-sm border border-border-default bg-surface-container font-mono text-sm text-on-surface"
        />
        {error && (
          <p className="font-dm-sans text-sm text-error mb-md">{error}</p>
        )}
        <div className="flex justify-end">
          <Tooltip label="Saves to your database as a private piece — nothing becomes public until you flip its visibility toggle.">
            <button
              onClick={save}
              disabled={saving || !text.trim()}
              className="inline-flex items-center gap-xs px-xl py-md rounded-none font-sora text-sm font-bold bg-primary text-on-primary border-2 border-inverse-surface shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Save as private
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export default function PrivateContent() {
  const [pieces, setPieces] = useState<PrivateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/content");
      if (!r.ok) throw new Error();
      const rows = await r.json();
      setPieces((Array.isArray(rows) ? rows : []).filter((d) => d.status !== "published"));
    } catch {
      setPieces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="mt-giant pt-giant border-t border-border-default">
      <div className="flex items-end justify-between gap-lg flex-wrap mb-md">
        <div>
          <h2 className="font-sora text-article-title text-on-surface">Private content</h2>
          <p className="font-dm-sans text-body-base text-on-surface-variant max-w-2xl mt-sm">
            Agent manuscripts and unpublished pieces live here, in your database — never in git, never visible to visitors. Preview as owner, flip the toggle to go public.
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-xs px-xl py-md rounded-none font-sora text-sm font-bold bg-primary text-on-primary border-2 border-inverse-surface shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <Plus className="w-4 h-4" /> New from manuscript
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-xxl">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : pieces.length === 0 ? (
        <div className="py-xxl text-center border border-dashed border-border-default rounded-none">
          <FileText className="w-8 h-8 mx-auto text-on-surface-muted mb-md" />
          <p className="font-dm-sans text-sm text-on-surface-muted">
            Nothing private right now. Ask any coding assistant for a piece, or paste its manuscript above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {pieces.map((d) => (
            <PrivateCard key={`${d.type}/${d.slug}`} row={d} onChanged={load} />
          ))}
        </div>
      )}

      {dialogOpen && <ManuscriptDialog onClose={() => setDialogOpen(false)} onSaved={load} />}
    </section>
  );
}
