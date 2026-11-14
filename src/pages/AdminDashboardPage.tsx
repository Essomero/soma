import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Pencil, Trash2, Globe, Archive, ChevronLeft, ChevronRight } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { SkeletonAdminRows } from "@/components/ui/Skeleton";
import AccentBar from "@/components/ui/AccentBar";
import LocalAgentPanel from "@/components/admin/LocalAgentPanel";
import ImportFromUrlPanel from "@/components/admin/ImportFromUrlPanel";
import ExportModal from "@/components/admin/ExportModal";
import VoiceProfileList from "@/components/admin/VoiceProfileList";
import { usePageMeta } from "@/hooks/usePageMeta";
import { invalidateContentCache } from "@/lib/content";
import Select from "@/components/ui/Select";
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
  const tableRef = useRef<HTMLDivElement>(null);
  const { data, loading, error, fetchAll, setData, setError } = useContentList();
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [voiceProfileRefreshKey, setVoiceProfileRefreshKey] = useState(0);

  usePageMeta({ title: "Admin Dashboard", description: "Manage all Soma content" });

  // Load on mount
  useEffect(() => {
    fetchAll();
  }, []);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [filterType, filterStatus, search]);

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
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  // Scroll to top of table on page change
  useEffect(() => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

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
            <p className="font-sora text-xs text-primary font-medium mb-sm">
              // Admin
            </p>
            <h1 className="font-sora text-3xl text-on-surface font-bold">Content Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/new"
              className="inline-flex items-center gap-sm px-xl py-md bg-primary text-on-primary font-sora text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              New Content
            </Link>
            <button
              onClick={() => setShowExport(true)}
              className="inline-flex items-center gap-sm px-xl py-md border border-border-default text-on-surface font-dm-sans text-sm hover:border-primary hover:text-primary bg-transparent cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-sm px-xl py-md border border-border-default text-on-surface font-dm-sans text-sm hover:border-primary hover:text-primary bg-transparent cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              Import
            </button>
            {showExport && <ExportModal onClose={() => setShowExport(false)} />}
            {showImport && <ImportFromUrlPanel open={showImport} onClose={() => setShowImport(false)} />}
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-md mb-xl">
        <div className="p-lg bg-surface border border-border-default">
          <p className="font-sora text-2xl text-on-surface font-bold">{stats.total}</p>
          <p className="font-dm-sans text-sm text-on-surface-muted font-medium mt-3">Total items</p>
        </div>
        <div className="p-lg bg-surface border border-border-default">
          <p className="font-sora text-2xl text-success font-bold">{stats.published}</p>
          <p className="font-dm-sans text-sm text-on-surface-muted font-medium mt-3">Published</p>
        </div>
        <div className="p-lg bg-surface border border-border-default">
          <p className="font-sora text-2xl text-on-surface-muted font-bold">{stats.private}</p>
          <p className="font-dm-sans text-sm text-on-surface-muted font-medium mt-3">Private</p>
        </div>
      </div>

      {/* Voice Profiles */}
      <div className="mb-xl p-lg bg-surface border border-border-default">
        <VoiceProfileList />
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

        <Select
          value={filterType}
          onChange={(v) => setFilterType(v)}
          options={[
            { value: "", label: "All Types" },
            ...CONTENT_TYPES.map((ct) => ({ value: ct, label: CONTENT_TYPE_LABELS[ct] })),
          ]}
          placeholder="All Types"
        />

        <Select
          value={filterStatus}
          onChange={(v) => setFilterStatus(v)}
          options={[
            { value: "", label: "All Status" },
            { value: "published", label: "Published" },
            { value: "private", label: "Private" },
          ]}
          placeholder="All Status"
        />

        <button
          onClick={() => fetchAll(filterType || undefined, search || undefined)}
          className="px-xl py-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm hover:bg-surface-container"
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
          <p className="font-dm-sans text-sm text-error">{error}</p>
          <button
            onClick={() => fetchAll()}
            className="mt-sm text-sm text-primary font-dm-sans"
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
            className="inline-flex items-center gap-sm text-sm text-primary font-dm-sans"
          >
            <Plus className="w-4 h-4" />
            Create your first piece of content
          </Link>
        </div>
      ) : (
        <>
          <div ref={tableRef} className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left p-md font-dm-sans text-sm text-on-surface-muted font-medium">Title</th>
                  <th className="text-left p-md font-dm-sans text-sm text-on-surface-muted font-medium">Type</th>
                  <th className="text-left p-md font-dm-sans text-sm text-on-surface-muted font-medium">Updated</th>
                  <th className="text-right p-md font-dm-sans text-sm text-on-surface-muted font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const baseRoute = ROUTE_BASE[item.type as ContentType] || item.type;
                  return (
                    <tr key={item.slug} className="admin-row border-b border-border-default">
                      <td className="p-md">
                        <div>
                          <Link
                            to={`/${baseRoute}/${item.slug}`}
                            className="font-dm-sans text-sm text-on-surface hover:text-primary transition-colors"
                          >
                            {item.title || item.slug}
                          </Link>
                          <p className="font-dm-sans text-xs text-on-surface-muted mt-3 line-clamp-1">
                            /{baseRoute}/{item.slug}
                            {item.archived && (
                              <span className="ml-sm text-accent-orange font-medium">archived</span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="p-md">
                        <span className="font-dm-sans text-sm text-on-surface-muted">
                          {CONTENT_TYPE_LABELS[item.type as ContentType] || item.type}
                        </span>
                      </td>
                      <td className="p-md">
                        <span className="font-dm-sans text-xs text-on-surface-muted">
                          {item.updated_at
                            ? new Date(item.updated_at).toLocaleDateString()
                            : "—"}
                        </span>
                      </td>
                      <td className="p-md">
                        <div className="grid grid-cols-[1fr_1.5fr_1.5fr_1fr] gap-sm w-full justify-items-center">
                          <Link
                            to={`/admin/${item.type}/${item.slug}/edit`}
                            className="flex items-center justify-center gap-xs px-md py-sm text-xs text-on-surface-muted hover:text-primary font-dm-sans border border-border-default w-full"
                            title={`Edit ${item.slug}`}
                          >
                            <Pencil className="w-3.5 h-3.5 shrink-0" />
                            Edit
                          </Link>
                          <button
                            onClick={() => toggleStatus(item)}
                            disabled={busySlug === item.slug}
                            className={`flex items-center justify-center gap-xs px-md py-sm text-xs font-dm-sans border disabled:opacity-50 disabled:cursor-not-allowed w-full text-on-surface-muted ${
                              item.status === "published"
                                ? "hover:text-warning border-border-default"
                                : "hover:text-success border-border-default"
                            }`}
                            title={item.status === "published" ? "Make private" : "Publish"}
                          >
                            <Globe className="w-3.5 h-3.5 shrink-0" />
                            {busySlug === item.slug ? "..." : item.status === "published" ? "Unpublish" : "Publish"}
                          </button>
                          <button
                            onClick={() => setArchiveTarget(item)}
                            disabled={busySlug === item.slug}
                            className="flex items-center justify-center gap-xs px-md py-sm text-xs font-dm-sans border disabled:opacity-50 disabled:cursor-not-allowed w-full text-on-surface-muted hover:text-on-surface border-border-default"
                            title={item.archived ? `Unarchive ${item.slug}` : `Archive ${item.slug}`}
                          >
                            <Archive className="w-3.5 h-3.5 shrink-0" />
                            {item.archived ? "Unarchive" : "Archive"}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            disabled={busySlug === item.slug}
                            className="flex items-center justify-center gap-xs px-md py-sm text-xs text-on-surface-muted hover:text-error font-dm-sans border border-border-default disabled:opacity-50 disabled:cursor-not-allowed w-full"
                            title={`Delete ${item.slug}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
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

          {/* Pagination */}
          <div className="flex items-center justify-between mt-lg pt-lg border-t border-border-default">
            <p className="font-dm-sans text-sm text-on-surface-muted">
              {safePage * pageSize + 1} &ndash; {Math.min((safePage + 1) * pageSize, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-md">
              <Select
                value={String(pageSize)}
                onChange={(v) => {
                  setPageSize(Number(v));
                  setPage(0);
                }}
                options={[
                  { value: "10", label: "10 / page" },
                  { value: "25", label: "25 / page" },
                  { value: "50", label: "50 / page" },
                  { value: "100", label: "100 / page" },
                ]}
                placeholder="10 / page"
              />
              {totalPages > 1 && (
                <>
                  <button
                    onClick={() => setPage(safePage - 1)}
                    disabled={safePage === 0}
                    className="inline-flex items-center gap-xs px-md py-sm text-sm text-on-surface-muted hover:text-primary font-dm-sans border border-border-default disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => {
                    // Show max 7 pages with ellipsis
                    if (totalPages <= 7 || i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1) {
                      return (
                        <button
                          key={i}
                          onClick={() => setPage(i)}
                          className={`px-sm py-sm text-sm font-dm-sans font-medium min-w-[2rem] ${
                            i === safePage
                              ? "text-primary border-b-2 border-primary"
                              : "text-on-surface-muted"
                          }`}
                        >
                          {i + 1}
                        </button>
                      );
                    }
                    // Show ellipsis once on each side
                    const showLeftEllipsis = i === 1 && safePage > 3;
                    const showRightEllipsis = i === totalPages - 2 && safePage < totalPages - 4;
                    if (showLeftEllipsis || showRightEllipsis) {
                      return <span key={i} className="px-sm text-sm text-on-surface-muted">&hellip;</span>;
                    }
                    return null;
                  })}
                  <button
                    onClick={() => setPage(safePage + 1)}
                    disabled={safePage >= totalPages - 1}
                    className="inline-flex items-center gap-xs px-md py-sm text-sm text-on-surface-muted hover:text-primary font-dm-sans border border-border-default disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </>
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