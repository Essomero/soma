import type { StoryContent, ArticleCardData } from "@/types";

// Legacy data for the custom DeveloperStoryPage layout
export const benjaminStory = {
  id: "origin-story",
  title: "Search anything. Learn it. Prove it.",
  description:
    "ChatGPT gives you an answer in a chat bubble. You read it, nod, and forget it by next week. No diagrams, no way to interact, no test to check if it stuck. I built a tool that treats learning as a loop: read, interact, verify.",
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

export const whyIBuiltSoma = {
  slug: "origin-story",
  category: "Community // Developer Story",
  title: "Search anything. Learn it. Prove it.",
  excerpt:
    "ChatGPT gives you an answer in a chat bubble. Every new message pushes the previous one further up. You scroll, you branch, you lose context. Soma uses a different format: persistent pages with sections, diagrams, math, and one-click tests that verify understanding.",
  image:
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=675&fit=crop",
  imageAlt: "Benjamin Mayanja",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  publishedAt: "2026-10-28T21:00:00Z",
  tags: ["Learning", "Open Source"],
  intro:
    "I want to understand WebSocket backpressure. I ask ChatGPT. It gives me a wall of text with bullet points. I read it, nod, and forget half of it by next week. If I want to check whether I actually understood it, I'm on my own. No diagram, no way to interact, no test. Just a chat log I'll never look at again. Soma uses a different format.",
  body: [
    "ChatGPT is for getting answers. You ask, it replies, you move on. Fast, useful, ephemeral. Soma is for learning. The format is different for a reason.",
    "Every new message in a chat pushes the previous explanation further up. You scroll to find that one paragraph that made it click. You can't. You branch the conversation to keep it. Now you have two threads and no way to merge them. Even if you save the chat, sharing it means the other person reads a messy log with half finished thoughts and \"can you explain that again?\" messages.",
    "Chat is built for conversation. It's great for that. It's terrible as a container for knowledge.",
    "Soma uses a page format. Search anything, you get a page with sections, Mermaid diagrams, KaTeX math, code blocks, callouts. A page stays a page. You don't scroll through 40 messages to find the part about backpressure strategies. You click the section heading.",
    "Highlight any paragraph and the margin AI explains it, challenges it, or simplifies it. Drop a 3D scene where a picture won't do. When you think you've got it, one click generates a test. Multiple choice, written, or oral. Checks whether you actually understood the topic, not whether you can spot a paragraph you read five minutes ago.",
    "You use ChatGPT when you need a quick answer. You use Soma when you want it to stick. They're different tools.",
    "Clone the repo. Open it in Claude Code, Cursor, or any coding agent. The bundled skill files and MCP server tell your agents exactly how to create, validate, and publish content. No setup, no config. Agents are more powerful than any browser interface. Your coding agent is a full publishing partner.",
    "Three repos, one loop. Soma is where you learn. Soma Labs is where you drill it. Son is a voice agent for oral exams. Read it, drill it, explain it. When all three feel easy, you know it.",
    "Luganda: to read, study, learn.",
  ],
  pullQuote: {
    quote:
      "ChatGPT is for getting answers. Soma is for learning them. Different formats for different moments.",
    attribution: "Benjamin Mayanja",
  },
};
