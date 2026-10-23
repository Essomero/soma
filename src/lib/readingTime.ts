const WORDS_PER_MINUTE = 225;

/** Estimate reading time in minutes from a body of text */
export function getReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Total reading time for an array of stories (by slug lookup) */
export function getTotalReadingTime(
  storySlugs: string[],
  stories: { slug: string; intro?: string; body?: string[]; sections?: Array<{ paragraphs: (string | any)[] }> }[]
): number {
  let totalWords = 0;
  for (const slug of storySlugs) {
    const story = stories.find((s) => s.slug === slug);
    if (!story) continue;
    const text = [
      story.intro || "",
      ...(story.body || []),
      ...(story.sections?.flatMap((s) =>
        s.paragraphs.filter((p): p is string => typeof p === "string")
      ) || []),
    ].join(" ");
    totalWords += text.trim().split(/\s+/).length;
  }
  return Math.max(1, Math.ceil(totalWords / WORDS_PER_MINUTE));
}
