import type { GuideContent, ArticleCardData } from "@/types";
import { shipSoma } from "./ship-soma";
import { marketSomaSuite } from "./market-soma-suite";
import { somaLabs } from "./soma-labs";
import { son } from "./son";
import { launchVideos } from "./launch-videos";

const rawGuides = [
  shipSoma,
  marketSomaSuite,
  somaLabs,
  son,
  launchVideos,
];

// Inject computed fields
export const allGuides: GuideContent[] = rawGuides.map((g, i) => ({
  ...g,
  id: g.slug,
  href: `/guides/${g.slug}`,
  isFeatured: i === 0,
}));

// Convert GuideContent to ArticleCardData for listing pages
export function toArticleCard(g: GuideContent): ArticleCardData {
  return {
    id: g.slug,
    category: g.category,
    title: g.title,
    excerpt: g.excerpt,
    image: g.image,
    imageAlt: g.imageAlt,
    href: g.href,
    author: g.author,
    date: g.date,
    tags: g.tags,
  };
}
