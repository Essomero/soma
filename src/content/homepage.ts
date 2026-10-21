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
  id: defaultFeatured ? defaultFeatured.slug : "nvda-accessibility",
  tag: "Featured Article",
  title: defaultFeatured ? defaultFeatured.title : "Accessibility as a Force Multiplier",
  description: defaultFeatured ? defaultFeatured.description : "How open source accessibility tools empower developers worldwide.",
  image: defaultFeatured ? defaultFeatured.image : "https://images.unsplash.com/photo-1634944902853-3e977c2de8b6?w=1200&h=675&fit=crop",
  imageAlt: defaultFeatured ? defaultFeatured.imageAlt : "Editorial illustration representing accessible technology",
  cta: { label: "Read story", href: defaultFeatured ? `/featured/${defaultFeatured.slug}` : "/featured/nvda-accessibility" },
};

export const featuredStories: ArticleCardData[] = allStories.map(toCard).slice(0, 3);

const firstGuide = allGuides[0];
export const secondaryGuide: ArticleCardData = firstGuide ? toCard(firstGuide) : (allStories[0] ? toCard(allStories[0]) : toCard({
  slug: "generative-ai",
  title: "Building with Generative AI",
  category: "Guide",
  excerpt: "An architectural guide to generative AI models and tooling.",
  image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=675&fit=crop",
  imageAlt: "AI neural network abstract design",
  author: { name: "Soma Editorial" },
  date: "2026-10-23",
}));

export const secondaryStories: ArticleCardData[] = allStories.slice(1, 4).map(toCard);

export const latestUpdates = allStories.slice(0, 5).map((s) => ({
  date: new Date(s.date || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase(),
  title: s.title,
  href: s.href || `/stories/${s.slug}`,
}));

export const featuredGuide = {
  title: firstGuide ? firstGuide.title : "Building with Generative AI",
  href: firstGuide ? `/guides/${firstGuide.slug}` : "/guides/generative-ai",
  image: firstGuide ? firstGuide.image : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&h=675&fit=crop",
};
