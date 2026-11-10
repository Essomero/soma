import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Trash2, Bot, PenLine, Eye, Send, X, Check, Copy, ChevronDown, Reply, Maximize2 } from "lucide-react";
import SelectionToolbar from "@/components/ui/SelectionToolbar";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { mdBlock } from "@/lib/markdown";
import { useTextSelection } from "@/lib/useTextSelection";
import MarkdownHtml from "@/components/ui/MarkdownHtml";
import Tooltip from "@/components/ui/Tooltip";
import { getSelectionOffsets, type HighlightData, COMMENT_MAX_DEPTH } from "@/lib/highlights";
import { useScrollLock } from "@/lib/useScrollLock";
import { streamChat } from "@/lib/tutor/client";
import { TUTOR_MODES } from "../../../shared/tutor/modes.js";
import type { TutorMode } from "../../../shared/tutor/modes.js";

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
  /** Present only on temp selection-AI drafts. */
  aiAction?: TutorMode;
  /** Persisted tutor mode returned by the API. */
  mode?: TutorMode | null;
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

interface InlineHighlightsProps {
  slug: string;
  storyText: string;
  storyTitle: string;
  articleRef: React.RefObject<HTMLElement | null>;
  isOwner: boolean;
  onHighlightsChange: (highlights: HighlightData[]) => void;
  highlightClickRef: React.MutableRefObject<(id: number) => void>;
  /** When true, the selection toolbar gains Explain / Summarize (selection AI). */
  selectionAi?: boolean;
}

