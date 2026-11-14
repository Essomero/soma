import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PenLine, Eye, Loader2, Save, Sparkles } from "lucide-react";
import { SkeletonForm } from "@/components/ui/Skeleton";
import AccentBar from "@/components/ui/AccentBar";
import MarkdownHtml from "@/components/ui/MarkdownHtml";
import { mdBlock } from "@/lib/markdown";
import { createNote, fetchNote, updateNote } from "@/lib/notes";
import { DEFAULT_MODEL_ID, readModelPref } from "@/lib/modelPref";

const PREVIEW_PLACEHOLDER = `Start with a **bold idea** and let the notes flow:

## Sub-heading
- Bullet points capture key concepts
- \`code\` stays readable inline

> A useful callout.

| Concept | Why it matters |
| --- | --- |
| Example | Illustrates the point |
`;

export default function NotesEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const isEdit = !!slug;
  const navigate = useNavigate();

  const titleRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  // Cursor position to restore after React commits a Tab insertion
  const cursorRef = useRef<number | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState("");
  const [titleManuallyEdited, setTitleManuallyEdited] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Focus the content textarea on mount (create mode) so the user can start
  // typing a note right away — the title gets drafted automatically.
  useEffect(() => {
    if (!isEdit) contentRef.current?.focus();
  }, [isEdit]);

  // ── Auto-title: draft a title from content as the user types ───────────
  // Only in create mode and only while the user hasn't touched the title.
  useEffect(() => {
    if (isEdit || titleManuallyEdited) return;
    const trimmed = content.trim();
    if (!trimmed) { setTitle(""); return; }

    // Debounce 1.5s after the user stops typing
    const timer = setTimeout(async () => {
      // 1. Try AI
      const aiTitle = await tryAiTitle(trimmed);
      if (aiTitle) { setTitle(aiTitle); return; }

      // 2. Fallback: first heading or first line, truncated to ~60 chars
      const firstHeading = trimmed.match(/^#{1,6}\s+(.+)$/m);
      const raw = (firstHeading?.[1] || trimmed.split('\n')[0]).replace(/^[#*\s>]+/, '').trim();
      if (!raw) return;
      setTitle(raw.length <= 80 ? raw : raw.slice(0, 77) + '...');
    }, 1500);

    return () => clearTimeout(timer);
  }, [content, isEdit, titleManuallyEdited]);

  async function tryAiTitle(contentSlice: string): Promise<string | null> {
    setGeneratingTitle(true);
    const model = readModelPref() || DEFAULT_MODEL_ID;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          max_tokens: 50,
          systemPrompt: "Generate a concise note title (max 8 words, plain text, no quotes). Return ONLY the title.",
          userMessage: contentSlice.slice(0, 2000),
        }),
      });
      if (!res.ok) {
        console.warn("[auto-title] API returned", res.status);
        return null;
      }
      const data = await res.json();
      // /api/chat returns { reply: "..." } for non-streaming non-Gemini
      const text = data?.reply?.trim() || "";
      return (text && text.length <= 120) ? text.replace(/^["']+|["']+$/g, "") : null;
    } catch (e) {
      console.warn("[auto-title] fetch failed", e);
      return null;
    } finally {
      setGeneratingTitle(false);
    }
  }

  // Edit mode: prefill from the stored article
  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    fetchNote(slug!).then((a) => {
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
        await updateNote(slug!, { title: t, content });
        navigate(`/notes/${slug}`, { replace: true });
      } else {
        const created = await createNote({ title: t, content });
        navigate(`/notes/${created.slug}`, { replace: true });
      }
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String(e.message) : "Couldn't save the note.";
      setError(msg);
      setSaving(false);
    }
  }, [title, content, saving, isEdit, slug, navigate]);

  // ── AI Generate: auto-save then navigate to /admin/new ─────────────
  const handleGenerate = useCallback(async () => {
    const t = title.trim();
    if (!t || !content.trim() || generating) return;
    setGenerating(true);
    setError("");
    try {
      let noteSlug = slug;
      if (!isEdit) {
        // Create mode — save first
        const created = await createNote({ title: t, content });
        noteSlug = created.slug;
      } else {
        // Edit mode — update first
        await updateNote(noteSlug!, { title: t, content });
      }
      navigate("/admin/new", {
        state: { sourceNote: { slug: noteSlug, title: t, content } },
      });
    } catch (e: unknown) {
      const msg = e && typeof e === "object" && "message" in e ? String(e.message) : "Couldn't save the note.";
      setError(msg);
      setGenerating(false);
    }
  }, [title, content, generating, isEdit, slug, navigate]);

  // ── Keyboard shortcuts ─────────────────────────────────
  // Cmd/Ctrl+Enter or Cmd/Ctrl+S → save.
  // Tab in the textarea → insert 2 spaces instead of moving focus.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "Enter" || e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  // Restore cursor after React commits a Tab insertion
  useEffect(() => {
    if (cursorRef.current !== null && contentRef.current) {
      contentRef.current.selectionStart = cursorRef.current;
      contentRef.current.selectionEnd = cursorRef.current;
      cursorRef.current = null;
    }
  });

  function handleTextareaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab" && e.shiftKey) {
      e.preventDefault();
      setTab("preview");
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = content.slice(0, start) + "  " + content.slice(end);
      cursorRef.current = start + 2;
      setContent(newValue);
    }
  }

  if (loading) {
    return (
      <div className="pt-32 pb-xxl max-w-readme mx-auto px-gutter md:px-margin-desktop">
        <SkeletonForm rows={5} />
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
              // NOTES : {isEdit ? "EDIT NOTE" : "NEW NOTE"}
            </p>
            <h1 className="font-sora text-headline-md text-on-surface">
              {isEdit ? "Edit your note" : "Write a note"}
            </h1>
          </div>
          <Link
            to={isEdit ? `/notes/${slug}` : "/notes"}
            className="inline-flex items-center gap-xs font-sora text-metadata-tag uppercase tracking-widest text-on-surface-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {isEdit ? "Back to note" : "Back to notes"}
          </Link>
        </div>
      </header>

      <div className="space-y-lg">
        {/* Title */}
        <div className="relative">
          <label className="font-sora text-metadata-tag text-on-surface-muted uppercase tracking-widest mb-xs block">
            Title <span className="text-error">*</span>
          </label>
          <div className="relative">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleManuallyEdited(true); }}
              placeholder={generatingTitle ? "Generating..." : "Note title"}
              maxLength={120}
              className="w-full bg-transparent font-sora text-2xl md:text-headline-md text-on-surface placeholder:text-on-surface-muted/40 focus:outline-none border-0 border-b border-border-default pb-md focus:border-primary/50 transition-colors"
            />
            {generatingTitle && (
              <Loader2 className="w-4 h-4 text-on-surface-muted animate-spin absolute right-0 bottom-3" />
            )}
          </div>
        </div>

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
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
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
        <div className="flex items-center gap-sm flex-wrap">
          <button
            onClick={handleSave}
            disabled={!title.trim() || !content.trim() || saving}
            className="inline-flex items-center gap-xs px-xl py-md rounded-lg font-sora text-sm bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create note"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={!title.trim() || !content.trim() || generating}
            className="inline-flex items-center gap-xs px-xl py-md rounded-lg font-sora text-sm bg-surface border border-border-default text-brand hover:bg-surface-container hover:border-brand/50 disabled:opacity-50 disabled:hover:border-border-default disabled:hover:bg-surface transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Saving..." : "Generate with AI"}
          </button>
          <Link
            to={isEdit ? `/notes/${slug}` : "/notes"}
            className="inline-flex items-center gap-xs px-xl py-md rounded-lg font-sora text-sm bg-surface border border-border-default text-on-surface-muted hover:bg-surface-container transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
