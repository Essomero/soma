// ── Content Type Schema Registry ─────────────────────
// Single source of truth for all content type definitions.
// Three consumers: AI prompt builder, dynamic form renderer, draft validator.
//
// This is type metadata (app code), not user content. Bundled at build time.

export type ContentType =
  | "story" | "guide" | "course" | "book" | "series"
  | "doc" | "featured" | "test" | "podcast";

export const CONTENT_TYPES: ContentType[] = [
  "story", "guide", "course", "book", "series",
  "doc", "featured", "test", "podcast",
];

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  story: "Story",
  guide: "Guide",
  course: "Course",
  book: "Book",
  series: "Series",
  doc: "Doc",
  featured: "Featured Article",
  test: "Test",
  podcast: "Podcast Episode",
};

export const ROUTE_BASE: Record<ContentType, string> = {
  story: "stories",
  guide: "guides",
  course: "courses",
  book: "books",
  series: "series",
  doc: "docs",
  featured: "featured",
  test: "tests",
  podcast: "podcast",
};

export const CATEGORIES = [
  "Engineering",
  "Philosophy",
  "Design",
  "Science",
  "Technology",
  "Culture",
  "Business",
  "Arts",
  "Career",
] as const;

export const TOPIC_OPTIONS = [
  { slug: "technology", label: "Technology" },
  { slug: "career", label: "Career" },
  { slug: "science", label: "Science" },
  { slug: "philosophy", label: "Philosophy" },
  { slug: "design", label: "Design" },
  { slug: "business", label: "Business" },
  { slug: "culture", label: "Culture" },
  { slug: "arts", label: "Arts" },
] as const;

// ── Field type definitions ───────────────────────────

export type FieldType =
  | "string"       // single-line text
  | "markdown"     // multi-line markdown text
  | "markdown[]"   // array of markdown paragraphs
  | "string[]"     // array of strings (tags)
  | "object"       // nested object (author)
  | "object[]"     // array of objects (sections, pull quotes)
  | "select"       // enum-like string picker
  | "boolean";

export interface FieldSchema {
  name: string;
  label?: string;
  type: FieldType;
  required: boolean;
  /** What the field is for — shown to the AI so it generates correct content */
  description: string;
  /** Constraints the AI needs to know (length limits, format rules, etc.) */
  constraints?: string;
  /** For select fields: allowed values */
  options?: readonly string[];
  /** Sub-fields for object types */
  children?: FieldSchema[];
  /** Placeholder text for the form input */
  placeholder?: string;
}

export interface ClassificationGuide {
  /** When to recommend this type — heuristic shown to the AI */
  when: string;
  /** Phrases in the user's request that suggest this type */
  keywords: string[];
  /** When to avoid this type even if keywords match */
  avoid: string;
}

export interface TypeSchema {
  type: ContentType;
  label: string;
  description: string;
  classification: ClassificationGuide;
  fields: FieldSchema[];
  /** One realistic example showing how all fields compose */
  example: Record<string, unknown>;
}

// ── Common field groups ──────────────────────────────

const COMMON_META: FieldSchema[] = [
  { name: "title", type: "string", required: true, description: "Compelling headline. 5-15 words that make someone want to read.", placeholder: "Why Does This TypeScript Error?" },
  { name: "excerpt", type: "markdown", required: true, description: "1-2 sentence card summary. Appears in listings and search results. 10-30 words.", constraints: "Should work standalone without the full article context.", placeholder: "You wrote an object with every property a function asked for, but TypeScript still threw a red squiggle..." },
  { name: "category", type: "select", required: true, description: "Content category for grouping and filtering.", options: CATEGORIES },
  { name: "author", type: "object", required: true, description: "Author information.", children: [
    { name: "name", type: "string", required: true, description: "Full name.", placeholder: "Benjamin Mayanja" },
    { name: "handle", type: "string", required: false, description: "Social handle (optional).", placeholder: "@Essomero" },
  ]},
  { name: "date", type: "string", required: true, description: "Display date. Use YYYY-MM-DD format.", constraints: "Must be a real date, not a placeholder.", placeholder: "2026-08-16" },
  { name: "image", type: "string", required: true, description: "Hero image URL shown in listings and at the top of the page. MUST be an actual image URL (https://images.unsplash.com/... or similar) — an absolute requirement, never a description of an image.", constraints: "Must start with http:// or https:// and point to a real image file. NEVER fill this with prose like 'a terminal window showing...' — if no real URL is available use https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=675&fit=crop as a safe default.", placeholder: "https://images.unsplash.com/photo-..." },
  { name: "imageAlt", type: "string", required: false, description: "Accessible alt text for the hero image — a SHORT description of what the image actually shows. Never a longer caption or title.", constraints: "1-8 words. Describes the picture itself, not the article's topic.", placeholder: "Code editor displaying a compile error overlay" },
  { name: "tags", type: "string[]", required: false, description: "2-5 tags for filtering and discovery. Short, lowercase, hyphenated.", constraints: "Tags should be specific but not overly niche.", placeholder: "full-stack-prep, typescript" },
  { name: "topics", type: "select", required: false, description: "Topic classification for browse-by-topic pages.", options: TOPIC_OPTIONS.map(t => t.slug) },
];

