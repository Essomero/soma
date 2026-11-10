// Server-side action registry. Clients send an action and context, never a
// system prompt. Add a new action here and every deploy target gets it.

import {
  buildArticleExplainPrompt,
  buildArticleSummaryPrompt,
  buildCommentReplyPrompt,
  buildHighlightReplyPrompt,
  buildTutorPrompt,
} from "./prompts.js";

export function buildActionPrompt({ action, mode, context } = {}) {
  switch (action) {
    case "tutor":
      return buildTutorPrompt({ mode, context });
    case "article-explain":
      return buildArticleExplainPrompt(context);
    case "article-summary":
      return buildArticleSummaryPrompt(context);
    case "comment-reply":
      return buildCommentReplyPrompt(context);
    case "highlight-reply":
      return buildHighlightReplyPrompt(context);
    default:
      return { error: "unknown action" };
  }
}
