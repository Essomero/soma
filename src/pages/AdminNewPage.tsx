import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AIDraftPanel from "@/components/admin/AIDraftPanel";
import ContentForm from "@/components/admin/ContentForm";
import AccentBar from "@/components/ui/AccentBar";
import { usePageMeta } from "@/hooks/usePageMeta";
import type { AIDraft } from "@/components/admin/AIDraftPanel";
import type { SavePayload } from "@/components/admin/ContentForm";
import type { ContentType } from "@/lib/admin-prompts";
import { CONTENT_TYPE_LABELS, ROUTE_BASE } from "@/lib/admin-prompts";

export default function AdminNewPage() {
  const navigate = useNavigate();
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
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: data.slug,
          type: data.type,
          title: data.title,
          excerpt: data.excerpt,
          meta: {
            category: data.category,
            author: data.author,
            date: data.date,
            tags: data.tags,
            topics: data.topics,
          },
          body: data.body,
          status: data.status,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Save failed (${res.status}): ${errBody}`);
      }

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
        {/* AI Drafting Panel — shown when no draft yet */}
        {!draft && (
          <section className="p-xl bg-surface border border-border-default">
            <AIDraftPanel onDraft={handleDraft} disabled={saving} />
          </section>
        )}

        {/* Content Form — shown after draft is generated */}
        {draft && (
          <section className="p-xl bg-surface border border-border-default">
            <ContentForm initial={draft} onSave={handleSave} saving={saving} />
          </section>
        )}
      </div>
    </div>
  );
}
