// Content knowledge for the MCP server: the type table, valid topics, and
// per-type manuscript templates. This is the skill's Quick Reference and
// Content Schema sections as data, so an agent gets the same guidance from
// tools instead of reading SOMA_SKILL.md or scraping the site.
//
// Keep in sync with SOMA_SKILL.md and src/content/topics/index.ts.

export const ROUTE_BASE = {
  story: "stories",
  guide: "guides",
  doc: "docs",
  course: "courses",
  book: "books",
  series: "series",
  test: "tests",
  featured: "featured",
  podcast: "podcast",
  topic: "topics",
};

// type -> { folder, route, when }: mirrors the skill's Quick Reference table.
export const CONTENT_TYPES = [
  { type: "story", folder: "src/content/stories/", route: "/stories/:slug", when: "One idea, felt deeply. Opens with something concrete that breaks, earns the principle. Never asks the reader to run code." },
  { type: "guide", folder: "src/content/guides/", route: "/guides/:slug", when: "Steps followed in order to end somewhere new. Reordering breaks it." },
  { type: "doc", folder: "src/content/docs/", route: "/docs/:slug", when: "Lookup answers. Sections stand alone; reordering changes nothing." },
  { type: "course", folder: "src/content/courses/", route: "/courses/:slug", when: "Ordered lessons where each assumes the previous. No prose of its own; lessons teach." },
  { type: "book", folder: "src/content/books/", route: "/books/:slug", when: "One finished work read in chapter order; chapters are stories that only make sense together." },
  { type: "series", folder: "src/content/series/", route: "/series/:slug", when: "A log of work released over time; episodes stand alone but gain meaning in sequence." },
  { type: "test", folder: "src/content/tests/", route: "/tests/:slug", when: "Proof under time pressure with scoring. Each question maps back to source lessons." },
  { type: "featured", folder: "src/content/featured/", route: "/featured/:slug", when: "A stage, not a topic: any story strong enough to carry the front page hero. MUST pair with a story row of the same slug." },
  { type: "podcast", folder: "src/content/podcast/", route: "/podcast/:slug", when: "Ideas better heard than read: segments, guests, player." },
  { type: "topic", folder: "src/content/topics/", route: "/topics/:slug", when: "A shelf, not content: groups everything by interest instead of format." },
];

// Valid topic slugs, kept in sync with src/content/topics/index.ts (allTopics).
export const TOPICS = [
  { slug: "technology", title: "Technology", description: "AI, robotics, and the engineering forces reshaping our world." },
  { slug: "economics", title: "Economics", description: "Markets, poverty, distribution, and the systems that govern prosperity." },
  { slug: "philosophy", title: "Philosophy", description: "Ideas, ethics, and the deeper questions behind the headlines." },
  { slug: "open-source", title: "Open Source", description: "Sustainability, governance, and the heart of collective innovation." },
  { slug: "career", title: "Career", description: "Growth paths, interviewing, and navigating the tech industry." },
  { slug: "accessibility", title: "Accessibility", description: "Ensuring the web remains open and usable for everyone." },
  { slug: "fact-check", title: "Fact Check", description: "Adversarially verified research separating signal from noise." },
  { slug: "devops", title: "DevOps", description: "Automation, cloud-native architecture, and infrastructure." },
  { slug: "startups", title: "Startups", description: "Indie hacking, bootstrapping, and building businesses outside the VC path." },
  { slug: "marketing", title: "Marketing", description: "Distribution, growth channels, and the art of getting products in front of people." },
];

// Workflow reminder appended to every template: the lifecycle from the skill.
export const WORKFLOW_NOTE = `Lifecycle (from SOMA_SKILL.md):
1. Save this file as drafts/<type>/<slug>.ts. drafts/ is gitignored: unpublished writing must NOT touch src/content/.
2. call validate_manuscript on the file. It runs the same checks npm run publish runs (required fields, slug uniqueness, cross-file references against the store), without writing.
3. Run publish_manuscript on the file. Rows always land private; publishing never touches visibility.
4. Confirm with store_row(<slug>): expect "status": "private". A missing row means the piece never landed.
5. Preview locally: the owner opens http://localhost:5173{route} (plain npm run dev serves the owner view including private rows).
6. The owner flips private -> public with the page toggle. There is NO CLI flag for going public.
7. The toggle sets archived_at = now() on the content row. No file is copied; no git commit is needed.`;

