import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, FileText, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import AIDraftPanel from "@/components/admin/AIDraftPanel";
import ContentForm from "@/components/admin/ContentForm";
import AccentBar from "@/components/ui/AccentBar";
import { usePageMeta } from "@/hooks/usePageMeta";
import { invalidateContentCache } from "@/lib/content";
import type { AIDraft } from "@/components/admin/AIDraftPanel";
import type { SavePayload } from "@/components/admin/ContentForm";
import type { ContentType } from "@/lib/admin-prompts";
import { CONTENT_TYPE_LABELS, ROUTE_BASE } from "@/lib/admin-prompts";

export default function AdminNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const sourceNote = (location.state as { sourceNote?: { slug: string; title: string; content: string } } | null)
    ?.sourceNote;

  const initialPrompt = useMemo(() => {
    if (!sourceNote) return undefined;
    return (
      `Create content based on this source note:\n\n` +
      `Title: ${sourceNote.title}\n\n` +
      `${sourceNote.content.slice(0, 4000)}` +
      (sourceNote.content.length > 4000 ? "\n\n[Note truncated to first 4000 characters]" : "")
    );
  }, [sourceNote]);
  const [draft, setDraft] = useState<AIDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  usePageMeta({ title: "New Content", description: "Create new content with AI assistance" });

  const handleDraft = (newDraft: AIDraft) => {
    setDraft(newDraft);
    setError("");
  };

  const handleSave = async (data: SavePayload) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Pages read category/author/date/tags/topics from the spread body
      // (mapRow flattens body_json at the top level). meta carries only
      // the featured flag, matching publish-all.ts.
      const bodyPayload = {
        ...data.body,
        category: data.category,
        author: data.author,
        publishedAt: data.publishedAt,
        tags: data.tags,
        topics: data.topics,
      };

      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: data.slug,
          type: data.type,
          title: data.title,
          excerpt: data.excerpt,
          meta: {},
          body: bodyPayload,
          status: data.status,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Save failed (${res.status}): ${errBody}`);
      }

      invalidateContentCache();

      const baseRoute = ROUTE_BASE[data.type as ContentType] || data.type;
      setSuccess(`"${data.title}" saved successfully!`);

      // Navigate to the content page after a brief delay
      setTimeout(() => {
        navigate(`/${baseRoute}/${data.slug}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setDraft(null);
    setError("");
    setSuccess("");
  };

  return (
    <div className="pt-32 pb-xxl max-w-readme mx-auto px-gutter md:px-margin-desktop">
      <header className="mb-xl">
        <AccentBar variant="small" className="mb-md" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sora text-metadata-tag text-primary uppercase tracking-widest mb-sm">
              // ADMIN
            </p>
            <h1 className="font-sora text-display-md text-on-surface">
              {draft ? "Review &amp; Refine" : "Create Content"}
            </h1>
            {draft && (
              <p className="font-dm-sans text-sm text-on-surface-muted mt-sm">
                Suggested type: <span className="text-primary font-medium">{CONTENT_TYPE_LABELS[draft.type]}</span>
                {" — "}
                <button onClick={resetForm} className="underline hover:text-primary transition-colors">
                  Start over
                </button>
              </p>
            )}
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="inline-flex items-center gap-sm text-sm text-on-surface-muted hover:text-on-surface transition-colors font-dm-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-xl p-lg bg-surface-container border border-border-default border-l-4 border-l-error">
          <p className="font-sora text-sm text-error font-medium">Error</p>
          <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-xl p-lg bg-surface-container border border-border-default border-l-4 border-l-success">
          <p className="font-sora text-sm text-success font-medium">Success</p>
          <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">{success}</p>
        </div>
      )}

      <div className="space-y-xxl">
        {/* Source note banner — shown when navigating from a note */}
        {sourceNote && (
          <div className="flex items-start gap-md p-lg bg-surface-container border border-border-default border-l-4 border-l-primary">
            <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-sora text-xs text-primary uppercase tracking-widest mb-xs">Source note</p>
              <p className="font-dm-sans text-sm text-on-surface truncate">{sourceNote.title}</p>
            </div>
            <Link
              to={`/notes/${sourceNote.slug}`}
              className="inline-flex items-center gap-xs shrink-0 font-sora text-xs text-on-surface-muted hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View
            </Link>
          </div>
        )}

        {/* AI Drafting Panel — shown when no draft yet */}
        {!draft && (
          <section className="p-xl bg-surface border border-border-default">
            <AIDraftPanel onDraft={handleDraft} disabled={saving} initialInput={initialPrompt} />
          </section>
        )}

        {/* Content Form — shown after draft is generated */}
        {draft && (
          <section className="p-xl bg-surface border border-border-default">
            <ContentForm
              initial={draft}
              onSave={handleSave}
              onCancel={() => navigate("/admin")}
              saving={saving}
            />
          </section>
        )}
      </div>
    </div>
  );
}
