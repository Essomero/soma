// Collects posted tutor turns for a section. Drafts (negative ids) and
// non-AI comments are ignored. Server prompts cap and truncate the result.

export function collectPriorTurns(highlights, sectionIndex, limit = 5) {
  if (!Array.isArray(highlights)) return [];

  const turns = [];
  for (const highlight of highlights) {
    if (!highlight || highlight.sectionIndex !== sectionIndex) continue;
    for (const comment of walk(highlight.comments)) {
      if (!comment || !comment.isAi) continue;
      if (typeof comment.id === "number" && comment.id < 0) continue;
      const body = typeof comment.body === "string" ? comment.body.trim() : "";
      if (!body) continue;
      turns.push({
        mode: comment.mode || comment.aiAction || "explain",
        body,
      });
    }
  }

  return turns.slice(-limit);
}

function walk(comments) {
  if (!Array.isArray(comments)) return [];
  const out = [];
  for (const comment of comments) {
    out.push(comment);
    out.push(...walk(comment?.replies));
  }
  return out;
}