// Starter manuscripts, one per type. Field sets match the canonical shapes in
// src/types/index.ts. Fill in the "..." placeholders and delete the comments.
export const TEMPLATES = {
  story: `// A story: one idea, felt deeply. Simple layout is intro + body + optional pullQuote.
// Rich layout (sections + bentoHighlights + pullQuotes) renders the full
// featured-style page. Both are valid; content drives the rendering.
import type { StoryContent } from "@/types";

export const myStory: StoryContent = {
  slug: "my-story",                     // URL-safe kebab-case, unique across all types
  category: "Perspective",              // primary category
  subcategory: "Technology // Economics", // optional tag
  title: "Story Title",
  excerpt: "Compelling one-liner summary.",
  image: "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1200&h=675&fit=crop", // verified ID, see below
  imageAlt: "Descriptive alt text describing the actual photo",
  author: { name: "Author Name", handle: "@handle" },
  date: "October 2026",
  tags: ["Tag1", "Tag2"],
  topics: ["technology"],               // must be valid topic slugs
  source: { name: "Author - Platform", url: "https://..." }, // optional single-source republish
  references: [{ title: "Source Title", url: "https://...", description: "Optional note" }], // optional multi-source synthesis

  // Simple layout
  intro: "Opening paragraph that hooks the reader...",
  body: ["First paragraph...", "Second paragraph..."],
  pullQuote: { quote: "A memorable quote.", attribution: "Person Name" }, // optional

  // Rich layout (when present, StoryPage renders sections + bento + pull quotes)
  bentoHighlights: [{ label: "KEY POINT", title: "Title", description: "Description." }],
  pullQuotes: [{ quote: "First impactful quote.", attribution: "Name" }],
  sections: [
    {
      heading: "Section Heading",
      paragraphs: [
        "Plain string paragraphs work as before. Math: use \\\\(inline\\\\) and $$display$$ LaTeX inside prose strings.",
        {
          type: "code" as const,
          filename: "example.ts",
          language: "TypeScript",
          code: "const x: number = 42;",
        },
        // Other block types: image, horizontalRule, videoCallout, mermaid,
        // youtube, callout (success/danger/warning/info), lab, chart, scene3d.
      ],
    },
  ],
};`,

  guide: `// A guide: steps followed in order to end somewhere new.
// Full GFM markdown in body[]. Every entry is one markdown BLOCK: a fenced
// code block or table must be a single entry with \\n rows, never split.
import type { GuideContent } from "@/types";

export const myGuide: GuideContent = {
  slug: "my-guide",
  category: "Technical Guide // Topic",
  title: "Guide Title",
  excerpt: "Compelling one-liner summary.",
  image: "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1200&h=675&fit=crop",
  imageAlt: "Descriptive alt text",
  author: { name: "Author Name", title: "Role" },
  date: "October 2026",
  tags: ["Tag1", "Tag2"],
  intro: "Opening paragraph with **bold** and [links](url) - inline markdown only.",
  body: [
    "## Section Heading",
    "Paragraph text with **bold**, *italic*, and \`code\`.",
    "> A blockquote to break up the text wall.",
    "A bullet list in a single entry:\\n\\n- First item\\n- Second item",
    "A table in a single entry:\\n\\n| Col A | Col B |\\n|---|---|\\n| Val 1 | Val 2 |",
  ],
  // Rich content - add these for every guide
  bentoHighlights: [
    { label: "KEY INSIGHT", title: "First Takeaway", description: "Concise description." },
  ],
  pullQuotes: [
    { quote: "The strongest, most quotable line from the first section." },
  ],
  references: [{ title: "Source Title", url: "https://...", description: "Optional note" }],
};`,

  doc: `// A doc: lookup answers. Sections stand alone; a reader scans and re-reads,
// never reads front to back. Fenced code blocks must be ONE answer entry.
import type { DocContent } from "@/types";

export const myDoc: DocContent = {
  slug: "my-doc",
  category: "Reference // Topic",
  title: "Doc Title",
  description: "What this doc answers.",
  image: "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1200&h=675&fit=crop",
  imageAlt: "Descriptive alt text",
  author: { name: "Author Name" },
  date: "October 2026",
  tags: ["Tag1"],
  topics: ["technology"],
  sections: [
    {
      number: "A",                        // single-letter section id
      heading: "Section Heading",
      anchor: "section-heading",          // explicit id: SidebarToc points at exactly this
      intro: "Optional markdown intro.",
      items: [
        {
          question: "Question the reader is looking up?",
          answer: ["One markdown block per answer entry.", "\`\`\`sh\ncommand\n\`\`\`"],
        },
      ],
      callout: { label: "WATCH OUT", text: "Optional aside." },
    },
  ],
};`,

  course: `// A course: ordered lessons that each reference an existing story by slug.
// The referenced stories must ALREADY exist in the store (published earlier or
// in the same publish batch).
import type { CourseContent } from "@/types";

export const myCourse: CourseContent = {
  slug: "my-course",
  title: "Course Title",
  description: "What the learner will understand by the end.",
  image: "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1600&h=900&fit=crop",
  imageAlt: "Descriptive alt text",
  author: { name: "Author Name" },
  date: "October 2026",
  topics: ["technology"],
  tagline: "Optional subtitle under the description.",
  lessons: [
    {
      title: "Lesson 1 - Foundations",
      storySlug: "some-existing-story",
      description: "What this lesson covers.",
    },
  ],
};

// Every lesson story in an ordered course MUST open with "N.1 Recap of
// Lesson N-1" (only the parts this lesson uses) and close with a "What You
// Just Learned" summary. The first lesson has no recap.`,

  book: `// A book: one finished work read in chapter order. Chapters are stories that
// only make sense together; each references an existing story by slug.
import type { BookContent } from "@/types";

export const myBook: BookContent = {
  slug: "my-book",
  title: "Book Title",
  description: "One-line description of the whole work.",
  image: "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1600&h=900&fit=crop",
  imageAlt: "Descriptive alt text",
  author: { name: "Author Name" },
  date: "October 2026",
  topics: ["technology"],
  tagline: "Optional tagline.",
  chapters: [
    {
      title: "Chapter 1 - Opening",
      storySlug: "some-existing-story",
      description: "Optional chapter note.",
    },
  ],
};`,

  series: `// A series: a log of work released over time. Episodes stand alone but gain
// meaning in sequence; each references an existing story by slug.
import type { SeriesContent } from "@/types";

export const mySeries: SeriesContent = {
  slug: "my-series",
  title: "Series Title",
  description: "One-line description of the series.",
  image: "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1600&h=900&fit=crop",
  imageAlt: "Descriptive alt text",
  author: { name: "Author Name" },
  date: "October 2026",
  topics: ["technology"],
  tagline: "Optional tagline.",
  episodes: [
    {
      title: "Episode 1 - First Post",
      storySlug: "some-existing-story",
      description: "Optional episode note.",
    },
  ],
};`,

  featured: `// A featured article: a stage, not a topic. MUST have a matching story row
// with the same slug. Batch-publish both files in one publish_manuscript call
// so cross-references resolve, then preview /featured/:slug.
// Do NOT create featured rows unless the owner explicitly asks for one.
import type { FeaturedContent } from "@/types";
import { myStory } from "../stories/my-story"; // import the story manuscript

export const myFeatured: FeaturedContent = {
  slug: "my-featured",   // MUST match the story slug
  tag: "FEATURED ARTICLE // CATEGORY",
  title: myStory.title,
  description: myStory.excerpt,
  image: "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1600&h=900&fit=crop", // wider hero
  imageAlt: myStory.imageAlt,
  author: myStory.author,
  date: myStory.date,
  tagline: "Optional tagline under the hero heading.",
  // Single source of truth: reuse the story's content
  bentoHighlights: myStory.bentoHighlights,
  pullQuotes: myStory.pullQuotes,
  sections: myStory.sections,
};`,

  test: `// A test: proof under time pressure with scoring. Each question maps back to
// source lessons. Multiple-choice and open questions are supported.
import type { TestContent } from "@/types";

export const myTest: TestContent = {
  slug: "my-test",
  title: "Test Title",
  description: "What this test proves.",
  category: "Category",
  subcategory: "Optional subcategory",
  format: "written",                       // "written" | "oral" | "hybrid"
  image: "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1200&h=675&fit=crop",
  imageAlt: "Descriptive alt text",
  author: { name: "Author Name" },
  date: "October 2026",
  tags: ["Tag1"],
  topics: ["technology"],
  estimatedMinutes: 15,
  passingScore: 80,
  sources: [
    { type: "story", storySlug: "some-existing-story", title: "Optional override" },
  ],
  questions: [
    {
      id: "q1",
      type: "multiple-choice",
      question: "Question text?",
      options: [
        { id: "a", label: "Option A", explanation: "Optional per-option note." },
        { id: "b", label: "Option B" },
      ],
      correctOptionIds: ["a"],
      timeLimitSeconds: 45,
    },
    {
      id: "q2",
      type: "open",
      question: "Free-form question?",
      keyPoints: ["Point the answer should hit"],
      timeLimitSeconds: 90,
    },
  ],
};`,

  podcast: `// A podcast episode: ideas better heard than read.
import type { PodcastEpisodeFull } from "@/types";

export const myEpisode: PodcastEpisodeFull = {
  slug: "my-episode",
  title: "Episode Title",
  image: "https://images.unsplash.com/photo-{NUMERIC_ID}?w=1200&h=675&fit=crop",
  imageAlt: "Descriptive alt text",
  episode: "EPISODE 31 // OCT 2026",
  date: "OCT 2026",
  duration: "42 MIN",
  durationSeconds: 2520,
  description: "One-line description.",
  category: "Open Source",
  summary: "Full episode summary.",
  audioUrl: "https://...",
  segments: [{ time: "00:00", title: "Intro", description: "What happens here." }],
  guests: [{ name: "Guest Name", role: "Role", description: "Who they are", color: "#4969ed" }],
  transcript: [{ speaker: "Host", text: "What was said", start: 0 }],
};`,

  topic: `// A topic: a shelf, not content. Groups everything by interest. Only add a
// topic when the owner asks; most content maps onto existing topics.
import type { TopicData } from "@/types";

export const myTopic: TopicData = {
  slug: "my-topic",
  title: "Topic Title",
  description: "One-line description.",
  icon: "Cpu",                // Lucide icon name
  accentColor: "primary",
  accentBg: "primary/20",
  accentText: "text-primary",
  category: "Tech",           // "Tech" | "Culture" | "Business"
};`,
};
