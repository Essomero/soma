import { useParams, Link, useLocation } from "react-router-dom";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import AccentBar from "@/components/ui/AccentBar";
import Tag from "@/components/ui/Tag";
import PullQuote from "@/components/ui/PullQuote";
import BentoCard from "@/components/cards/BentoCard";
import ArticleCard from "@/components/cards/ArticleCard";
import SidebarAbout from "@/components/sections/SidebarAbout";
import ContentBlocks from "@/components/ui/ContentBlocks";
import SelectionToolbar from "@/components/ui/SelectionToolbar";
import Tooltip from "@/components/ui/Tooltip";
import ConfirmModal from "@/components/ui/ConfirmModal";
import StoryJumpButtons from "@/components/ui/StoryJumpButtons";
import { SectionHeader } from "@/components/ui/SectionHeader";
import PrintButton from "@/components/ui/PrintButton";
import { useContentItem, useContentList } from "@/lib/content";
import type { StoryContent, CourseContent, BookContent, SeriesContent, TestContent } from "@/types";
import { ArrowLeft, ArrowRight, ExternalLink, Check, Copy, Bookmark, Loader2, Trash2, Bot, PenLine, Eye, Send, X, ChevronDown, Reply, Maximize2, Sparkles, Edit3 } from "lucide-react";
import { mdBlock, contentToMarkdown, md } from "@/lib/markdown";
import MarkdownHtml from "@/components/ui/MarkdownHtml";
import { useProgress } from "@/lib/useProgress";
import { getReadingTime } from "@/lib/readingTime";
import StarRating from "@/components/ui/StarRating";
import Comments from "@/components/ui/Comments";
import { useAuth } from "@/lib/AuthContext";
import { useTextSelection } from "@/lib/useTextSelection";
import { getSelectionOffsets, type HighlightData, COMMENT_MAX_DEPTH } from "@/lib/highlights";
import { useScrollLock } from "@/lib/useScrollLock";
import { buildLessonIndex, resolveSectionAnchors, storyCodePrefix } from "@/lib/storyLinks";
import SafeImage from "@/components/ui/SafeImage";

interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  free?: boolean;
}

const DEFAULT_MODELS: ModelInfo[] = [
  { id: "deepseek-flash", label: "DeepSeek Flash", provider: "deepseek" },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "deepseek" },
];

// ── Threaded comment helpers ─────────────────────
interface ThreadedComment {
  id: number;
  body: string;
  parentId: number | null;
  isAi: boolean;
  aiModel: string | null;
  aiAction?: "explain" | "summarize"; // tag for AI-initiated actions
  createdAt: string;
  updatedAt: string | null;
  replies: ThreadedComment[];
}

