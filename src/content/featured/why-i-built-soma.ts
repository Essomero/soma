import type { FeaturedContent, Author, ArticleCardData, BentoCardData, PullQuoteData } from "@/types";

// Legacy data for the custom FeaturedArticlePage layout
export const somaAuthor: Author = { name: "Benjamin Mayanja", handle: "@Essomero" };

export const somaBentoHighlights: BentoCardData[] = [
  { label: "SOVEREIGN BY DEFAULT", title: "Your Words Live in Your Database", description: "Notes, highlights, and publishing toggles sit in your own Turso edge SQLite behind one password you invent. There is no Soma cloud holding your writing hostage." },
  { label: "LEARN OUT LOUD", title: "Reading You Can Prove", description: "Margin AI explains any paragraph, Soma Labs turns lessons into runnable drills, and the Son voice agent scores your spoken answers in real time." },
  { label: "AGENTS THAT PUBLISH", title: "Publishing Is a Git Push", description: "Soma ships the same skills its author writes with, so any coding assistant can draft typed content, run the build, and open a pull request." },
];

export const somaPullQuotes: PullQuoteData[] = [
  { quote: "Think in private on your own infrastructure, and make public what you wish.", attribution: "BENJAMIN MAYANJA" },
  { quote: "You either publish too early or you never ship at all. Soma ends that trade." },
];

export const somaMoreStories: ArticleCardData[] = [
  { id: "benjamin-mayanja", category: "COMMUNITY", title: "Think on paper, but digital: why I built Soma", excerpt: "Why Benjamin built Soma: learn in private on your own infrastructure, and make public what you wish.", image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&h=400&fit=crop", imageAlt: "Benjamin Mayanja", href: "/stories/benjamin-mayanja" },
  { id: "fs-1-why-this-type-error", category: "ENGINEERING", title: "Why Does This Type Error?", excerpt: "The backpack rule: why TypeScript checks shapes instead of names.", image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop", imageAlt: "TypeScript code editor", href: "/stories/fs-1-why-this-type-error" },
  { id: "fs-2-generics", category: "ENGINEERING", title: "Generics as Relationships", excerpt: "Connecting input types to output types without cluttering signatures.", image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop", imageAlt: "Laptop with code", href: "/stories/fs-2-generics" },
];

export const whyIBuiltSoma: FeaturedContent = {
  slug: "why-i-built-soma",
  tag: "FEATURED ARTICLE // SOMA",
  title: "Think on paper, but digital: why I built Soma",
  description:
    "Most tools force a trade: publish before you understand, or understand in a silo nobody can see. I built Soma so learning and publishing live in the same place, on infrastructure you own.",
  image:
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=675&fit=crop",
  imageAlt: "Benjamin Mayanja",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  date: "October 24, 2026",
  tagline: "Think in private on your own infrastructure, and make public what you wish.",
  bentoHighlights: [
    {
      label: "SOVEREIGN BY DEFAULT",
      title: "Your Words Live in Your Database",
      description:
        "Notes, highlights, and publishing toggles sit in your own Turso edge SQLite behind one password you invent. There is no Soma cloud holding your writing hostage.",
    },
    {
      label: "LEARN OUT LOUD",
      title: "Reading You Can Prove",
      description:
        "Margin AI explains any paragraph, Soma Labs turns lessons into runnable drills, and the Son voice agent scores your spoken answers in real time.",
    },
    {
      label: "AGENTS THAT PUBLISH",
      title: "Publishing Is a Git Push",
      description:
        "Soma ships the same skills its author writes with, so any coding assistant can draft typed content, run the build, and open a pull request.",
    },
  ],
  pullQuotes: [
    {
      quote:
        "Think in private on your own infrastructure, and make public what you wish.",
      attribution: "BENJAMIN MAYANJA",
    },
    {
      quote:
        "You either publish too early or you never ship at all. Soma ends that trade.",
    },
  ],
  sections: [
    {
      heading: "The trade every tool forces",
      paragraphs: [
        "Every publishing tool I tried forced the same trade. Blogging platforms like Ghost and Substack push you to perform for an audience before you have understood the topic yourself. Note-taking apps like Notion and Obsidian keep your thinking trapped in proprietary clouds or fragile sync setups. You either publish too early or you never ship at all.",
        "So I stopped shopping for tools and started building one. Soma (Luganda: to read, study, learn) is a single place where the private notebook, the editorial reading experience, and the publish button live together. You draft the way you would on paper, then flip one toggle and the same page is on the public web.",
      ],
    },
    {
      heading: "Owning the loop",
      paragraphs: [
        "Owning the loop mattered more than any feature. Fork the repo, import it into Vercel, add one password, click Add on the Turso card, deploy. Tables initialize on their own, and pulling my updates later never touches your words, because your writing lives in your database, never in git.",
        "Learning here is something you do, not something you consume. Ask the margin AI to challenge a paragraph. Run the drills in Soma Labs with your own hands. Then say it out loud: the Son voice agent reads diagnostic questions to you and scores your spoken answers. If one reader prints a course, runs every lab, and passes an oral screen without ever touching someone else's server, Soma did its job.",
      ],
    },
  ],
};
