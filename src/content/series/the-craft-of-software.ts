import type { SeriesContent } from "@/types";

export const theCraftOfSoftware: SeriesContent = {
  slug: "the-craft-of-software",
  title: "The Craft of Software: Building in the Open",
  description: "A sequential series demonstrating real-world software architecture, trade-offs, and iterative design.",
  image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1600&h=900&fit=crop",
  imageAlt: "Laptop displaying code in a focused workspace",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  publishedAt: "2026-10-22T21:00:00Z",
  topics: ["technology"],
  tagline: "From first principles to working systems.",
  episodes: [
    {
      title: "Episode 1: Why Does This Type Error?",
      storySlug: "fs-1-why-this-type-error",
      description: "Why the compiler checks shapes instead of names, why fresh literals get checked harder, and how to read errors like a blueprint.",
    },
    {
      title: "Episode 2: Generics as Relationships",
      storySlug: "fs-2-generics",
      description: "How TypeScript infers types from arguments, and how to use constraints without over-engineering.",
    },
  ],
};