// ── Per-type field definitions ───────────────────────

const STORY_FIELDS: FieldSchema[] = [
  ...COMMON_META,
  { name: "intro", type: "markdown", required: true, description: "Opening hook. 1-3 paragraphs that set the stakes. Why should the reader care? Sets the emotional and intellectual frame for the whole piece.", constraints: "Markdown is supported. Should stand alone as a compelling lead.", placeholder: "Most developers first encounter TypeScript as an obstacle course..." },
  { name: "body", type: "markdown[]", required: true, description: "Narrative paragraphs. Each entry is one markdown paragraph. The story unfolds sequentially through these paragraphs.", constraints: "Each paragraph renders as its own block. Use sections instead of paragraphs when you need sub-headings.", placeholder: "Most developers first encounter TypeScript as an obstacle course..." },
  { name: "sections", type: "object[]", required: false, description: "Rich optional sections with headings and content blocks. Use when the story benefits from sub-topics with clear breaks.", children: [
    { name: "heading", type: "string", required: true, description: "Section heading.", placeholder: "What Fresh Objects Reveal" },
    { name: "paragraphs", type: "markdown[]", required: true, description: "Section content. Each entry is a paragraph or a structured content block." },
  ]},
  { name: "pullQuotes", type: "object[]", required: false, description: "Highlight-worthy quotes displayed as visual breaks in the story. Not the same as the excerpt.", children: [
    { name: "quote", type: "markdown", required: true, description: "The pull quote text.", placeholder: "TypeScript is JavaScript that kept a diary." },
    { name: "attribution", type: "string", required: false, description: "Who said it (optional).", placeholder: "Benjamin Mayanja" },
  ]},
  { name: "bentoHighlights", type: "object[]", required: false, description: "3-card bento grid of key takeaways. Only for rich stories that benefit from a structured summary.", children: [
    { name: "label", type: "string", required: true, description: "Card label.", placeholder: "01 // CONCEPT" },
    { name: "title", type: "string", required: true, description: "Card title.", placeholder: "Shapes Over Names" },
    { name: "description", type: "markdown", required: true, description: "Card content." },
  ]},
  { name: "references", type: "object[]", required: false, description: "Sources and further reading. Attribution for claims and ideas.", children: [
    { name: "title", type: "string", required: true, description: "Reference title." },
    { name: "url", type: "string", required: true, description: "Reference URL." },
    { name: "description", type: "string", required: false, description: "Optional note about the reference." },
  ]},
];

