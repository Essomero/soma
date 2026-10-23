import { slugify } from "@/lib/slug";

// ── Story section anchors ──────────────────────────────
// Stories number their sections in the heading itself ("15.7 Evaluating the
// Next Framework") and the prose refers to them by that number ("apply 15.7's
// question 3"). The anchor id is built from the same number so the two agree
// without a lookup table: section 15.7 is `#section-15-7`.

/** "15.7 Evaluating the Next Framework" → "15.7"; "Practice Problems" → null. */
const NUMBERED_HEADING = /^\s*(\d+(?:\.\d+)+)\b/;

function sectionNumber(heading: string): string | null {
  const match = heading.match(NUMBERED_HEADING);
  return match ? match[1] : null;
}

function baseAnchorId(heading: string): string {
  const number = sectionNumber(heading);
  return number ? `section-${number.replace(/\./g, "-")}` : `section-${slugify(heading)}`;
}

export interface SectionAnchors {
  /** Element id per section, in render order. */
  ids: string[];
  /** Section number ("15.7") → element id, for the headings that carry one. */
  refs: Map<string, string>;
}

export function resolveSectionAnchors(headings: string[]): SectionAnchors {
  const ids: string[] = [];
  const refs = new Map<string, string>();

  headings.forEach((heading, i) => {
    const id = baseAnchorId(heading);
    ids[i] = id;

    const number = sectionNumber(heading);
    if (number && !refs.has(number)) refs.set(number, id);
  });

  return { ids, refs };
}

// ── Lesson references ──────────────────────────────────
// Lesson prose points at another lesson two ways: by number ("lesson 5's
// compile-time split", where 5 is the story number of the same course, so
// "py-14" refers to "py-5"), and by id ("14.4 + 14.6 + py-27"). Hints keep
// their wording and surface those lessons as a separate "read next" row, so a
// reference never replaces the sentence that made it.

/** Story ids lead with the course code and number: "py-27-transaction-races". */
const STORY_ID = /^([a-z]{2,4}-\d{1,2})(?:-|$)/;

export interface LessonRef {
  /** Lesson id as the prose writes it: "py-13". */
  id: string;
  href: string;
  /** Course label for the lesson: "L13 : Threads & the GIL." */
  label: string;
}

export interface LessonLinks {
  /** Course code of the story being read ("py" for "py-14-race-conditions"), or null. */
  prefix: string | null;
  /** Lesson id → lesson, for every lesson of every course. */
  index: Map<string, LessonRef>;
}

/**
 * Index every course lesson by story id. Order matters: pass the reader's own
 * course first, so a story that is a lesson in two courses is named the way
 * this course names it.
 */
export function buildLessonIndex(
  courses: { lessons: { title: string; storySlug: string }[] }[],
): Map<string, LessonRef> {
  const index = new Map<string, LessonRef>();
  for (const course of courses) {
    for (const lesson of course.lessons) {
      const id = lesson.storySlug.match(STORY_ID)?.[1];
      if (id && !index.has(id)) {
        index.set(id, { id, href: `/stories/${lesson.storySlug}`, label: lesson.title });
      }
    }
  }
  return index;
}

/** "py-14-race-conditions" → "py"; a story without a course code → null. */
export function storyCodePrefix(slug: string): string | null {
  return slug.match(STORY_ID)?.[1].split("-")[0] ?? null;
}

// ── Rewriting references inside hint text ──────────────
// Section references become links in place. Lesson references are only
// detected : the hint text is left exactly as written.
// Either way, fenced code, inline code and existing markdown links are excluded
// so a snippet that looks like an id ("path/to/py-13.log") is never touched.

const LITERAL = /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`|\[[^\]\n]*\]\([^)\s]*\)/g;

function mapLiterals(
  markdown: string,
  prose: (text: string) => string,
  code: (inner: string) => string,
): string {
  let out = "";
  let cursor = 0;
  for (const match of markdown.matchAll(LITERAL)) {
    const start = match.index!;
    const token = match[0];
    out += prose(markdown.slice(cursor, start));
    const inlineCode = token.startsWith("`") && !token.startsWith("```");
    out += inlineCode ? code(token.slice(1, -1)) : token;
    cursor = start + token.length;
  }
  return out + prose(markdown.slice(cursor));
}

// The boundary guards keep both patterns from eating version strings, filenames
// and decimals : `python:3.12-slim`, `v2.4.1` and `4.6s` are not references.
const REFERENCE = /(?<![\w.:/-])(\d+(?:\.\d+)+)(?![-\w])/g;

function rewriteSectionRefs(text: string, refs: Map<string, string>): string {
  return text.replace(REFERENCE, (whole, number: string) => {
    const id = refs.get(number);
    return id ? `[${number}](#${id})` : whole;
  });
}

/** Turn section references in hint markdown into links to those sections. */
export function linkSectionRefs(markdown: string, refs: Map<string, string>): string {
  if (refs.size === 0) return markdown;
  return mapLiterals(markdown, (text) => rewriteSectionRefs(text, refs), (code) => `\`${code}\``);
}

const LESSON_REF = /\b[Ll]esson\s?(\d{1,2})\b/g;
const LESSON_ID = /(?<![\w-])([a-z]{2,4}-\d{1,2})(?![-\w])/g;

/** The lessons a hint points at, in the order it mentions them. */
export function collectLessonRefs(markdown: string, links?: LessonLinks): LessonRef[] {
  if (!links || links.index.size === 0) return [];

  const { prefix, index } = links;
  const found = new Map<string, LessonRef>();

  const collect = (text: string) => {
    if (prefix) {
      for (const match of text.matchAll(LESSON_REF)) {
        const ref = index.get(`${prefix}-${match[1]}`);
        if (ref && !found.has(ref.id)) found.set(ref.id, ref);
      }
    }
    for (const match of text.matchAll(LESSON_ID)) {
      const ref = index.get(match[1]);
      if (ref && !found.has(ref.id)) found.set(ref.id, ref);
    }
  };

  mapLiterals(
    markdown,
    (text) => {
      collect(text);
      return text;
    },
    (code) => {
      collect(code);
      return code;
    },
  );
  return [...found.values()];
}
