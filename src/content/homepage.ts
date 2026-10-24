import type { FeaturedStoryData, ArticleCardData } from "@/types";
import { allStories, allFeatured } from "./registry";
import { allGuides } from "./guides";

function toCard(s: any): ArticleCardData {
  return {
    id: s.slug || s.id,
    category: s.category || s.tag || "General",
    title: s.title,
    excerpt: s.excerpt || s.description || "",
    image: s.image,
    imageAlt: s.imageAlt,
    href: s.href || `/stories/${s.slug}`,
    author: s.author,
    date: s.date,
    tags: s.tags || [],
  };
}

const defaultFeatured = allFeatured[0];
export const featuredHero: FeaturedStoryData = {
  id: defaultFeatured ? defaultFeatured.slug : "structural-typing",
  tag: "Featured Article",
  title: defaultFeatured ? defaultFeatured.title : "Why does this type error? Shapes, not names",
  description: defaultFeatured ? defaultFeatured.description : "The compiler checks shapes instead of names, and fresh literals get checked harder than variables.",
  image: defaultFeatured ? defaultFeatured.image : "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=675&fit=crop",
  imageAlt: defaultFeatured ? defaultFeatured.imageAlt : "Code editor displaying a compile error overlay on a monitor",
  cta: { label: "Read story", href: defaultFeatured ? `/featured/${defaultFeatured.slug}` : "/featured/structural-typing" },
};

export const featuredStories: ArticleCardData[] = allStories.map(toCard).slice(0, 3);

const firstGuide = allGuides[0];
export const secondaryGuide: ArticleCardData = firstGuide ? toCard(firstGuide) : (allStories[0] ? toCard(allStories[0]) : toCard({
  slug: "ship-soma",
  title: "Ship Soma on your own infrastructure in minutes",
  category: "Guide",
  excerpt: "Three moves: fork the repo, import it into Vercel, add one password, click Add on the Turso card, deploy.",
  image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=675&fit=crop",
  imageAlt: "Server racks in a data center",
  author: { name: "Benjamin Mayanja" },
  date: "2026-10-23",
}));

export const secondaryStories: ArticleCardData[] = allStories.slice(1, 4).map(toCard);

export const latestUpdates = allStories.slice(0, 5).map((s) => ({
  date: new Date(s.date || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase(),
  title: s.title,
  href: s.href || `/stories/${s.slug}`,
}));

export const featuredGuide = {
  title: firstGuide ? firstGuide.title : "Ship Soma on your own infrastructure in minutes",
  href: firstGuide ? `/guides/${firstGuide.slug}` : "/guides/ship-soma",
  image: firstGuide ? firstGuide.image : "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=675&fit=crop",
};
