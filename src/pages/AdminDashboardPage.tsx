import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Eye, EyeOff, Search, Pencil, Trash2, Globe, Archive } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { SkeletonAdminRows } from "@/components/ui/Skeleton";
import AccentBar from "@/components/ui/AccentBar";
import LocalAgentPanel from "@/components/admin/LocalAgentPanel";
import { usePageMeta } from "@/hooks/usePageMeta";
import { invalidateContentCache } from "@/lib/content";
import { CONTENT_TYPES, CONTENT_TYPE_LABELS, ROUTE_BASE, type ContentType } from "@/lib/admin-prompts";

interface ContentItem {
  slug: string;
  type: string;
  status: string;
  title: string;
  excerpt: string;
  updated_at: string;
  archived?: boolean;
}

function useContentList() {
  const [data, setData] = useState<ContentItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = async (type?: string, q?: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (q) params.set("q", q);

      const res = await fetch(`/api/content?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = await res.json();
      setData(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load content");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetchAll, setData, setError };
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { data, loading, error, fetchAll, setData, setError } = useContentList();
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  usePageMeta({ title: "Admin Dashboard", description: "Manage all Soma content" });

  // Load on mount
  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = (data || []).filter((item) => {
    if (filterType && item.type !== filterType) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        item.excerpt.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    total: data?.length || 0,
    published: data?.filter((i) => i.status === "published").length || 0,
    private: data?.filter((i) => i.status === "private").length || 0,
  };

  // Immediate toggle of a row's visibility: content_items.status is the
  // single gate, so the next GET reflects the flip.
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ContentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);

  const toggleStatus = async (item: ContentItem) => {
    setBusySlug(item.slug);
    setError("");
    try {
      const next = item.status === "published" ? "private" : "published";
      // The upsert overwrites body_json on conflict, so the full authored
      // object must be re-sent. The list row already carries it flattened
      // (mapRow spreads body_json); strip the computed columns.
      const COMPUTED: Record<string, true> = {
        slug: true, type: true, status: true, title: true, excerpt: true,
        meta: true, isFeatured: true, position: true, updatedAt: true,
        id: true, href: true,
      };
      const body = Object.fromEntries(
        Object.entries(item).filter(([k]) => !COMPUTED[k])
      );
      const r = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: item.slug,
          type: item.type,
          title: item.title,
          excerpt: item.excerpt,
          meta: {},
          body,
          status: next,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      invalidateContentCache();
      const rows = (data || []).map((it) =>
        it.slug === item.slug ? { ...it, status: next } : it
      );
      setData(rows);
    } catch (err) {
      setError(`Toggle failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusySlug(null);
    }
  };

  const deleteItem = async (item: ContentItem) => {
    setBusySlug(item.slug);
    setError("");
    try {
      const r = await fetch(`/api/content?slug=${encodeURIComponent(item.slug)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      invalidateContentCache();
      setData((data || []).filter((it) => it.slug !== item.slug));
      setDeleteTarget(null);
    } catch (err) {
      setError(`Delete failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusySlug(null);
    }
  };

  /** Flip the row's archived flag. archived lives in body_json, so like a
      status toggle this re-POSTs the full authored body with the flag set. */
  const toggleArchived = async (item: ContentItem, archived: boolean) => {
    setBusySlug(item.slug);
    setError("");
    try {
      const COMPUTED: Record<string, true> = {
        slug: true, type: true, status: true, title: true, excerpt: true,
        meta: true, isFeatured: true, position: true, updatedAt: true,
        id: true, href: true, archived: true,
      };
      const body = Object.fromEntries(
        Object.entries(item).filter(([k]) => !COMPUTED[k])
      );
      const r = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: item.slug,
          type: item.type,
          title: item.title,
          excerpt: item.excerpt,
          meta: {},
          body: { ...body, archived },
          status: item.status,
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      invalidateContentCache();
      const rows = (data || []).map((it) =>
        it.slug === item.slug ? { ...it, archived } : it
      );
      setData(rows);
      setArchiveTarget(null);
    } catch (err) {
      setError(`Archive toggle failed: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setBusySlug(null);
    }
  };

  return (
    <div className="pt-32 pb-xxl max-w-readme mx-auto px-gutter md:px-margin-desktop">
      <header className="mb-xl">
        <AccentBar variant="small" className="mb-md" />
        <div className="flex items-center justify-between flex-wrap gap-lg">
          <div>
            <p className="font-sora text-metadata-tag text-primary uppercase tracking-widest mb-sm">
              // ADMIN
            </p>
            <h1 className="font-sora text-display-md text-on-surface">Content Dashboard</h1>
          </div>
          <Link
            to="/admin/new"
            className="inline-flex items-center gap-sm px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest hover:bg-primary-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Content
          </Link>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-lg mb-xl">
        <div className="p-lg bg-surface border border-border-default">
          <p className="font-sora text-3xl text-primary font-bold">{stats.total}</p>
          <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">Total Items</p>
        </div>
        <div className="p-lg bg-surface border border-border-default">
          <p className="font-sora text-3xl text-success font-bold">{stats.published}</p>
          <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">Published</p>
        </div>
        <div className="p-lg bg-surface border border-border-default">
          <p className="font-sora text-3xl text-on-surface-muted font-bold">{stats.private}</p>
          <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">Private</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-md mb-xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or slug..."
            className="w-full pl-xl pr-md py-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
        >
          <option value="">All Types</option>
          {CONTENT_TYPES.map((ct) => (
            <option key={ct} value={ct}>{CONTENT_TYPE_LABELS[ct]}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="private">Private</option>
        </select>

        <button
          onClick={() => fetchAll(filterType || undefined, search || undefined)}
          className="px-xl py-md bg-surface border border-border-default text-on-surface font-sora text-xs uppercase tracking-widest hover:bg-surface-container transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Content Table */}
      {loading ? (
        <div className="py-xl">
          <SkeletonAdminRows rows={5} />
        </div>
      ) : error ? (
        <div className="p-lg bg-surface-container border border-border-default border-l-4 border-l-error">
          <p className="font-sora text-sm text-error">{error}</p>
          <button
            onClick={() => fetchAll()}
            className="mt-sm text-sm text-primary hover:underline font-dm-sans"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-xxl text-center border border-dashed border-border-default">
          <p className="font-dm-sans text-sm text-on-surface-muted mb-md">
            {data?.length === 0
              ? "No content yet."
              : "No content matches your filters."}
          </p>
          <Link
            to="/admin/new"
            className="inline-flex items-center gap-sm text-sm text-primary hover:underline font-dm-sans"
          >
            <Plus className="w-4 h-4" />
            Create your first piece of content
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left p-md font-sora text-xs text-on-surface-muted uppercase tracking-widest">Title</th>
                <th className="text-left p-md font-sora text-xs text-on-surface-muted uppercase tracking-widest">Type</th>
                <th className="text-left p-md font-sora text-xs text-on-surface-muted uppercase tracking-widest">Status</th>
                <th className="text-left p-md font-sora text-xs text-on-surface-muted uppercase tracking-widest">Updated</th>
                <th className="text-right p-md font-sora text-xs text-on-surface-muted uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const baseRoute = ROUTE_BASE[item.type as ContentType] || item.type;
                return (
                  <tr key={item.slug} className="border-b border-border-default hover:bg-surface-container transition-colors">
                    <td className="p-md">
                      <div>
                        <Link
                          to={`/${baseRoute}/${item.slug}`}
                          className="font-dm-sans text-sm text-on-surface hover:text-primary transition-colors"
                        >
                          {item.title || item.slug}
                        </Link>
                        <p className="font-dm-sans text-xs text-on-surface-muted mt-xs line-clamp-1">
                          /{baseRoute}/{item.slug}
                        </p>
                      </div>
                    </td>
                    <td className="p-md">
                      <span className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">
                        {CONTENT_TYPE_LABELS[item.type as ContentType] || item.type}
                      </span>
                    </td>
                    <td className="p-md">
                      <span
                        className={`inline-flex items-center gap-sm font-sora text-xs uppercase tracking-widest ${
                          item.status === "published"
                            ? "text-success"
                            : "text-on-surface-muted"
                        }`}
                      >
                        {item.status === "published" ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        {item.status}
                        {item.archived && (
                          <span className="text-accent-orange">
                            <Archive className="w-3 h-3 inline-block" /> archived
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="p-md">
                      <span className="font-dm-sans text-xs text-on-surface-muted">
                        {item.updated_at
                          ? new Date(item.updated_at).toLocaleDateString()
                          : "—"}
                      </span>
                    </td>
                    <td className="p-md text-right">
                      <div className="flex items-center justify-end gap-sm">
                        <Link
                          to={`/admin/${item.type}/${item.slug}/edit`}
                          className="inline-flex items-center gap-xs px-md py-sm text-xs text-on-surface-muted hover:text-primary font-dm-sans transition-colors border border-border-default hover:border-primary"
                          title={`Edit ${item.slug}`}
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </Link>
                        <button
                          onClick={() => toggleStatus(item)}
                          disabled={busySlug === item.slug}
                          className={`inline-flex items-center gap-xs px-md py-sm text-xs font-dm-sans transition-colors border disabled:opacity-50 ${
                            item.status === "published"
                              ? "text-warning border-border-default hover:border-warning"
                              : "text-success border-border-default hover:border-success"
                          }`}
                          title={item.status === "published" ? "Make private" : "Publish"}
                        >
                          <Globe className="w-3 h-3" />
                          {busySlug === item.slug ? "..." : item.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          onClick={() => setArchiveTarget(item)}
                          disabled={busySlug === item.slug}
                          className={`inline-flex items-center gap-xs px-md py-sm text-xs font-dm-sans transition-colors border disabled:opacity-50 ${
                            item.archived
                              ? "text-accent-orange border-border-default hover:border-accent-orange"
                              : "text-on-surface-muted border-border-default hover:border-accent-orange hover:text-accent-orange"
                          }`}
                          title={item.archived ? `Unarchive ${item.slug}` : `Archive ${item.slug}`}
                        >
                          <Archive className="w-3 h-3" />
                          {item.archived ? "Unarchive" : "Archive"}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          disabled={busySlug === item.slug}
                          className="inline-flex items-center gap-xs px-md py-sm text-xs text-on-surface-muted hover:text-error font-dm-sans transition-colors border border-border-default hover:border-error disabled:opacity-50"
                          title={`Delete ${item.slug}`}
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    {/* Local agent (shell/git/build sidecar — local dev only) */}
      <div className="mt-xxl space-y-lg">
        <LocalAgentPanel />
      </div>

      {archiveTarget && (
        <ConfirmModal
          title={archiveTarget.archived ? "Unarchive content?" : "Archive content?"}
          message={
            archiveTarget.archived
              ? `"${archiveTarget.title}" will reappear on its index page.`
              : `"${archiveTarget.title}" stays in the database (private or published as-is) but disappears from its index page. The archive page keeps a year-grouped list of archived stories.`
          }
          confirmLabel={archiveTarget.archived ? "Unarchive" : "Archive"}
          loadingLabel={archiveTarget.archived ? "Unarchiving..." : "Archiving..."}
          destructive={false}
          onConfirm={() => toggleArchived(archiveTarget, !archiveTarget.archived)}
          onCancel={() => setArchiveTarget(null)}
          loading={busySlug === archiveTarget.slug}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete content?"
          message={`"${deleteTarget.title}" (/${deleteTarget.type}/${deleteTarget.slug}) will be permanently removed from the database. This is the hard path: unpublishing keeps the row, deleting does not.`}
          confirmText="DELETE"
          onConfirm={() => deleteItem(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
          loading={busySlug === deleteTarget.slug}
        />
      )}
    </div>
  );
}