const GUIDE_FIELDS: FieldSchema[] = [
  ...COMMON_META,
  { name: "intro", type: "markdown", required: true, description: "Opening hook. What problem does this guide solve? Who is it for?", placeholder: "Deploying a TypeScript API to Cloudflare Workers with D1 and R2..." },
  { name: "body", type: "markdown[]", required: true, description: "Step-by-step walkthrough paragraphs. Sequential: each paragraph builds on the last.", placeholder: "First, install Wrangler globally..." },
  { name: "sections", type: "object[]", required: false, description: "Numbered sections for multi-step guides.", children: [
    { name: "heading", type: "string", required: true, description: "Section heading." },
    { name: "paragraphs", type: "markdown[]", required: true, description: "Section content." },
  ]},
  { name: "tipCards", type: "object[]", required: false, description: "Visual tip cards — best practice callouts, common pitfalls, or pro-tips displayed as cards.", children: [
    { name: "icon", type: "string", required: true, description: "Icon identifier.", placeholder: "terminal, lightbulb, alert-triangle, code" },
    { name: "title", type: "string", required: true, description: "Tip card title." },
    { name: "description", type: "markdown", required: true, description: "Tip content." },
    { name: "bgClass", type: "string", required: false, description: "Background color class override." },
    { name: "iconColorClass", type: "string", required: false, description: "Icon color class override." },
  ]},
  { name: "pullQuotes", type: "object[]", required: false, description: "Highlight-worthy quotes from the guide.", children: [
    { name: "quote", type: "markdown", required: true, description: "Quote text." },
    { name: "attribution", type: "string", required: false, description: "Attribution." },
  ]},
  { name: "bentoHighlights", type: "object[]", required: false, description: "3-card takeaways.", children: [
    { name: "label", type: "string", required: true, description: "Card label." },
    { name: "title", type: "string", required: true, description: "Card title." },
    { name: "description", type: "markdown", required: true, description: "Card content." },
  ]},
];

// Collection item type (used by course, book, series)
const COLLECTION_ITEM_FIELDS: FieldSchema[] = [
  { name: "title", type: "string", required: true, description: "Lesson/chapter/episode title." },
  { name: "storySlug", type: "string", required: true, description: "Slug of the existing story this entry references. If the story doesn't exist yet, use a slugified version of the title and flag it for creation.", placeholder: "fs-1-why-this-type-error" },
  { name: "description", type: "markdown", required: false, description: "Optional one-line summary." },
];

const COURSE_FIELDS: FieldSchema[] = [
  ...COMMON_META.filter(f => f.name !== "tags"),
  { name: "tagline", type: "string", required: false, description: "Short subtitle shown below the title on the course page.", placeholder: "Five visual lessons that make the type system click" },
  { name: "lessons", type: "object[]", required: true, description: "Course lessons. Each references an existing story. A course does not own content — it curates stories into a learning path.", children: COLLECTION_ITEM_FIELDS },
];

const BOOK_FIELDS: FieldSchema[] = [
  ...COMMON_META.filter(f => f.name !== "tags"),
  { name: "tagline", type: "string", required: false, description: "Short subtitle." },
  { name: "chapters", type: "object[]", required: true, description: "Book chapters. Each references an existing story.", children: COLLECTION_ITEM_FIELDS },
];

const SERIES_FIELDS: FieldSchema[] = [
  ...COMMON_META.filter(f => f.name !== "tags"),
  { name: "tagline", type: "string", required: false, description: "Short subtitle." },
  { name: "episodes", type: "object[]", required: true, description: "Series episodes. Each references an existing story.", children: COLLECTION_ITEM_FIELDS },
];

const DOC_FIELDS: FieldSchema[] = [
  ...COMMON_META,
  { name: "sections", type: "object[]", required: true, description: "Reference sections. A doc is scanned and re-read, not read front to back. Each section contains Q&A pairs.", children: [
    { name: "number", type: "string", required: true, description: "Section identifier letter.", placeholder: "A, B, C" },
    { name: "heading", type: "string", required: true, description: "Section heading.", placeholder: "Frontend" },
    { name: "anchor", type: "string", required: true, description: "Anchor ID for sidebar navigation." },
    { name: "items", type: "object[]", required: true, description: "Q&A pairs in this section.", children: [
      { name: "question", type: "string", required: true, description: "The question." },
      { name: "answer", type: "markdown[]", required: true, description: "The answer. Each entry is a markdown block or structured content block." },
    ]},
  ]},
];

