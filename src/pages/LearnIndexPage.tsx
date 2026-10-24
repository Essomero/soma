import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Loader2, Edit3, StickyNote } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Tooltip from "@/components/ui/Tooltip";
import { useAuth } from "@/lib/AuthContext";
import { fetchLearnList, deleteLearn, deriveExcerpt } from "@/lib/learn";
import PublishAll from "@/components/studio/PublishAll";
import { type LearnArticle } from "@/types";

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function LearnIndexPage() {
  const { isOwner } = useAuth();
  const [articles, setArticles] = useState<LearnArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<LearnArticle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchLearnList();
      setArticles(list);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteLearn(deleteTarget.slug);
      setArticles((prev) => prev.filter((a) => a.slug !== deleteTarget.slug));
      setDeleteTarget(null);
    } catch {
      // keep modal open so the user sees the failure
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting]);

  return (
    <div className="pt-32 pb-xxl max-w-readme mx-auto px-gutter md:px-margin-desktop">
      {/* Hero */}
      <header className="mb-giant">
        <AccentBar variant="small" className="mb-md" />
        <p className="font-sora text-metadata-tag text-primary uppercase tracking-widest mb-sm">
          // LEARN
        </p>
        <div className="flex items-end justify-between gap-lg flex-wrap">
          <h1 className="font-sora text-headline-md max-w-3xl text-on-surface">
            Notes to <span className="text-gradient">internalize</span> ideas.
          </h1>
          {isOwner && (
            <Link
              to="/learn/new"
              className="inline-flex items-center gap-xs px-xl py-md rounded-none font-sora text-sm font-bold bg-primary text-on-primary border-2 border-inverse-surface shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <Plus className="w-4 h-4" /> New note
            </Link>
          )}
        </div>
        <p className="font-dm-sans text-body-base text-on-surface-variant max-w-2xl mt-md">
          Quick study notes, edited directly on the site. Private by default : flip the toggle on any note to share it.
        </p>
      </header>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-xxl">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : loadError ? (
        <div className="py-xxl text-center">
          <p className="font-dm-sans text-sm text-error">Couldn't load notes. Try again.</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="py-xxl text-center border border-dashed border-border-default rounded-none">
          <StickyNote className="w-8 h-8 mx-auto text-on-surface-muted mb-md" />
          <p className="font-dm-sans text-sm text-on-surface-muted mb-lg">
            No notes yet : capture your first study note.
          </p>
          {isOwner && (
            <Link
              to="/learn/new"
              className="inline-flex items-center gap-xs px-xl py-md rounded-none font-sora text-sm font-bold bg-primary text-on-primary border-2 border-inverse-surface shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <Plus className="w-4 h-4" /> Write a note
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {articles.map((a) => (
            <article
              key={a.slug}
              className="group flex flex-col border-2 border-inverse-surface bg-surface hover:-translate-y-1 hover:shadow-brutal transition-all duration-200 rounded-none overflow-hidden"
            >
              <Link to={`/learn/${a.slug}`} className="block flex-1 p-lg flex flex-col">
                <p className="font-sora text-metadata-tag text-on-surface-muted uppercase tracking-widest mb-md">
                  Updated {formatDate(a.updatedAt || a.createdAt)}
                </p>
                <h2 className="font-sora text-xl text-on-surface group-hover:text-primary transition-colors mb-md">
                  {a.title}
                </h2>
                <p className="font-dm-sans text-sm text-on-surface-variant leading-relaxed">
                  {deriveExcerpt(a.content)}
                </p>
              </Link>
              {isOwner && (
                <div className="flex items-center gap-xs px-lg pb-lg">
                  <Tooltip label="Edit note">
                    <Link
                      to={`/learn/${a.slug}/edit`}
                      className="inline-flex items-center gap-xs px-md py-xs rounded-md font-sora text-[10px] uppercase tracking-widest text-on-surface-muted hover:text-primary hover:bg-surface-container transition-colors"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </Link>
                  </Tooltip>
                  <Tooltip label="Delete note">
                    <button
                      onClick={() => setDeleteTarget(a)}
                      className="inline-flex items-center gap-xs px-md py-xs rounded-md font-sora text-[10px] uppercase tracking-widest text-on-surface-muted hover:text-error hover:bg-error/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </Tooltip>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {isOwner && <PublishAll />}

      {deleteTarget && (

        <ConfirmModal
          title="Delete note?"
          message={`"${deleteTarget.title}" and all its comments and highlights will be permanently removed.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
