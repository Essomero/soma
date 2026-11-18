import type { FeaturedContent, Author, ArticleCardData, BentoCardData, PullQuoteData } from "@/types";

// Legacy data for the custom FeaturedArticlePage layout
export const somaAuthor: Author = { name: "Benjamin Mayanja", handle: "@Essomero" };

export const somaBentoHighlights: BentoCardData[] = [
  { label: "SEARCH ANYTHING", title: "Type a topic. AI builds the page.", description: "Search bar is the first thing you see. If nothing exists, start a note and click one button. AI generates a full page with sections, diagrams, code blocks, and math." },
  { label: "READ, TINKER, SHARE", title: "Interactive by default, public when you want", description: "Highlight any paragraph and the margin AI explains or challenges it. Drop a Mermaid diagram next to KaTeX math. Flip one toggle and the same page is on the public web no rebuild, no redeploy." },
  { label: "RUNS ON YOUR INFRA", title: "Your writing, your database", description: "Fork the repo, run docker compose up, add one password. Your writing lives in your own database. My updates never touch your words. Nothing locks you in." },
];

export const somaPullQuotes: PullQuoteData[] = [
  { quote: "ChatGPT is for getting answers. Soma is for learning them. Different formats for different moments.", attribution: "BENJAMIN MAYANJA" },
  { quote: "A page stays a page. A chat log keeps growing. That's the format difference." },
];

export const somaMoreStories: ArticleCardData[] = [
  { id: "origin-story", category: "COMMUNITY", title: "Search anything. Learn it. Prove it.", excerpt: "ChatGPT is for getting answers. Soma is for learning them. Different formats for different moments.", image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&h=400&fit=crop", imageAlt: "Benjamin Mayanja", href: "/stories/origin-story" },
  { id: "fs-1-why-this-type-error", category: "ENGINEERING", title: "Why Does This Type Error?", excerpt: "The backpack rule: why TypeScript checks shapes instead of names.", image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop", imageAlt: "TypeScript code editor", href: "/stories/fs-1-why-this-type-error" },
  { id: "fs-2-generics", category: "ENGINEERING", title: "Generics as Relationships", excerpt: "Connecting input types to output types without cluttering signatures.", image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop", imageAlt: "Laptop with code", href: "/stories/fs-2-generics" },
];

export const whyIBuiltSoma: FeaturedContent = {
  slug: "why-i-built-soma",
  tag: "FEATURED ARTICLE // SOMA",
  title: "Search anything. Learn it. Prove it.",
  description:
    "ChatGPT is for getting answers. Soma is for learning them. Chat is built for conversation. It's terrible as a container for knowledge. Soma uses a page format: persistent, navigable, with interactive AI and built-in tests to verify understanding.",
  image:
    "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=1200&h=675&fit=crop",
  imageAlt: "Writing by hand in a paper planner next to a laptop, coffee, and books",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  publishedAt: "2026-10-29T00:00:00Z",
  tagline: "Search anything. Learn it with rich pages and built-in tests that verify you understood it.",
  bentoHighlights: [
    {
      label: "LEARN IT",
      title: "Beautiful pages designed for reading, not chat",
      description:
        "Search anything, get a rich page with sections, Mermaid diagrams, KaTeX math, and code blocks. Highlight any paragraph and the margin AI explains, challenges, or simplifies it.",
    },
    {
      label: "TWO FORMATS, TWO JOBS",
      title: "ChatGPT for answers. Soma for learning.",
      description:
        "ChatGPT gives you a quick answer. Soma gives you a persistent page with sections, diagrams, math, and tests. You use both. They do different things.",
    },
    {
      label: "RUNS ON YOUR INFRA",
      title: "Your learning, your data",
      description:
        "Fork the repo, run docker compose up, add one password. Your progress, notes, and tests live in your own database. Nothing locks you in.",
    },
  ],
  pullQuotes: [
    {
      quote:
        "ChatGPT is for getting answers. Soma is for learning them. Different formats for different moments.",
      attribution: "BENJAMIN MAYANJA",
    },
    {
      quote:
        "A page stays a page. A chat log keeps growing. That's the format difference.",
    },
  ],
  sections: [
    {
      heading: "Why I built it",
      paragraphs: [
        "I want to understand WebSocket backpressure. I ask ChatGPT. It gives me a wall of text with bullet points. I read it, nod, and forget half of it by next week.",
        "Every new message pushes the previous explanation further up. I scroll to find that one paragraph that made it click. I can't. I branch the conversation to keep it. Now I have two threads and no way to merge them.",
        "Chat is built for conversation. It's great for that. It's terrible as a container for knowledge.",
        "Getting an answer is not the same as learning it. That's the gap Soma closes.",
        "Luganda: to read, study, learn.",
      ],
    },
{
      heading: "Two formats for two different things",
      "paragraphs": [
        "ChatGPT is for getting answers. You ask, it replies, you move on. Fast, useful, ephemeral. Soma is for learning. The format is different for a reason.",
        "Search anything. You get a page, not a chat log. Sections, Mermaid diagrams, KaTeX math, code blocks, callouts. A page stays a page. You don't scroll through 40 messages to find the part about backpressure strategies. You click the section heading.",
        "Highlight any paragraph and the margin AI explains it, challenges it, or simplifies it. Drop a 3D scene where a picture won't do. When you think you've got it, one click generates a test. Multiple choice, written, or oral. Checks whether you actually understood the topic, not whether you can spot a paragraph you read five minutes ago.",
        "You use ChatGPT when you need a quick answer. You use Soma when you want it to stick. They're different tools.",
      ],
    },
    {
      heading: "What Soma is not",
      "paragraphs": [
        "Not a ChatGPT replacement. ChatGPT gives you answers. Soma helps you learn them. Not a notes app, not a blog platform, not an LMS. It's a page format designed for learning, with interactive AI and built in tests.",
      ],
    },
    {
      heading: "Three pieces, one loop",
      "paragraphs": [
        "Reading a chapter feels like progress. Then someone asks you to explain it a week later and you say, uh, it was about types. Nothing stuck.",
        "**Soma** is where you learn. Search anything, get a rich page. Highlight anything, the margin AI tutors you. One click generates a test. The repo is [Soma on GitHub](https://github.com/Essomero/soma).",
        "**Soma Labs** is where you drill it. Each lesson turns into a real exercise: a failing test, a function you write, a green check when it passes. Reading about generics is easy. Writing them until the test passes is the part that sticks. The drills live at [Soma Labs on GitHub](https://github.com/Essomero/soma-labs).",
        "**Son** is a voice agent for oral exams. It reads questions aloud, listens to your answer, evaluates it. No proprietary cloud. Kokoro TTS runs locally. Soma borrows it for oral tests, but Son runs standalone. The repo is [Son on GitHub](https://github.com/Essomero/son).",
        "Three repos, one loop. Read it in Soma, drill it in Soma Labs, explain it to Son. When all three feel easy, you know it.",
      ],
    },
  ],
};