const FEATURED_FIELDS: FieldSchema[] = [
  ...COMMON_META,
  { name: "tagline", type: "string", required: false, description: "Short tagline shown on the hero card.", placeholder: "A new kind of library, built for the age of agents." },
  { name: "sections", type: "object[]", required: true, description: "Featured article sections with rich content.", children: [
    { name: "heading", type: "string", required: true, description: "Section heading." },
    { name: "paragraphs", type: "markdown[]", required: true, description: "Section content." },
  ]},
  { name: "pullQuotes", type: "object[]", required: false, description: "Pull quotes.", children: [
    { name: "quote", type: "markdown", required: true, description: "Quote text." },
    { name: "attribution", type: "string", required: false, description: "Attribution." },
  ]},
  { name: "bentoHighlights", type: "object[]", required: false, description: "3-card takeaways.", children: [
    { name: "label", type: "string", required: true, description: "Card label." },
    { name: "title", type: "string", required: true, description: "Card title." },
    { name: "description", type: "markdown", required: true, description: "Card content." },
  ]},
];

const TEST_FIELDS: FieldSchema[] = [
  ...COMMON_META,
  { name: "format", type: "select", required: true, description: "Test delivery format.", options: ["written", "oral", "hybrid"] },
  { name: "estimatedMinutes", type: "string", required: false, description: "Estimated time to complete in minutes.", placeholder: "30" },
  { name: "passingScore", type: "string", required: false, description: "Minimum score to pass (0-100).", placeholder: "70" },
  { name: "sources", type: "object[]", required: true, description: "Source material the test is based on.", children: [
    { name: "type", type: "select", required: true, description: "Source type.", options: ["story", "guide", "doc", "link"] },
    { name: "storySlug", type: "string", required: false, description: "Story slug (for story sources)." },
    { name: "guideSlug", type: "string", required: false, description: "Guide slug." },
    { name: "docSlug", type: "string", required: false, description: "Doc slug." },
    { name: "title", type: "string", required: false, description: "Title (for link sources)." },
    { name: "url", type: "string", required: false, description: "URL (for link sources)." },
  ]},
  { name: "questions", type: "object[]", required: true, description: "Test questions.", children: [
    { name: "id", type: "string", required: true, description: "Unique question ID." },
    { name: "type", type: "select", required: true, description: "Question type.", options: ["multiple-choice", "open"] },
    { name: "question", type: "markdown", required: true, description: "Question text." },
    { name: "options", type: "object[]", required: false, description: "Answer options (for multiple-choice).", children: [
      { name: "id", type: "string", required: true, description: "Option ID." },
      { name: "label", type: "markdown", required: true, description: "Option text." },
    ]},
    { name: "correctOptionIds", type: "string[]", required: false, description: "IDs of correct options." },
    { name: "explanation", type: "markdown", required: false, description: "Explanation shown after answering." },
  ]},
];

const PODCAST_FIELDS: FieldSchema[] = [
  ...COMMON_META,
  { name: "episode", type: "string", required: true, description: "Episode label shown on cards.", placeholder: "EPISODE 30 // AUG 14" },
  { name: "duration", type: "string", required: true, description: "Duration string.", placeholder: "42 MIN" },
  { name: "summary", type: "markdown", required: false, description: "Full episode summary for the detail page." },
  { name: "segments", type: "object[]", required: false, description: "Episode timeline segments.", children: [
    { name: "time", type: "string", required: true, description: "Timestamp.", placeholder: "00:00" },
    { name: "title", type: "string", required: true, description: "Segment title." },
    { name: "description", type: "string", required: true, description: "Segment description." },
  ]},
  { name: "guests", type: "object[]", required: false, description: "Episode guests.", children: [
    { name: "name", type: "string", required: true, description: "Guest name." },
    { name: "role", type: "string", required: false, description: "Guest role/title." },
    { name: "description", type: "string", required: false, description: "Brief guest bio." },
  ]},
];

// ── Full schema registry ─────────────────────────────

