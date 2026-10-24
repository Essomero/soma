import type { StoryContent, ArticleCardData } from "@/types";

// Legacy data for the custom DeveloperStoryPage layout
export const benjaminStory = {
  id: "benjamin-mayanja",
  title: "Think on paper, but digital: why I built Soma",
  description:
    "Most tools force a trade: publish before you understand, or understand in a silo nobody can see. I built Soma so learning and publishing live in the same place, on infrastructure you own.",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  location: "Kampala, Uganda",
  social: "@Essomero",
  website: "github.com/Essomero",
  organizations: ["Soma"],
};

export const benjaminMoreStories: ArticleCardData[] = [
  {
    id: "fs-1-why-this-type-error", category: "ENGINEERING",
    title: "Why Does This Type Error?",
    excerpt: "The backpack rule: why TypeScript checks shapes instead of names.",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop",
    imageAlt: "TypeScript code editor", href: "/stories/fs-1-why-this-type-error",
    author: { name: "Benjamin Mayanja" },
  },
  {
    id: "fs-2-generics", category: "ENGINEERING",
    title: "Generics as Relationships",
    excerpt: "Connecting input types to output types without cluttering signatures.",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop",
    imageAlt: "Laptop with code", href: "/stories/fs-2-generics",
    author: { name: "Benjamin Mayanja" },
  },
  {
    id: "fs-3-discriminated-unions", category: "ENGINEERING",
    title: "Discriminated Unions & Narrowing: Making Impossible States Impossible",
    excerpt: "You modeled state with three booleans: isLoading, isError, and data.",
    image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=400&fit=crop",
    imageAlt: "Mist rolling over branching mountain ridges showing paths that fork and narrow", href: "/stories/fs-3-discriminated-unions",
    author: { name: "Benjamin Mayanja" },
  },
];

export const benjaminMayanja = {
  slug: "benjamin-mayanja",
  category: "Community // Developer Story",
  title: "Think on paper, but digital: why I built Soma",
  excerpt:
    "Most tools force a trade: publish before you understand, or understand in a silo nobody can see. I built Soma so learning and publishing live in the same place, on infrastructure you own.",
  image:
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=675&fit=crop",
  imageAlt: "Benjamin Mayanja",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  date: "October 24, 2026",
  added: "2026-10-24T00:00:00+03:00",
  tags: ["Sovereignty", "Open Source", "Learning"],
  intro:
    "Hey, I am Benjamin Mayanja. I build Soma, an AI-native learning and publishing platform that treats reading like thinking on paper: private by default, public when you choose, and running entirely on infrastructure you own.",
  body: [
    "Every publishing tool I tried forced the same trade. Blogging platforms like Ghost and Substack push you to perform for an audience before you have understood the topic yourself. Note-taking apps like Notion and Obsidian keep your thinking trapped in proprietary clouds or fragile sync setups with clumsy export pipelines. You either publish too early or you never ship at all.",
    "So I stopped shopping for tools and started building one. Soma (Luganda: to read, study, learn) is a single place where the private notebook, the editorial reading experience, and the publish button live together. You draft in the open the way you would on paper, then flip one toggle and the same page is on the public web. Nothing to migrate, nothing to reformat.",
    "Owning the loop mattered more than any feature. Your notes, highlights, and publishing toggles live in your own Turso database, an edge SQLite you control, behind one password you invent. Fork the repo, import it into Vercel, add the password, click Add on the Turso card, deploy. There is no Soma cloud holding your writing hostage, which means pulling my updates later never touches your words.",
    "Learning here is not passive reading. Select any paragraph to ask a margin AI to explain, challenge, or simplify it. Run hands-on drills in the companion Soma Labs repo instead of copying code into a void. Then prove you actually know it: the Son voice agent reads diagnostic test questions aloud and scores your spoken answers in real time, all from your own machine.",
    "Agents are first-class citizens too. Soma ships the same skills I write with, so any coding assistant can draft a course, a guide, or a story and stage it into your database as a private piece. Flipping it public is one toggle, no rebuild, no redeploy.",
    "That is the whole bet: think in private on your own infrastructure, and make public what you wish. If one reader prints a course, runs every lab, and passes an oral screen without ever touching someone else's server, Soma did its job.",
  ],
  pullQuote: {
    quote:
      "Think in private on your own infrastructure, and make public what you wish.",
    attribution: "Benjamin Mayanja",
  },
};