function buildCommentTree(flat: any[]): ThreadedComment[] {
  const map: Record<number, ThreadedComment> = {};
  const roots: ThreadedComment[] = [];
  for (const c of flat) {
    map[c.id] = { id: c.id, body: c.body, parentId: c.parentId ?? null, isAi: c.isAi ?? false, aiModel: c.aiModel ?? null, createdAt: c.createdAt, updatedAt: c.updatedAt ?? null, replies: [] };
  }
  for (const c of flat) {
    const node = map[c.id];
    if (node.parentId != null && map[node.parentId]) {
      map[node.parentId].replies.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function addReplyToTree(comments: ThreadedComment[], parentId: number | null, child: ThreadedComment): ThreadedComment[] {
  if (parentId == null) return [...comments, child];
  return comments.map(c => {
    if (c.id === parentId) return { ...c, replies: [...c.replies, child] };
    if (c.replies.length) return { ...c, replies: addReplyToTree(c.replies, parentId, child) };
    return c;
  });
}

function removeCommentFromTree(comments: ThreadedComment[], commentId: number): ThreadedComment[] {
  return comments
    .filter(c => c.id !== commentId)
    .map(c => c.replies.length ? { ...c, replies: removeCommentFromTree(c.replies, commentId) } : c);
}

function StoryProgressButton({ slug }: { slug: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    fetch(`/api/progress?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json()).then(rows => setDone(!!(rows?.[0]?.completed)))
      .catch(() => {});
  }, [slug]);
  const toggle = async () => {
    setDone(!done);
    await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, completed: !done }) }).catch(() => {});
  };
  return (
    <button onClick={toggle} className={`inline-flex items-center gap-sm px-xl py-md rounded-lg font-sora text-sm transition-all ${done ? "bg-secondary/10 border border-secondary/40 text-secondary" : "bg-surface-container-low border border-border-default text-on-surface-muted hover:border-primary/40 hover:text-primary"}`}>
      {done ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
      {done ? "Completed" : "Mark as read"}
    </button>
  );
}

function CollectionProgressButton({ collectionSlug, storySlugs, title, currentSlug }: { collectionSlug: string; storySlugs: string[]; title: string; currentSlug: string }) {
  const { isCompleted, toggle } = useProgress(collectionSlug, storySlugs);
  const done = isCompleted(currentSlug);
  return (
    <button
      onClick={() => toggle(currentSlug)}
      className={`inline-flex items-center gap-sm px-xl py-md rounded-lg font-sora text-sm transition-all ${
        done
          ? "bg-secondary/10 border border-secondary/40 text-secondary"
          : "bg-surface-container-low border border-border-default text-on-surface-muted hover:border-primary/40 hover:text-primary"
      }`}
    >
      {done ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
      {done ? `${title} : Completed` : `Mark as read in ${title}`}
    </button>
  );
}

export default function StoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: story, loading: storyLoading } = useContentItem<StoryContent>("story", slug);
  const courses = useContentList<CourseContent>("course").data ?? [];
  const books = useContentList<BookContent>("book").data ?? [];
  usePageMeta({ title: story?.title, description: story?.excerpt, image: story?.image });
  const series = useContentList<SeriesContent>("series").data ?? [];
  const tests = useContentList<TestContent>("test").data ?? [];
  const stories = useContentList<StoryContent>("story").data ?? [];
  const location = useLocation();

  // Section anchor ids + the number→id map hints link against. Resolved before
  // the not-found bail-out so hook order stays stable across renders.
  const sectionAnchors = useMemo(
    () => resolveSectionAnchors((story?.sections ?? []).map((s) => s.heading)),
    [story],
  );

  // Lesson references in hints become a "read next" row pointing at the
  // lesson's story page, labelled the way the reader's own course names it.
  const lessonIndex = useMemo(() => {
    const own = courses.filter((c) => c.lessons.some((l) => l.storySlug === slug));
    return buildLessonIndex([...own, ...courses]);
  }, [slug, courses]);
  const lessonLinks = useMemo(
    () => ({ prefix: story ? storyCodePrefix(story.slug) : null, index: lessonIndex }),
    [story, lessonIndex],
  );

  // Lesson diagnostic test (if this story has an associated test)
  const lessonTest = useMemo(() => tests.find((t) => t.storySlug === slug), [slug, tests]);

  // Reading time
  const storyText = [story?.intro || "", ...(story?.body || []), ...(story?.sections?.flatMap((s) => s.paragraphs.filter((p): p is string => typeof p === "string")) || [])].join(" ");
  const readingTime = getReadingTime(storyText);

  // ── Highlights ────────────────────────────────────────
  const { isOwner } = useAuth();
  const [highlights, setHighlights] = useState<HighlightData[]>([]);
  const [commentsRefresh, setCommentsRefresh] = useState(0);
  const articleRef = useRef<HTMLElement>(null);
  const { selection, clearSelection } = useTextSelection(articleRef);

  const fetchHighlights = useCallback(async () => {
    if (!slug) return;
    try {
      const r = await fetch(`/api/highlights?story=${encodeURIComponent(slug)}`);
      if (r.ok) {
        const data = await r.json();
        setHighlights(data.map((h: any) => ({
          id: h.id,
          sectionIndex: Number(h.sectionIndex),
          paragraphIndex: Number(h.paragraphIndex),
          startOffset: Number(h.startOffset),
          endOffset: Number(h.endOffset),
          color: h.color,
          comments: buildCommentTree(h.comments || []),
        })));
      }
    } catch {}
  }, [slug]);

  useEffect(() => { fetchHighlights(); }, [fetchHighlights]);

  const handleHighlight = useCallback(async (color: string) => {
    if (!selection.container || !slug) return;

    const offsets = getSelectionOffsets(selection.container, window.getSelection()!);
    if (!offsets) return;

    const containerEl = selection.container;
    const sectionIndex = parseInt(containerEl.dataset.sectionIndex || "0", 10);
    const paragraphIndex = parseInt(containerEl.dataset.paragraphIndex || "0", 10);

    // Simple hash of selected text for validation
    const textHash = offsets.text.slice(0, 20);

    try {
      const r = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: slug,
          sectionIndex,
          paragraphIndex,
          startOffset: offsets.start,
          endOffset: offsets.end,
          selectedText: offsets.text,
          textHash,
          color,
        }),
      });
      if (r.ok) {
        const created = await r.json();
        clearSelection();
        window.getSelection()?.removeAllRanges();
        // Optimistic: add to state immediately (no reload wait)
        setHighlights((prev) => [...prev, {
          id: created.id,
          sectionIndex: Number(created.sectionIndex),
          paragraphIndex: Number(created.paragraphIndex),
          startOffset: Number(created.startOffset),
          endOffset: Number(created.endOffset),
          color: created.color,
          comments: [],
        }]);
      }
    } catch {}
  }, [selection, slug, clearSelection]);

  const [activeHighlight, setActiveHighlight] = useState<{ id: number; x: number; y: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteHighlightTarget, setDeleteHighlightTarget] = useState<number | null>(null);
  const [deleteCommentTarget, setDeleteCommentTarget] = useState<number | null>(null);
  const [inlineDeleting, setInlineDeleting] = useState<number | null>(null);
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);

  // ── AI reply state for inline comments ──────────────
  const [inlineAiLoading, setInlineAiLoading] = useState<number | null>(null);
  const [inlineAiDrafts, setInlineAiDrafts] = useState<Map<number, string>>(new Map());
  const [inlineAiDraftTabs, setInlineAiDraftTabs] = useState<Map<number, "write" | "preview">>(new Map());
  const [inlineAiError, setInlineAiError] = useState<{id: number, message: string} | null>(null);
  const [inlineModels, setInlineModels] = useState<ModelInfo[]>(DEFAULT_MODELS);
  const [inlineAiReady, setInlineAiReady] = useState(false);
  const [inlineAiModel, setInlineAiModel] = useState<string>("deepseek-flash");
  const [inlineAiProvider, setInlineAiProvider] = useState<string>("deepseek");
  const [inlineModelMenuOpen, setInlineModelMenuOpen] = useState(false);
  const inlineModelMenuRef = useRef<HTMLDivElement>(null);
  // No provider keys configured yet: AI actions stay visible but disabled,
  // so readers learn the feature exists instead of wondering where it went.
  const aiUnavailable = !inlineAiReady || inlineModels.length === 0;

  // ── Explain state (AI explains selected text) ──────
  const [explainState, setExplainState] = useState<{
    highlightId: number;
    draft: string;
  } | null>(null);

  // Manual reply state
  const [inlineReplyToId, setInlineReplyToId] = useState<number | null>(null);
  const [inlineReplyBody, setInlineReplyBody] = useState("");
  const [inlineExpanded, setInlineExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Lock page scroll while the expanded modal is open
  useScrollLock(inlineExpanded);

  // Esc to dismiss comment popover: expanded → minimise, minimised → close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Don't close if user is typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (deleteHighlightTarget != null) {
        setDeleteHighlightTarget(null);
      } else if (deleteCommentTarget != null) {
        setDeleteCommentTarget(null);
      } else if (inlineExpanded) {
        setInlineExpanded(false);
        setActiveHighlight(null);
      } else if (activeHighlight) {
        setActiveHighlight(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inlineExpanded, activeHighlight, deleteHighlightTarget, deleteCommentTarget]);

  // Fetch available AI models. Until this resolves with a non-empty list,
  // AI actions render disabled: no keys must never look like a working model.
  useEffect(() => {
    fetch("/api/models")
      .then(r => r.json())
      .then(data => {
        setInlineModels(data.models ?? []);
        setInlineAiReady(true);
        if (data.models?.length) {
          const current = data.models.find((m: ModelInfo) => m.id === inlineAiModel && m.provider === inlineAiProvider);
          if (!current) {
            setInlineAiModel(data.models[0].id);
            setInlineAiProvider(data.models[0].provider);
          }
        }
      })
      .catch(() => { setInlineModels([]); setInlineAiReady(true); });
  }, []);

  // Close model menu on click outside
  useEffect(() => {
    if (!inlineModelMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (inlineModelMenuRef.current && !inlineModelMenuRef.current.contains(e.target as Node)) {
        setInlineModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [inlineModelMenuOpen]);

  const handleCommentOnSelection = useCallback(async () => {
    if (!selection.container || !slug) return;

    const offsets = getSelectionOffsets(selection.container, window.getSelection()!);
    if (!offsets) return;

    const rect = window.getSelection()?.getRangeAt(0)?.getBoundingClientRect();
    const popoverX = rect ? rect.left + rect.width / 2 : selection.x + 100;
    const popoverY = rect ? rect.bottom : selection.y;

    try {
      const r = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: slug,
          sectionIndex: selection.sectionIndex,
          paragraphIndex: selection.paragraphIndex,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
          selectedText: selection.selectedText,
          textHash: selection.textHash,
          color: "underline",
        }),
      });
      if (r.ok) {
        const created = await r.json();
        clearSelection();
        window.getSelection()?.removeAllRanges();
        setHighlights((prev) => [...prev, {
          id: created.id,
          sectionIndex: Number(created.sectionIndex),
          paragraphIndex: Number(created.paragraphIndex),
          startOffset: Number(created.startOffset),
          endOffset: Number(created.endOffset),
          color: created.color,
          comments: [],
        }]);
        setActiveHighlight({ id: created.id, x: popoverX, y: popoverY });
        setCommentBody("");
      }
    } catch {}
  }, [selection, slug, clearSelection]);

  const handleAiAction = useCallback(async (action: "explain" | "summarize") => {
    if (!selection.container || !slug) return;

    const offsets = getSelectionOffsets(selection.container, window.getSelection()!);
    if (!offsets) return;

    const rect = window.getSelection()?.getRangeAt(0)?.getBoundingClientRect();
    const popoverX = rect ? rect.left + rect.width / 2 : selection.x + 100;
    const popoverY = rect ? rect.bottom : selection.y;

    const actionLabel = action === "explain" ? "Explain" : "Summarize";

    // 1. Create underline highlight
    let highlightId: number;
    try {
      const r = await fetch("/api/highlights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: slug,
          sectionIndex: selection.sectionIndex,
          paragraphIndex: selection.paragraphIndex,
          startOffset: selection.startOffset,
          endOffset: selection.endOffset,
          selectedText: selection.selectedText,
          textHash: selection.textHash,
          color: "underline",
        }),
      });
      if (!r.ok) return;
      const created = await r.json();
      highlightId = created.id;

      clearSelection();
      window.getSelection()?.removeAllRanges();

      setHighlights((prev) => [...prev, {
        id: created.id,
        sectionIndex: Number(created.sectionIndex),
        paragraphIndex: Number(created.paragraphIndex),
        startOffset: Number(created.startOffset),
        endOffset: Number(created.endOffset),
        color: created.color,
        comments: [],
      }]);

      setActiveHighlight({ id: created.id, x: popoverX, y: popoverY });
    } catch {
      return;
    }

    // 2. Stream AI response : render draft as a temp comment
    const TEMP_ID = -(Date.now()); // negative ID = temp, won't collide with real DB ids
    setExplainState({ highlightId, draft: "" });

    // Seed a temp comment so it renders inline immediately
    const tempComment: ThreadedComment = {
      id: TEMP_ID,
      body: "",
      parentId: null,
      isAi: true,
      aiModel: inlineAiModel,
      aiAction: action,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      replies: [],
    };
    setHighlights((prev) => prev.map((hl) =>
      hl.id === highlightId
        ? { ...hl, comments: [...(hl.comments || []), tempComment] as ThreadedComment[] }
        : hl,
    ));

    try {
      const articleExcerpt = storyText.slice(0, 4000) + (storyText.length > 4000 ? "..." : "");

      const systemPrompt = action === "explain"
        ? `You explain concepts in the distinctive style of Aditya Bhargava's "Grokking Algorithms": simple, not easy, never dumbed down, and relentlessly illustrative.

Core philosophy:
- Simplify the language, never the truth. Keep full technical depth, edge cases, and real trade-offs, but cut academic jargon, dense abstractions, and needless filler.
- Intuition before vocabulary: ground the idea in a physical object, everyday metaphor, or small napkin sketch before naming the formal engineering term.
- The marker-and-napkin test: break down what's actually happening step-by-step with concrete numbers, real cause-and-effect, and small ASCII sketches or flow boxes.
- Swap abstract nouns for real things you can picture.
- Say what it isn't: call out the near-miss, subtle trap, or common misunderstanding.
- Contractions always (it's, don't, you're). Active voice. Short, punchy paragraphs (1-3 sentences).
- Zero hedge openers ("In this passage", "It's worth noting", "Let's look at"). Never use em dashes.

Structure your response using these markdown ## headings:

## The Napkin Sketch
The intuitive physical mental model or everyday analogy that makes this passage instantly click (include a tiny ASCII diagram or sketch if helpful).

## The Mechanics (Under The Hood)
What is actually happening step-by-step with concrete cause-and-effect. Simplify the language, not the facts.

## What It Isn't & Why It Matters
The common misconception or near-miss to avoid, and the real-world trade-off or reason this matters.

## The One Takeaway
One memorable sentence capturing the core insight.`
        : `You are a skilled editor summarizing a passage from an article. Distill the highlighted text down to its essential point in 1-3 sentences. Be concise and clear. Use markdown formatting.`;

      const userMessage = action === "explain"
        ? "Explain what this passage means and why it matters in Grokking Algorithms style (simple, illustrative, concrete, not dumbed down)."
        : "Summarize this passage concisely.";

      const systemPromptFull = `${systemPrompt}

--- HIGHLIGHTED TEXT ---
"${offsets.text.slice(0, 2000)}"

--- ARTICLE CONTEXT ---
${story?.title ? `Title: ${story.title}\n` : ""}${articleExcerpt}
--- END CONTEXT ---`;

      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: systemPromptFull,
          userMessage,
          model: inlineAiModel,
          provider: inlineAiProvider,
          stream: true,
        }),
      });

      if (!r.ok) throw new Error(`AI service error (HTTP ${r.status})`);

      const reader = r.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const token = parsed.choices?.[0]?.delta?.content || "";
            if (token) {
              fullResponse += token;
              // Update the temp comment body inline
              setHighlights((prev) => prev.map((hl) =>
                hl.id === highlightId
                  ? { ...hl, comments: (hl.comments || []).map((c) =>
                      (c as ThreadedComment).id === TEMP_ID
                        ? { ...(c as ThreadedComment), body: fullResponse }
                        : c,
                    )}
                  : hl,
              ));
            }
          } catch {}
        }
      }

      // 3. Draft is ready : it stays as a temp comment for the user to review
      if (!fullResponse.trim()) {
        // Empty response : remove the temp comment
        setHighlights((prev) => prev.map((hl) =>
          hl.id === highlightId
            ? { ...hl, comments: (hl.comments || []).filter((c) => (c as ThreadedComment).id !== TEMP_ID) }
            : hl,
        ));
      }
    } catch (e: any) {
      console.error(`${actionLabel} failed:`, e);
      // Remove the temp comment on failure
      setHighlights((prev) => prev.map((hl) =>
        hl.id === highlightId
          ? { ...hl, comments: (hl.comments || []).filter((c) => (c as ThreadedComment).id !== TEMP_ID) }
          : hl,
      ));
    }
    setExplainState(null);
  }, [selection, slug, clearSelection, storyText, story, inlineAiModel, inlineModels]);

  // ── Post / cancel AI draft ──────────────────────────
  const [draftPosting, setDraftPosting] = useState<number | null>(null);

  const handlePostDraft = useCallback(async (highlightId: number, tempId: number, body: string, action: "explain" | "summarize") => {
    if (!slug || draftPosting !== null) return;
    setDraftPosting(tempId);
    try {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: slug,
          body,
          highlightId,
          isAi: true,
          aiModel: inlineAiModel,
        }),
      });
      if (r.ok) {
        setCommentsRefresh((n: number) => n + 1);
        const newComment = await r.json();
        setHighlights((prev) => prev.map((hl) =>
          hl.id === highlightId
            ? { ...hl, comments: (hl.comments || []).map((c) =>
                (c as ThreadedComment).id === tempId
                  ? {
                      id: newComment.id,
                      body,
                      parentId: null,
                      isAi: true,
                      aiModel: inlineAiModel,
                      aiAction: action,
                      createdAt: new Date().toISOString(),
                      updatedAt: null,
                      replies: [],
                    } as ThreadedComment
                  : c,
              )}
            : hl,
        ));
        setCommentsRefresh((n: number) => n + 1);
      }
    } catch {}
    setDraftPosting(null);
  }, [slug, draftPosting, inlineAiModel]);

  const handleCancelDraft = useCallback((highlightId: number, tempId: number) => {
    setHighlights((prev) => prev.map((hl) =>
      hl.id === highlightId
        ? { ...hl, comments: (hl.comments || []).filter((c) => (c as ThreadedComment).id !== tempId) }
        : hl,
    ));
  }, []);

  const handleHighlightClick = useCallback((highlightId: number) => {
    const mark = document.querySelector(`mark[data-highlight-id="${highlightId}"]`);
    if (mark) {
      const rect = mark.getBoundingClientRect();
      setActiveHighlight({ id: highlightId, x: rect.left + rect.width / 2, y: rect.bottom });
      setCommentBody("");
    }
  }, []);

  // Reposition popover on scroll/resize so it tracks the highlighted text
  const activeHighlightId = activeHighlight?.id;
  useEffect(() => {
    if (activeHighlightId == null) return;

    const reposition = () => {
      const mark = document.querySelector(`mark[data-highlight-id="${activeHighlightId}"]`);
      if (mark) {
        const rect = mark.getBoundingClientRect();
        setActiveHighlight((prev) =>
          prev ? { ...prev, x: rect.left + rect.width / 2, y: rect.bottom } : null,
        );
      }
    };

    window.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [activeHighlightId]);

  const activeHighlightData = activeHighlight
    ? highlights.find((h) => h.id === activeHighlight.id)
    : null;

  const handlePostComment = useCallback(async () => {
    if (!commentBody.trim() || !activeHighlight || posting || !slug) return;
    setPosting(true);
    try {
      const h = activeHighlightData;
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: slug,
          body: commentBody.trim(),
          highlightId: activeHighlight.id,
          sectionIndex: h?.sectionIndex ?? null,
          paragraphIndex: h?.paragraphIndex ?? null,
          startOffset: h?.startOffset ?? null,
          endOffset: h?.endOffset ?? null,
        }),
      });
      if (r.ok) {
        setCommentsRefresh((n: number) => n + 1);
        const newComment = await r.json();
        // Add comment to local state
        setHighlights((prev) => prev.map((hl) =>
          hl.id === activeHighlight.id
            ? { ...hl, comments: addReplyToTree((hl.comments || []) as ThreadedComment[], null, { id: newComment.id, body: commentBody.trim(), parentId: null, isAi: false, aiModel: null, createdAt: new Date().toISOString(), updatedAt: null, replies: [] }) }
            : hl,
        ));
        setCommentBody("");
      }
    } catch {}
    setPosting(false);
  }, [commentBody, activeHighlight, posting, slug, activeHighlightData]);


  const handleDeleteHighlight = useCallback(() => {
    if (!activeHighlight || deleting) return;
    setDeleteHighlightTarget(activeHighlight.id);
  }, [activeHighlight, deleting]);

  const confirmDeleteHighlight = useCallback(async () => {
    if (deleteHighlightTarget == null) return;
    const highlightId = deleteHighlightTarget;
    setDeleting(true);
    try {
      const r = await fetch("/api/highlights", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: highlightId }),
      });
      if (r.ok) {
        setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
        if (activeHighlight?.id === highlightId) {
          setActiveHighlight(null);
          setInlineExpanded(false);
        }
      }
    } catch {}
    setDeleting(false);
    setDeleteHighlightTarget(null);
  }, [deleteHighlightTarget, activeHighlight]);

  // ── AI reply for inline comments ────────────────────

  // Walk the threaded tree to find the parent chain for a comment
  const findThreadChain = (commentId: number, nodes: ThreadedComment[], path: ThreadedComment[] = []): ThreadedComment[] | null => {
    for (const node of nodes) {
      if (node.id === commentId) return [...path, node];
      if (node.replies?.length) {
        const found = findThreadChain(commentId, node.replies, [...path, node]);
        if (found) return found;
      }
    }
    return null;
  };

  const handleInlineAiReply = useCallback(async (comment: { id: number; body: string }) => {
    if (inlineAiLoading !== null) return;
    setInlineAiLoading(comment.id);
    setInlineAiError(null);

    setInlineAiDrafts(prev => { const next = new Map(prev); next.set(comment.id, ""); return next; });
    setInlineAiDraftTabs(prev => { const next = new Map(prev); next.set(comment.id, "write"); return next; });

    try {
      // Get highlighted text for context
      const mark = activeHighlightId ? document.querySelector(`mark[data-highlight-id="${activeHighlightId}"]`) : null;
      const highlightedText = mark?.textContent || "";

      const articleExcerpt = storyText.slice(0, 4000) + (storyText.length > 4000 ? "..." : "");

      // Build thread context from parent chain
      const comments = activeHighlightData?.comments as ThreadedComment[] | undefined;
      const chain = comments ? findThreadChain(comment.id, comments) : null;
      let threadContext = "";
      if (chain && chain.length > 1) {
        threadContext = "\n\n--- THREAD CONTEXT (read bottom-to-top) ---\n";
        for (const c of chain) {
          const author = c.isAi
            ? (inlineModels.find(m => m.id === c.aiModel)?.label || "AI")
            : "User";
          threadContext += `\n[${author}]: ${c.body}\n`;
        }
        threadContext += "--- END THREAD ---\n\n";
      }

      const systemPrompt = `You are a helpful assistant replying to a comment on a highlighted passage. Use the context below. Write a concise, friendly reply. Reference the highlighted text when relevant. Use markdown formatting.

--- HIGHLIGHTED TEXT ---
"${highlightedText.slice(0, 2000)}"

--- ARTICLE EXCERPT ---
${story?.title ? `Title: ${story.title}\n` : ""}${articleExcerpt}
--- END CONTEXT ---`;

      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          userMessage: `Reply to this comment:\n\n${comment.body}${threadContext}`,
          model: inlineAiModel,
          provider: inlineAiProvider,
          stream: true,
        }),
      });

      if (!r.ok) {
        let msg = `AI service error (HTTP ${r.status})`;
        try { const errData = await r.json(); if (errData.error) msg = errData.error; } catch {}
        throw new Error(msg);
      }

      const reader = r.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const token = parsed.choices?.[0]?.delta?.content || "";
            if (token) {
              setInlineAiDrafts(prev => {
                const next = new Map(prev);
                next.set(comment.id, (next.get(comment.id) || "") + token);
                return next;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      setInlineAiError({ id: comment.id, message: e.message || "Unknown error" });
      setInlineAiDrafts(prev => { const next = new Map(prev); next.delete(comment.id); return next; });
      setInlineAiDraftTabs(prev => { const next = new Map(prev); next.delete(comment.id); return next; });
    }
    setInlineAiLoading(null);
  }, [inlineAiLoading, activeHighlightId, storyText, story, inlineAiModel, inlineModels, activeHighlightData]);

  const postInlineAiReply = useCallback(async (commentId: number) => {
    const draft = inlineAiDrafts.get(commentId);
    if (!draft?.trim() || !slug || !activeHighlight) return;
    setPosting(true);
    try {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: slug,
          body: draft.trim(),
          highlightId: activeHighlight.id,
          parentId: commentId,
          isAi: true,
          aiModel: inlineAiModel,
        }),
      });
      if (r.ok) {
        setCommentsRefresh((n: number) => n + 1);
        const newComment = await r.json();
        setHighlights((prev) => prev.map((hl) =>
          hl.id === activeHighlight.id
            ? { ...hl, comments: addReplyToTree((hl.comments || []) as ThreadedComment[], commentId, { id: newComment.id, body: draft.trim(), parentId: commentId, isAi: true, aiModel: inlineAiModel, createdAt: new Date().toISOString(), updatedAt: null, replies: [] }) }
            : hl,
        ));
        setInlineAiDrafts(prev => { const next = new Map(prev); next.delete(commentId); return next; });
        setInlineAiDraftTabs(prev => { const next = new Map(prev); next.delete(commentId); return next; });
      }
    } catch {}
    setPosting(false);
  }, [inlineAiDrafts, slug, activeHighlight, inlineAiModel]);

  const cancelInlineAiReply = useCallback((commentId: number) => {
    setInlineAiDrafts(prev => { const next = new Map(prev); next.delete(commentId); return next; });
    setInlineAiDraftTabs(prev => { const next = new Map(prev); next.delete(commentId); return next; });
    setInlineAiError(null);
  }, []);

  // Manual reply to an inline comment
  const handlePostInlineReply = useCallback(async (parentId: number) => {
    if (!inlineReplyBody.trim() || !slug || !activeHighlight || posting) return;
    setPosting(true);
    try {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storySlug: slug,
          body: inlineReplyBody.trim(),
          highlightId: activeHighlight.id,
          parentId,
        }),
      });
      if (r.ok) {
        setCommentsRefresh((n: number) => n + 1);
        const newComment = await r.json();
        setHighlights((prev) => prev.map((hl) =>
          hl.id === activeHighlight.id
            ? { ...hl, comments: addReplyToTree((hl.comments || []) as ThreadedComment[], parentId, { id: newComment.id, body: inlineReplyBody.trim(), parentId, isAi: false, aiModel: null, createdAt: new Date().toISOString(), updatedAt: null, replies: [] }) }
            : hl,
        ));
        setInlineReplyToId(null);
        setInlineReplyBody("");
      }
    } catch {}
    setPosting(false);
  }, [inlineReplyBody, slug, activeHighlight, posting]);

  // Delete individual inline comment

  const handleCopyComment = useCallback((c: { id: number; body: string }) => {
    const text = c.body;
    const onSuccess = () => {
      setCopiedId(c.id);
      setTimeout(() => setCopiedId((prev) => (prev === c.id ? null : prev)), 1500);
    };
    const fallback = () => {
      try {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        onSuccess();
      } catch {}
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(fallback);
    } else {
      fallback();
    }
  }, []);

  const handleDeleteInlineComment = useCallback((commentId: number) => {
    if (inlineDeleting !== null) return;
    setDeleteCommentTarget(commentId);
  }, [inlineDeleting]);

  const confirmDeleteInlineComment = useCallback(async () => {
    if (deleteCommentTarget == null) return;
    const commentId = deleteCommentTarget;
    setInlineDeleting(commentId);
    try {
      const r = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: commentId }),
      });
      if (r.ok) {
        setCommentsRefresh((n: number) => n + 1);
        setHighlights((prev) => prev.map((hl) => ({
          ...hl,
          comments: removeCommentFromTree((hl.comments || []) as ThreadedComment[], commentId),
        })));
      }
    } catch {}
    setInlineDeleting(null);
    setDeleteCommentTarget(null);
  }, [deleteCommentTarget]);

  // Find collection navigation : courses, books, and series this story belongs to
  type NavEntry = { collection: { title: string; slug: string }; type: string; prev: { title: string; storySlug: string } | null; next: { title: string; storySlug: string } | null };
  const collectionNav: NavEntry[] = slug
    ? [
        ...courses
          .filter((c) => c.lessons.some((l) => l.storySlug === slug))
          .map((c) => {
            const idx = c.lessons.findIndex((l) => l.storySlug === slug);
            return { collection: c, type: "course", prev: idx > 0 ? c.lessons[idx - 1] : null, next: idx < c.lessons.length - 1 ? c.lessons[idx + 1] : null };
          }),
        ...books
          .filter((b) => b.chapters.some((ch) => ch.storySlug === slug))
          .map((b) => {
            const idx = b.chapters.findIndex((ch) => ch.storySlug === slug);
            return { collection: b, type: "book", prev: idx > 0 ? b.chapters[idx - 1] : null, next: idx < b.chapters.length - 1 ? b.chapters[idx + 1] : null };
          }),
        ...series
          .filter((s) => s.episodes.some((e) => e.storySlug === slug))
          .map((s) => {
            const idx = s.episodes.findIndex((e) => e.storySlug === slug);
            return { collection: s, type: "series", prev: idx > 0 ? s.episodes[idx - 1] : null, next: idx < s.episodes.length - 1 ? s.episodes[idx + 1] : null };
          }),
      ]
    : [];

  if (storyLoading) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-on-surface-muted" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <h1 className="font-sora text-headline-md text-on-surface mb-md">Story Not Found</h1>
        <p className="text-on-surface-muted mb-xl">The story you're looking for doesn't exist yet.</p>
        <Link to="/stories" className="text-primary hover:underline font-bold">
          ← Browse all stories
        </Link>
      </div>
    );
  }

  // Content from the story object : no hardcoded maps
  const hasRichContent = !!(story.sections && story.sections.length > 0);
  const hasBento = !!(story.bentoHighlights && story.bentoHighlights.length > 0);
  const hasMultiPullQuotes = !!(story.pullQuotes && story.pullQuotes.length > 0);

  const otherStories = stories.filter((s) => s.id !== story.id).slice(0, 3);
  const storyMarkdown = contentToMarkdown({
    title: story.title,
    intro: story.intro,
    body: story.body,
    sections: story.sections,
    references: story.references,
  });
  return (
    <div className="pt-xxl">
      {/* Hero */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop mb-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          <div className="md:col-span-8">
            <AccentBar variant="small" className="mb-md" />
            <Tag variant="primary" className="mb-sm block">{story.category}</Tag>
            <h1 className="font-sora text-headline-md mb-md leading-tight text-on-surface">{story.title}</h1>
            <p className="font-sora text-article-title text-on-surface-variant mb-xl" dangerouslySetInnerHTML={{ __html: md(story.excerpt) }} />
            {story.author && (
              <div className="flex flex-wrap items-center gap-sm font-sora text-metadata-tag text-primary uppercase tracking-widest mb-lg">
                <span>{story.author.name}</span>
                {story.date && (
                  <>
                    <span className="text-on-surface-muted">//</span>
                    <span className="text-on-surface-muted">{story.date}</span>
                  </>
                )}
                <span className="text-on-surface-muted">//</span>
                <span className="text-on-surface-muted">{readingTime} min read</span>
                <span className="text-on-surface-muted">//</span>
                <PrintButton to={`${location.pathname}/print`} compact className="normal-case tracking-normal" />
                {isOwner && (
                  <Link to={`/admin/story/${slug}/edit`}
                    className="print:hidden inline-flex items-center gap-sm font-sora bg-primary text-on-primary border-primary hover:bg-primary-hover transition-all shadow-sm rounded-lg font-semibold px-md py-sm text-xs"
                    title="Edit content"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </Link>
                )}
              </div>
            )}
            {story.source && (
              <a
                href={story.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-sm px-md py-sm bg-surface-container-low border border-border-default rounded-lg font-sora text-[10px] uppercase tracking-widest text-on-surface-muted hover:text-primary hover:border-primary/50 transition-colors mb-xxl"
              >
                <ExternalLink className="w-3 h-3" />
                Source: {story.source.name}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop mb-giant">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-giant">
          {/* Sidebar */}
          <aside className="md:col-span-3 space-y-xl border-t border-border-default pt-xl md:border-t-0 md:pt-0">
            <SidebarAbout
              publicToggleSlug={
                books.some((b) => b.chapters.some((ch) => ch.storySlug === slug))
                  ? undefined // books: no public toggle (copyrighted)
                  : slug
              }
              publicToggleCollection={
                series.find((s) => s.episodes.some((e) => e.storySlug === slug))?.slug
                || courses.find((c) => c.lessons.some((l) => l.storySlug === slug))?.slug
                || undefined
              }
              markdownContent={storyMarkdown}
            />
            {collectionNav.length > 0 && (
              <div className="hidden md:block space-y-sm">
                  {collectionNav.map(({ collection, prev, next }) => (
                    <div key={collection.slug} className="space-y-xs">
                      {collectionNav.length > 1 && (
                        <p className="font-sora text-[10px] text-on-surface-muted uppercase tracking-widest truncate" title={collection.title}>
                          {collection.title}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-sm">
                        {prev ? (
                          <Tooltip label={`Previous: ${prev.title}`} className="w-full">
                          <Link
                            to={`/stories/${prev.storySlug}`}
                            className="w-full flex items-center justify-center gap-xs border border-border-default rounded py-sm font-sora text-metadata-tag hover:border-primary transition-all text-on-surface-variant hover:text-on-surface group"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                            <span>PREV</span>
                          </Link>
                          </Tooltip>
                        ) : (
                          <div
                            className="w-full flex items-center justify-center gap-xs border border-border-default/30 rounded py-sm font-sora text-metadata-tag text-on-surface-muted/30 cursor-not-allowed select-none"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>PREV</span>
                          </div>
                        )}
                        {next ? (
                          <Tooltip label={`Next: ${next.title}`} className="w-full">
                          <Link
                            to={`/stories/${next.storySlug}`}
                            className="w-full flex items-center justify-center gap-xs border border-border-default rounded py-sm font-sora text-metadata-tag hover:border-primary transition-all text-on-surface-variant hover:text-on-surface group"
                          >
                            <span>NEXT</span>
                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                          </Link>
                          </Tooltip>
                        ) : (
                          <div
                            className="w-full flex items-center justify-center gap-xs border border-border-default/30 rounded py-sm font-sora text-metadata-tag text-on-surface-muted/30 cursor-not-allowed select-none"
                          >
                            <span>NEXT</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </aside>

          {/* Article Body */}
          <article ref={articleRef} className="md:col-span-8 space-y-xl">
            {/* Featured Image */}
            <figure className="my-xxl">
              <SafeImage alt={story.imageAlt}
                className="w-full h-auto aspect-[16/9] object-cover rounded-lg border border-border-default"
                src={story.image}
              />
            </figure>

            {(story.intro || story.body.length > 0) ? (
              <>
                {/* Intro (shown in both layouts) */}
                {story.intro && (
                  <div className="font-dm-sans text-body-base leading-relaxed text-on-surface mb-lg">
                    <ContentBlocks
                      blocks={[story.intro]}
                      firstDropCap={true}
                      highlights={highlights}
                      onHighlightClick={handleHighlightClick}
                      sectionRefs={sectionAnchors.refs}
                      lessonLinks={lessonLinks}
                    />
                  </div>
                )}

                {/* Rich layout: sections + bento + multi pull quotes */}
                {hasRichContent ? (
                  <>
                    {/* Body (shown before bento in rich layout, merged as a single ContentBlocks block) */}
                    {story.body.length > 0 && (
                      <div className="font-dm-sans text-body-base leading-relaxed text-on-surface mb-lg">
                        <ContentBlocks
                          blocks={story.body}
                          firstDropCap={false}
                          highlights={highlights}
                          onHighlightClick={handleHighlightClick}
                          sectionRefs={sectionAnchors.refs}
                          lessonLinks={lessonLinks}
                        />
                      </div>
                    )}

                    {/* Bento Highlights */}
                    {hasBento && (
                      <div
                        className={`grid ${
                          story.bentoHighlights!.length === 4 || story.bentoHighlights!.length === 2
                            ? "grid-cols-1 sm:grid-cols-2"
                            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                        } gap-md my-giant`}
                      >
                        {story.bentoHighlights!.map((card) => (
                          <BentoCard key={card.title} card={card} />
                        ))}
                      </div>
                    )}

                    {/* Sections with interspersed pull quotes */}
                    {story.sections!.map((section, i) => {
                      const quoteBefore =
                        hasMultiPullQuotes && i > 0
                          ? story.pullQuotes![i - 1]
                          : null;

                      return (
                        <div key={section.heading} id={sectionAnchors.ids[i]} className="scroll-mt-24">
                          {quoteBefore && (
                            <PullQuote
                              variant={i === 1 ? "gradient-bar" : "border-left"}
                              quote={quoteBefore.quote}
                              attribution={quoteBefore.attribution}
                            />
                          )}
                          <div>
                            <h2 className="font-sora text-article-title text-on-surface pt-lg pb-md" dangerouslySetInnerHTML={{ __html: md(section.heading) }} />
                            <ContentBlocks
                              blocks={section.paragraphs}
                              firstDropCap={i === 0}
                              sectionIndex={i}
                              isPractice={/practice/i.test(section.heading)}
                              highlights={highlights}
                              onHighlightClick={handleHighlightClick}
                              sectionRefs={sectionAnchors.refs}
                              lessonLinks={lessonLinks}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Remaining pull quotes after last section */}
                    {hasMultiPullQuotes &&
                      story.pullQuotes!.length > story.sections!.length - 1 && (
                        <PullQuote
                          variant="border-left"
                          quote={story.pullQuotes![story.pullQuotes!.length - 1].quote}
                          attribution={story.pullQuotes![story.pullQuotes!.length - 1].attribution}
                        />
                      )}
                  </>
                ) : (
                  /* Simple layout: intro + flat body with ContentBlocks for highlights */
                  <>
                    <div className="font-dm-sans text-body-base leading-loose text-on-surface space-y-lg">
                      <ContentBlocks
                        blocks={story.body}
                        firstDropCap={true}
                        highlights={highlights}
                        onHighlightClick={handleHighlightClick}
                      />
                    </div>
                    {story.pullQuote && (
                      <PullQuote
                        variant="border-y"
                        quote={story.pullQuote.quote}
                        attribution={story.pullQuote.attribution}
                      />
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="font-dm-sans text-body-base leading-loose text-on-surface space-y-lg">
                <p className="text-xl text-on-surface-variant">
                  Full article content coming soon.
                </p>
                <p>Check back soon for the complete feature, or explore our other stories below.</p>
              </div>
            )}

            {/* Lesson Diagnostic Test Card (Opens in external tab) */}
            {lessonTest && (
              <div className="mt-giant bg-surface-container-low border border-border-default/80 rounded-2xl p-xl md:p-xxl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent-orange" />
                <div className="flex flex-wrap items-center justify-between gap-md mb-md">
                  <div className="flex items-center gap-xs">
                    <Tag variant="primary">TIMED DIAGNOSTIC TEST</Tag>
                    <span className="text-xs font-sora text-on-surface-muted">
                      {lessonTest.questions.length} Questions · ~{lessonTest.estimatedMinutes || 6} mins
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-sora text-secondary font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Evaluated Feedback
                  </span>
                </div>

                <h3 className="font-sora text-headline-sm text-on-surface mb-sm">
                  {lessonTest.title}
                </h3>
                <p className="font-dm-sans text-sm text-on-surface-muted mb-xl max-w-2xl leading-relaxed">
                  Test your active recall of the invariants and trade-offs taught in this lesson. Answer one timed question at a time, then get practical diagnostic evaluation from your chosen LLM.
                </p>

                <div className="flex flex-wrap items-center justify-between gap-md pt-md border-t border-border-default/40">
                  <div className="flex items-center gap-sm text-xs font-sora text-on-surface-muted">
                    <span>✓ Timed questions</span>
                    <span>·</span>
                    <span>✓ Open &amp; multiple choice</span>
                    <span>·</span>
                    <span>✓ Graded against this lesson</span>
                  </div>

                  <a
                    href={`/tests/${lessonTest.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-xl py-3 rounded-xl bg-primary text-background font-sora text-sm font-bold hover:bg-primary/90 transition-all hover:scale-[1.02] shadow-sm"
                  >
                    <span>Take Lesson Test</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}
          </article>
        </div>
      </section>

      {/* Collection Navigation : previous/next in courses & books */}
      {collectionNav.length > 0 && (
        <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-xl">
          {collectionNav.map(({ collection, type, prev, next }) => (
            <div key={collection.slug} className="border-t border-border-default pt-xl mt-xl first:mt-0 first:border-t-0 first:pt-0">
              <p className="font-sora text-metadata-tag text-primary uppercase mb-lg">
                {collection.title}
              </p>
              <div className="flex justify-between gap-lg">
                {prev ? (
                  <Link
                    to={`/stories/${prev.storySlug}`}
                    className="group flex items-start gap-md p-lg bg-surface-container-low border border-border-default rounded-xl hover:border-primary/50 transition-colors flex-1"
                  >
                    <ArrowLeft className="w-5 h-5 text-on-surface-muted group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-widest">Previous</span>
                      <p className="font-sora text-sm text-on-surface group-hover:text-primary transition-colors">{prev.title}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
                {next ? (
                  <Link
                    to={`/stories/${next.storySlug}`}
                    className="group flex items-start gap-md p-lg bg-surface-container-low border border-border-default rounded-xl hover:border-primary/50 transition-colors flex-1 text-right"
                  >
                    <div className="flex-1">
                      <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-widest">Next</span>
                      <p className="font-sora text-sm text-on-surface group-hover:text-primary transition-colors">{next.title}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-on-surface-muted group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Completion toggle + Star Rating */}
      {slug && (
        <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-lg border-t border-border-default">
          <div className="flex flex-wrap items-center justify-between gap-md">
            <div className="flex flex-wrap items-center gap-md">
              {collectionNav.map(({ collection, type }) => {
                const storySlugs: string[] = (() => {
                  if (type === "course") return courses.find((c) => c.slug === collection.slug)?.lessons.map((l) => l.storySlug) ?? [];
                  if (type === "book") return books.find((b) => b.slug === collection.slug)?.chapters.map((ch) => ch.storySlug) ?? [];
                  if (type === "series") return series.find((s) => s.slug === collection.slug)?.episodes.map((e) => e.storySlug) ?? [];
                  return [];
                })();
                return (
                  <CollectionProgressButton
                    key={collection.slug}
                    collectionSlug={collection.slug}
                    storySlugs={storySlugs}
                    title={collection.title}
                    currentSlug={slug}
                  />
                );
              })}
              {/* Standalone mark-as-read for non-course/book stories */}
              {collectionNav.length === 0 && (
                <StoryProgressButton slug={slug} />
              )}
            </div>
            <StarRating storySlug={slug} />
          </div>
        </section>
      )}

      {/* References : multi-source attribution for original research */}
      {story.references && story.references.length > 0 && (
        <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant border-t border-border-default">
          <h2 className="font-sora text-headline-md text-on-surface mb-xl">References</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md max-w-4xl">
            {story.references.map((ref, i) => (
              <a
                key={i}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-sm p-md bg-surface-container-low border border-border-default rounded-lg hover:border-primary/50 transition-colors group"
              >
                <span className="font-sora text-xs text-on-surface-muted flex-shrink-0 mt-0.5">{i + 1}.</span>
                <div>
                  <p className="font-sora text-sm text-on-surface group-hover:text-primary transition-colors">{ref.title}</p>
                  {ref.description && (
                    <p className="font-dm-sans text-xs text-on-surface-muted mt-xs" dangerouslySetInnerHTML={{ __html: md(ref.description) }} />
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Comments */}
      {slug && <Comments storySlug={slug} storyContext={{ title: story?.title || "", body: storyText }} refreshSignal={commentsRefresh} />}

      {/* More Stories */}
      <section className="bg-surface-container-low py-giant border-t border-border-default">
        <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
          <div className="flex justify-between items-end mb-xxl">
            <div>
              <AccentBar variant="small" className="mb-md" />
              <h2 className="font-sora text-headline-md text-on-surface">More Stories</h2>
            </div>
            <Link to="/stories" className="font-sora text-metadata-tag uppercase tracking-widest text-primary hover:underline pb-2">
              View all stories
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {otherStories.map((s) => (
              <ArticleCard key={s.id} article={s} variant="story" />
            ))}
          </div>
        </div>
      </section>

      {/* Floating Selection Toolbar : owner only */}
      {isOwner && (
        <SelectionToolbar
          visible={selection.visible}
          x={selection.x}
          y={selection.y}
          onHighlight={handleHighlight}
          onComment={handleCommentOnSelection}
          onExplain={() => handleAiAction("explain")}
          onSummarize={() => handleAiAction("summarize")}
          onDismiss={clearSelection}
          models={inlineModels}
          aiModel={inlineAiModel}
          aiProvider={inlineAiProvider}
          aiDisabled={aiUnavailable}
          onAiModelChange={(id, prov) => {
            setInlineAiModel(id);
            if (prov) setInlineAiProvider(prov);
          }}
        />
      )}

      {/* Highlight popover: comments + delete */}
      {activeHighlight && !inlineExpanded && (
        <div className="fixed inset-0 z-modal-above-r3f" onClick={() => setActiveHighlight(null)}>
          <div
            className="absolute bg-surface border border-border-default rounded-xl shadow-2xl w-80 max-h-96 flex flex-col"
            style={{ left: Math.max(8, Math.min(activeHighlight.x - 160, window.innerWidth - 340)), top: Math.min(activeHighlight.y + 8, window.innerHeight - 400) }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-lg py-md border-b border-border-default">
              <span className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">
                {activeHighlightData?.color === "underline" ? "Comment" : "Highlight"}
              </span>
              <div className="flex items-center gap-sm">
                {isOwner && (
                  <div className="relative" ref={inlineModelMenuRef}>
                    <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : "AI model"}>
                    <button
                      type="button"
                      onClick={() => setInlineModelMenuOpen(!inlineModelMenuOpen)}
                      disabled={inlineAiLoading !== null || aiUnavailable}
                      className="flex items-center gap-xs text-on-surface-muted hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    </Tooltip>
                    {inlineModelMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-surface border border-border-default rounded-lg shadow-xl z-50 py-xs min-w-[200px] max-h-[300px] overflow-y-auto thin-scrollbar">
                        {(() => {
                          const deepseek = inlineModels.filter(m => m.provider === "deepseek");
                          const gemini = inlineModels.filter(m => m.provider === "gemini");
                          const openrouter = inlineModels.filter(m => m.provider === "openrouter");
                          const groq = inlineModels.filter(m => m.provider === "groq");
                          const cerebras = inlineModels.filter(m => m.provider === "cerebras");
                          const straitly = inlineModels.filter(m => m.provider === "straitly");
                          return (
                            <>
                              {deepseek.length > 0 && (
                                <>
                                  <SectionHeader label="DeepSeek" dotColor="#b8c3ff" />
                                  {deepseek.map(m => (
                                    <button key={m.id} type="button" onClick={() => { setInlineAiModel(m.id); setInlineModelMenuOpen(false); }}
                                      className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel ? "text-brand" : "text-on-surface"}`}>
                                      {m.label}
                                    </button>
                                  ))}
                                </>
                              )}
                              {gemini.length > 0 && (
                                <>
                                  <SectionHeader label="Gemini" dotColor="#47e175" />
                                  {gemini.map(m => (
                                    <button key={m.id} type="button" onClick={() => { setInlineAiModel(m.id); setInlineModelMenuOpen(false); }}
                                      className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${m.id === inlineAiModel ? "text-brand" : "text-on-surface"}`}>
                                      <span className="truncate mr-sm">{m.label}</span>
                                      {m.free && <span className="text-[9px] text-accent-orange flex-shrink-0">FREE</span>}
                                    </button>
                                  ))}
                                </>
                              )}
                              {groq.length > 0 && (
                                <>
                                  <SectionHeader label="Groq" dotColor="#fde68a" />
                                  {groq.map(m => (
                                    <button key={m.id} type="button" onClick={() => { setInlineAiModel(m.id); setInlineModelMenuOpen(false); }}
                                      className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel ? "text-brand" : "text-on-surface"}`}>
                                      {m.label}
                                    </button>
                                  ))}
                                </>
                              )}
                              {cerebras.length > 0 && (
                                <>
                                  <SectionHeader label="Cerebras" dotColor="#a78bfa" />
                                  {cerebras.map(m => (
                                    <button key={m.id} type="button" onClick={() => { setInlineAiModel(m.id); setInlineModelMenuOpen(false); }}
                                      className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel ? "text-brand" : "text-on-surface"}`}>
                                      {m.label}
                                    </button>
                                  ))}
                                </>
                              )}
                              {straitly.length > 0 && (
                                <>
                                  <SectionHeader label="Straightly" dotColor="#06B6D4" />
                                  {straitly.map(m => (
                                    <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }}
                                      className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}>
                                      {m.label}
                                    </button>
                                  ))}
                                </>
                              )}
                              {openrouter.filter(m => m.free).length > 0 && (
                                <>
                                  <SectionHeader label="OpenRouter · Free" dotColor="#fb923c" />
                                  {openrouter.filter(m => m.free).map(m => (
                                    <button key={m.id} type="button" onClick={() => { setInlineAiModel(m.id); setInlineModelMenuOpen(false); }}
                                      className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${m.id === inlineAiModel ? "text-brand" : "text-on-surface"}`}>
                                      <span className="truncate mr-sm">{m.label}</span>
                                      <span className="text-[9px] text-accent-orange flex-shrink-0">FREE</span>
                                    </button>
                                  ))}
                                </>
                              )}
                              {openrouter.filter(m => !m.free).length > 0 && (
                                <>
                                  <SectionHeader label="OpenRouter · Paid" dotColor="#fb923c" />
                                  {openrouter.filter(m => !m.free).map(m => (
                                    <button key={m.id} type="button" onClick={() => { setInlineAiModel(m.id); setInlineModelMenuOpen(false); }}
                                      className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel ? "text-brand" : "text-on-surface"}`}>
                                      {m.label}
                                    </button>
                                  ))}
                                </>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
                <Tooltip label="Expand">
                <button
                  onClick={() => setInlineExpanded(true)}
                  className="p-xs rounded-md text-on-surface-muted hover:text-on-surface transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                </Tooltip>
                <Tooltip label="Delete highlight">
                <button
                  onClick={handleDeleteHighlight}
                  disabled={deleting}
                  className="p-xs rounded-md text-on-surface-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
                </Tooltip>
              </div>
            </div>

            {/* Comments */}
            <div className="flex-1 overflow-y-auto thin-scrollbar px-lg py-md space-y-md">
              {activeHighlightData?.comments && (activeHighlightData.comments as ThreadedComment[]).length > 0 ? (
                (activeHighlightData.comments as ThreadedComment[]).map((c) => {
                  const maxDepth = COMMENT_MAX_DEPTH;
                  const renderCommentTree = (comment: ThreadedComment, depth: number): React.ReactNode => {
                    const indent = depth > 0 ? "ml-md border-l-2 border-l-brand/30 pl-md" : "";
                    return (
                      <div key={comment.id}>
                        <div className={`bg-surface-container-low border border-border-default rounded-lg p-md ${indent}`}>
                          <div className="flex items-center justify-between gap-xs mb-sm">
                            <div className="flex items-center gap-xs">
                              {comment.isAi ? (
                                <div className="flex items-center gap-xs">
                                  <span className="font-sora text-[10px] text-brand uppercase tracking-widest">
                                    {inlineModels.find(m => m.id === comment.aiModel)?.label || "AI"}
                                  </span>
                                  {comment.aiAction && (
                                    <span className="font-sora text-[9px] text-brand/70 uppercase tracking-wider bg-brand/10 px-xs py-px rounded">
                                      {comment.aiAction === "explain" ? "Explain" : "Summary"}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-widest">You</span>
                              )}
                              {comment.id >= 0 && (
                                <span className="font-sora text-[10px] text-on-surface-muted">
                                  {new Date(comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>
                            {comment.id < 0 ? (
                              <div className="flex items-center gap-xs">
                                <span className="font-sora text-[10px] text-amber-400 uppercase tracking-widest">Draft</span>
                                {comment.body.trim() && (
                                  <Tooltip label={copiedId === comment.id ? "Copied" : "Copy"}>
                                  <button
                                    onClick={() => handleCopyComment(comment)}
                                    className={`p-xs rounded-md transition-colors ${copiedId === comment.id ? "text-brand" : "text-on-surface-muted hover:text-brand"}`}
                                  >
                                    {copiedId === comment.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                  </Tooltip>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-xs">
                                <Tooltip label={copiedId === comment.id ? "Copied" : "Copy"}>
                                <button
                                  onClick={() => handleCopyComment(comment)}
                                  className={`p-xs rounded-md transition-colors ${copiedId === comment.id ? "text-brand" : "text-on-surface-muted hover:text-brand"}`}
                                >
                                  {copiedId === comment.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </button>
                                </Tooltip>
                                <Tooltip label="Reply">
                                <button
                                  onClick={() => {
                                    setInlineReplyToId(inlineReplyToId === comment.id ? null : comment.id);
                                    setInlineReplyBody("");
                                  }}
                                  className={`p-xs rounded-md transition-colors ${inlineReplyToId === comment.id ? "text-brand" : "text-on-surface-muted hover:text-brand"}`}
                                >
                                  <Reply className="w-3 h-3" />
                                </button>
                                </Tooltip>
                                {isOwner && (
                                  <>
                                    <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : "AI Reply"}>
                                    <button
                                      onClick={() => handleInlineAiReply(comment)}
                                      disabled={inlineAiLoading !== null || aiUnavailable}
                                      className="p-xs rounded-md text-on-surface-muted hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                      {inlineAiLoading === comment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                                    </button>
                                    </Tooltip>
                                    <Tooltip label="Delete comment">
                                    <button
                                      onClick={() => handleDeleteInlineComment(comment.id)}
                                      disabled={inlineDeleting !== null}
                                      className="p-xs rounded-md text-on-surface-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                                    >
                                      {inlineDeleting === comment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                    </button>
                                    </Tooltip>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <MarkdownHtml html={mdBlock(comment.body)} className="prose prose-sm font-dm-sans text-sm text-on-surface leading-relaxed" />
                          {comment.id < 0 && (
                            <div className="flex items-center gap-xs mt-sm pt-sm border-t border-border-default">
                              {draftPosting === comment.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-brand" />
                              ) : (
                                <>
                                  <button
                                    onClick={() => handlePostDraft(activeHighlight!.id, comment.id, comment.body, comment.aiAction!)}
                                    disabled={!comment.body.trim()}
                                    className="inline-flex items-center gap-xs text-[10px] bg-primary text-on-primary px-sm py-xs rounded-md hover:opacity-90 disabled:opacity-50 font-sora"
                                  >
                                    <Send className="w-2.5 h-2.5" /> Post
                                  </button>
                                  <button
                                    onClick={() => handleCancelDraft(activeHighlight!.id, comment.id)}
                                    className="inline-flex items-center gap-xs text-[10px] bg-surface border border-border-default text-on-surface-muted px-sm py-xs rounded-md hover:bg-surface-container font-sora"
                                  >
                                    <X className="w-2.5 h-2.5" /> Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Manual reply form */}
                        {inlineReplyToId === comment.id && (
                          <form onSubmit={(e) => { e.preventDefault(); handlePostInlineReply(comment.id); }} className="mt-sm p-md bg-surface border border-border-default rounded-lg space-y-sm">
                            <textarea
                              value={inlineReplyBody}
                              onChange={(e) => setInlineReplyBody(e.target.value)}
                              placeholder="Write a reply..."
                              rows={2}
                              className="w-full bg-transparent border-0 p-0 font-dm-sans text-xs text-on-surface placeholder:text-on-surface-muted focus:ring-0 outline-none resize-y thin-scrollbar"
                            />
                            <div className="flex gap-sm">
                              <button type="submit" disabled={posting || !inlineReplyBody.trim()} className="inline-flex items-center gap-xs text-xs bg-primary text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50">
                                <Send className="w-3 h-3" /> {posting ? "Posting..." : "Reply"}
                              </button>
                              <button type="button" onClick={() => { setInlineReplyToId(null); setInlineReplyBody(""); }} className="inline-flex items-center gap-xs text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container">
                                <X className="w-3 h-3" /> Cancel
                              </button>
                            </div>
                          </form>
                        )}

                        {/* AI error */}
                        {inlineAiError?.id === comment.id && (
                          <div className="mt-sm p-md bg-error/5 border border-error/20 rounded-lg">
                            <div className="flex items-start justify-between gap-md">
                              <span className="font-sora text-[10px] text-error leading-relaxed">{inlineAiError.message}</span>
                              <button onClick={() => cancelInlineAiReply(comment.id)} className="text-on-surface-muted hover:text-on-surface flex-shrink-0"><X className="w-3 h-3" /></button>
                            </div>
                          </div>
                        )}

                        {/* AI draft */}
                        {(inlineAiLoading === comment.id || inlineAiDrafts.has(comment.id)) && (
                          <div className="mt-sm bg-brand/5 border border-brand/20 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between border-b border-brand/10 bg-brand/[0.03] px-sm">
                              <div className="flex">
                                <button type="button" onClick={() => setInlineAiDraftTabs(prev => { const next = new Map(prev); next.set(comment.id, "write"); return next; })}
                                  className={`inline-flex items-center gap-xs px-md py-sm font-sora text-[10px] uppercase tracking-widest border-b-2 transition-colors ${(inlineAiDraftTabs.get(comment.id) || "write") === "write" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}>
                                  <PenLine className="w-3 h-3" /> Write
                                </button>
                                <button type="button" onClick={() => setInlineAiDraftTabs(prev => { const next = new Map(prev); next.set(comment.id, "preview"); return next; })}
                                  className={`inline-flex items-center gap-xs px-md py-sm font-sora text-[10px] uppercase tracking-widest border-b-2 transition-colors ${inlineAiDraftTabs.get(comment.id) === "preview" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}>
                                  <Eye className="w-3 h-3" /> Preview
                                </button>
                              </div>
                              <span className="font-sora text-[10px] text-brand uppercase tracking-widest pr-sm">
                                {inlineAiLoading === comment.id ? "Generating..." : "AI Draft"}
                              </span>
                            </div>

                            {(inlineAiDraftTabs.get(comment.id) || "write") === "write" ? (
                              <textarea
                                value={inlineAiDrafts.get(comment.id) || ""}
                                onChange={(e) => {
                                  setInlineAiDrafts(prev => { const next = new Map(prev); next.set(comment.id, e.target.value); return next; });
                                }}
                                rows={4}
                                className="w-full bg-transparent border-0 px-md py-sm font-dm-sans text-xs text-on-surface focus:ring-0 outline-none resize-y thin-scrollbar"
                                placeholder={inlineAiLoading === comment.id ? "Waiting for response..." : ""}
                              />
                            ) : (
                              <div className="px-md py-sm min-h-[80px]">
                                {inlineAiDrafts.get(comment.id)?.trim()
                                  ? <MarkdownHtml html={mdBlock(inlineAiDrafts.get(comment.id) || "")} className="prose font-dm-sans text-xs text-on-surface" />
                                  : <p className="font-dm-sans text-xs text-on-surface-muted italic">Waiting for response...</p>
                                }
                              </div>
                            )}

                            {inlineAiLoading !== comment.id && (
                              <div className="flex gap-sm px-md pb-md pt-sm">
                                <button onClick={() => postInlineAiReply(comment.id)} disabled={posting}
                                  className="inline-flex items-center gap-xs text-xs bg-brand text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50">
                                  <Send className="w-3 h-3" /> {posting ? "Posting..." : "Post Reply"}
                                </button>
                                <button onClick={() => cancelInlineAiReply(comment.id)}
                                  className="inline-flex items-center gap-xs text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container">
                                  <X className="w-3 h-3" /> Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Threaded replies */}
                        {comment.replies.length > 0 && depth < maxDepth && (
                          <div className="mt-sm space-y-sm">
                            {comment.replies.map((reply) => renderCommentTree(reply, depth + 1))}
                          </div>
                        )}
                      </div>
                    );
                  };
                  return renderCommentTree(c, 0);
                })
              ) : (
                <p className="font-dm-sans text-sm text-on-surface-muted italic text-center py-md">No comments yet</p>
              )}
            </div>

            {/* Comment input */}
            <div className="border-t border-border-default p-md">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="w-full bg-surface-container-low border border-border-default rounded-lg px-md py-sm font-dm-sans text-sm text-on-surface placeholder:text-on-surface-muted resize-y thin-scrollbar focus:border-primary/50 outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostComment(); }
                }}
              />
              <div className="flex justify-between items-center mt-sm">
                <span className="font-sora text-[10px] text-on-surface-muted">Enter to post</span>
                <button
                  onClick={handlePostComment}
                  disabled={!commentBody.trim() || posting}
                  className="px-md py-sm rounded-md font-sora text-xs bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-xs"
                >
                  {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {posting ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded modal */}
      {activeHighlight && inlineExpanded && (
        <div className="fixed inset-0 z-modal-above-r3f bg-background/95 backdrop-blur-sm flex items-center justify-center p-xl" onClick={() => { setInlineExpanded(false); setActiveHighlight(null); }}>
          <div className="bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-lg py-md border-b border-border-default">
              <span className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">
                {activeHighlightData?.color === "underline" ? "Comment" : "Highlight"}
              </span>
              <div className="flex items-center gap-sm">
                {isOwner && (
                  <div className="relative" ref={inlineModelMenuRef}>
                    <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : "AI model"}>
                    <button type="button" onClick={() => setInlineModelMenuOpen(!inlineModelMenuOpen)} disabled={inlineAiLoading !== null || aiUnavailable}
                      className="flex items-center gap-xs text-on-surface-muted hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      <Bot className="w-3.5 h-3.5" />
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    </Tooltip>
                    {inlineModelMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-surface border border-border-default rounded-lg shadow-xl z-50 py-xs min-w-[200px] max-h-[300px] overflow-y-auto thin-scrollbar">
                        {(() => {
                          const d = inlineModels.filter(m => m.provider === "deepseek"), g = inlineModels.filter(m => m.provider === "gemini"),
                            o = inlineModels.filter(m => m.provider === "openrouter"), gr = inlineModels.filter(m => m.provider === "groq"),
                            ce = inlineModels.filter(m => m.provider === "cerebras"),
                            st = inlineModels.filter(m => m.provider === "straitly");
                          return (<>
                            {d.length > 0 && (<><SectionHeader label="DeepSeek" dotColor="#b8c3ff" />{d.map(m => <button key={m.id} type="button" onClick={() => { setInlineAiModel(m.id); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel ? "text-brand" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                            {g.length > 0 && (<><SectionHeader label="Gemini" dotColor="#47e175" />{g.map(m => <button key={m.id} type="button" onClick={() => { setInlineAiModel(m.id); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${m.id === inlineAiModel ? "text-brand" : "text-on-surface"}`}><span className="truncate mr-sm">{m.label}</span>{m.free && <span className="text-[9px] text-accent-orange flex-shrink-0">FREE</span>}</button>)}</>)}
                            {gr.length > 0 && (<><SectionHeader label="Groq" dotColor="#fde68a" />{gr.map(m => <button key={m.id} type="button" onClick={() => { setInlineAiModel(m.id); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel ? "text-brand" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                            {ce.length > 0 && (<><SectionHeader label="Cerebras" dotColor="#a78bfa" />{ce.map(m => <button key={m.id} type="button" onClick={() => { setInlineAiModel(m.id); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel ? "text-brand" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                            {st.length > 0 && (<><SectionHeader label="Straightly" dotColor="#06B6D4" />{st.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                            {o.filter(m => m.free).length > 0 && (<><SectionHeader label="OpenRouter · Free" dotColor="#fb923c" />{o.filter(m => m.free).map(m => <button key={m.id} type="button" onClick={() => { setInlineAiModel(m.id); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${m.id === inlineAiModel ? "text-brand" : "text-on-surface"}`}><span className="truncate mr-sm">{m.label}</span>{m.free && <span className="text-[9px] text-accent-orange flex-shrink-0">FREE</span>}</button>)}</>)}
                            {o.filter(m => !m.free).length > 0 && (<><SectionHeader label="OpenRouter · Paid" dotColor="#fb923c" />{o.filter(m => !m.free).map(m => <button key={m.id} type="button" onClick={() => { setInlineAiModel(m.id); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel ? "text-brand" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                          </>);
                        })()}
                      </div>
                    )}
                  </div>
                )}
                <Tooltip label="Delete highlight">
                <button onClick={handleDeleteHighlight} disabled={deleting}
                  className="p-xs rounded-md text-on-surface-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50">
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
                </Tooltip>
                <Tooltip label="Close">
                <button onClick={() => { setInlineExpanded(false); setActiveHighlight(null); }} className="p-xs rounded-md text-on-surface-muted hover:text-on-surface transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
                </Tooltip>
              </div>
            </div>

            {/* Comments */}
            <div className="flex-1 overflow-y-auto thin-scrollbar px-lg py-md space-y-md">
              {activeHighlightData?.comments && (activeHighlightData.comments as ThreadedComment[]).length > 0 ? (
                (activeHighlightData.comments as ThreadedComment[]).map((c) => {
                  const maxDepth = COMMENT_MAX_DEPTH;
                  const renderCommentTree = (comment: ThreadedComment, depth: number): React.ReactNode => {
                    const indent = depth > 0 ? "ml-md border-l-2 border-l-brand/30 pl-md" : "";
                    return (
                      <div key={comment.id}>
                        <div className={`bg-surface-container-low border border-border-default rounded-lg p-md ${indent}`}>
                          <div className="flex items-center justify-between gap-xs mb-sm">
                            <div className="flex items-center gap-xs">
                              {comment.isAi ? (
                                <div className="flex items-center gap-xs">
                                  <span className="font-sora text-[10px] text-brand uppercase tracking-widest">
                                    {inlineModels.find(m => m.id === comment.aiModel)?.label || "AI"}
                                  </span>
                                  {comment.aiAction && (
                                    <span className="font-sora text-[9px] text-brand/70 uppercase tracking-wider bg-brand/10 px-xs py-px rounded">
                                      {comment.aiAction === "explain" ? "Explain" : "Summary"}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-widest">You</span>
                              )}
                              {comment.id >= 0 && (
                                <span className="font-sora text-[10px] text-on-surface-muted">
                                  {new Date(comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>
                            {comment.id < 0 ? (
                              <div className="flex items-center gap-xs">
                                <span className="font-sora text-[10px] text-amber-400 uppercase tracking-widest">Draft</span>
                                {comment.body.trim() && (
                                  <Tooltip label={copiedId === comment.id ? "Copied" : "Copy"}>
                                  <button
                                    onClick={() => handleCopyComment(comment)}
                                    className={`p-xs rounded-md transition-colors ${copiedId === comment.id ? "text-brand" : "text-on-surface-muted hover:text-brand"}`}
                                  >
                                    {copiedId === comment.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                  </Tooltip>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-xs">
                                <Tooltip label={copiedId === comment.id ? "Copied" : "Copy"}>
                                <button
                                  onClick={() => handleCopyComment(comment)}
                                  className={`p-xs rounded-md transition-colors ${copiedId === comment.id ? "text-brand" : "text-on-surface-muted hover:text-brand"}`}
                                >
                                  {copiedId === comment.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </button>
                                </Tooltip>
                                <Tooltip label="Reply">
                                <button
                                  onClick={() => { setInlineReplyToId(inlineReplyToId === comment.id ? null : comment.id); setInlineReplyBody(""); }}
                                  className={`p-xs rounded-md transition-colors ${inlineReplyToId === comment.id ? "text-brand" : "text-on-surface-muted hover:text-brand"}`}>
                                  <Reply className="w-3 h-3" />
                                </button>
                                </Tooltip>
                                {isOwner && (
                                  <>
                                    <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : "AI Reply"}>
                                    <button onClick={() => handleInlineAiReply(comment)} disabled={inlineAiLoading !== null || aiUnavailable}
                                      className="p-xs rounded-md text-on-surface-muted hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                                      {inlineAiLoading === comment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                                    </button>
                                    </Tooltip>
                                    <Tooltip label="Delete comment">
                                    <button onClick={() => handleDeleteInlineComment(comment.id)} disabled={inlineDeleting !== null}
                                      className="p-xs rounded-md text-on-surface-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50">
                                      {inlineDeleting === comment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                    </button>
                                    </Tooltip>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <MarkdownHtml html={mdBlock(comment.body)} className="prose prose-sm font-dm-sans text-sm text-on-surface leading-relaxed" />
                          {comment.id < 0 && (
                            <div className="flex items-center gap-xs mt-sm pt-sm border-t border-border-default">
                              {draftPosting === comment.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-brand" />
                              ) : (
                                <>
                                  <button
                                    onClick={() => handlePostDraft(activeHighlight!.id, comment.id, comment.body, comment.aiAction!)}
                                    disabled={!comment.body.trim()}
                                    className="inline-flex items-center gap-xs text-[10px] bg-primary text-on-primary px-sm py-xs rounded-md hover:opacity-90 disabled:opacity-50 font-sora"
                                  >
                                    <Send className="w-2.5 h-2.5" /> Post
                                  </button>
                                  <button
                                    onClick={() => handleCancelDraft(activeHighlight!.id, comment.id)}
                                    className="inline-flex items-center gap-xs text-[10px] bg-surface border border-border-default text-on-surface-muted px-sm py-xs rounded-md hover:bg-surface-container font-sora"
                                  >
                                    <X className="w-2.5 h-2.5" /> Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                        {/* Manual reply form */}
                        {inlineReplyToId === comment.id && (
                          <form onSubmit={(e) => { e.preventDefault(); handlePostInlineReply(comment.id); }} className="mt-sm p-md bg-surface border border-border-default rounded-lg space-y-sm">
                            <textarea
                              value={inlineReplyBody}
                              onChange={(e) => setInlineReplyBody(e.target.value)}
                              placeholder="Write a reply..."
                              rows={2}
                              className="w-full bg-transparent border-0 p-0 font-dm-sans text-xs text-on-surface placeholder:text-on-surface-muted focus:ring-0 outline-none resize-y thin-scrollbar"
                            />
                            <div className="flex gap-sm">
                              <button type="submit" disabled={posting || !inlineReplyBody.trim()} className="inline-flex items-center gap-xs text-xs bg-primary text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50">
                                <Send className="w-3 h-3" /> {posting ? "Posting..." : "Reply"}
                              </button>
                              <button type="button" onClick={() => { setInlineReplyToId(null); setInlineReplyBody(""); }} className="inline-flex items-center gap-xs text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container">
                                <X className="w-3 h-3" /> Cancel
                              </button>
                            </div>
                          </form>
                        )}

                        {/* AI error */}
                        {inlineAiError?.id === comment.id && (
                          <div className="mt-sm p-md bg-error/5 border border-error/20 rounded-lg">
                            <div className="flex items-start justify-between gap-md">
                              <span className="font-sora text-[10px] text-error leading-relaxed">{inlineAiError.message}</span>
                              <button onClick={() => cancelInlineAiReply(comment.id)} className="text-on-surface-muted hover:text-on-surface flex-shrink-0"><X className="w-3 h-3" /></button>
                            </div>
                          </div>
                        )}

                        {/* AI draft */}
                        {(inlineAiLoading === comment.id || inlineAiDrafts.has(comment.id)) && (
                          <div className="mt-sm bg-brand/5 border border-brand/20 rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between border-b border-brand/10 bg-brand/[0.03] px-sm">
                              <div className="flex">
                                <button type="button" onClick={() => setInlineAiDraftTabs(prev => { const next = new Map(prev); next.set(comment.id, "write"); return next; })}
                                  className={`inline-flex items-center gap-xs px-md py-sm font-sora text-[10px] uppercase tracking-widest border-b-2 transition-colors ${(inlineAiDraftTabs.get(comment.id) || "write") === "write" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}>
                                  <PenLine className="w-3 h-3" /> Write
                                </button>
                                <button type="button" onClick={() => setInlineAiDraftTabs(prev => { const next = new Map(prev); next.set(comment.id, "preview"); return next; })}
                                  className={`inline-flex items-center gap-xs px-md py-sm font-sora text-[10px] uppercase tracking-widest border-b-2 transition-colors ${inlineAiDraftTabs.get(comment.id) === "preview" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}>
                                  <Eye className="w-3 h-3" /> Preview
                                </button>
                              </div>
                              <span className="font-sora text-[10px] text-brand uppercase tracking-widest pr-sm">
                                {inlineAiLoading === comment.id ? "Generating..." : "AI Draft"}
                              </span>
                            </div>

                            {(inlineAiDraftTabs.get(comment.id) || "write") === "write" ? (
                              <textarea
                                value={inlineAiDrafts.get(comment.id) || ""}
                                onChange={(e) => {
                                  setInlineAiDrafts(prev => { const next = new Map(prev); next.set(comment.id, e.target.value); return next; });
                                }}
                                rows={4}
                                className="w-full bg-transparent border-0 px-md py-sm font-dm-sans text-xs text-on-surface focus:ring-0 outline-none resize-y thin-scrollbar"
                                placeholder={inlineAiLoading === comment.id ? "Waiting for response..." : ""}
                              />
                            ) : (
                              <div className="px-md py-sm min-h-[80px]">
                                {inlineAiDrafts.get(comment.id)?.trim()
                                  ? <MarkdownHtml html={mdBlock(inlineAiDrafts.get(comment.id) || "")} className="prose font-dm-sans text-xs text-on-surface" />
                                  : <p className="font-dm-sans text-xs text-on-surface-muted italic">Waiting for response...</p>
                                }
                              </div>
                            )}

                            {inlineAiLoading !== comment.id && (
                              <div className="flex gap-sm px-md pb-md pt-sm">
                                <button onClick={() => postInlineAiReply(comment.id)} disabled={posting}
                                  className="inline-flex items-center gap-xs text-xs bg-brand text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50">
                                  <Send className="w-3 h-3" /> {posting ? "Posting..." : "Post Reply"}
                                </button>
                                <button onClick={() => cancelInlineAiReply(comment.id)}
                                  className="inline-flex items-center gap-xs text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container">
                                  <X className="w-3 h-3" /> Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        </div>
                        {comment.replies.length > 0 && depth < maxDepth && (
                          <div className="mt-sm space-y-sm">
                            {comment.replies.map((reply) => renderCommentTree(reply, depth + 1))}
                          </div>
                        )}
                      </div>
                    );
                  };
                  return renderCommentTree(c, 0);
                })
              ) : (
                <p className="font-dm-sans text-sm text-on-surface-muted italic text-center py-md">No comments yet</p>
              )}
            </div>

            {/* Comment input */}
            <div className="border-t border-border-default p-md">
              <textarea value={commentBody} onChange={(e) => setCommentBody(e.target.value)} placeholder="Add a comment..." rows={3}
                className="w-full bg-surface-container-low border border-border-default rounded-lg px-md py-sm font-dm-sans text-sm text-on-surface placeholder:text-on-surface-muted resize-y thin-scrollbar focus:border-primary/50 outline-none"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }} />
              <div className="flex justify-between items-center mt-sm">
                <span className="font-sora text-[10px] text-on-surface-muted">Enter to post</span>
                <button onClick={handlePostComment} disabled={!commentBody.trim() || posting}
                  className="px-md py-sm rounded-md font-sora text-xs bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-xs">
                  {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {posting ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modals */}
      {deleteHighlightTarget != null && (
        <ConfirmModal
          title="Delete Highlight"
          message="Delete this highlight and all its comments?"
          onConfirm={confirmDeleteHighlight}
          onCancel={() => setDeleteHighlightTarget(null)}
          loading={deleting}
        />
      )}
      {deleteCommentTarget != null && (
        <ConfirmModal
          title="Delete Comment"
          message="Delete this comment and its replies?"
          onConfirm={confirmDeleteInlineComment}
          onCancel={() => setDeleteCommentTarget(null)}
          loading={inlineDeleting === deleteCommentTarget}
        />
      )}

      {/* Floating Jump to Top & Jump to Bottom navigation */}
      <StoryJumpButtons />
    </div>
  );
}
