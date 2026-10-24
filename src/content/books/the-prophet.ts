import type { BookContent } from "@/types";

export const theProphet: BookContent = {
  slug: "the-prophet",
  title: "The Prophet: A Reader's Selection",
  description:
    "A prophet about to sail home answers his people's questions on love, work, and freedom. Kahlil Gibran's 1923 classic in twenty-six prose poems; this reader's selection follows six sittings, each with notes on what it means for learning and work.",
  image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&h=900&fit=crop",
  imageAlt: "Calm sea under a clear sky, a ship's voyage home",
  author: { name: "Kahlil Gibran" },
  date: "1923-01-01",
  topics: ["philosophy"],
  tagline: "Love, work, and freedom in six sittings, plus notes for learners.",
  chapters: [
    {
      title: "On Love",
      storySlug: "prophet-1-on-love",
      description: "Almustafa on love: follow when it beckons, even though its ways are hard and steep.",
    },
    {
      title: "On Marriage",
      storySlug: "prophet-2-on-marriage",
      description: "On marriage: keep spaces in your togetherness, and let the winds of heaven dance between you.",
    },
    {
      title: "On Children",
      storySlug: "prophet-3-on-children",
      description: "On children: they are Life's longing for itself, not your possessions.",
    },
    {
      title: "On Work",
      storySlug: "prophet-4-on-work",
      description: "On work: love made visible, and what to do when the love is missing.",
    },
    {
      title: "On Reason and Passion",
      storySlug: "prophet-5-on-reason-and-passion",
      description: "On reason and passion: the rudder and the sails of your seafaring soul.",
    },
    {
      title: "On Sorrow",
      storySlug: "prophet-6-on-sorrow",
      description: "On sorrow: your joy is your sorrow unmasked.",
    },
  ],
};
