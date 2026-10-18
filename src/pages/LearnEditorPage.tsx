import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PenLine, Eye, Loader2, Save } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import MarkdownHtml from "@/components/ui/MarkdownHtml";
import { mdBlock } from "@/lib/markdown";
import { createLearn, fetchLearn, updateLearn } from "@/lib/learn";

const PREVIEW_PLACEHOLDER = `Start with a **bold idea** and let the notes flow:

## Sub-heading
- Bullet points capture key concepts
- \`code\` stays readable inline

> A useful callout.

| Concept | Why it matters |
| --- | --- |
| Example | Illustrates the point |
`;

export default function LearnEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const isEdit = !!slug;
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");

  // Edit mode: prefill from the stored article
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    fetchLearn(slug!).then((a) => {
      if (cancelled) return;
      setTitle(a.title);
      setContent(a.content);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      setError("Couldn't load this note.");
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [isEdit, slug]);

  const handleSave = useCallback(async () => {
    const t = title.trim();
    if (!t || !content.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await updateLearn(slug!, { title: t, content });
        navigate(`/learn/${slug}`, { replace: true });
      } else {
        const created = await createLearn({ title: t, content });
        navigate(`/learn/${created.slug}`, { replace: true });
      }
    } catch (e: any) {
      setError(e?.message || "Couldn't save the note.");
      setSaving(false);
    }
  }, [title, content, saving, isEdit, slug, navigate]);

  if (loading) {
    return (
      <div className="pt-32 pb-xxl max-w-readme mx-auto px-gutter md:px-margin-desktop flex items-center justify-center py-xxl">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pt-32 pb-xxl max-w-readme mx-auto px-gutter md:px-margin-desktop">
      <header className="mb-lg">
        <AccentBar variant="small" className="mb-md" />
        <div className="flex items-center justify-between gap-lg flex-wrap">
          <div>
            <p className="font-sora text-metadata-tag text-primary uppercase tracking-widest mb-sm">
              // LEARN : {isEdit ? "EDIT NOTE" : "NEW NOTE"}
            </p>
            <h1 className="font-sora text-headline-md text-on-surface">
              {isEdit ? "Edit your note" : "Write a study note"}
            </h1>
          </div>
          <Link
            to={isEdit ? `/learn/${slug}` : "/learn"}
            className="inline-flex items-center gap-xs font-sora text-metadata-tag uppercase tracking-widest text-on-surface-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {isEdit ? "Back to note" : "Back to notes"}
          </Link>
        </div>
      </header>

      <div className="space-y-lg">
        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          maxLength={120}
          className="w-full bg-transparent font-sora text-2xl md:text-headline-md text-on-surface placeholder:text-on-surface-muted focus:outline-none border-0 border-b border-border-default pb-md focus:border-primary/50 transition-colors"
        />

        {/* Editor card */}
        <div className="border border-border-default rounded-xl overflow-hidden bg-surface">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-border-default bg-surface-container-low px-lg">
            <div className="flex">
              <button
                type="button"
                onClick={() => setTab("write")}
                className={`inline-flex items-center gap-xs px-md py-sm font-sora text-[10px] uppercase tracking-widest border-b-2 transition-colors ${tab === "write" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}
              >
                <PenLine className="w-3 h-3" /> Write
              </button>
              <button
                type="button"
                onClick={() => setTab("preview")}
                className={`inline-flex items-center gap-xs px-md py-sm font-sora text-[10px] uppercase tracking-widest border-b-2 transition-colors ${tab === "preview" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}
              >
                <Eye className="w-3 h-3" /> Preview
              </button>
            </div>
            <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-widest">
              Markdown
            </span>
          </div>

          {/* Body */}
          {tab === "write" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={PREVIEW_PLACEHOLDER}
              rows={24}
              className="w-full bg-transparent border-0 px-lg py-md font-dm-sans text-sm text-on-surface placeholder:text-on-surface-muted/50 focus:ring-0 outline-none resize-y thin-scrollbar"
            />
          ) : (
            <div className="px-lg py-md min-h-[480px]">
              {content.trim() ? (
                <MarkdownHtml
                  html={mdBlock(content)}
                  className="prose prose-invert max-w-none font-dm-sans text-body-base text-on-surface"
                />
              ) : (
                <p className="font-dm-sans text-sm text-on-surface-muted italic">Nothing to preview yet.</p>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="font-dm-sans text-xs text-error">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-sm">
          <button
            onClick={handleSave}
            disabled={!title.trim() || !content.trim() || saving}
            className="inline-flex items-center gap-xs px-xl py-md rounded-lg font-sora text-sm bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create note"}
          </button>
          <Link
            to={isEdit ? `/learn/${slug}` : "/learn"}
            className="inline-flex items-center gap-xs px-xl py-md rounded-lg font-sora text-sm bg-surface border border-border-default text-on-surface-muted hover:bg-surface-container transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
