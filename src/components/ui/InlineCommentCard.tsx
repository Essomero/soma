import { memo, useMemo, useState } from "react";
import { Send, X, Check, Copy, Bot, Loader2, Reply, Trash2, PenLine, Eye } from "lucide-react";
import { mdBlock } from "@/lib/markdown";
import MarkdownHtml from "@/components/ui/MarkdownHtml";
import Tooltip from "@/components/ui/Tooltip";
import { ThinkingSection } from "@/components/ui/ThinkingSection";
import { COMMENT_MAX_DEPTH } from "@/lib/highlights";
import { TUTOR_MODES } from "../../../shared/tutor/modes.js";
import { modeColor } from "@/lib/tutor/modeStyles";

// ── Types ──────────────────────────────────────────

export interface ThreadedComment {
  id: number;
  body: string;
  parentId: number | null;
  isAi: boolean;
  aiModel: string | null;
  aiAction?: string;
  mode?: string | null;
  createdAt: string;
  updatedAt: string | null;
  replies: ThreadedComment[];
}

interface InlineCommentCardProps {
  comment: ThreadedComment;
  depth: number;
  isOwner: boolean;
  activeHighlightId: number;
  /** Whether this specific card's reply form is open */
  isReplying: boolean;
  /** Whether AI is loading for this card */
  isAiLoading: boolean;
  /** The AI draft text for this card (empty string if none) */
  aiDraftText: string;
  /** The AI draft tab for this card */
  aiDraftTab: "write" | "preview";
  /** Whether this card has an AI error */
  hasAiError: boolean;
  /** The AI error message (only meaningful when hasAiError is true) */
  aiErrorMessage: string;
  aiUnavailable: boolean;
  posting: boolean;
  /** Whether this card is being deleted */
  isDeleting: boolean;
  /** Whether this card's text is in "copied" state */
  isCopied: boolean;
  /** Whether this card's draft is being posted */
  isDraftPosting: boolean;
  /** Whether this card has a post error */
  hasPostError: boolean;
  /** The post error message */
  postErrorMessage: string;
  /** Whether this card has thinking/reasoning content */
  hasThinking: boolean;
  /** The thinking/reasoning text */
  thinkingText: string;
  // Pre-computed lookups
  modelLabels: Record<string, string>;
  modeLabels: Record<string, string>;
  // Callbacks
  onCopyComment: (comment: ThreadedComment) => void;
  onSetReplyToId: (id: number | null) => void;
  onInlineAiReply: (comment: ThreadedComment) => void;
  onDeleteInlineComment: (id: number) => void;
  /** Called with (parentId, body) when a manual reply is submitted */
  onPostInlineReply: (parentId: number, body: string) => void;
  onCancelInlineAiReply: (id: number) => void;
  onPostInlineAiReply: (id: number) => void;
  onSetAiDraftTab: (id: number, tab: "write" | "preview") => void;
  onSetAiDraft: (id: number, text: string) => void;
  onPostDraft: (highlightId: number, tempId: number, body: string, mode: string) => void;
  onCancelDraft: (highlightId: number, tempId: number) => void;
  onSetPostError: (error: string | null) => void;
}

// ── Helpers ────────────────────────────────────────

const fmtInlineDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

// ── Single Comment Card (memoized) ─────────────────

