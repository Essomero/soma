import type { FeaturedContent, Author, ArticleCardData, BentoCardData, PullQuoteData } from "@/types";

// Legacy data for the custom FeaturedArticlePage layout
export const somaAuthor: Author = { name: "Benjamin Mayanja", handle: "@Essomero" };

export const somaBentoHighlights: BentoCardData[] = [
  { label: "YOUR OWN INFRASTRUCTURE", title: "Your Words Live in Your Database", description: "Notes, highlights, and publishing toggles sit in your own Turso edge SQLite behind one password you invent. No cloud holding your writing hostage." },
  { label: "AI-ACCELERATED", title: "Point an LLM at the Repo, It Works", description: "Soma ships a bundled skill and MCP server. Any coding agent reads the skill and starts creating or editing content on its own. No setup, no config." },
  { label: "BUILT FOR VISUAL LEARNERS", title: "Mermaid, KaTeX, 3D Scenes, Code Blocks", description: "Graphs beside math beside interactive scenes beside runnable code. If you learn by looking, you get the same treatment as someone who reads cover to cover." },
];

export const somaPullQuotes: PullQuoteData[] = [
  { quote: "AI-accelerated learning that you own. And it works with whatever you're already using.", attribution: "BENJAMIN MAYANJA" },
  { quote: "Obsidian was great for local notes. But shareability, online access, and web rendering? It never cut it. Soma closes that gap." },
];

export const somaMoreStories: ArticleCardData[] = [
  { id: "benjamin-mayanja", category: "COMMUNITY", title: "AI-accelerated learning you own", excerpt: "I love to learn. I love markdown, graphs, illustrations, and maths. Obsidian was perfect for local notes, but it never cut it for shareability. I built Soma to close that gap.", image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&h=400&fit=crop", imageAlt: "Benjamin Mayanja", href: "/stories/benjamin-mayanja" },
  { id: "fs-1-why-this-type-error", category: "ENGINEERING", title: "Why Does This Type Error?", excerpt: "The backpack rule: why TypeScript checks shapes instead of names.", image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop", imageAlt: "TypeScript code editor", href: "/stories/fs-1-why-this-type-error" },
  { id: "fs-2-generics", category: "ENGINEERING", title: "Generics as Relationships", excerpt: "Connecting input types to output types without cluttering signatures.", image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop", imageAlt: "Laptop with code", href: "/stories/fs-2-generics" },
];

export const whyIBuiltSoma: FeaturedContent = {
  slug: "why-i-built-soma",
  tag: "FEATURED ARTICLE // SOMA",
  title: "AI-accelerated learning you own",
  description:
    "I love to learn. I love markdown, graphs, illustrations, and maths laid out beautifully. Obsidian was my go-to for local notes, but it never cut it for shareability, online access, or the web. I built Soma to close that gap. AI-accelerated learning you own, that works with whatever you already use. Deploys to Vercel in 60 seconds and it's beautiful.",
  image:
    "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=1200&h=675&fit=crop",
  imageAlt: "Writing by hand in a paper planner next to a laptop, coffee, and books",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  publishedAt: "2026-10-29T00:00:00Z",
  tagline: "AI-accelerated learning you own. Works with whatever you already use.",
  bentoHighlights: [
    {
      label: "YOUR OWN INFRASTRUCTURE",
      title: "Your Words Live in Your Database",
      description:
        "Notes, highlights, and publishing toggles sit in your own Turso edge SQLite behind one password you invent. No cloud holding your writing hostage.",
    },
    {
      label: "AI-ACCELERATED",
      title: "Point an LLM at the Repo, It Works",
      description:
        "Soma ships a bundled skill and MCP server. Any coding agent reads the skill and starts creating or editing content on its own. No setup, no config.",
    },
    {
      label: "BUILT FOR VISUAL LEARNERS",
      title: "Mermaid, KaTeX, 3D Scenes, Code Blocks",
      description:
        "Graphs beside math beside interactive scenes beside runnable code. If you learn by looking, you get the same treatment as someone who reads cover to cover.",
    },
  ],
  pullQuotes: [
    {
      quote:
        "AI-accelerated learning that you own. And it works with whatever you're already using.",
      attribution: "BENJAMIN MAYANJA",
    },
    {
      quote:
        "Obsidian was great for local notes. But shareability, online access, and web rendering? It never cut it. Soma closes that gap.",
    },
  ],
  sections: [
    {
      heading: "Why I built it",
      paragraphs: [
        "I love to learn new things. I wanted one centralized place to learn. I'm a visual learner. I love markdown, I love graphs, illustrations, and maths laid out beautifully side by side.",
        "For years Obsidian was my go-to. I still use it for local notes. But it never cut it for shareability and online access from all my devices. It's built for the Obsidian app, not for web content. Their AI integrations are also built for note-taking, not for learning workflows.",
        "I built Soma (Luganda: to read, study, learn) to close that gap. AI-accelerated learning that you own. And it works with whatever you're already using.",
      ],
    },
    {
      heading: "How it works",
      paragraphs: [
        "Point any LLM or coding agent at the codebase. It loads the bundled skill and starts creating or editing content on its own. There's also an MCP server shipped with the repo. It works entirely on the web and deploys to Vercel in 60 seconds. All you need is an API key to your favorite model and it gets working fast.",
        "And it's beautiful. I love beautiful content. Every page is designed for readers who learn by looking. Mermaid diagrams beside KaTeX math beside interactive 3D scenes beside runnable code blocks. If you learn visually, you get the same treatment as someone who reads cover to cover.",
      ],
    },
    {
      heading: "Your words live in your database",
      paragraphs: [
        "Your words live in your own Turso database, an edge SQLite you control behind one password you invent. Fork the repo, import it into Vercel, add the password, deploy. There's no Soma cloud holding your writing hostage. Pulling my updates never touches your words.",
        "Nothing locks you in either. Copy any page as markdown or export a PDF for print. This is the gap I wanted closed. One centralized place to learn, AI-accelerated, that you own, that works with whatever you already use, that's beautiful by default, and that deploys in 60 seconds. Soma is that place.",
      ],
    },
  ],
};
