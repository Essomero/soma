import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit3, Trash2, Loader2, Link2Off, Clipboard, Check } from "lucide-react";
import { SkeletonLearnArticle } from "@/components/ui/Skeleton";
import AccentBar from "@/components/ui/AccentBar";
import Tag from "@/components/ui/Tag";
import Comments from "@/components/ui/Comments";
import ContentBlocks from "@/components/ui/ContentBlocks";
import InlineHighlights from "@/components/ui/InlineHighlights";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Tooltip from "@/components/ui/Tooltip";
import MarkdownHtml from "@/components/ui/MarkdownHtml";
import { PublicToggleButton, usePublicState } from "@/components/ui/PublicToggle";
import { useAuth } from "@/lib/AuthContext";
import { mdBlock } from "@/lib/markdown";
import { type HighlightData, type HighlightComment } from "@/lib/highlights";
import { fetchLearn, deleteLearn, splitMarkdownBlocks, validateHighlights } from "@/lib/learn";
import { type LearnArticle } from "@/types";

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Orphan note card (highlight whose text anchor drifted after an edit) ──

/** Flatten a threaded comment tree into a display order. */
function flattenThread(comments: HighlightComment[], depth = 0): Array<{ c: HighlightComment; depth: number }> {
  const out: Array<{ c: HighlightComment; depth: number }> = [];
  for (const c of comments) {
    out.push({ c, depth });
    if (c.replies?.length) out.push(...flattenThread(c.replies, depth + 1));
  }
  return out;
}

function OrphanNoteCard({
  highlight,
  isOwner,
  onDelete,
  deleting,
}: {
  highlight: HighlightData;
  isOwner: boolean;
  onDelete: (id: number) => void;
  deleting: boolean;
}) {
  const thread = highlight.comments ? flattenThread(highlight.comments) : [];
  return (
    <div className="border border-border-default rounded-xl overflow-hidden bg-surface">
      <div className="flex items-center justify-between gap-md px-lg py-md bg-surface-container-low border-b border-border-default">
        <div className="flex items-center gap-xs">
          <Link2Off className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-sora text-[10px] text-amber-400 uppercase tracking-widest">Unmapped note</span>
        </div>
        {isOwner && (
          <Tooltip label="Delete note">
            <button
              onClick={() => onDelete(highlight.id)}
              disabled={deleting}
              className="p-xs rounded-md text-on-surface-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </Tooltip>
        )}
      </div>

      <div className="px-lg py-md space-y-md">
        {/* The stored selection : the anchor that drifted */}
        {highlight.selectedText ? (
          <blockquote className="border-l-2 border-border-default pl-md font-dm-sans text-sm text-on-surface-variant italic">
            “{highlight.selectedText.slice(0, 300)}{highlight.selectedText.length > 300 ? "…" : ""}”
          </blockquote>
        ) : (
          <p className="font-dm-sans text-xs text-on-surface-muted italic">(no text captured)</p>
        )}

        {thread.length > 0 ? (
          <div className="space-y-sm">
            {thread.map(({ c, depth }, i) => (
              <div key={c.id} className={depth > 0 ? "ml-md border-l-2 border-l-brand/30 pl-md" : ""}>
                <div className="flex items-center gap-xs mb-xs">
                  {c.isAi ? (
                    <span className="font-sora text-[10px] text-brand uppercase tracking-widest">{c.aiModel || "AI"}</span>
                  ) : (
                    <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-widest">You</span>
                  )}
                  <span className="font-sora text-[10px] text-on-surface-muted">{formatDate(c.createdAt)}</span>
                </div>
                <MarkdownHtml html={mdBlock(c.body)} className="font-dm-sans text-sm text-on-surface leading-relaxed" />
              </div>
            ))}
          </div>
        ) : (
          <p className="font-dm-sans text-sm text-on-surface-muted italic">
            The text this note pointed at was edited away : its comments were kept.
          </p>
        )}
      </div>
    </div>
  );
}