const InlineCommentCard = memo(function InlineCommentCard({
  comment,
  depth,
  isOwner,
  activeHighlightId,
  isReplying,
  isAiLoading,
  aiDraftText,
  aiDraftTab,
  hasAiError,
  aiErrorMessage,
  aiUnavailable,
  posting,
  isDeleting,
  isCopied,
  isDraftPosting,
  hasPostError,
  postErrorMessage,
  hasThinking,
  thinkingText,
  modelLabels,
  modeLabels,
  onCopyComment,
  onSetReplyToId,
  onInlineAiReply,
  onDeleteInlineComment,
  onPostInlineReply,
  onCancelInlineAiReply,
  onPostInlineAiReply,
  onSetAiDraftTab,
  onSetAiDraft,
  onPostDraft,
  onCancelDraft,
  onSetPostError,
}: InlineCommentCardProps) {
  // Local reply body state — typing does not propagate to parent
  const [localReplyBody, setLocalReplyBody] = useState("");

  // Pre-compute expensive derivations once per body/id change
  const bodyHtml = useMemo(() => mdBlock(comment.body), [comment.body]);
  const modelLabel = modelLabels[comment.aiModel ?? ""] || "AI";
  const modeLabel = comment.aiAction || comment.mode
    ? modeLabels[comment.aiAction || comment.mode || ""] || "AI"
    : null;
  const modeClr = comment.aiAction || comment.mode
    ? modeColor(comment.aiAction || comment.mode)
    : "";
  const indent = depth > 0 ? "ml-md border-l-2 border-l-brand/30 pl-md" : "";

  const isAiDraftWrite = aiDraftTab === "write";
  const hasAiDraft = isAiLoading || aiDraftText.length > 0;
  const isDraft = comment.id < 0;
  const isEmptyDraft = isDraft && !comment.body.trim();

  // Derived AI draft preview HTML
  const aiDraftPreviewHtml = useMemo(
    () => (aiDraftText ? mdBlock(aiDraftText) : ""),
    [aiDraftText],
  );

  const hasReplies = comment.replies.length > 0 && depth < COMMENT_MAX_DEPTH;

  // ── Event handlers (stable per render, no inline arrow deps on parent) ──

  const handleReplyClick = () => {
    onSetReplyToId(isReplying ? null : comment.id);
    setLocalReplyBody("");
  };

  const handleCancelReply = () => {
    onSetReplyToId(null);
    setLocalReplyBody("");
  };

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    onPostInlineReply(comment.id, localReplyBody);
  };

  const handleCopy = () => onCopyComment(comment);

  const handleAiReply = () => onInlineAiReply(comment);

  const handleDelete = () => onDeleteInlineComment(comment.id);

  const handleCancelAi = () => onCancelInlineAiReply(comment.id);

  const handlePostAiReply = () => onPostInlineAiReply(comment.id);

  const handleSetAiDraftWrite = () => onSetAiDraftTab(comment.id, "write");

  const handleSetAiDraftPreview = () => onSetAiDraftTab(comment.id, "preview");

  const handleAiDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    onSetAiDraft(comment.id, e.target.value);

  const handlePostDraftClick = () =>
    onPostDraft(activeHighlightId, comment.id, comment.body, comment.aiAction ?? "");

  const handleCancelDraftClick = () =>
    onCancelDraft(activeHighlightId, comment.id);

  return (
    <div>
      {/* ── Comment card body ── */}
      <div className={`bg-surface-container-low border border-border-default rounded-lg p-md ${indent}`}>
        {/* Author badge */}
        <div className="flex items-center gap-xs mb-sm">
          {comment.isAi ? (
            <div className="flex items-center gap-xs">
              <span className="font-sora text-[10px] text-brand uppercase tracking-widest">
                {modelLabel}
              </span>
              {modeLabel && (
                <span className={`font-sora text-[9px] uppercase tracking-wider px-xs py-px rounded ${modeClr}`}>
                  {modeLabel}
                </span>
              )}
            </div>
          ) : (
            <span className="font-sora text-[10px] text-on-surface-muted uppercase tracking-widest">You</span>
          )}
          {comment.id >= 0 && (
            <span className="font-sora text-[10px] text-on-surface-muted">
              {fmtInlineDate(comment.createdAt)}
            </span>
          )}
          {isDraft && (
            <span className="font-sora text-[10px] text-amber-400 uppercase tracking-widest">Draft</span>
          )}
        </div>

        {/* Thinking / reasoning section */}
        {hasThinking && <ThinkingSection reasoning={thinkingText} />}

        {/* Body */}
        {isEmptyDraft ? (
          <div className="flex items-center gap-sm py-sm">
            <Loader2 className="w-3 h-3 animate-spin text-brand" />
            <span className="font-sora text-[10px] text-brand animate-pulse">Generating...</span>
          </div>
        ) : (
          <MarkdownHtml html={bodyHtml} className="prose prose-sm font-dm-sans text-sm text-on-surface leading-relaxed" />
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-xs mt-sm pt-sm border-t border-border-default">
          {!(isEmptyDraft) && (
            <Tooltip label={isCopied ? "Copied" : "Copy"}>
              <button
                onClick={handleCopy}
                className={`p-xs rounded-md transition-colors ${isCopied ? "text-brand" : "text-on-surface-muted hover:text-brand"}`}
              >
                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </Tooltip>
          )}
          {comment.id >= 0 && (
            <>
              <Tooltip label="Reply">
                <button
                  onClick={handleReplyClick}
                  className={`p-xs rounded-md transition-colors ${isReplying ? "text-brand" : "text-on-surface-muted hover:text-brand"}`}
                >
                  <Reply className="w-3 h-3" />
                </button>
              </Tooltip>
              {isOwner && (
                <>
                  <Tooltip label={aiUnavailable ? "Add an AI provider key to enable" : "AI Reply"}>
                    <button
                      onClick={handleAiReply}
                      disabled={isAiLoading || aiUnavailable}
                      className="p-xs rounded-md text-on-surface-muted hover:text-brand transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                    </button>
                  </Tooltip>
                  <Tooltip label="Delete comment">
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="p-xs rounded-md text-on-surface-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                    >
                      {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </button>
                  </Tooltip>
                </>
              )}
            </>
          )}
        </div>

        {/* Post error */}
        {hasPostError && (
          <div className="mt-sm px-md py-sm bg-error/5 border border-error/20 rounded-lg">
            <span className="font-sora text-[10px] text-error">{postErrorMessage}</span>
          </div>
        )}

        {/* Draft post/cancel buttons */}
        {isDraft && (
          <div className="flex items-center gap-xs mt-sm pt-sm border-t border-border-default">
            <button
              onClick={handlePostDraftClick}
              disabled={isDraftPosting || !comment.body.trim()}
              className="inline-flex items-center gap-xs text-xs bg-primary text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50 font-sora"
            >
              {isDraftPosting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
              Post
            </button>
            <button
              onClick={handleCancelDraftClick}
              disabled={isDraftPosting}
              className="inline-flex items-center gap-xs text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container font-sora"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* ── Manual reply form (local state, no parent re-render on keystroke) ── */}
      {isReplying && (
        <form
          onSubmit={handleSubmitReply}
          className="mt-sm p-md bg-surface border border-border-default rounded-lg space-y-sm"
        >
          <textarea
            value={localReplyBody}
            onChange={(e) => setLocalReplyBody(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            className="w-full bg-transparent border-0 p-0 font-dm-sans text-xs text-on-surface placeholder:text-on-surface-muted focus:ring-0 outline-none resize-y thin-scrollbar"
          />
          <div className="flex gap-sm">
            <button
              type="submit"
              disabled={posting || !localReplyBody.trim()}
              className="inline-flex items-center gap-xs text-xs bg-primary text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50"
            >
              <Send className="w-3 h-3" /> {posting ? "Posting..." : "Reply"}
            </button>
            <button
              type="button"
              onClick={handleCancelReply}
              className="inline-flex items-center gap-xs text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── AI error ── */}
      {hasAiError && (
        <div className="mt-sm p-md bg-error/5 border border-error/20 rounded-lg">
          <div className="flex items-start justify-between gap-md">
            <span className="font-sora text-[10px] text-error leading-relaxed">{aiErrorMessage}</span>
            <button onClick={handleCancelAi} className="text-on-surface-muted hover:text-on-surface flex-shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ── AI draft ── */}
      {hasAiDraft && (
        <div className="mt-sm bg-brand/5 border border-brand/20 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between border-b border-brand/10 bg-brand/[0.03] px-sm">
            <div className="flex">
              <button
                type="button"
                onClick={handleSetAiDraftWrite}
                className={`inline-flex items-center gap-xs px-md py-sm font-sora text-[10px] uppercase tracking-widest border-b-2 transition-colors ${isAiDraftWrite ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}
              >
                <PenLine className="w-3 h-3" /> Write
              </button>
              <button
                type="button"
                onClick={handleSetAiDraftPreview}
                className={`inline-flex items-center gap-xs px-md py-sm font-sora text-[10px] uppercase tracking-widest border-b-2 transition-colors ${!isAiDraftWrite ? "border-brand text-brand" : "border-transparent text-on-surface-muted hover:text-on-surface"}`}
              >
                <Eye className="w-3 h-3" /> Preview
              </button>
            </div>
            <span className="font-sora text-[10px] text-brand uppercase tracking-widest pr-sm">
              {isAiLoading ? "Generating..." : "AI Draft"}
            </span>
          </div>

          {isAiDraftWrite ? (
            <textarea
              value={aiDraftText}
              onChange={handleAiDraftChange}
              rows={4}
              className="w-full bg-transparent border-0 px-md py-sm font-dm-sans text-xs text-on-surface focus:ring-0 outline-none resize-y thin-scrollbar"
              placeholder={isAiLoading ? "Waiting for response..." : ""}
            />
          ) : (
            <div className="px-md py-sm min-h-[80px]">
              {aiDraftText.trim()
                ? <MarkdownHtml html={aiDraftPreviewHtml} className="prose font-dm-sans text-xs text-on-surface" />
                : <p className="font-dm-sans text-xs text-on-surface-muted italic">Waiting for response...</p>
              }
            </div>
          )}

          {!isAiLoading && (
            <div className="flex gap-sm px-md pb-md pt-sm">
              <button
                onClick={handlePostAiReply}
                disabled={posting}
                className="inline-flex items-center gap-xs text-xs bg-brand text-on-primary px-md py-sm rounded-md hover:opacity-90 disabled:opacity-50"
              >
                <Send className="w-3 h-3" /> {posting ? "Posting..." : "Post Reply"}
              </button>
              <button
                onClick={handleCancelAi}
                className="inline-flex items-center gap-xs text-xs bg-surface border border-border-default text-on-surface-muted px-md py-sm rounded-md hover:bg-surface-container"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Threaded replies ── */}
      {hasReplies && (
        <div className="mt-sm space-y-sm">
          {comment.replies.map((reply) => (
            <InlineCommentCard
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              isOwner={isOwner}
              activeHighlightId={activeHighlightId}
              isReplying={isReplying}
              isAiLoading={isAiLoading}
              aiDraftText={aiDraftText}
              aiDraftTab={aiDraftTab}
              hasAiError={hasAiError}
              aiErrorMessage={aiErrorMessage}
              aiUnavailable={aiUnavailable}
              posting={posting}
              isDeleting={isDeleting}
              isCopied={isCopied}
              isDraftPosting={isDraftPosting}
              hasPostError={hasPostError}
              postErrorMessage={postErrorMessage}
              hasThinking={hasThinking}
              thinkingText={thinkingText}
              modelLabels={modelLabels}
              modeLabels={modeLabels}
              onCopyComment={onCopyComment}
              onSetReplyToId={onSetReplyToId}
              onInlineAiReply={onInlineAiReply}
              onDeleteInlineComment={onDeleteInlineComment}
              onPostInlineReply={onPostInlineReply}
              onCancelInlineAiReply={onCancelInlineAiReply}
              onPostInlineAiReply={onPostInlineAiReply}
              onSetAiDraftTab={onSetAiDraftTab}
              onSetAiDraft={onSetAiDraft}
              onPostDraft={onPostDraft}
              onCancelDraft={onCancelDraft}
              onSetPostError={onSetPostError}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ── Recursive Tree (pre-computes per-card values) ──

interface InlineCommentTreeProps {
  comments: ThreadedComment[];
  isOwner: boolean;
  activeHighlightId: number;
  // Raw state (derived to per-card values before passing to card)
  inlineReplyToId: number | null;
  inlineAiLoading: number | null;
  inlineAiDrafts: Map<number, string>;
  inlineAiDraftTabs: Map<number, "write" | "preview">;
  inlineAiError: { id: number; message: string } | null;
  aiUnavailable: boolean;
  posting: boolean;
  inlineDeleting: number | null;
  copiedId: number | null;
  draftPosting: number | null;
  postError: string | null;
  thinkingDrafts: Map<number, string>;
  // Pre-computed lookups
  modelLabels: Record<string, string>;
  modeLabels: Record<string, string>;
  // Callbacks
  onCopyComment: (comment: ThreadedComment) => void;
  onSetReplyToId: (id: number | null) => void;
  onInlineAiReply: (comment: ThreadedComment) => void;
  onDeleteInlineComment: (id: number) => void;
  onPostInlineReply: (parentId: number, body: string) => void;
  onCancelInlineAiReply: (id: number) => void;
  onPostInlineAiReply: (id: number) => void;
  onSetAiDraftTab: (id: number, tab: "write" | "preview") => void;
  onSetAiDraft: (id: number, text: string) => void;
  onPostDraft: (highlightId: number, tempId: number, body: string, mode: string) => void;
  onCancelDraft: (highlightId: number, tempId: number) => void;
  onSetPostError: (error: string | null) => void;
}

export default function InlineCommentTree(props: InlineCommentTreeProps) {
  const { comments } = props;
  if (!comments || comments.length === 0) {
    return (
      <p className="font-dm-sans text-sm text-on-surface-muted italic text-center py-md">
        No comments yet
      </p>
    );
  }

  return (
    <>
      {comments.map((comment) => {
        // Compute per-card scalar values so React.memo on InlineCommentCard
        // only sees changed props for the affected card.
        const isReplying = props.inlineReplyToId === comment.id;
        const isAiLoading = props.inlineAiLoading === comment.id;
        const aiDraftText = props.inlineAiDrafts.get(comment.id) ?? "";
        const aiDraftTab = props.inlineAiDraftTabs.get(comment.id) ?? "write";
        const hasAiError = props.inlineAiError?.id === comment.id;
        const aiErrorMessage = hasAiError ? props.inlineAiError!.message : "";
        const isDeleting = props.inlineDeleting === comment.id;
        const isCopied = props.copiedId === comment.id;
        const isDraftPosting = props.draftPosting === comment.id;
        const hasPostError = props.postError !== null;
        const postErrorMessage = props.postError ?? "";
        const hasThinking = props.thinkingDrafts.has(comment.id);
        const thinkingText = props.thinkingDrafts.get(comment.id) ?? "";

        return (
          <InlineCommentCard
            key={comment.id}
            comment={comment}
            depth={0}
            isOwner={props.isOwner}
            activeHighlightId={props.activeHighlightId}
            isReplying={isReplying}
            isAiLoading={isAiLoading}
            aiDraftText={aiDraftText}
            aiDraftTab={aiDraftTab}
            hasAiError={hasAiError}
            aiErrorMessage={aiErrorMessage}
            aiUnavailable={props.aiUnavailable}
            posting={props.posting}
            isDeleting={isDeleting}
            isCopied={isCopied}
            isDraftPosting={isDraftPosting}
            hasPostError={hasPostError}
            postErrorMessage={postErrorMessage}
            hasThinking={hasThinking}
            thinkingText={thinkingText}
            modelLabels={props.modelLabels}
            modeLabels={props.modeLabels}
            onCopyComment={props.onCopyComment}
            onSetReplyToId={props.onSetReplyToId}
            onInlineAiReply={props.onInlineAiReply}
            onDeleteInlineComment={props.onDeleteInlineComment}
            onPostInlineReply={props.onPostInlineReply}
            onCancelInlineAiReply={props.onCancelInlineAiReply}
            onPostInlineAiReply={props.onPostInlineAiReply}
            onSetAiDraftTab={props.onSetAiDraftTab}
            onSetAiDraft={props.onSetAiDraft}
            onPostDraft={props.onPostDraft}
            onCancelDraft={props.onCancelDraft}
            onSetPostError={props.onSetPostError}
          />
        );
      })}
    </>
  );
}