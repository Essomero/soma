import type { FeaturedContent, Author, ArticleCardData, BentoCardData, PullQuoteData } from "@/types";

// Legacy data for the custom FeaturedArticlePage layout
export const somaAuthor: Author = { name: "Benjamin Mayanja", handle: "@Essomero" };

export const somaBentoHighlights: BentoCardData[] = [
  { label: "SOVEREIGN BY DEFAULT", title: "Your Words Live in Your Database", description: "Notes, highlights, and publishing toggles sit in your own Turso edge SQLite behind one password you invent. There is no Soma cloud holding your writing hostage." },
  { label: "LEARN OUT LOUD", title: "Reading You Can Prove", description: "Margin AI explains any paragraph, Soma Labs turns lessons into runnable drills, and the Son voice agent scores your spoken answers in real time." },
  { label: "AGENTS THAT PUBLISH", title: "Staged Private, Shared by Choice", description: "Soma ships the same skills its author writes with, so any coding assistant can draft typed content and stage it into your database as a private piece. One toggle makes it public." },
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
    "AI can now teach you anything at your pace, tests can prove you know it, and one toggle can share it. I built Soma so learning, proving, seeing, and sharing live in the same place, on infrastructure you own.",
  image:
    "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=1200&h=675&fit=crop",
  imageAlt: "Writing by hand in a paper planner next to a laptop, coffee, and books",
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
        "Margin AI teaches at your pace, Soma Labs turns lessons into runnable drills, and the Son voice agent scores your spoken answers in real time.",
    },
    {
      label: "AGENTS THAT PUBLISH",
      title: "Staged Private, Shared by Choice",
      description:
        "Soma ships the same skills its author writes with, so any coding assistant can draft typed content and stage it into your database as a private piece. One toggle makes it public.",
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
        "So I stopped shopping for tools and started building one. Soma (Luganda: to read, study, learn) starts from a simple belief: learning and sharing have never been easier. AI can teach anything at whatever pace you need, so you do not have to keep up with a class or wait for one.",
      ],
    },
    {
      heading: "Learn it at your pace, then prove you know it",
      paragraphs: [
        "Here is how a lesson feels in Soma. You read a hard paragraph on database lock contention, you select it, and you ask the margin AI to explain it like you are new, then challenge you like you are interviewing. You set the pace, not the page. When you are ready, Soma Labs hands you a runnable drill you run with your own hands, not a snippet you skim.",
        "Then you say it out loud. Diagnostic tests grade your written answers, and the Son voice agent reads questions to you and scores your spoken answers in real time. If you cannot explain it in text and speech, you do not know it yet. That check is the whole point.",
      ],
    },
    {
      heading: "See it, then share it only if you want",
      paragraphs: [
        "Some ideas do not click until you see them move. Every page in Soma can draw: Mermaid diagrams for flows, interactive graphs for relationships, and full 3D scenes for systems you need to turn around in your head. If you learn by looking, you get the same first class treatment as someone who learns by reading.",
        "Owning the loop mattered more than any single feature. Fork the repo, import it into Vercel, add one password, click Add on the Turso card, deploy. Your writing lives in your database, never in git, so pulling my updates never touches your words. You think in private, you prove it to yourself, and you flip one toggle only when you want the world to see it.",
      ],
    },
  ],
};