export const CONTENT_SCHEMA: Record<ContentType, TypeSchema> = {
  story: {
    type: "story",
    label: "Story",
    description: "Narrative essay, personal experience, opinion piece, or deep dive. One idea per story, felt deeply. Read from front to back.",
    classification: {
      when: "The user wants to explore an idea, share an experience, argue a position, or tell a story. They use language like 'I think', 'my experience with', 'why X matters', 'what I learned'. Stories have a narrative arc — a beginning that hooks, a middle that develops, an end that lands.",
      keywords: ["i think", "my experience", "why", "what if", "reflection", "story", "feels", "discovered", "learned", "realized", "exploring"],
      avoid: "Step-by-step instructions → use Guide. Testing knowledge → use Test. Reference material → use Doc.",
    },
    fields: STORY_FIELDS,
    example: {
      title: "Why Does This TypeScript Error? Reading the Type System Fluently",
      excerpt: "You wrote an object that has every property a function asked for, but TypeScript still threw a red squiggle. This lesson unpacks structural typing from first principles.",
      category: "Engineering",
      author: { name: "Benjamin Mayanja", handle: "@Essomero" },
      date: "2026-08-16",
      tags: ["full-stack-prep", "typescript"],
      topics: ["technology", "career"],
      intro: "Most developers first encounter TypeScript as an obstacle course. You write code that runs perfectly fine in JavaScript, but the editor paints it with red squiggles...",
      body: [
        "Most developers first encounter TypeScript as an obstacle course...",
        "TypeScript uses structural typing. It doesn't care about the names of types — it cares about their shapes...",
        "When you write `const config = { api: \"https://...\", timeout: 5000, retries: 3 }` and pass it to a function expecting `{ api: string, timeout: number }`, TypeScript looks at the shape...",
      ],
      sections: [
        { heading: "What Fresh Objects Reveal", paragraphs: ["When you pass a freshly created object literal to a function that expects a narrower type, TypeScript performs excess property checking..."] },
      ],
      pullQuotes: [
        { quote: "TypeScript is JavaScript that kept a diary.", attribution: "Benjamin Mayanja" },
      ],
      bentoHighlights: [
        { label: "01 // CONCEPT", title: "Shapes Over Names", description: "TypeScript compares objects by their structure, not their declared type name." },
      ],
    },
  },

  guide: {
    type: "guide",
    label: "Guide",
    description: "Step-by-step tutorial or how-to walkthrough. A guide teaches a practical skill the reader can follow and reproduce.",
    classification: {
      when: "The user wants to teach a practical skill step by step. They use language like 'how to', 'guide to', 'walkthrough', 'step by step', 'getting started with', 'set up', 'deploy', 'configure', 'build a'. Guides are sequential — you follow them in order, and each step produces a visible result.",
      keywords: ["how to", "guide", "walkthrough", "step by", "getting started", "set up", "configure", "deploy", "tutorial", "build a", "implement"],
      avoid: "Exploring an idea without steps → use Story. Reference material with no sequence → use Doc.",
    },
    fields: GUIDE_FIELDS,
    example: {
      title: "Setting Up TypeScript with Node.js and Express",
      excerpt: "A step-by-step guide to configuring TypeScript in a Node.js Express project from scratch: tsconfig, hot reload, debugging, and production build.",
      category: "Engineering",
      author: { name: "Benjamin Mayanja", handle: "@Essomero" },
      date: "2026-09-01",
      tags: ["typescript", "nodejs", "express"],
      topics: ["technology", "career"],
      intro: "You have an Express API that works. Now you want TypeScript guarding your routes, your request handlers, and your database queries. Here's how to set it up without the usual config pain.",
      body: [
        "Start by initializing your project with a `package.json` if you haven't already: `npm init -y`.",
        "Install the core dependencies: `npm install express` and the dev dependencies: `npm install -D typescript @types/express @types/node tsx`.",
        "Create a `tsconfig.json` with strict mode enabled, ES module resolution, and output to a `dist/` folder.",
      ],
      tipCards: [
        { icon: "terminal", bgClass: "", iconColorClass: "", title: "Use tsx for Dev", description: "Instead of tsc + node, use `tsx watch src/index.ts` for hot reload during development." },
      ],
    },
  },

  course: {
    type: "course",
    label: "Course",
    description: "Multi-lesson structured learning path. A course curates existing stories into a sequenced lesson plan. Each lesson references a story slug.",
    classification: {
      when: "The user wants to teach a subject across multiple linked lessons. They use language like 'course on', 'learn X from scratch', 'curriculum for', 'training program', 'multi-part'. A course is a container for stories, not a single narrative.",
      keywords: ["course", "curriculum", "learn from scratch", "training", "multi-part", "lesson plan", "syllabus", "from zero to"],
      avoid: "A single in-depth piece → use Story. A practical how-to → use Guide. A collection that follows a build log → use Series.",
    },
    fields: COURSE_FIELDS,
    example: {
      title: "TypeScript Interview Fast Track",
      excerpt: "Five visual lessons that make the type system click: shapes over names, generics as relationships, and boundaries you can trust.",
      category: "Engineering",
      author: { name: "Benjamin Mayanja", handle: "@Essomero" },
      date: "2026-08-20",
      tagline: "Five visual lessons that make the type system click",
      lessons: [
        { title: "Why Does This TypeScript Error?", storySlug: "fs-1-why-this-type-error", description: "Structural typing from first principles." },
        { title: "Generics as Relationships", storySlug: "fs-2-generics", description: "Type parameters that connect inputs and outputs." },
      ],
    },
  },

  book: {
    type: "book",
    label: "Book",
    description: "Multi-chapter long-form work. A book is a collection of chapters, each referencing a story slug.",
    classification: {
      when: "The user wants to present a long-form work divided into chapters. They use language like 'book on', 'chapters', 'part I', 'volume'. Books are the largest container — each chapter can be a substantial story.",
      keywords: ["book", "chapter", "volume", "part i", "part ii", "long-form", "manuscript"],
      avoid: "A short course with lessons → use Course. Episodic build log → use Series.",
    },
    fields: BOOK_FIELDS,
    example: {
      title: "The Prophet",
      excerpt: "Kahlil Gibran's timeless collection of poetic essays on life, love, and the human condition.",
      category: "Philosophy",
      author: { name: "Benjamin Mayanja", handle: "@Essomero" },
      date: "2026-07-01",
      chapters: [
        { title: "On Love", storySlug: "prophet-1-on-love", description: "Love gives naught but itself and takes naught but from itself." },
        { title: "On Marriage", storySlug: "prophet-2-on-marriage", description: "Let there be spaces in your togetherness." },
      ],
    },
  },

  series: {
    type: "series",
    label: "Series",
    description: "Multi-part sequential build log. A series follows a project or investigation across episodes. Each episode references a story slug.",
    classification: {
      when: "The user is building or investigating something across multiple parts. They use language like 'part 1', 'building X in Y parts', 'series on', 'multi-part series'. A series documents a journey over time.",
      keywords: ["part 1", "part i", "building in", "series", "episode", "multi-part", "sequel", "following up"],
      avoid: "Static reference material → use Doc. Teaching curriculum → use Course.",
    },
    fields: SERIES_FIELDS,
    example: {
      title: "The Craft of Software",
      excerpt: "A series on the principles, practices, and philosophy of building software that lasts.",
      category: "Engineering",
      author: { name: "Benjamin Mayanja", handle: "@Essomero" },
      date: "2026-06-15",
      episodes: [
        { title: "On Code", storySlug: "craft-of-software-1-on-code" },
        { title: "On Architecture", storySlug: "craft-of-software-2-on-architecture" },
      ],
    },
  },

  doc: {
    type: "doc",
    label: "Doc",
    description: "Reference material, FAQ, Q&A. A doc is scanned and re-read, not read front to back. Compressed format with numbered sections of question-answer pairs.",
    classification: {
      when: "The user wants to create reference material that people will search and scan, not read sequentially. They use language like 'reference for', 'FAQ', 'common questions about', 'cheat sheet', 'documentation for', 'guide to X concepts'. Docs are dense and structured — answers are concise and to the point.",
      keywords: ["reference", "faq", "common questions", "cheat sheet", "documentation", "glossary", "quick reference", "concepts"],
      avoid: "Step-by-step teaching → use Guide. Narrative exploration → use Story.",
    },
    fields: DOC_FIELDS,
    example: {
      title: "Lab Setup: Soma Development Environment",
      excerpt: "A quick reference for setting up your local Soma development environment: dependencies, configuration, and common commands.",
      category: "Engineering",
      author: { name: "Benjamin Mayanja", handle: "@Essomero" },
      date: "2026-05-10",
      tags: ["setup", "development"],
      sections: [
        {
          number: "A",
          heading: "Prerequisites",
          anchor: "prerequisites",
          items: [
            { question: "What do I need to install first?", answer: ["You need Node.js >= 20 and pnpm."] },
            { question: "How do I install pnpm?", answer: ["Run `npm install -g pnpm` or use `brew install pnpm` on macOS."] },
          ],
        },
        {
          number: "B",
          heading: "Configuration",
          anchor: "configuration",
          items: [
            { question: "Where do API keys go?", answer: ["Copy `.env.example` to `.env.local` and fill in the values.", "The env file is gitignored — it never gets committed."] },
          ],
        },
      ],
    },
  },

  featured: {
    type: "featured",
    label: "Featured Article",
    description: "Hero article for the landing page. Longer and richer than a standard story. Has a tagline and rich sections with content blocks.",
    classification: {
      when: "The user wants to create a landing-page hero piece that introduces the site, explains its mission, or tells the founding story. Featured articles are the most visible content on the site.",
      keywords: ["featured", "hero", "landing", "about", "mission", "founding", "introducing", "welcome"],
      avoid: "A regular story that doesn't need hero placement → use Story.",
    },
    fields: FEATURED_FIELDS,
    example: {
      title: "Why I Built Soma",
      excerpt: "A new kind of library, built for the age of agents.",
      category: "Philosophy",
      author: { name: "Benjamin Mayanja", handle: "@Essomero" },
      date: "2026-01-01",
      tagline: "A new kind of library, built for the age of agents.",
      sections: [
        { heading: "The Problem with Digital Libraries", paragraphs: ["Digital libraries today are designed for humans who read linearly..."] },
        { heading: "A Library for Humans and Agents", paragraphs: ["Soma is built differently. Every piece of content is structured, typed, and machine-readable..."] },
      ],
    },
  },

  test: {
    type: "test",
    label: "Test",
    description: "Diagnostic assessment with multiple-choice and open questions. Tests link to source material (stories, guides, docs) and can be written, oral, or hybrid format.",
    classification: {
      when: "The user wants to assess knowledge of a topic. They use language like 'test on', 'assess knowledge of', 'quiz', 'exam', 'assessment for', 'evaluate understanding'. Tests have sources (what to study) and questions (what to answer).",
      keywords: ["test", "quiz", "exam", "assessment", "evaluate", "practice questions", "knowledge check", "diagnostic"],
      avoid: "Teaching material → use Guide or Course. Reference → use Doc.",
    },
    fields: TEST_FIELDS,
    example: {
      title: "SQL Query Optimization",
      excerpt: "Test your understanding of SQL query optimization: indexing strategies, execution plans, and query rewriting.",
      category: "Engineering",
      author: { name: "Benjamin Mayanja", handle: "@Essomero" },
      date: "2026-09-10",
      format: "written",
      estimatedMinutes: 30,
      passingScore: 70,
      sources: [
        { type: "story", storySlug: "fs-1-why-this-type-error" },
        { type: "doc", docSlug: "lab-setup" },
      ],
      questions: [
        { id: "q1", type: "multiple-choice", question: "What index type would you use for exact match lookups?", options: [{ id: "a", label: "B-tree" }, { id: "b", label: "Hash" }], correctOptionIds: ["b"] },
        { id: "q2", type: "open", question: "Explain how a covering index reduces query cost." },
      ],
    },
  },

  podcast: {
    type: "podcast",
    label: "Podcast Episode",
    description: "Audio episode with segments, guests, transcript, and related reading. Has a unique audio-centric structure.",
    classification: {
      when: "The user wants to create an audio episode with segments, guests, and a transcript. Podcasts are the only type with audio content.",
      keywords: ["podcast", "episode", "audio", "conversation", "interview"],
      avoid: "Written content → use any other type.",
    },
    fields: PODCAST_FIELDS,
    example: {
      title: "Bridging Code and Community",
      excerpt: "A conversation about open source, developer communities, and the craft of building tools that people love to use.",
      category: "Technology",
      author: { name: "Benjamin Mayanja", handle: "@Essomero" },
      date: "2026-10-01",
      tags: ["open-source", "community"],
      episode: "EPISODE 30 // OCT 24",
      duration: "42 MIN",
      summary: "In this episode, we explore the intersection of open source development and community building.",
      segments: [
        { time: "00:00", title: "Introduction", description: "Welcome and episode overview." },
        { time: "05:30", title: "Open Source Philosophy", description: "Why build in the open." },
      ],
      guests: [
        { name: "Ruth Ikegah", role: "Developer Advocate", description: "Ruth builds bridges between developers and the tools they use." },
      ],
    },
  },
};