export default function LearnArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { isOwner } = useAuth();

  const [article, setArticle] = useState<LearnArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [allHighlights, setAllHighlights] = useState<HighlightData[]>([]);
  const [noteCopied, setNoteCopied] = useState(false);
  const [commentsRefresh, setCommentsRefresh] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [orphanDeleting, setOrphanDeleting] = useState<number | null>(null);

  const articleRef = useRef<HTMLElement>(null);
  const highlightClickRef = useRef<(id: number) => void>(() => {});

  const { isPublic, toggle } = usePublicState(slug ?? "");

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const a = await fetchLearn(slug);
      setArticle(a);
      setNotFound(false);
    } catch {
      setArticle(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const blocks = useMemo(() => (article ? splitMarkdownBlocks(article.content) : []), [article]);

  // Highlights that still map to live text vs. those that lost their anchor.
  const { mapped, orphans } = useMemo(
    () => validateHighlights(allHighlights, blocks),
    [allHighlights, blocks],
  );

  const handleHighlightsChange = useCallback((hs: HighlightData[]) => {
    setAllHighlights(hs);
    // A highlight interaction may have added comments: refresh the
    // section below so they appear without a page reload.
    setCommentsRefresh((n) => n + 1);
  }, []);

  const storyText = article ? article.content : "";

  const handleCopyNote = useCallback(async () => {
    if (!article?.content) return;
    try {
      await navigator.clipboard.writeText(`# ${article.title}\n\n${article.content}`);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = `# ${article.title}\n\n${article.content}`;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setNoteCopied(true);
    setTimeout(() => setNoteCopied(false), 2000);
  }, [article]);

  const confirmDeleteArticle = useCallback(async () => {
    if (!article || deleting) return;
    setDeleting(true);
    try {
      await deleteLearn(article.slug);
      navigate("/learn");
    } catch {
      setDeleting(false);
    }
  }, [article, deleting, navigate]);

  const handleDeleteOrphan = useCallback(async (id: number) => {
    if (orphanDeleting !== null) return;
    setOrphanDeleting(id);
    try {
      await fetch("/api/highlights", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setAllHighlights((prev) => prev.filter((h) => h.id !== id));
    } catch {}
    setOrphanDeleting(null);
  }, [orphanDeleting]);

  if (loading) {
    return (
      <SkeletonLearnArticle />
    );
  }

  if (!article || notFound) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <h1 className="font-sora text-headline-md text-on-surface mb-md">Note Not Found</h1>
        <p className="text-on-surface-muted mb-xl">This note doesn't exist (or was deleted).</p>
        <Link to="/learn" className="text-primary hover:underline font-bold">
          ← Back to notes
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-xxl">
      {/* Hero */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop mb-giant">
        <div className="flex items-center gap-sm mb-lg">
          <Link
            to="/learn"
            className="inline-flex items-center gap-xs font-sora text-metadata-tag uppercase tracking-widest text-on-surface-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Notes
          </Link>
          {isOwner && (
            <>
              <span className="text-on-surface-muted">//</span>
              <PublicToggleButton isPublic={isPublic} onToggle={toggle} />
            </>
          )}
        </div>

        <AccentBar variant="small" className="mb-md" />
        <Tag variant="primary" className="mb-sm block">LEARN</Tag>
        <h1 className="font-sora text-headline-md text-on-surface mb-md max-w-4xl leading-tight">
          {article.title}
        </h1>
        <div className="flex items-center gap-sm font-sora text-metadata-tag text-on-surface-muted uppercase tracking-widest">
          <span>Updated {formatDate(article.updatedAt || article.createdAt)}</span>
          {isPublic && (
            <>
              <span className="text-on-surface-muted">//</span>
              <span className="text-secondary">Public</span>
            </>
          )}
        </div>

        {isOwner && (
          <div className="flex items-center gap-xs mt-lg">
            <Link
              to={`/learn/${article.slug}/edit`}
              className="inline-flex items-center gap-xs px-md py-sm rounded-md font-sora text-xs bg-surface border border-border-default text-on-surface-muted hover:text-primary hover:border-primary/50 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </Link>
            <Tooltip label={noteCopied ? "Copied!" : "Copy note as Markdown"}>
              <button
                onClick={handleCopyNote}
                className="inline-flex items-center gap-xs px-md py-sm rounded-md font-sora text-xs bg-surface border border-border-default text-on-surface-muted hover:text-secondary hover:border-secondary/50 transition-colors"
              >
                {noteCopied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Clipboard className="w-3.5 h-3.5" />} {noteCopied ? "Copied" : "Copy"}
              </button>
            </Tooltip>
            <button
              onClick={() => setDeleteTarget(true)}
              className="inline-flex items-center gap-xs px-md py-sm rounded-md font-sora text-xs bg-surface border border-border-default text-on-surface-muted hover:text-error hover:border-error/50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </section>

      {/* Body */}
      <article ref={articleRef} className="max-w-readme mx-auto px-gutter md:px-margin-desktop mb-giant">
        <div className="story-prose font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl">
          {blocks.length > 0 ? (
            <ContentBlocks
              blocks={blocks}
              sectionIndex={0}
              highlights={mapped}
              onHighlightClick={(id) => highlightClickRef.current(id)}
            />
          ) : (
            <p className="font-dm-sans text-sm text-on-surface-muted italic">
              This note is empty : hit Edit to write something.
            </p>
          )}
        </div>
      </article>

      {/* Unmapped notes : comments whose highlight anchor drifted on edit */}
      {orphans.length > 0 && (
        <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop mb-giant">
          <h2 className="font-sora text-headline-md text-on-surface mb-md">Unmapped notes</h2>
          <p className="font-dm-sans text-sm text-on-surface-muted mb-lg">
            These comments' highlighted text was edited away, so they can't be anchored to the page.
            They're kept here so nothing is lost.
          </p>
          <div className="grid grid-cols-1 gap-md max-w-3xl">
            {orphans.map((o) => (
              <OrphanNoteCard
                key={o.id}
                highlight={o}
                isOwner={isOwner}
                onDelete={handleDeleteOrphan}
                deleting={orphanDeleting === o.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Comments */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop mb-giant">
        <Comments
          storySlug={article.slug}
          storyContext={{ title: article.title, body: storyText }}
          refreshSignal={commentsRefresh}
        />
      </section>

      <InlineHighlights
        slug={article.slug}
        storyText={storyText}
        storyTitle={article.title}
        articleRef={articleRef}
        isOwner={isOwner}
        onHighlightsChange={handleHighlightsChange}
        highlightClickRef={highlightClickRef}
        selectionAi
      />

      {deleteTarget && (
        <ConfirmModal
          title="Delete note?"
          message={`"${article.title}" and all its comments and highlights will be permanently removed.`}
          onConfirm={confirmDeleteArticle}
          onCancel={() => setDeleteTarget(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}
