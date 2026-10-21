import type { StoryContent, ArticleCardData } from "@/types";
import { ruthIkegah } from "./ruth-ikegah";
import { fs1WhyThisTypeError } from "./fs-1-why-this-type-error";
import { fs2Generics } from "./fs-2-generics";
import { fs3DiscriminatedUnions } from "./fs-3-discriminated-unions";
import { fs4UtilityTypes } from "./fs-4-utility-types";
import { fs5TypingTheBoundary } from "./fs-5-typing-the-boundary";
import { alchemist1 } from "./alchemist-1-prologue";
import { alchemist2 } from "./alchemist-2-tangier";
import { alchemist3 } from "./alchemist-3-caravan";
import { alchemist4 } from "./alchemist-4-oasis";
import { alchemist5 } from "./alchemist-5-desert";
import { alchemist6 } from "./alchemist-6-epilogue";

const rawStories = [
  ruthIkegah,
  fs1WhyThisTypeError,
  fs2Generics,
  fs3DiscriminatedUnions,
  fs4UtilityTypes,
  fs5TypingTheBoundary,
  alchemist1,
  alchemist2,
  alchemist3,
  alchemist4,
  alchemist5,
  alchemist6,
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