// ── Helpers ──────────────────────────────────────────

/** Get the schema for a specific content type */
export function getSchema(type: ContentType): TypeSchema {
  return CONTENT_SCHEMA[type];
}

/** Get all fields for a type, optionally including/excluding common meta */
export function getFields(type: ContentType, includeMeta = true): FieldSchema[] {
  const schema = CONTENT_SCHEMA[type];
  if (includeMeta) return schema.fields;
  return schema.fields.filter((f) => !COMMON_META.some((m) => m.name === f.name));
}

/** Build a human-readable classification guide string for the AI prompt */
export function buildClassificationGuide(): string {
  return Object.values(CONTENT_SCHEMA)
    .map(
      (s) => `## ${s.label} (\`${s.type}\`)
${s.description}

**Recommend when:** ${s.classification.when}
**Keywords that suggest this type:** ${s.classification.keywords.join(", ")}
**Avoid when:** ${s.classification.avoid}`
    )
    .join("\n\n");
}

/** Build a field schema description string for a specific type (for the AI prompt) */
export function buildFieldDescriptions(type: ContentType): string {
  const schema = CONTENT_SCHEMA[type];
  const lines: string[] = [];

  for (const field of schema.fields) {
    const required = field.required ? "required" : "optional";
    lines.push(`- \`${field.name}\` (${field.type}, ${required}): ${field.description}`);
    if (field.constraints) lines.push(`  Constraints: ${field.constraints}`);
    if (field.children && field.children.length > 0) {
      for (const child of field.children) {
        const cr = child.required ? "required" : "optional";
        lines.push(`  - \`${child.name}\` (${child.type}, ${cr}): ${child.description}`);
      }
    }
  }

  return lines.join("\n");
}

