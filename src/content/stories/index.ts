import type { StoryContent, ArticleCardData } from "@/types";
import { benjaminMayanja } from "./benjamin-mayanja";
import { fs1WhyThisTypeError } from "./fs-1-why-this-type-error";
import { fs2Generics } from "./fs-2-generics";
import { fs3DiscriminatedUnions } from "./fs-3-discriminated-unions";
import { fs4UtilityTypes } from "./fs-4-utility-types";
import { fs5TypingTheBoundary } from "./fs-5-typing-the-boundary";
import { prophet1OnLove } from "./prophet-1-on-love";
import { prophet2OnMarriage } from "./prophet-2-on-marriage";
import { prophet3OnChildren } from "./prophet-3-on-children";
import { prophet4OnWork } from "./prophet-4-on-work";
import { prophet5OnReasonAndPassion } from "./prophet-5-on-reason-and-passion";
import { prophet6OnSorrow } from "./prophet-6-on-sorrow";

const rawStories = [
  benjaminMayanja,
  fs1WhyThisTypeError,
  fs2Generics,
  fs3DiscriminatedUnions,
  fs4UtilityTypes,
  fs5TypingTheBoundary,
  prophet1OnLove,
  prophet2OnMarriage,
  prophet3OnChildren,
  prophet4OnWork,
  prophet5OnReasonAndPassion,
  prophet6OnSorrow,
];

// Inject computed fields. Validate every story has fields pages assume exist
// without optional chaining, so a missing field crashes at build time, not
// at runtime on a user's browser.
const REQUIRED_STORY_FIELDS = ["slug", "title", "body", "author", "date", "category", "image", "imageAlt", "excerpt"] as const;
export const allStories: StoryContent[] = (rawStories as unknown[]).map((s, i) => {
  if (!s || typeof s !== "object") throw new Error(`story[${i}] is not an object`);
  const story = s as Record<string, unknown>;
  for (const f of REQUIRED_STORY_FIELDS) {
    if (story[f] === undefined) {
      throw new Error(`story[${i}] (slug="${story.slug}") is missing required field "${f}". Every story must have it.`);
    }
  }
  return {
    ...story,
    id: story.slug,
    href: `/stories/${story.slug}`,
    isFeatured: i === 0,
  } as StoryContent;
});

// Convert to ArticleCardData for listing pages
export function toArticleCard(s: StoryContent): ArticleCardData {
  return {
    id: s.slug,
    category: s.category,
    title: s.title,
    excerpt: s.excerpt,
    image: s.image,
    imageAlt: s.imageAlt,
    href: s.href,
    author: s.author,
    date: s.date,
    publishedAt: s.publishedAt,
    tags: s.tags,
  };
}
