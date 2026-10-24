import type { SeriesContent } from "@/types";

export const theCraftOfSoftware: SeriesContent = {
  slug: "the-craft-of-software",
  title: "The Craft of Software: Building in the Open",
  description: "A sequential series demonstrating real-world software architecture, trade-offs, and iterative design.",
  image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1600&h=900&fit=crop",
  imageAlt: "Laptop displaying code in a focused workspace",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  date: "2026-10-23",
  added: "2026-10-23T00:00:00+03:00",
  topics: ["technology"],
  tagline: "From first principles to working systems.",
  episodes: [
    {
      title: "Episode 1: Why Systems Fail",
      storySlug: "fs-1-why-this-type-error",
      description: "Understanding trust boundaries and structural assumptions.",
    },
    {
      title: "Episode 2: Boundaries and Invariants",
      storySlug: "fs-2-generics",
      description: "How typed relationships prevent runtime drift across services.",
    },
  ],
};
