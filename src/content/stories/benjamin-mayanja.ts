import type { StoryContent, ArticleCardData } from "@/types";

// Legacy data for the custom DeveloperStoryPage layout
export const benjaminStory = {
  id: "benjamin-mayanja",
  title: "AI-accelerated learning you own",
  description:
    "I love to learn. I love markdown, graphs, illustrations, and maths. Obsidian was my go-to for local notes, but it never cut it for shareability, online access, or the web. I built Soma to close that gap.",
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
  title: "AI-accelerated learning you own",
  excerpt:
    "I love to learn. I love markdown, graphs, illustrations, and maths. Obsidian was perfect for local notes. But shareability, online access from every device, and proper web rendering? It never cut it. I built Soma to close that gap.",
  image:
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=675&fit=crop",
  imageAlt: "Benjamin Mayanja",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  date: "October 29, 2026",
  added: "2026-10-29T00:00:00+03:00",
  tags: ["Learning", "Open Source", "Sovereignty"],
  intro:
    "I'm Benjamin Mayanja. I build Soma, an AI-accelerated learning platform you own. It works with whatever you already use. Point any LLM or coding agent at the repo, it loads the bundled skill and starts creating or editing content. It also ships an MCP server and deploys to Vercel in 60 seconds. All you need is an API key to your favorite model and it gets working fast. And it's beautiful, designed for how visual learners actually learn.",
  body: [
    "I love to learn new things. I wanted one centralized place to learn. I'm a visual learner. I love markdown, I love graphs, illustrations, and maths laid out beautifully side by side.",
    "For years Obsidian was my go-to. I still use it for local notes. But it never cut it for shareability and online access from all my devices. It's built for the Obsidian app, not for web content. Their AI integrations are also built for note-taking, not for learning workflows.",
    "I built Soma (Luganda: to read, study, learn) to close that gap. AI-accelerated learning that you own. And it works with whatever you're already using.",
    "Point any LLM or coding agent at the codebase. It loads the skill and starts creating or editing content. There's an MCP server shipped with the repo. It works entirely on the web and deploys to Vercel in 60 seconds. All you need is an API key to your favorite model and it gets working fast.",
    "And it's beautiful. I love beautiful content. Every page is designed for readers who learn by looking. Mermaid diagrams beside KaTeX math beside interactive 3D scenes beside runnable code blocks. If you learn visually, you get the same treatment as someone who reads cover to cover.",
    "Your words live in your own Turso database, an edge SQLite you control behind one password you invent. Fork the repo, import it into Vercel, add the password, deploy. There's no Soma cloud holding your writing hostage. Pulling my updates never touches your words. Nothing locks you in either. Copy any page as markdown or export a PDF for print.",
    "This is the gap I wanted closed. One centralized place to learn, AI-accelerated, that you own, that works with whatever you already use, that's beautiful by default, and that deploys in 60 seconds. Soma is that place.",
  ],
  pullQuote: {
    quote:
      "AI-accelerated learning that you own. And it works with whatever you're already using.",
    attribution: "Benjamin Mayanja",
  },
};