/** Build a complete example draft for a type (for the AI prompt) */
export function buildExamplePrompt(type: ContentType): string {
  const schema = CONTENT_SCHEMA[type];
  return JSON.stringify(schema.example, null, 2);
}

/** Build a full system prompt for content drafting. `types` limits to specific types. */
export function buildSystemPrompt(types?: ContentType[]): string {
  const targets = types
    ? types.map((t) => CONTENT_SCHEMA[t])
    : Object.values(CONTENT_SCHEMA);

  return `You are a content creation assistant for Soma, a personal library of deep research, curated reading, and ideas that matter.

Your job: accept the user's plain-language description, classify it into the right content type, and generate a structured draft with substantive content.

## Content Types

${targets.map((s) => `### ${s.label} (\`${s.type}\`)
${s.description}
**Recommend when:** ${s.classification.when}
**Keywords:** ${s.classification.keywords.join(", ")}
**Avoid:** ${s.classification.avoid}`
).join("\n\n")}

## Output Format

Return ONLY valid JSON (no markdown fences). The JSON must have:

### Required top-level fields:
- \`type\`: string — one of: ${targets.map(s => `"${s.type}"`).join(", ")}
- \`reasoning\`: string — 1-2 sentence explanation of why you chose this type
- \`title\`: string — compelling headline
- \`excerpt\`: string — 1-2 sentence card summary
- \`category\`: string — one of: ${CATEGORIES.join(", ")}
- \`author\`: object — { name: string, handle?: string }
- \`date\`: string — today in YYYY-MM-DD

### Type-specific fields:

Each type has its own field schema. Generate ONLY the fields relevant to the type you chose.

${targets.map((s) => `--- ${s.label} (\`${s.type}\`) fields ---
${buildFieldDescriptions(s.type)}`
).join("\n\n")}

### Rules:
1. Choose the closest-fitting type from the list above.
2. If the idea fits multiple, pick the best one and explain in reasoning.
3. Generate REALISTIC, SUBSTANTIVE content — actual paragraphs, not outlines or placeholders.
4. Use markdown within text fields.
5. Date must be today's real date.`;
}
