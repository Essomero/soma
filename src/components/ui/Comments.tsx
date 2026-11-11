import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, Send, Edit3, Trash2, X, Check, Copy, Eye, PenLine, Bot, Loader2, ChevronDown, Reply, Brain } from "lucide-react";
import { mdBlock } from "@/lib/markdown";
import { useAuth } from "@/lib/AuthContext";
import MarkdownHtml from "@/components/ui/MarkdownHtml";
import { SectionHeader } from "@/components/ui/SectionHeader";
import Tooltip from "@/components/ui/Tooltip";
import { COMMENT_MAX_DEPTH } from "@/lib/highlights";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { streamChat } from "@/lib/tutor/client";
import { TUTOR_MODES } from "../../../shared/tutor/modes.js";

interface Comment {
  id: number;
  story_slug: string;
  body: string;
  parent_id: number | null;
  is_ai: number;
  ai_model: string | null;
  mode: string | null;
  created_at: string;
  updated_at: string | null;
  replies: Comment[];
}

interface StoryContext {
  title: string;
  body: string;
}

interface CommentsProps {
  storySlug: string;
  storyContext?: StoryContext;
  /**
   * Bump to refetch the thread list, e.g. after the sibling
   * InlineHighlights posts a highlight-attached comment. Keeps the
   * section below in sync without a page refresh.
   */
  refreshSignal?: number;
}

interface ModelInfo {
  id: string;
  label: string;
  provider: string;
  free?: boolean;
  pricing?: { prompt: string; completion: string } | null;
}

const DEFAULT_MODELS: ModelInfo[] = [
  { id: "deepseek-flash", label: "DeepSeek Flash", provider: "deepseek" },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", provider: "deepseek" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "gemini" },
  { id: "gemini-flash-latest", label: "Gemini Flash Latest", provider: "gemini" },
  { id: "gemini-flash-lite-latest", label: "Gemini Flash-Lite Latest", provider: "gemini" },
  { id: "google/gemini-2.5-flash", label: "Google: Gemini 2.5 Flash", provider: "openrouter" },
  { id: "google/gemini-flash-latest", label: "Google: Gemini Flash Latest", provider: "openrouter" },
  { id: "google/gemini-flash-lite-latest", label: "Google: Gemini Flash-Lite Latest", provider: "openrouter" },
];

function fmtDate(raw: any) {
  const iso = (raw && typeof raw === "object") ? (raw.value || "") : String(raw || "");
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(raw);
  }
}


