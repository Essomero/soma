import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Edit3, StickyNote, Search, X } from "lucide-react";
import { SkeletonNotesIndexGrid } from "@/components/ui/Skeleton";
import AccentBar from "@/components/ui/AccentBar";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Tooltip from "@/components/ui/Tooltip";
import { useAuth } from "@/lib/AuthContext";
import { fetchNotesList, deleteNote, deriveExcerpt } from "@/lib/notes";
import PublishAll from "@/components/studio/PublishAll";
import { type NoteArticle } from "@/types";

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function NotesIndexPage() {
  const { isOwner } = useAuth();
  const [articles, setArticles] = useState<NoteArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<NoteArticle | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Client-side filter: match against title and content
  const q = searchQuery.toLowerCase().trim();
  const filteredArticles = q
    ? articles.filter((a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q))
    : articles;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchNotesList();
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
      await deleteNote(deleteTarget.slug);
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
          // NOTES
        </p>
        <div className="flex items-end justify-between gap-lg flex-wrap">
          <h1 className="font-sora text-headline-md max-w-3xl text-on-surface">
            Notes to <span className="text-gradient">internalize</span> ideas.
          </h1>
          {isOwner && (
            <Link
              to="/notes/new"
              className="inline-flex items-center gap-xs px-xl py-md rounded-none font-sora text-sm font-bold bg-primary text-on-primary border-2 border-inverse-surface shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <Plus className="w-4 h-4" /> New note
            </Link>
          )}
        </div>
        <p className="font-dm-sans text-body-base text-on-surface-variant max-w-2xl mt-md">
          Quick notes, edited directly on the site. Private by default : flip the toggle on any note to share it.
        </p>
      </header>

      {/* Search */}
      {!loading && articles.length > 0 && (
        <div className="relative mb-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-muted pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full bg-surface-container-low border border-border-default pl-11 pr-10 py-3 font-dm-sans text-sm text-on-surface placeholder:text-on-surface-muted focus:outline-none focus:border-primary/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-muted hover:text-on-surface transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <SkeletonNotesIndexGrid />
      ) : loadError ? (
        <div className="py-xxl text-center">
          <p className="font-dm-sans text-sm text-error">Couldn't load notes. Try again.</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="py-xxl text-center border border-dashed border-border-default rounded-none">
          <StickyNote className="w-8 h-8 mx-auto text-on-surface-muted mb-md" />
          <p className="font-dm-sans text-sm text-on-surface-muted mb-lg">
            No notes yet : capture your first note.
          </p>
          {isOwner && (
            <Link
              to="/notes/new"
              className="inline-flex items-center gap-xs px-xl py-md rounded-none font-sora text-sm font-bold bg-primary text-on-primary border-2 border-inverse-surface shadow-brutal-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
            >
              <Plus className="w-4 h-4" /> Write a note
            </Link>
          )}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="py-xxl text-center">
          <Search className="w-8 h-8 mx-auto text-on-surface-muted mb-md" />
          <p className="font-dm-sans text-sm text-on-surface-muted">
            No notes match <span className="font-bold">"{searchQuery}"</span>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {filteredArticles.map((a) => (
            <article
              key={a.slug}
              className="group flex flex-col border-2 border-inverse-surface bg-surface hover:-translate-y-1 hover:shadow-brutal transition-all duration-200 rounded-none overflow-hidden"
            >
              <Link to={`/notes/${a.slug}`} className="block flex-1 p-lg flex flex-col">
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
                      to={`/notes/${a.slug}/edit`}
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