export default function InlineHighlights({
  slug, storyText, storyTitle, articleRef, isOwner,
  onHighlightsChange, highlightClickRef, selectionAi = false,
}: InlineHighlightsProps) {
  const { selection, clearSelection } = useTextSelection(articleRef);
  const [highlights, setHighlights] = useState<HighlightData[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<{ id: number; x: number; y: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [draftPosting, setDraftPosting] = useState<number | null>(null);

  const [inlineAiLoading, setInlineAiLoading] = useState<number | null>(null);
  const [inlineAiDrafts, setInlineAiDrafts] = useState<Map<number, string>>(new Map());
  const [inlineAiDraftTabs, setInlineAiDraftTabs] = useState<Map<number, "write" | "preview">>(new Map());
  const [inlineAiError, setInlineAiError] = useState<{id: number, message: string} | null>(null);
  const [inlineModels, setInlineModels] = useState<ModelInfo[]>(DEFAULT_MODELS);
  const [inlineAiReady, setInlineAiReady] = useState(false);
  const [inlineAiModel, setInlineAiModel] = useState<string>("deepseek-flash");
  const [inlineAiProvider, setInlineAiProvider] = useState<string>("deepseek");
  const inlineModelMenuRef = useRef<HTMLDivElement>(null);
  const [inlineModelMenuOpen, setInlineModelMenuOpen] = useState(false);
  // No provider keys configured yet: AI actions stay visible but disabled.
  const aiUnavailable = !inlineAiReady || inlineModels.length === 0;
  const [inlineReplyToId, setInlineReplyToId] = useState<number | null>(null);
  const [inlineReplyBody, setInlineReplyBody] = useState("");
  const [inlineExpanded, setInlineExpanded] = useState(false);
  const [inlineDeleting, setInlineDeleting] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "highlight" } | { kind: "comment"; id: number } | null>(null);

  // Sync highlights to parent
  const prevKeyRef = useRef("");
  useEffect(() => {
    const key = JSON.stringify(highlights.map(h => h.id).sort());
    if (key !== prevKeyRef.current) { prevKeyRef.current = key; onHighlightsChange(highlights); }
  }, [highlights, onHighlightsChange]);

  const fetchHighlights = useCallback(async () => {
    if (!slug) return;
    try {
      const r = await fetch(`/api/highlights?story=${encodeURIComponent(slug)}`);
      if (r.ok) {
        const data = await r.json();
        setHighlights(data.map((h: any) => ({
          id: h.id, sectionIndex: Number(h.sectionIndex), paragraphIndex: Number(h.paragraphIndex),
          startOffset: Number(h.startOffset), endOffset: Number(h.endOffset), color: h.color,
          selectedText: h.selectedText,
          comments: buildCommentTree(h.comments || []),
        })));
      }
    } catch {}
  }, [slug]);

  useEffect(() => { fetchHighlights(); }, [fetchHighlights]);

  useScrollLock(inlineExpanded);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (inlineExpanded) {
        setInlineExpanded(false);
        setActiveHighlight(null);
      } else if (activeHighlight) {
        setActiveHighlight(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inlineExpanded, activeHighlight]);

  useEffect(() => {
    fetch("/api/models").then(r => r.json()).then(data => {
      setInlineModels(data.models ?? []);
      setInlineAiReady(true);
      if (data.models?.length) {
        const current = data.models.find((m: ModelInfo) => m.id === inlineAiModel && m.provider === inlineAiProvider);
        if (!current) {
          setInlineAiModel(data.models[0].id);
          setInlineAiProvider(data.models[0].provider);
        }
      }
    }).catch(() => { setInlineModels([]); setInlineAiReady(true); });
  }, []);

  useEffect(() => {
    if (!inlineModelMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (inlineModelMenuRef.current && !inlineModelMenuRef.current.contains(e.target as Node)) setInlineModelMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [inlineModelMenuOpen]);

  // ── Highlight CRUD ───────────────────────────────
  const handleHighlight = useCallback(async (color: string) => {
    if (!selection.container || !slug) return;
    const offsets = getSelectionOffsets(selection.container, window.getSelection()!);
    if (!offsets) return;
    const sectionIndex = parseInt(selection.container.dataset.sectionIndex || "0", 10);
    const paragraphIndex = parseInt(selection.container.dataset.paragraphIndex || "0", 10);
    try {
      const r = await fetch("/api/highlights", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storySlug: slug, sectionIndex, paragraphIndex, startOffset: offsets.start, endOffset: offsets.end, selectedText: offsets.text, textHash: offsets.text.slice(0, 20), color }),
      });
      if (r.ok) {
        const created = await r.json();
        clearSelection(); window.getSelection()?.removeAllRanges();
        setHighlights(prev => [...prev, { id: created.id, sectionIndex: Number(created.sectionIndex), paragraphIndex: Number(created.paragraphIndex), startOffset: Number(created.startOffset), endOffset: Number(created.endOffset), color: created.color, selectedText: offsets.text, comments: [] }]);
      }
    } catch {}
  }, [selection, slug, clearSelection]);

  const handleCommentOnSelection = useCallback(async () => {
    if (!selection.container || !slug) return;
    const offsets = getSelectionOffsets(selection.container, window.getSelection()!);
    if (!offsets) return;
    const rect = window.getSelection()?.getRangeAt(0)?.getBoundingClientRect();
    const px = rect ? rect.left + rect.width / 2 : selection.x + 100;
    const py = rect ? rect.bottom : selection.y;
    try {
      const r = await fetch("/api/highlights", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storySlug: slug, sectionIndex: selection.sectionIndex, paragraphIndex: selection.paragraphIndex, startOffset: selection.startOffset, endOffset: selection.endOffset, selectedText: selection.selectedText, textHash: selection.textHash, color: "underline" }),
      });
      if (r.ok) {
        const created = await r.json();
        clearSelection(); window.getSelection()?.removeAllRanges();
        setHighlights(prev => [...prev, { id: created.id, sectionIndex: Number(created.sectionIndex), paragraphIndex: Number(created.paragraphIndex), startOffset: Number(created.startOffset), endOffset: Number(created.endOffset), color: created.color, selectedText: selection.selectedText, comments: [] }]);
        setActiveHighlight({ id: created.id, x: px, y: py }); setCommentBody("");
      }
    } catch {}
  }, [selection, slug, clearSelection]);

  const handleHighlightClick = useCallback((highlightId: number) => {
    const mark = document.querySelector(`mark[data-highlight-id="${highlightId}"]`);
    if (mark) {
      const rect = mark.getBoundingClientRect();
      setActiveHighlight({ id: highlightId, x: rect.left + rect.width / 2, y: rect.bottom });
      setCommentBody("");
    }
  }, []);
  highlightClickRef.current = handleHighlightClick;

  const activeHighlightId = activeHighlight?.id;
  useEffect(() => {
    if (activeHighlightId == null) return;
    const reposition = () => {
      const mark = document.querySelector(`mark[data-highlight-id="${activeHighlightId}"]`);
      if (mark) { const rect = mark.getBoundingClientRect(); setActiveHighlight(prev => prev ? { ...prev, x: rect.left + rect.width / 2, y: rect.bottom } : null); }
    };
    window.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    return () => { window.removeEventListener("scroll", reposition); window.removeEventListener("resize", reposition); };
  }, [activeHighlightId]);

  const activeHighlightData = activeHighlight ? highlights.find(h => h.id === activeHighlight.id) : null;

  // ── Comment CRUD ─────────────────────────────────
  const handlePostComment = useCallback(async () => {
    if (!commentBody.trim() || !activeHighlight || posting || !slug) return;
    setPosting(true);
    try {
      const h = activeHighlightData;
      const r = await fetch("/api/comments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storySlug: slug, body: commentBody.trim(), highlightId: activeHighlight.id, sectionIndex: h?.sectionIndex ?? null, paragraphIndex: h?.paragraphIndex ?? null, startOffset: h?.startOffset ?? null, endOffset: h?.endOffset ?? null }),
      });
      if (r.ok) {
        const nc = await r.json();
        setHighlights(prev => prev.map(hl => hl.id === activeHighlight.id
          ? { ...hl, comments: addReplyToTree((hl.comments || []) as ThreadedComment[], null, { id: nc.id, body: commentBody.trim(), parentId: null, isAi: false, aiModel: null, createdAt: new Date().toISOString(), updatedAt: null, replies: [] }) }
          : hl));
        setCommentBody("");
      }
    } catch {}
    setPosting(false);
  }, [commentBody, activeHighlight, posting, slug, activeHighlightData]);

  const handleDeleteHighlight = useCallback(async () => {
    if (!activeHighlight || deleting) return;
    setDeleting(true);
    try {
      await fetch("/api/highlights", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeHighlight.id }) });
      setHighlights(prev => prev.filter(h => h.id !== activeHighlight.id));
      setActiveHighlight(null);
    } catch {}
    setDeleting(false);
    setDeleteTarget(null);
  }, [activeHighlight, deleting]);


  // ── Tutor modes ─────────────
  const handleTutorMode = useCallback(async (mode: TutorMode) => {
    if (!selection.container || !slug) return;

    const offsets = getSelectionOffsets(selection.container, window.getSelection()!);
    if (!offsets) return;

    const rect = window.getSelection()?.getRangeAt(0)?.getBoundingClientRect();
    const popoverX = rect ? rect.left + rect.width / 2 : selection.x + 100;
    const popoverY = rect ? rect.bottom : selection.y;

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
        selectedText: selection.selectedText,
        comments: [],
      }]);

      setActiveHighlight({ id: created.id, x: popoverX, y: popoverY });
    } catch {
      return;
    }

    // 2. Stream the tutor answer into a temp comment
    const TEMP_ID = -(Date.now());

    const tempComment: ThreadedComment = {
      id: TEMP_ID,
      body: "",
      parentId: null,
      isAi: true,
      aiModel: inlineAiModel,
      aiAction: mode,
      mode,
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
      const full = await streamChat({
        action: "tutor",
        mode,
        context: {
          selectedText: offsets.text,
          articleTitle: storyTitle,
          articleExcerpt: storyText.slice(0, 4000),
          sectionIndex: selection.sectionIndex,
          paragraphIndex: selection.paragraphIndex,
        },
        model: inlineAiModel,
        provider: inlineAiProvider,
        onToken: (body) => {
          setHighlights((prev) => prev.map((hl) =>
            hl.id === highlightId
              ? { ...hl, comments: (hl.comments || []).map((c) =>
                  (c as ThreadedComment).id === TEMP_ID ? { ...(c as ThreadedComment), body } : c,
                )}
              : hl,
          ));
        },
      });

      if (!full.trim()) {
        setHighlights((prev) => prev.map((hl) =>
          hl.id === highlightId
            ? { ...hl, comments: (hl.comments || []).filter((c) => (c as ThreadedComment).id !== TEMP_ID) }
            : hl,
        ));
      }
    } catch (e) {
      console.error(`Tutor ${mode} failed:`, e);
      setHighlights((prev) => prev.map((hl) =>
        hl.id === highlightId
          ? { ...hl, comments: (hl.comments || []).filter((c) => (c as ThreadedComment).id !== TEMP_ID) }
          : hl,
      ));
    }
  }, [selection, slug, clearSelection, storyText, storyTitle, inlineAiModel, inlineAiProvider]);

  const handlePostDraft = useCallback(async (highlightId: number, tempId: number, body: string, mode: TutorMode) => {
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
          mode,
        }),
      });
      if (r.ok) {
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
                      aiAction: mode,
                      mode,
                      createdAt: new Date().toISOString(),
                      updatedAt: null,
                      replies: [],
                    } as ThreadedComment
                  : c,
              )}
            : hl,
        ));
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

  // ── AI reply ─────────────────────────────────────
  const findThreadChain = (commentId: number, nodes: ThreadedComment[], path: ThreadedComment[] = []): ThreadedComment[] | null => {
    for (const node of nodes) {
      if (node.id === commentId) return [...path, node];
      if (node.replies?.length) { const f = findThreadChain(commentId, node.replies, [...path, node]); if (f) return f; }
    }
    return null;
  };

  const handleInlineAiReply = useCallback(async (comment: { id: number; body: string }) => {
    if (inlineAiLoading !== null) return;
    setInlineAiLoading(comment.id); setInlineAiError(null);
    setInlineAiDrafts(prev => { const n = new Map(prev); n.set(comment.id, ""); return n; });
    setInlineAiDraftTabs(prev => { const n = new Map(prev); n.set(comment.id, "write"); return n; });
    try {
      const mark = activeHighlightId ? document.querySelector(`mark[data-highlight-id="${activeHighlightId}"]`) : null;
      const highlightedText = mark?.textContent || "";
      const articleExcerpt = storyText.slice(0, 4000) + (storyText.length > 4000 ? "..." : "");
      const comments = activeHighlightData?.comments as ThreadedComment[] | undefined;
      const chain = comments ? findThreadChain(comment.id, comments) : null;
      let tc = "";
      if (chain && chain.length > 1) {
        tc = "\n\n--- THREAD CONTEXT (read bottom-to-top) ---\n";
        for (const c of chain) { tc += `\n[${c.isAi ? (inlineModels.find(m => m.id === c.aiModel)?.label || "AI") : "User"}]: ${c.body}\n`; }
        tc += "--- END THREAD ---\n\n";
      }
      await streamChat({
        action: "highlight-reply",
        context: {
          commentBody: comment.body,
          highlightedText,
          articleTitle: storyTitle,
          articleExcerpt,
          threadContext: tc,
        },
        model: inlineAiModel,
        provider: inlineAiProvider,
        onToken: (full) => setInlineAiDrafts(prev => new Map(prev).set(comment.id, full)),
      });
    } catch (e) {
      setInlineAiError({ id: comment.id, message: e instanceof Error ? e.message : "Unknown error" });
      setInlineAiDrafts(prev => { const n = new Map(prev); n.delete(comment.id); return n; });
      setInlineAiDraftTabs(prev => { const n = new Map(prev); n.delete(comment.id); return n; });
    }
    setInlineAiLoading(null);
  }, [inlineAiLoading, activeHighlightId, storyText, storyTitle, inlineAiModel, inlineModels, activeHighlightData]);

  const postInlineAiReply = useCallback(async (commentId: number) => {
    const draft = inlineAiDrafts.get(commentId);
    if (!draft?.trim() || !slug || !activeHighlight) return;
    setPosting(true);
    try {
      const r = await fetch("/api/comments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storySlug: slug, body: draft.trim(), highlightId: activeHighlight.id, parentId: commentId, isAi: true, aiModel: inlineAiModel }),
      });
      if (r.ok) {
        const nc = await r.json();
        setHighlights(prev => prev.map(hl => hl.id === activeHighlight.id
          ? { ...hl, comments: addReplyToTree((hl.comments || []) as ThreadedComment[], commentId, { id: nc.id, body: draft.trim(), parentId: commentId, isAi: true, aiModel: inlineAiModel, createdAt: new Date().toISOString(), updatedAt: null, replies: [] }) }
          : hl));
        setInlineAiDrafts(prev => { const n = new Map(prev); n.delete(commentId); return n; });
        setInlineAiDraftTabs(prev => { const n = new Map(prev); n.delete(commentId); return n; });
      }
    } catch {}
    setPosting(false);
  }, [inlineAiDrafts, slug, activeHighlight, inlineAiModel]);

  const cancelInlineAiReply = useCallback((commentId: number) => {
    setInlineAiDrafts(prev => { const n = new Map(prev); n.delete(commentId); return n; });
    setInlineAiDraftTabs(prev => { const n = new Map(prev); n.delete(commentId); return n; });
    setInlineAiError(null);
  }, []);

  const handlePostInlineReply = useCallback(async (parentId: number) => {
    if (!inlineReplyBody.trim() || !slug || !activeHighlight || posting) return;
    setPosting(true);
    try {
      const r = await fetch("/api/comments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storySlug: slug, body: inlineReplyBody.trim(), highlightId: activeHighlight.id, parentId }),
      });
      if (r.ok) {
        const nc = await r.json();
        setHighlights(prev => prev.map(hl => hl.id === activeHighlight.id
          ? { ...hl, comments: addReplyToTree((hl.comments || []) as ThreadedComment[], parentId, { id: nc.id, body: inlineReplyBody.trim(), parentId, isAi: false, aiModel: null, createdAt: new Date().toISOString(), updatedAt: null, replies: [] }) }
          : hl));
        setInlineReplyToId(null); setInlineReplyBody("");
      }
    } catch {}
    setPosting(false);
  }, [inlineReplyBody, slug, activeHighlight, posting]);

  const handleDeleteInlineComment = useCallback(async (commentId: number) => {
    if (inlineDeleting !== null) return;
    setInlineDeleting(commentId);
    try {
      const r = await fetch("/api/comments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: commentId }) });
      if (r.ok) setHighlights(prev => prev.map(hl => hl.id === activeHighlight?.id ? { ...hl, comments: removeCommentFromTree((hl.comments || []) as ThreadedComment[], commentId) } : hl));
    } catch {}
    setInlineDeleting(null);
  }, [inlineDeleting, activeHighlight]);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "highlight") {
      void handleDeleteHighlight();
    } else {
      void handleDeleteInlineComment(deleteTarget.id);
    }
    setDeleteTarget(null);
  }, [deleteTarget, handleDeleteHighlight, handleDeleteInlineComment]);

  // ── Shared comment tree renderer ──────────────────
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

  const renderCommentTree = (comment: ThreadedComment, depth: number): React.ReactNode => {
    const maxDepth = COMMENT_MAX_DEPTH;
    const indent = depth > 0 ? "ml-md border-l-2 border-l-brand/30 pl-md" : "";
    return (
      <div key={comment.id}>
        <div className={`bg-surface-container-low border border-border-default rounded-lg p-md ${indent}`}>
          <div className="flex items-center justify-between gap-xs mb-sm">
            <div className="flex items-center gap-xs">
              {comment.isAi ? (
                <span className="flex items-center gap-xs">
                  <span className="font-sora text-[10px] text-brand uppercase tracking-widest">{inlineModels.find(m => m.id === comment.aiModel)?.label || "AI"}</span>
                  {(comment.aiAction || comment.mode) && (
                    <span className="font-sora text-[9px] text-brand/70 uppercase tracking-wider bg-brand/10 px-xs py-px rounded">
                      {TUTOR_MODES.find((m) => m.id === (comment.aiAction || comment.mode))?.label || "AI"}
                    </span>
                  )}
                </span>
              ) : (
                <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-widest">You</span>
              )}
              {comment.id >= 0 && (
                <span className="font-sora text-[10px] text-on-surface-muted">{new Date(comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              )}
            </div>
            {comment.id < 0 ? (
              <div className="flex items-center gap-xs">
                <span className="font-sora text-[10px] text-amber-400 uppercase tracking-widest">Draft</span>
                {comment.body.trim() && (
                  <Tooltip label={copiedId === comment.id ? "Copied" : "Copy"}>
                  <button onClick={() => handleCopyComment(comment)}
                    className={`p-xs rounded-md transition-colors ${copiedId === comment.id ? "text-brand" : "text-on-surface-muted hover:text-brand"}`}>
                    {copiedId === comment.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}</button>
                  </Tooltip>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-xs">
                <Tooltip label={copiedId === comment.id ? "Copied" : "Copy"}>
                <button onClick={() => handleCopyComment(comment)}
                  className={`p-xs rounded-md transition-colors ${copiedId === comment.id ? "text-brand" : "text-on-surface-muted hover:text-brand"}`}>
                  {copiedId === comment.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}</button>
                </Tooltip>
                <Tooltip label="Reply">
                <button onClick={() => { setInlineReplyToId(inlineReplyToId === comment.id ? null : comment.id); setInlineReplyBody(""); }}
                  className={`p-xs rounded-md transition-colors ${inlineReplyToId === comment.id ? "text-brand" : "text-on-surface-muted hover:text-brand"}`}><Reply className="w-3 h-3" /></button>
                </Tooltip>
                {isOwner && (<>
                <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : "AI Reply"}>
                  <button onClick={() => handleInlineAiReply(comment)} disabled={inlineAiLoading !== null || aiUnavailable}
                    className="p-xs rounded-md text-on-surface-muted hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    {inlineAiLoading === comment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}</button>
                </Tooltip>
                  <Tooltip label="Delete comment">
                  <button onClick={() => setDeleteTarget({ kind: "comment", id: comment.id })} disabled={inlineDeleting !== null}
                    className="p-xs rounded-md text-on-surface-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50">
                    {inlineDeleting === comment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}</button>
                  </Tooltip>
                </>)}
              </div>
            )}
          </div>
          <MarkdownHtml html={mdBlock(comment.body)} className="font-dm-sans text-sm text-on-surface leading-relaxed" />
          {comment.id < 0 && (
            <div className="flex items-center gap-xs mt-sm pt-sm border-t border-border-default">
              {draftPosting === comment.id ? (
                <Loader2 className="w-3 h-3 animate-spin text-brand" />
              ) : (
                <>
                  <button
                    onClick={() => handlePostDraft(activeHighlight!.id, comment.id, comment.body, comment.aiAction!)}
                    disabled={!comment.body.trim()}
                    className="inline-flex items-center gap-xs text-xs bg-primary text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50 font-sora"
                  >
                    <Send className="w-3 h-3" /> Post
                  </button>
                  <button
                    onClick={() => handleCancelDraft(activeHighlight!.id, comment.id)}
                    className="inline-flex items-center gap-xs text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container font-sora"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {inlineReplyToId === comment.id && (
          <form onSubmit={e => { e.preventDefault(); handlePostInlineReply(comment.id); }} className="mt-sm p-md bg-surface border border-border-default rounded-lg space-y-sm">
            <textarea value={inlineReplyBody} onChange={e => setInlineReplyBody(e.target.value)} placeholder="Write a reply..." rows={2}
              className="w-full bg-transparent border-0 p-0 font-dm-sans text-xs text-on-surface placeholder:text-on-surface-muted focus:ring-0 outline-none resize-y thin-scrollbar" />
            <div className="flex gap-sm">
              <button type="submit" disabled={posting || !inlineReplyBody.trim()} className="inline-flex items-center gap-xs text-xs bg-primary text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50"><Send className="w-3 h-3" /> {posting ? "Posting..." : "Reply"}</button>
              <button type="button" onClick={() => { setInlineReplyToId(null); setInlineReplyBody(""); }} className="inline-flex items-center gap-xs text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container"><X className="w-3 h-3" /> Cancel</button>
            </div>
          </form>
        )}
        {inlineAiError?.id === comment.id && (
          <div className="mt-sm p-md bg-error/5 border border-error/20 rounded-lg">
            <div className="flex items-start justify-between gap-md"><span className="font-sora text-[10px] text-error leading-relaxed">{inlineAiError.message}</span><button onClick={() => cancelInlineAiReply(comment.id)} className="text-on-surface-muted hover:text-on-surface flex-shrink-0"><X className="w-3 h-3" /></button></div>
          </div>
        )}
        {(inlineAiLoading === comment.id || inlineAiDrafts.has(comment.id)) && (
          <div className="mt-sm bg-brand/5 border border-brand/20 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-brand/10 bg-brand/[0.03] px-sm">
              <div className="flex">
                <button type="button" onClick={() => setInlineAiDraftTabs(prev => { const n = new Map(prev); n.set(comment.id, "write"); return n; })}
                  className={`inline-flex items-center gap-xs px-md py-sm font-sora text-[10px] uppercase tracking-widest border-b-2 transition-colors ${(inlineAiDraftTabs.get(comment.id) || "write") === "write" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}><PenLine className="w-3 h-3" /> Write</button>
                <button type="button" onClick={() => setInlineAiDraftTabs(prev => { const n = new Map(prev); n.set(comment.id, "preview"); return n; })}
                  className={`inline-flex items-center gap-xs px-md py-sm font-sora text-[10px] uppercase tracking-widest border-b-2 transition-colors ${inlineAiDraftTabs.get(comment.id) === "preview" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}><Eye className="w-3 h-3" /> Preview</button>
              </div>
              <span className="font-sora text-[10px] text-brand uppercase tracking-widest pr-sm">{inlineAiLoading === comment.id ? "Generating..." : "AI Draft"}</span>
            </div>
            {(inlineAiDraftTabs.get(comment.id) || "write") === "write" ? (
              <textarea value={inlineAiDrafts.get(comment.id) || ""} onChange={e => { setInlineAiDrafts(prev => { const n = new Map(prev); n.set(comment.id, e.target.value); return n; }); }}
                rows={4} className="w-full bg-transparent border-0 px-md py-sm font-dm-sans text-xs text-on-surface focus:ring-0 outline-none resize-y thin-scrollbar" placeholder={inlineAiLoading === comment.id ? "Waiting for response..." : ""} />
            ) : (
              <div className="px-md py-sm min-h-[80px]">{inlineAiDrafts.get(comment.id)?.trim()
                ? <MarkdownHtml html={mdBlock(inlineAiDrafts.get(comment.id) || "")} className="prose font-dm-sans text-xs text-on-surface" />
                : <p className="font-dm-sans text-xs text-on-surface-muted italic">Waiting for response...</p>}</div>
            )}
            {inlineAiLoading !== comment.id && (
              <div className="flex gap-sm px-md pb-md pt-sm">
                <button onClick={() => postInlineAiReply(comment.id)} disabled={posting} className="inline-flex items-center gap-xs text-xs bg-brand text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50"><Send className="w-3 h-3" /> {posting ? "Posting..." : "Post Reply"}</button>
                <button onClick={() => cancelInlineAiReply(comment.id)} className="inline-flex items-center gap-xs text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container"><X className="w-3 h-3" /> Cancel</button>
              </div>
            )}
          </div>
        )}
        {comment.replies.length > 0 && depth < maxDepth && (
          <div className="mt-sm space-y-sm">{comment.replies.map(reply => renderCommentTree(reply, depth + 1))}</div>
        )}
      </div>
    );
  };

  const headerLabel = activeHighlightData?.color === "underline" ? "Comment" : "Highlight";

  return (
    <>
      {isOwner && (
        <SelectionToolbar visible={selection.visible} x={selection.x} y={selection.y}
          onHighlight={handleHighlight} onComment={handleCommentOnSelection}
          onTutorMode={selectionAi ? handleTutorMode : undefined}
          onDismiss={clearSelection}
          models={selectionAi ? inlineModels : undefined}
          aiModel={selectionAi ? inlineAiModel : undefined}
          aiProvider={selectionAi ? inlineAiProvider : undefined}
          onAiModelChange={selectionAi ? (id, prov) => {
            setInlineAiModel(id);
            if (prov) setInlineAiProvider(prov);
          } : undefined}
          aiDisabled={aiUnavailable}
        />
      )}
      {activeHighlight && !inlineExpanded && (
        <div className="fixed inset-0 z-modal-above-r3f" onClick={() => setActiveHighlight(null)}>
          <div className="absolute bg-surface border border-border-default rounded-xl shadow-2xl w-80 max-h-96 flex flex-col"
            style={{ left: Math.max(8, Math.min(activeHighlight.x - 160, window.innerWidth - 340)), top: Math.min(activeHighlight.y + 8, window.innerHeight - 400) }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-lg py-md border-b border-border-default">
              <span className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">{headerLabel}</span>
              <div className="flex items-center gap-sm">
                {isOwner && (
                  <div className="relative" ref={inlineModelMenuRef}>
                    <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : "AI model"}>
                    <button type="button" onClick={() => setInlineModelMenuOpen(!inlineModelMenuOpen)} disabled={inlineAiLoading !== null || aiUnavailable}
                      className="flex items-center gap-xs text-on-surface-muted hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><Bot className="w-3.5 h-3.5" /><ChevronDown className="w-3 h-3" /></button>
                    </Tooltip>
                    {inlineModelMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-surface border border-border-default rounded-lg shadow-xl z-50 py-xs min-w-[200px] max-h-[300px] overflow-y-auto thin-scrollbar">
                        {(() => {
                          const d = inlineModels.filter(m => m.provider === "deepseek"), g = inlineModels.filter(m => m.provider === "gemini"),
                            o = inlineModels.filter(m => m.provider === "openrouter"), gr = inlineModels.filter(m => m.provider === "groq"),
                            ce = inlineModels.filter(m => m.provider === "cerebras"),
                            st = inlineModels.filter(m => m.provider === "straitly");
                          return (<>
                            {d.length > 0 && (<><SectionHeader label="DeepSeek" dotColor="#b8c3ff" />{d.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                            {g.length > 0 && (<><SectionHeader label="Gemini" dotColor="#47e175" />{g.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}><span className="truncate mr-sm">{m.label}</span>{m.free && <span className="text-[9px] text-accent-orange flex-shrink-0">FREE</span>}</button>)}</>)}
                            {gr.length > 0 && (<><SectionHeader label="Groq" dotColor="#fde68a" />{gr.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                            {ce.length > 0 && (<><SectionHeader label="Cerebras" dotColor="#a78bfa" />{ce.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                            {st.length > 0 && (<><SectionHeader label="Straightly" dotColor="#06B6D4" />{st.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                            {o.filter(m => m.free).length > 0 && (<><SectionHeader label="OpenRouter · Free" dotColor="#fb923c" />{o.filter(m => m.free).map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}><span className="truncate mr-sm">{m.label}</span>{m.free && <span className="text-[9px] text-accent-orange flex-shrink-0">FREE</span>}</button>)}</>)}
                            {o.filter(m => !m.free).length > 0 && (<><SectionHeader label="OpenRouter · Paid" dotColor="#fb923c" />{o.filter(m => !m.free).map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                          </>);
                        })()}
                      </div>
                    )}
                  </div>
                )}
                <Tooltip label="Expand">
                <button onClick={() => setInlineExpanded(true)} className="p-xs rounded-md text-on-surface-muted hover:text-on-surface transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
                </Tooltip>
                <Tooltip label="Delete highlight">
                <button onClick={() => setDeleteTarget({ kind: "highlight" })} disabled={deleting} className="p-xs rounded-md text-on-surface-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50">
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button>
                </Tooltip>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto thin-scrollbar px-lg py-md space-y-md">
              {activeHighlightData?.comments && (activeHighlightData.comments as ThreadedComment[]).length > 0
                ? (activeHighlightData.comments as ThreadedComment[]).map(c => renderCommentTree(c, 0))
                : <p className="font-dm-sans text-sm text-on-surface-muted italic text-center py-md">No comments yet</p>}
            </div>
            <div className="border-t border-border-default p-md">
              <textarea value={commentBody} onChange={e => setCommentBody(e.target.value)} placeholder="Add a comment..." rows={2}
                className="w-full bg-surface-container-low border border-border-default rounded-lg px-md py-sm font-dm-sans text-sm text-on-surface placeholder:text-on-surface-muted resize-y thin-scrollbar focus:border-primary/50 outline-none"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }} />
              <div className="flex justify-between items-center mt-sm">
                <span className="font-sora text-[10px] text-on-surface-muted">Enter to post</span>
                <button onClick={handlePostComment} disabled={!commentBody.trim() || posting}
                  className="px-md py-sm rounded-md font-sora text-xs bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-xs">
                  {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}{posting ? "Posting..." : "Post"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeHighlight && inlineExpanded && (
        <div className="fixed inset-0 z-modal-above-r3f bg-background/95 backdrop-blur-sm flex items-center justify-center p-xl" onClick={() => { setInlineExpanded(false); setActiveHighlight(null); }}>
          <div className="bg-surface border border-border-default rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-lg py-md border-b border-border-default">
              <span className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">{headerLabel}</span>
              <div className="flex items-center gap-sm">
                {isOwner && <div className="relative" ref={inlineModelMenuRef}>
                  <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : "AI model"}>
                  <button type="button" onClick={() => setInlineModelMenuOpen(!inlineModelMenuOpen)} disabled={inlineAiLoading !== null || aiUnavailable}
                    className="flex items-center gap-xs text-on-surface-muted hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><Bot className="w-3.5 h-3.5" /><ChevronDown className="w-3 h-3" /></button>
                  </Tooltip>
                  {inlineModelMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-surface border border-border-default rounded-lg shadow-xl z-50 py-xs min-w-[200px] max-h-[300px] overflow-y-auto thin-scrollbar">
                      {(() => {
                        const d = inlineModels.filter(m => m.provider === "deepseek"), g = inlineModels.filter(m => m.provider === "gemini"),
                          o = inlineModels.filter(m => m.provider === "openrouter"), gr = inlineModels.filter(m => m.provider === "groq"),
                          ce = inlineModels.filter(m => m.provider === "cerebras"),
                          st = inlineModels.filter(m => m.provider === "straitly");
                        return (<>
                          {d.length > 0 && (<><SectionHeader label="DeepSeek" dotColor="#b8c3ff" />{d.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                          {g.length > 0 && (<><SectionHeader label="Gemini" dotColor="#47e175" />{g.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}><span className="truncate mr-sm">{m.label}</span>{m.free && <span className="text-[9px] text-accent-orange flex-shrink-0">FREE</span>}</button>)}</>)}
                          {gr.length > 0 && (<><SectionHeader label="Groq" dotColor="#fde68a" />{gr.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                          {ce.length > 0 && (<><SectionHeader label="Cerebras" dotColor="#a78bfa" />{ce.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                          {st.length > 0 && (<><SectionHeader label="Straightly" dotColor="#06B6D4" />{st.map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                          {o.filter(m => m.free).length > 0 && (<><SectionHeader label="OpenRouter · Free" dotColor="#fb923c" />{o.filter(m => m.free).map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}><span className="truncate mr-sm">{m.label}</span>{m.free && <span className="text-[9px] text-accent-orange flex-shrink-0">FREE</span>}</button>)}</>)}
                          {o.filter(m => !m.free).length > 0 && (<><SectionHeader label="OpenRouter · Paid" dotColor="#fb923c" />{o.filter(m => !m.free).map(m => <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setInlineAiModel(m.id); setInlineAiProvider(m.provider); setInlineModelMenuOpen(false); }} className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === inlineAiModel && m.provider === inlineAiProvider ? "text-brand font-medium" : "text-on-surface"}`}>{m.label}</button>)}</>)}
                        </>);
                      })()}
                    </div>
                  )}
                </div>}
                <Tooltip label="Delete highlight">
                <button onClick={() => setDeleteTarget({ kind: "highlight" })} disabled={deleting} className="p-xs rounded-md text-on-surface-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50">
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button>
                </Tooltip>
                <Tooltip label="Close">
                <button onClick={() => { setInlineExpanded(false); setActiveHighlight(null); }} className="p-xs rounded-md text-on-surface-muted hover:text-on-surface transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
                </Tooltip>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto thin-scrollbar px-lg py-md space-y-md">
              {activeHighlightData?.comments && (activeHighlightData.comments as ThreadedComment[]).length > 0
                ? (activeHighlightData.comments as ThreadedComment[]).map(c => renderCommentTree(c, 0))
                : <p className="font-dm-sans text-sm text-on-surface-muted italic text-center py-md">No comments yet</p>}
            </div>
            <div className="border-t border-border-default p-md">
              <textarea value={commentBody} onChange={e => setCommentBody(e.target.value)} placeholder="Add a comment..." rows={3}
                className="w-full bg-surface-container-low border border-border-default rounded-lg px-md py-sm font-dm-sans text-sm text-on-surface placeholder:text-on-surface-muted resize-y thin-scrollbar focus:border-primary/50 outline-none"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }} />
              <div className="flex justify-between items-center mt-sm">
                <span className="font-sora text-[10px] text-on-surface-muted">Enter to post</span>
                <button onClick={handlePostComment} disabled={!commentBody.trim() || posting}
                  className="px-md py-sm rounded-md font-sora text-xs bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-xs">
                  {posting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}{posting ? "Posting..." : "Post"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <ConfirmModal
          title={deleteTarget.kind === "highlight" ? "Delete highlight" : "Delete comment"}
          message={deleteTarget.kind === "highlight" ? "Delete this highlight and all its comments?" : "Delete this comment and its replies?"}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting || inlineDeleting !== null}
        />
      )}
    </>
  );
}