export default function Comments({ storySlug, storyContext, refreshSignal = 0 }: CommentsProps) {
  const { isOwner } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Inline reply state
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");

  // Copy state
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // AI reply state
  const [aiLoading, setAiLoading] = useState<number | null>(null);
  const [aiDrafts, setAiDrafts] = useState<Map<number, string>>(new Map());
  const [aiDraftTabs, setAiDraftTabs] = useState<Map<number, "write" | "preview">>(new Map());
  const [aiError, setAiError] = useState<{id: number, message: string} | null>(null);
  const [models, setModels] = useState<ModelInfo[]>(DEFAULT_MODELS);
  const [modelsReady, setModelsReady] = useState(false);
  const [aiModel, setAiModel] = useState<string>("deepseek-flash");
  const [aiProvider, setAiProvider] = useState<string>("deepseek");

  // Fetch available models. Until this resolves with a non-empty list,
  // AI actions render disabled: no keys must never look like a working model.
  useEffect(() => {
    fetch("/api/models")
      .then(r => r.json())
      .then(data => {
        setModels(data.models ?? []);
        setModelsReady(true);
        if (data.models?.length) {
          // Keep current selection if still valid
          const current = data.models.find((m: ModelInfo) => m.id === aiModel && m.provider === aiProvider);
          if (!current) {
            setAiModel(data.models[0].id);
            setAiProvider(data.models[0].provider);
          }
        }
      })
      .catch(() => { setModels([]); setModelsReady(true); });
  }, []);
  const aiUnavailable = !modelsReady || models.length === 0;
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownAlign, setDropdownAlign] = useState<"left" | "right" | "center">("left");

  // Summarize state
  const [summarizing, setSummarizing] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [summaryTab, setSummaryTab] = useState<"write" | "preview">("write");

  // Explain state
  const [explaining, setExplaining] = useState(false);
  const [explainDraft, setExplainDraft] = useState("");
  const [explainTab, setExplainTab] = useState<"write" | "preview">("write");

  useEffect(() => {
    if (!modelMenuOpen) return;
    // Pick alignment based on available space
    if (modelBtnRef.current) {
      const rect = modelBtnRef.current.getBoundingClientRect();
      const menuWidth = 260;
      const spaceRight = window.innerWidth - rect.left;
      const spaceLeft = rect.right;
      if (spaceRight < menuWidth && spaceLeft >= menuWidth) {
        setDropdownAlign("right");
      } else if (spaceRight >= menuWidth && spaceLeft >= menuWidth) {
        setDropdownAlign("center");
      } else {
        setDropdownAlign("left");
      }
    }
    const handler = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modelMenuOpen]);

  // Turso returns integers as strings; normalize once on the way in so
  // identity checks below (containsId, reply attach) compare numbers.
  const normalize = (nodes: any[]): Comment[] => nodes.map(n => ({
    ...n,
    id: Number(n.id),
    parent_id: n.parent_id != null ? Number(n.parent_id) : null,
    is_ai: Number(n.is_ai ?? 0),
    replies: normalize(n.replies || []),
  }));

  const fetchComments = useCallback(async () => {
    try {
      const r = await fetch(`/api/comments?story=${encodeURIComponent(storySlug)}`);
      if (r.ok) setComments(normalize(await r.json()));
    } catch {}
  }, [storySlug]);

  // Refetch on mount, on story change, and whenever a sibling highlight
  // interaction bumps refreshSignal (new highlight comments appear below
  // in real time, no refresh needed).
  useEffect(() => { fetchComments(); }, [fetchComments, refreshSignal]);

  const containsId = (nodes: Comment[], id: number): boolean => {
    for (const n of nodes) {
      if (n.id === id) return true;
      if (n.replies?.length && containsId(n.replies, id)) return true;
    }
    return false;
  };

  const insertCreated = (created: any) => {
    if (!created || created.id == null) return;
    const node: Comment = {
      ...created,
      id: Number(created.id),
      parent_id: created.parent_id != null ? Number(created.parent_id) : null,
      is_ai: Number(created.is_ai ?? 0),
      replies: [],
    };
    setComments(prev => {
      // No-op when the node is already listed (e.g. reconciling after a
      // refetch that already included it). Keeps re-insert safe.
      if (containsId(prev, node.id)) return prev;
      if (node.parent_id == null) return [node, ...prev];
      let attached = false;
      const attach = (nodes: Comment[]): Comment[] => nodes.map(n => {
        if (n.id === node.parent_id) { attached = true; return { ...n, replies: [...(n.replies || []), node] }; }
        const replies = attach(n.replies || []);
        return replies === n.replies ? n : { ...n, replies };
      });
      const next = attach(prev);
      return attached ? next : [node, ...prev];
    });
  };

  const postComment = async (text: string, parentId?: number | null) => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storySlug, body: text.trim(), parentId: parentId ?? null }),
      });
      if (r.ok) {
        try { insertCreated(await r.json()); } catch {}
        setBody("");
        setReplyBody("");
        setReplyToId(null);
      }
    } catch {}
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    postComment(body, null);
  };

  const handleReplySubmit = (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    postComment(replyBody, parentId);
  };

  const handleEdit = async (id: number) => {
    if (!editBody.trim()) return;
    try {
      const r = await fetch("/api/comments", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, body: editBody.trim() }),
      });
      if (r.ok) { setEditingId(null); setEditBody(""); fetchComments(); }
    } catch {}
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const r = await fetch("/api/comments", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget }),
      });
      if (r.ok) fetchComments();
    } catch {}
    setDeleting(false);
    setDeleteTarget(null);
  };

  // Find a comment by ID in the tree and return the path from root to it
  const findThreadChain = (commentId: number, nodes: Comment[], path: Comment[] = []): Comment[] | null => {
    for (const node of nodes) {
      if (node.id === commentId) return [...path, node];
      if (node.replies?.length) {
        const found = findThreadChain(commentId, node.replies, [...path, node]);
        if (found) return found;
      }
    }
    return null;
  };

  const handleAiReply = async (comment: Comment) => {
    if (aiLoading !== null) return;

    setAiLoading(comment.id);
    setAiError(null);

    setAiDrafts(prev => {
      const next = new Map(prev);
      next.set(comment.id, "");
      return next;
    });
    setAiDraftTabs(prev => {
      const next = new Map(prev);
      next.set(comment.id, "write");
      return next;
    });

    try {
      // Build thread context: walk up the parent chain
      const chain = findThreadChain(comment.id, comments);
      let threadContext = "";
      if (chain && chain.length > 1) {
        threadContext = "\n\n--- THREAD CONTEXT (read bottom-to-top) ---\n";
        for (const c of chain) {
          const author = c.is_ai == 1
            ? (models.find(m => m.id === c.ai_model)?.label || "AI")
            : "User";
          threadContext += `\n[${author}]: ${c.body}\n`;
        }
        threadContext += "--- END THREAD ---\n\n";
      }

      // Truncate article body to avoid huge context
      const articleExcerpt = storyContext?.body
        ? storyContext.body.slice(0, 8000) + (storyContext.body.length > 8000 ? "..." : "")
        : "";

      await streamChat({
        action: "comment-reply",
        context: {
          commentBody: comment.body,
          articleTitle: storyContext?.title,
          articleExcerpt: articleExcerpt,
          threadContext,
        },
        model: aiModel,
        provider: aiProvider,
        onToken: (full) => {
          setAiDrafts(prev => {
            const next = new Map(prev);
            next.set(comment.id, full);
            return next;
          });
        },
      });
    } catch (e) {
      setAiError({ id: comment.id, message: e instanceof Error ? e.message : "Unknown error" });
      setAiDrafts(prev => {
        const next = new Map(prev);
        next.delete(comment.id);
        return next;
      });
      setAiDraftTabs(prev => {
        const next = new Map(prev);
        next.delete(comment.id);
        return next;
      });
    }
    setAiLoading(null);
  };

  const handleSummarize = async () => {
    if (summarizing || aiLoading !== null) return;
    if (!storyContext) return;

    setSummarizing(true);
    setSummaryDraft("");
    setSummaryTab("write");

    try {
      await streamChat({
        action: "article-summary",
        context: {
          articleTitle: storyContext.title,
          articleBody: storyContext.body,
        },
        model: aiModel,
        provider: aiProvider,
        onToken: (full) => setSummaryDraft(full),
      });
    } catch (e) {
      setAiError({ id: -1, message: e instanceof Error ? e.message : "Unknown error" });
    }
    setSummarizing(false);
  };

  const postSummary = async () => {
    if (!summaryDraft.trim()) return;
    setLoading(true);
    try {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storySlug, body: summaryDraft.trim(), isAi: true, aiModel }),
      });
      if (r.ok) {
        let created: any = null;
        try { created = await r.json(); } catch {}
        if (created && created.id != null) {
          insertCreated(created);
          setSummaryDraft("");
          setSummarizing(false);
        } else {
          setAiError({ id: -1, message: (created && created.error) || "Couldn't save — try again." });
        }
      } else {
        setAiError({ id: -1, message: `Couldn't save (HTTP ${r.status}) — try again.` });
      }
    } catch {
      setAiError({ id: -1, message: "Couldn't save — try again." });
    }
    setLoading(false);
  };

  const handleExplain = async () => {
    if (explaining || aiLoading !== null) return;
    if (!storyContext) return;

    setExplaining(true);
    setExplainDraft("");
    setExplainTab("write");

    try {
      await streamChat({
        action: "article-explain",
        context: {
          articleTitle: storyContext.title,
          articleBody: storyContext.body,
        },
        model: aiModel,
        provider: aiProvider,
        onToken: (full) => setExplainDraft(full),
      });
    } catch (e) {
      setAiError({ id: -2, message: e instanceof Error ? e.message : "Unknown error" });
    }
    setExplaining(false);
  };

  const postExplain = async () => {
    if (!explainDraft.trim()) return;
    setLoading(true);
    try {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storySlug, body: explainDraft.trim(), isAi: true, aiModel }),
      });
      if (r.ok) {
        let created: any = null;
        try { created = await r.json(); } catch {}
        if (created && created.id != null) {
          insertCreated(created);
          setExplainDraft("");
          setExplaining(false);
        } else {
          setAiError({ id: -2, message: (created && created.error) || "Couldn't save — try again." });
        }
      } else {
        setAiError({ id: -2, message: `Couldn't save (HTTP ${r.status}) — try again.` });
      }
    } catch {
      setAiError({ id: -2, message: "Couldn't save — try again." });
    }
    setLoading(false);
  };

  const postAiReply = async (commentId: number) => {
    const draft = aiDrafts.get(commentId);
    if (!draft?.trim()) return;

    setLoading(true);
    try {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storySlug, body: draft.trim(), parentId: commentId, isAi: true, aiModel }),
      });
      if (r.ok) {
        let created: any = null;
        try { created = await r.json(); } catch {}
        if (created && created.id != null) {
          insertCreated(created);
          setAiDrafts(prev => {
            const next = new Map(prev);
            next.delete(commentId);
            return next;
          });
          setAiDraftTabs(prev => {
            const next = new Map(prev);
            next.delete(commentId);
            return next;
          });
        } else {
          setAiError({ id: commentId, message: (created && created.error) || "Couldn't save — try again." });
        }
      } else {
        setAiError({ id: commentId, message: `Couldn't save (HTTP ${r.status}) — try again.` });
      }
    } catch {
      setAiError({ id: commentId, message: "Couldn't save — try again." });
    }
    setLoading(false);
  };

  const cancelAiReply = (commentId: number) => {
    setAiDrafts(prev => {
      const next = new Map(prev);
      next.delete(commentId);
      return next;
    });
    setAiDraftTabs(prev => {
      const next = new Map(prev);
      next.delete(commentId);
      return next;
    });
    setAiError(null);
  };

  const setAiDraftTab = (commentId: number, tab: "write" | "preview") => {
    setAiDraftTabs(prev => {
      const next = new Map(prev);
      next.set(commentId, tab);
      return next;
    });
  };

  const handleCopy = (comment: Comment) => {
    const text = comment.body;
    const onSuccess = () => {
      setCopiedId(comment.id);
      setTimeout(() => setCopiedId((prev) => (prev === comment.id ? null : prev)), 1500);
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
  };

  // Recursive comment renderer
  const renderComment = (comment: Comment, depth: number) => {
    const isReply = depth > 0;
    const maxDepth = COMMENT_MAX_DEPTH;

    return (
      <div key={comment.id}>
        <div className={`p-xl bg-surface-container-low border border-border-default rounded-xl ${isReply ? "ml-xl border-l-2 border-l-brand/40" : ""}`}>
          {editingId === comment.id ? (
            <div className="space-y-md">
              <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={3} className="w-full bg-surface border border-border-default rounded-lg px-lg py-md font-dm-sans text-sm text-on-surface focus:border-primary outline-none resize-y" />
              <div className="flex gap-sm">
                <button onClick={() => handleEdit(comment.id)} className="inline-flex items-center gap-xs font-sora text-xs bg-primary text-on-primary px-md py-sm rounded-md hover:opacity-90"><Check className="w-3 h-3" /> Save</button>
                <button onClick={() => setEditingId(null)} className="inline-flex items-center gap-xs font-sora text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container"><X className="w-3 h-3" /> Cancel</button>
              </div>
            </div>
          ) : (
            <>
              {/* Author badge */}
              <div className="flex items-center gap-sm mb-sm">
                {comment.is_ai == 1 ? (
                  <>
                    <Bot className="w-3.5 h-3.5 text-brand" />
                    <span className="font-sora text-[10px] text-brand uppercase tracking-widest">
                      {models.find(m => m.id === comment.ai_model)?.label || "AI"}
                    </span>
                    {comment.mode && (
                      <span className="font-sora text-[9px] text-brand/70 uppercase tracking-wider bg-brand/10 px-xs py-px rounded">
                        {TUTOR_MODES.find((m) => m.id === comment.mode)?.label || comment.mode}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <span className="text-[7px] text-primary font-bold">Y</span>
                    </div>
                    <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-widest">{isOwner ? "You" : "Anonymous"}</span>
                  </>
                )}
              </div>
              <MarkdownHtml html={mdBlock(comment.body)} className="prose font-dm-sans text-body-base text-on-surface leading-relaxed" />
              <div className="flex items-center justify-between mt-lg pt-md border-t border-border-default">
                <span className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">
                  {fmtDate(comment.created_at)}{comment.updated_at && comment.updated_at !== comment.created_at ? " (edited)" : ""}
                </span>
                <div className="flex items-center gap-sm">
                  <Tooltip label={copiedId === comment.id ? "Copied" : "Copy"}>
                  <button
                    onClick={() => handleCopy(comment)}
                    className={`transition-colors ${copiedId === comment.id ? "text-primary" : "text-on-surface-muted hover:text-primary"}`}
                  >
                    {copiedId === comment.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  </Tooltip>
                  {comment.is_ai != 1 && (
                    <Tooltip label="Edit">
                    <button onClick={() => { setEditingId(comment.id); setEditBody(comment.body); }} className="text-on-surface-muted hover:text-primary transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                    </Tooltip>
                  )}
                  <Tooltip label="Reply">
                  <button
                    onClick={() => {
                      setReplyToId(replyToId === comment.id ? null : comment.id);
                      setReplyBody("");
                    }}
                    className={`transition-colors ${replyToId === comment.id ? "text-brand" : "text-on-surface-muted hover:text-brand"}`}
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>
                  </Tooltip>
                  {isOwner && (
                  <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : "AI Reply"}>
                  <button
                    onClick={() => handleAiReply(comment)}
                    disabled={aiLoading !== null || aiUnavailable}
                    className="text-on-surface-muted hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {aiLoading === comment.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                  </button>
                  </Tooltip>
                  )}
                  <Tooltip label="Delete">
                  <button onClick={() => setDeleteTarget(comment.id)} className="text-on-surface-muted hover:text-error transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </Tooltip>
                </div>
              </div>

              {/* Inline manual reply form */}
              {replyToId === comment.id && (
                <form onSubmit={(e) => handleReplySubmit(e, comment.id)} className="mt-md p-lg bg-surface border border-border-default rounded-lg space-y-md">
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); (e.target as HTMLTextAreaElement).form?.requestSubmit(); } }}
                    placeholder="Write a reply... (⌘+Enter to send)"
                    rows={3}
                    className="w-full bg-transparent border-0 p-0 font-dm-sans text-sm text-on-surface placeholder:text-on-surface-muted focus:ring-0 outline-none resize-y"
                  />
                  <div className="flex gap-sm">
                    <button type="submit" disabled={loading || !replyBody.trim()} className="inline-flex items-center gap-xs font-sora text-xs bg-primary text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50">
                      <Send className="w-3 h-3" /> {loading ? "Posting..." : "Reply"}
                    </button>
                    <button type="button" onClick={() => { setReplyToId(null); setReplyBody(""); }} className="inline-flex items-center gap-xs font-sora text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* AI error */}
              {aiError?.id === comment.id && (
                <div className="mt-md p-lg bg-error/5 border border-error/20 rounded-lg">
                  <div className="flex items-start justify-between gap-md">
                    <span className="font-sora text-xs text-error leading-relaxed">{aiError.message}</span>
                    <button onClick={() => cancelAiReply(comment.id)} className="text-on-surface-muted hover:text-on-surface flex-shrink-0 mt-0.5"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              )}

              {/* AI draft */}
              {(aiLoading === comment.id || aiDrafts.has(comment.id)) && (
                <div className="mt-md bg-brand/5 border border-brand/20 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-brand/10 bg-brand/[0.03] px-md">
                    <div className="flex">
                      <button type="button" onClick={() => setAiDraftTab(comment.id, "write")} className={`inline-flex items-center gap-sm px-lg py-sm font-sora text-xs uppercase tracking-widest border-b-2 transition-colors ${(aiDraftTabs.get(comment.id) || "write") === "write" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}>
                        <PenLine className="w-3 h-3" /> Write
                      </button>
                      <button type="button" onClick={() => setAiDraftTab(comment.id, "preview")} className={`inline-flex items-center gap-sm px-lg py-sm font-sora text-xs uppercase tracking-widest border-b-2 transition-colors ${aiDraftTabs.get(comment.id) === "preview" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}>
                        <Eye className="w-3 h-3" /> Preview
                      </button>
                    </div>
                    <div className="flex items-center gap-sm">
                      <Bot className="w-3.5 h-3.5 text-brand" />
                      <span className="font-sora text-[10px] text-brand uppercase tracking-widest">
                        {aiLoading === comment.id ? "Generating..." : "AI Draft"}
                      </span>
                    </div>
                  </div>

                  {(aiDraftTabs.get(comment.id) || "write") === "write" ? (
                    <textarea
                      value={aiDrafts.get(comment.id) || ""}
                      onChange={(e) => {
                        setAiDrafts(prev => {
                          const next = new Map(prev);
                          next.set(comment.id, e.target.value);
                          return next;
                        });
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); postAiReply(comment.id); } }}
                      rows={5}
                      className="w-full bg-transparent border-0 px-xl py-md font-dm-sans text-sm text-on-surface focus:ring-0 outline-none resize-y"
                      placeholder={aiLoading === comment.id ? "Waiting for response..." : "⌘+Enter to post"}
                    />
                  ) : (
                    <div className="px-xl py-md min-h-[120px]">
                      {aiDrafts.get(comment.id)?.trim()
                        ? <MarkdownHtml html={mdBlock(aiDrafts.get(comment.id) || "")} className="prose font-dm-sans text-body-base text-on-surface" />
                        : <p className="font-dm-sans text-on-surface-muted italic">Waiting for response...</p>
                      }
                    </div>
                  )}

                  {aiLoading !== comment.id && (
                    <div className="flex gap-sm px-xl pb-lg pt-sm">
                      <button onClick={() => postAiReply(comment.id)} disabled={loading} className="inline-flex items-center gap-xs font-sora text-xs bg-brand text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50">
                        <Send className="w-3 h-3" /> {loading ? "Posting..." : "Post Reply"}
                      </button>
                      <button onClick={() => cancelAiReply(comment.id)} className="inline-flex items-center gap-xs font-sora text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Render child replies recursively */}
        {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
          <div className="mt-lg space-y-lg">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant border-t border-border-default">
      {deleteTarget && <ConfirmModal title="Delete Comment" message="This action cannot be undone." onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={deleting} />}

      <div className="flex flex-col gap-md mb-xl">
        <h2 className="font-sora text-headline-md text-on-surface flex items-center gap-sm">
          <MessageSquare className="w-6 h-6 text-primary" />
          Comments{comments.length > 0 && <span className="font-dm-sans text-body-base text-on-surface-muted font-normal">({comments.length})</span>}
        </h2>
        {isOwner && (
        <div className="flex items-center gap-sm flex-wrap">
          {storyContext && (
            <>
              <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : "Explain article"} align="start">
              <button
                type="button"
                onClick={handleExplain}
                disabled={explaining || aiLoading !== null || aiUnavailable}
                className="flex items-center gap-xs bg-surface border border-border-default rounded-md px-sm py-sm font-sora text-xs text-on-surface hover:border-brand/50 hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {explaining ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                <span className="hidden sm:inline">Explain</span>
              </button>
              </Tooltip>
              <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : "Summarize article"} align="start">
              <button
                type="button"
                onClick={handleSummarize}
                disabled={summarizing || aiLoading !== null || aiUnavailable}
                className="flex items-center gap-xs bg-surface border border-border-default rounded-md px-sm py-sm font-sora text-xs text-on-surface hover:border-brand/50 hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {summarizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
                <span className="hidden sm:inline">Summarize</span>
              </button>
              </Tooltip>
            </>
          )}
          <Bot className="w-4 h-4 text-brand" />
          <div className="relative" ref={modelMenuRef}>
            <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : "AI model"} align="start">
            <button
              ref={modelBtnRef}
              type="button"
              onClick={() => setModelMenuOpen(!modelMenuOpen)}
              disabled={aiLoading !== null || aiUnavailable}
              className="flex items-center gap-xs bg-surface border border-border-default rounded-md px-sm py-sm font-sora text-xs text-on-surface hover:border-brand/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">{aiUnavailable ? "No AI models available" : ((models.find(m => m.id === aiModel && m.provider === aiProvider) || models.find(m => m.id === aiModel))?.label || aiModel)}</span>
              <ChevronDown className="w-3 h-3 text-on-surface-muted" />
            </button>
            </Tooltip>
            {modelMenuOpen && (
              <div className={`absolute top-full mt-1 bg-surface border border-border-default rounded-lg shadow-xl z-50 py-xs min-w-[200px] sm:min-w-[260px] max-h-[400px] overflow-y-auto ${
                dropdownAlign === "right" ? "right-0" : dropdownAlign === "center" ? "left-1/2 -translate-x-1/2" : "left-0"
              }`}>
                {(() => {
                  const deepseekModels = models.filter(m => m.provider === "deepseek");
                  const geminiModels = models.filter(m => m.provider === "gemini");
                  const openrouterModels = models.filter(m => m.provider === "openrouter");
                  const groqModels = models.filter(m => m.provider === "groq");
                  const cerebrasModels = models.filter(m => m.provider === "cerebras");
                  const straitlyModels = models.filter(m => m.provider === "straitly");
                  const freeOR = openrouterModels.filter(m => m.free);
                  const paidOR = openrouterModels.filter(m => !m.free);
                  return (
                    <>
                      {deepseekModels.length > 0 && (
                        <>
                          <SectionHeader label="DeepSeek" dotColor="#b8c3ff" />
                          {deepseekModels.map(m => (
                            <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setAiModel(m.id); setAiProvider(m.provider); setModelMenuOpen(false); }}
                              className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === aiModel && m.provider === aiProvider ? "text-brand font-medium" : "text-on-surface"}`}>
                              {m.label}
                            </button>
                          ))}
                        </>
                      )}
                      {geminiModels.length > 0 && (
                        <>
                          <SectionHeader label="Gemini" dotColor="#47e175" />
                          {geminiModels.map(m => (
                            <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setAiModel(m.id); setAiProvider(m.provider); setModelMenuOpen(false); }}
                              className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${m.id === aiModel && m.provider === aiProvider ? "text-brand font-medium" : "text-on-surface"}`}>
                              <span className="truncate mr-sm">{m.label}</span>
                              {m.free && <span className="text-[9px] text-accent-orange flex-shrink-0">FREE</span>}
                            </button>
                          ))}
                        </>
                      )}
                      {groqModels.length > 0 && (
                        <>
                          <SectionHeader label="Groq" dotColor="#fde68a" />
                          {groqModels.map(m => (
                            <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setAiModel(m.id); setAiProvider(m.provider); setModelMenuOpen(false); }}
                              className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === aiModel && m.provider === aiProvider ? "text-brand font-medium" : "text-on-surface"}`}>
                              {m.label}
                            </button>
                          ))}
                        </>
                      )}
                      {cerebrasModels.length > 0 && (
                        <>
                          <SectionHeader label="Cerebras" dotColor="#a78bfa" />
                          {cerebrasModels.map(m => (
                            <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setAiModel(m.id); setAiProvider(m.provider); setModelMenuOpen(false); }}
                              className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === aiModel && m.provider === aiProvider ? "text-brand font-medium" : "text-on-surface"}`}>
                              {m.label}
                            </button>
                          ))}
                        </>
                      )}
                      {straitlyModels.length > 0 && (
                        <>
                          <SectionHeader label="Straightly" dotColor="#06B6D4" />
                          {straitlyModels.map(m => (
                            <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setAiModel(m.id); setAiProvider(m.provider); setModelMenuOpen(false); }}
                              className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === aiModel && m.provider === aiProvider ? "text-brand font-medium" : "text-on-surface"}`}>
                              {m.label}
                            </button>
                          ))}
                        </>
                      )}
                      {freeOR.length > 0 && (
                        <>
                          <SectionHeader label="OpenRouter · Free" dotColor="#fb923c" />
                          {freeOR.map(m => (
                            <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setAiModel(m.id); setAiProvider(m.provider); setModelMenuOpen(false); }}
                              className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors flex items-center justify-between ${m.id === aiModel && m.provider === aiProvider ? "text-brand font-medium" : "text-on-surface"}`}>
                              <span className="truncate mr-sm">{m.label}</span>
                              <span className="text-[9px] text-accent-orange flex-shrink-0">FREE</span>
                            </button>
                          ))}
                        </>
                      )}
                      {paidOR.length > 0 && (
                        <>
                          <SectionHeader label="OpenRouter · Paid" dotColor="#fb923c" />
                          {paidOR.map(m => (
                            <button key={`${m.provider}-${m.id}`} type="button" onClick={() => { setAiModel(m.id); setAiProvider(m.provider); setModelMenuOpen(false); }}
                              className={`w-full text-left px-md py-sm font-sora text-xs hover:bg-surface-container transition-colors ${m.id === aiModel && m.provider === aiProvider ? "text-brand font-medium" : "text-on-surface"}`}>
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
        </div>
        )}
      </div>

      {/* Summary draft area */}
      {(summarizing || summaryDraft || aiError?.id === -1) && (
        <div className="mb-xxl max-w-3xl bg-brand/5 border border-brand/20 rounded-xl overflow-hidden">
          {aiError?.id === -1 ? (
            <div className="p-xl bg-error/5 border-b border-error/20">
              <div className="flex items-start justify-between gap-md">
                <span className="font-sora text-xs text-error leading-relaxed">{aiError.message}</span>
                <button onClick={() => setAiError(null)} className="text-on-surface-muted hover:text-on-surface flex-shrink-0 mt-0.5"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ) : (
            <>
            <div className="flex items-center justify-between border-b border-brand/10 bg-brand/[0.03] px-md">
              <div className="flex">
                <button type="button" onClick={() => setSummaryTab("write")} className={`inline-flex items-center gap-sm px-lg py-sm font-sora text-xs uppercase tracking-widest border-b-2 transition-colors ${summaryTab === "write" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}>
                  <PenLine className="w-3 h-3" /> Write
                </button>
                <button type="button" onClick={() => setSummaryTab("preview")} className={`inline-flex items-center gap-sm px-lg py-sm font-sora text-xs uppercase tracking-widest border-b-2 transition-colors ${summaryTab === "preview" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}>
                  <Eye className="w-3 h-3" /> Preview
                </button>
              </div>
              <div className="flex items-center gap-sm">
                <Bot className="w-3.5 h-3.5 text-brand" />
                <span className="font-sora text-[10px] text-brand uppercase tracking-widest">
                  {summarizing ? "Summarizing..." : "Summary Draft"}
                </span>
              </div>
            </div>

          {summaryTab === "write" ? (
            <textarea
              value={summaryDraft}
              onChange={(e) => setSummaryDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); postSummary(); } }}
              rows={8}
              className="w-full bg-transparent border-0 px-xl py-md font-dm-sans text-sm text-on-surface focus:ring-0 outline-none resize-y"
              placeholder={summarizing ? "Generating summary..." : "⌘+Enter to post"}
            />
          ) : (
            <div className="px-xl py-md min-h-[160px]">
              {summaryDraft.trim()
                ? <MarkdownHtml html={mdBlock(summaryDraft)} className="prose font-dm-sans text-body-base text-on-surface" />
                : <p className="font-dm-sans text-on-surface-muted italic">Generating summary...</p>
              }
            </div>
          )}

          {!summarizing && (
            <div className="flex gap-sm px-xl pb-lg pt-sm">
              <button onClick={postSummary} disabled={loading} className="inline-flex items-center gap-xs font-sora text-xs bg-brand text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50">
                <Send className="w-3 h-3" /> {loading ? "Posting..." : "Post Summary"}
              </button>
              <button onClick={() => { setSummaryDraft(""); setSummarizing(false); }} className="inline-flex items-center gap-xs font-sora text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container">
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          )}
          </>
        )}
        </div>
      )}

      {(explaining || explainDraft || aiError?.id === -2) && (
        <div className="mb-xxl max-w-3xl bg-brand/5 border border-brand/20 rounded-xl overflow-hidden">
          {aiError?.id === -2 ? (
            <div className="p-xl bg-error/5 border-b border-error/20">
              <div className="flex items-start justify-between gap-md">
                <span className="font-sora text-xs text-error leading-relaxed">{aiError.message}</span>
                <button onClick={() => setAiError(null)} className="text-on-surface-muted hover:text-on-surface flex-shrink-0 mt-0.5"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ) : (
            <>
            <div className="flex items-center justify-between border-b border-brand/10 bg-brand/[0.03] px-md">
              <div className="flex">
                <button type="button" onClick={() => setExplainTab("write")} className={`inline-flex items-center gap-sm px-lg py-sm font-sora text-xs uppercase tracking-widest border-b-2 transition-colors ${explainTab === "write" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}>
                  <PenLine className="w-3 h-3" /> Write
                </button>
                <button type="button" onClick={() => setExplainTab("preview")} className={`inline-flex items-center gap-sm px-lg py-sm font-sora text-xs uppercase tracking-widest border-b-2 transition-colors ${explainTab === "preview" ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}>
                  <Eye className="w-3 h-3" /> Preview
                </button>
              </div>
              <div className="flex items-center gap-sm">
                <Brain className="w-3.5 h-3.5 text-brand" />
                <span className="font-sora text-[10px] text-brand uppercase tracking-widest">
                  {explaining ? "Explaining..." : "Explain Draft"}
                </span>
              </div>
            </div>

          {explainTab === "write" ? (
            <textarea
              value={explainDraft}
              onChange={(e) => setExplainDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); postExplain(); } }}
              rows={8}
              className="w-full bg-transparent border-0 px-xl py-md font-dm-sans text-sm text-on-surface focus:ring-0 outline-none resize-y"
              placeholder={explaining ? "Generating explanation..." : "⌘+Enter to post"}
            />
          ) : (
            <div className="px-xl py-md min-h-[160px]">
              {explainDraft.trim()
                ? <MarkdownHtml html={mdBlock(explainDraft)} className="prose font-dm-sans text-body-base text-on-surface" />
                : <p className="font-dm-sans text-on-surface-muted italic">Generating explanation...</p>
              }
            </div>
          )}

          {!explaining && (
            <div className="flex gap-sm px-xl pb-lg pt-sm">
              <button onClick={postExplain} disabled={loading} className="inline-flex items-center gap-xs font-sora text-xs bg-brand text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50">
                <Send className="w-3 h-3" /> {loading ? "Posting..." : "Post Explanation"}
              </button>
              <button onClick={() => { setExplainDraft(""); setExplaining(false); }} className="inline-flex items-center gap-xs font-sora text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container">
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          )}
          </>
        )}
        </div>
      )}

      {/* New top-level comment form */}
      <form onSubmit={handleSubmit} className="mb-xxl max-w-3xl">
        <div className="bg-surface border border-border-default rounded-xl overflow-hidden">
          <div className="flex border-b border-border-default bg-surface-container px-md">
            <button type="button" onClick={() => setTab("write")} className={`inline-flex items-center gap-sm px-lg py-sm font-sora text-xs uppercase tracking-widest border-b-2 transition-colors ${tab === "write" ? "border-primary text-primary" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}><PenLine className="w-3 h-3" /> Write</button>
            <button type="button" onClick={() => setTab("preview")} className={`inline-flex items-center gap-sm px-lg py-sm font-sora text-xs uppercase tracking-widest border-b-2 transition-colors ${tab === "preview" ? "border-primary text-primary" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}><Eye className="w-3 h-3" /> Preview</button>
          </div>
          {tab === "write" ? (
            <textarea value={body} onChange={(e) => setBody(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); (e.currentTarget as HTMLTextAreaElement).form?.requestSubmit(); } }} placeholder="Write a comment... (markdown supported) — ⌘+Enter to post" rows={5} className="w-full bg-transparent border-0 px-xl py-md font-dm-sans text-on-surface placeholder:text-on-surface-muted focus:ring-0 outline-none resize-y" />
          ) : (
            <div className="px-xl py-md min-h-[120px]">
              {body.trim()
                ? <MarkdownHtml html={mdBlock(body)} className="prose font-dm-sans text-body-base text-on-surface leading-relaxed" />
                : <p className="font-dm-sans text-on-surface-muted italic">Nothing to preview.</p>
              }
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mt-md">
          <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-widest">Markdown supported</span>
          <button type="submit" disabled={loading || !body.trim()} className="inline-flex items-center gap-xs bg-primary text-on-primary font-sora text-xs px-md py-sm rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"><Send className="w-3 h-3" /> {loading ? "Posting..." : "Post"}</button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="font-dm-sans text-body-base text-on-surface-muted italic">No comments yet. Be the first.</p>
      ) : (
        <div className="space-y-lg max-w-3xl">
          {comments.map(comment => renderComment(comment, 0))}
        </div>
      )}
    </section>
  );
}
