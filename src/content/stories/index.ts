import type { StoryContent, ArticleCardData } from "@/types";
import { benjaminMayanja } from "./benjamin-mayanja";
import { fs1WhyThisTypeError } from "./fs-1-why-this-type-error";
import { fs2Generics } from "./fs-2-generics";
import { fs3DiscriminatedUnions } from "./fs-3-discriminated-unions";
import { fs4UtilityTypes } from "./fs-4-utility-types";
import { fs5TypingTheBoundary } from "./fs-5-typing-the-boundary";

const rawStories = [
  benjaminMayanja,
  fs1WhyThisTypeError,
  fs2Generics,
  fs3DiscriminatedUnions,
  fs4UtilityTypes,
  fs5TypingTheBoundary,
];

// Inject computed fields
export const allStories: StoryContent[] = (rawStories as any[]).map((s, i) => ({
  ...s,
  id: s.slug,
  href: `/stories/${s.slug}`,
  isFeatured: i === 0,
})) as StoryContent[];

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
    tags: s.tags,
  };
}
