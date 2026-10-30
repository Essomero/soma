// ── Content Blocks (rich inline content) ──────────────

// ── 3D scene primitives ─────────────────────────────────
// Flexible scene-graph types. Authors compose arbitrary 3D scenes from
// these primitives. The renderer walks the `objects` tree and instantiates
// the appropriate Three.js geometry/material each node maps to. Authors
// are not limited to predefined presets : see the skill doc for the full
// range of supported primitives.

export type SceneLight =
  | { type: "ambient"; color?: string; intensity?: number }
  | { type: "directional"; position: [number, number, number]; color?: string; intensity?: number }
  | { type: "point"; position: [number, number, number]; color?: string; intensity?: number; distance?: number }
  | { type: "hemisphere"; skyColor?: string; groundColor?: string; intensity?: number }
  | { type: "spot"; position: [number, number, number]; target: [number, number, number]; color?: string; intensity?: number; angle?: number };

export type SceneObject =
  // Parametric surface: f(x, y) = expression. The most useful primitive
  // for math visualizations. The expression is a JS function of `x` and `y`.
  | {
      kind: "surface";
      expression: string;
      xRange: [number, number];
      yRange: [number, number];
      // Grid topology. "square" samples x and y on a cartesian lattice (best for
      // rectangular domains and non-symmetric functions). "polar" samples at
      // (r·cos θ, r·sin θ) for r ∈ [0, maxR] and θ ∈ [0, 2π) : gives a clean
      // circular rim, no corner spikes. Use "polar" for radially-symmetric
      // functions like x² + y². Defaults to "square".
      grid?: "square" | "polar";
      yScale?: number;
      yClip?: number;
      segments?: number;
      color?: string;
      wireframe?: boolean;
      wireframeColor?: string;
      position?: [number, number, number];
    }
  // Built-in geometry meshes
  | {
      kind: "mesh";
      geometry: "box" | "sphere" | "torus" | "cylinder" | "cone" | "plane" | "circle" | "ring";
      size?: number | number[] | [number, number, number];
      position?: [number, number, number];
      rotation?: [number, number, number];
      color?: string;
      wireframe?: boolean;
    }
  // Arrow from point A to point B (ArrowHelper)
  | {
      kind: "arrow";
      from: [number, number, number];
      to: [number, number, number];
      color?: string;
      headLength?: number;
      headWidth?: number;
    }
  // Point marker (sphere)
  | {
      kind: "point";
      position: [number, number, number];
      radius?: number;
      color?: string;
    }
  // 3D-anchored HTML label
  | {
      kind: "label";
      position: [number, number, number];
      text: string;
      color?: string;
      bg?: string;
    }
  // Group: nest objects with a shared transform
  | {
      kind: "group";
      position?: [number, number, number];
      rotation?: [number, number, number];
      objects: SceneObject[];
    };

// ── Chart block primitives ─────────────────────────────
// Discriminated union mirroring the SceneObject pattern. Authors compose any
// chart from these nodes : no preset whitelist. The chart-family root (one
// of lineChart/areaChart/barChart/scatterChart/pieChart/radialBarChart) must
// appear exactly once; all other nodes are optional and may repeat.
export type ChartNode =
  // ── Chart-family root (exactly one; selects Recharts container) ──
  | {
      kind: "lineChart";
      // Merged rows: one entry per x value, each series as a numeric column.
      // The renderer builds this from the sibling `series` nodes automatically
      // : supply only if you want to override.
      data?: { x: number; y: number | null }[];
      smooth?: boolean;
    }
  | { kind: "areaChart"; data?: { x: number; y: number | null }[]; smooth?: boolean }
  | { kind: "barChart"; data?: { x: number; y: number | null }[] }
  | { kind: "scatterChart" }
  | { kind: "pieChart" }
  | { kind: "radialBarChart" }
  // ── Axes (one or two per direction for multi-axis charts) ──
  | {
      kind: "xAxis";
      label?: string;
      min?: number;
      max?: number;
      scale?: "linear" | "log";
      tickCount?: number;
      tickFormat?: "integer" | "decimal";
      side?: "top" | "bottom";
      yAxisId?: string; // for cross-axis plots; rare
    }
  | {
      kind: "yAxis";
      label?: string;
      min?: number;
      max?: number;
      scale?: "linear" | "log";
      tickCount?: number;
      tickFormat?: "integer" | "decimal";
      side?: "left" | "right";
      yAxisId?: string;
    }
  // ── Series (one per line/area/bar; data carried inline) ──
  | {
      kind: "series";
      name: string;
      data: { x: number; y: number | null }[];
      color?: string;
      strokeWidth?: number;
      fillOpacity?: number;
      pointMarkers?: boolean;
      // Override the chart-family root's render type for this series only.
      // Useful for mixing bars + lines in one chart.
      type?: "line" | "bar" | "area";
      yAxisId?: string;
    }
  // ── Annotations ──
  | { kind: "annotation"; x: number; y: number; label: string; color?: string }
  | {
      kind: "referenceLine";
      orientation: "horizontal" | "vertical";
      value: number;
      label?: string;
      color?: string;
      strokeDasharray?: string;
    }
  // ── Region band (shaded zone) ──
  | {
      kind: "band";
      orientation: "horizontal" | "vertical";
      from: number;
      to: number;
      color?: string;
      opacity?: number;
      label?: string;
    }
  // ── Trend line (straight line through two points) ──
  | {
      kind: "trendLine";
      from: { x: number; y: number };
      to: { x: number; y: number };
      color?: string;
      strokeDasharray?: string;
      label?: string;
    }
  // ── Per-series error bars (works inside barChart / scatterChart) ──
  | {
      kind: "errorBar";
      series: string;
      direction: "x" | "y";
      data: { x: number; low: number; high: number }[];
      color?: string;
      width?: number;
    }
  // ── Chart chrome ──
  | { kind: "grid"; stroke?: string; strokeDasharray?: string }
  | { kind: "tooltip"; enabled?: boolean }
  | { kind: "legend"; enabled?: boolean; position?: "top" | "bottom" | "left" | "right" }
  // ── Pie / radialBar slice (one node per slice) ──
  | { kind: "category"; name: string; value: number; color?: string };

export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "horizontalRule" }
  | { type: "videoCallout"; title: string; links: { label: string; url: string }[] }
  // Coaching aside: success (green), danger (red), warning (orange), info (blue).
  // `text` is markdown. Use for do/don't guidance : never fake a code file for prose.
  | { type: "callout"; variant: "success" | "danger" | "warning" | "info"; title?: string; text: string }
  | { type: "code"; code: string; language?: string; filename?: string }
  | { type: "math"; expression: string; display?: boolean }
  | { type: "mermaid"; diagram: string; caption?: string }
  | { type: "youtube"; videoId: string; caption?: string }
  | {
      type: "chart";
      // Flexible primitive tree. The first node whose kind is one of the
      // chart-family roots picks the chart family (lineChart, areaChart,
      // barChart, scatterChart, pieChart, radialBarChart). All other nodes
      // are composition primitives (axes, series, annotations, etc.).
      // See ChartNode below for the full vocabulary.
      title?: string;
      caption?: string;
      nodes: ChartNode[];
    }
  | {
      type: "scene3d";
      // Optional camera. Defaults to a 3/4 view from front-right.
      camera?: {
        position: [number, number, number];
        target?: [number, number, number];
        fov?: number;
      };
      // Optional lights. Defaults to ambient + directional + hemisphere.
      lights?: SceneLight[];
      // Free-form scene objects. Compose any 3D scene from these primitives.
      // See the SceneObject discriminated union below for what's supported.
      objects: SceneObject[];
      caption?: string;
    }
  | LabBlock;

export interface LabFile {
  path: string;
  action?: "inspect" | "modify" | "create";
  language?: string;
  code: string;
  description?: string;
}

export interface LabBlock {
  type: "lab";
  id?: string;
  title: string;
  path: string;
  step?: {
    current: number;
    total: number;
    title?: string;
  };
  summary?: string;
  command: string;
  output?: string;
  files?: LabFile[];
};

// ── Author ────────────────────────────────────────────
export interface Author {
  name: string;
  handle?: string;
  avatar?: string;
  title?: string;
  bio?: string;
}

// ── Navigation ────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
}

// ── Article / Story Cards ─────────────────────────────
export interface ArticleCardData {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  href: string;
  author?: Author;
  date?: string;
  /** UTC ISO 8601 timestamp for sorting */
  publishedAt?: string;
  tags?: string[];
  isFeatured?: boolean;
}

// ── Content Schemas (the canonical shapes) ────────────
export interface StoryContent {
  id: string;        // same as slug
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  href: string;      // "/stories/:slug"
  author: Author;
  /** UTC ISO 8601 timestamp — formatted to display date at render time */
  publishedAt: string;
  tags?: string[];
  isFeatured?: boolean;
  intro: string;
  body: string[];
  pullQuote?: PullQuoteData;
  // Attribution
  source?: { name: string; url: string };  // Single source : republished content (Twitter thread, etc.)
  references?: { title: string; url: string; description?: string }[];  // Multi-source : original synthesis/research

  // Content lifecycle
  archived?: boolean;
  listed?: boolean;    // false = hidden from index listings (course lessons, etc.)

  // Topics this story belongs to (matches topic slugs in allTopics)
  topics?: string[];

  // Optional rich fields : when present, StoryPage renders like a featured article
  pullQuotes?: PullQuoteData[];
  bentoHighlights?: BentoCardData[];
  sections?: Array<{ heading: string; paragraphs: (string | ContentBlock)[] }>;
}

// User-authored notes : stored at runtime in Turso (not shipped as TS files).
// `slug` is immutable once created (it's the key that links comments/highlights).
export type PublishedContentEntry = {
  title: string;
  slug: string;
  type: string;
};

export interface NoteArticle {
  id: number;
  slug: string;
  title: string;
  content: string;      // single raw Markdown document
  publishedContent: PublishedContentEntry[];
  createdAt: string;
  updatedAt: string | null;
}

export interface GuideContent {
  id: string;        // same as slug
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  image: string;
  imageAlt: string;
  href: string;      // "/guides/:slug"
  author: Author;
  /** UTC ISO 8601 timestamp — formatted to display date at render time */
  publishedAt: string;
  tags?: string[];
  isFeatured?: boolean;
  intro: string;
  body: string[];
  sections?: Array<{ heading: string; paragraphs: (string | ContentBlock)[] }>;
  bentoHighlights?: BentoCardData[];
  pullQuotes?: PullQuoteData[];
  references?: { title: string; url: string; description?: string }[];
  tipCards?: { icon: string; bgClass: string; iconColorClass: string; title: string; description: string }[];
}

export interface FeaturedContent {
  slug: string;
  tag: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  author: Author;
  /** UTC ISO 8601 timestamp — formatted to display date at render time */
  publishedAt: string;
  tagline?: string;
  bentoHighlights?: BentoCardData[];
  pullQuotes?: PullQuoteData[];
  sections?: Array<{ heading: string; paragraphs: (string | ContentBlock)[] }>;
}

// ── Homepage ──────────────────────────────────────────
export interface FeaturedStoryData {
  id: string;
  tag: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  cta: { label: string; href: string };
  author?: Author;
  date?: string;
  /** UTC ISO 8601 timestamp for sorting */
  publishedAt?: string;
}

// ── Podcast ───────────────────────────────────────────
export interface PodcastEpisode {
  id: string;
  title: string;
  image: string;
  imageAlt: string;
  href: string;
}

export interface PodcastEpisodeFull {
  id: string;
  slug?: string;           // URL-friendly slug, e.g. "bridging-code-and-community"
  title: string;
  image: string;
  imageAlt: string;
  episode: string;        // "EPISODE 30 // AUG 14"
  /** UTC ISO 8601 timestamp — formatted to display date at render time */
  publishedAt: string;
  duration: string;       // "42 MIN"
  durationSeconds?: number; // 2520 : for progress tracking
  description: string;
  category: string;
  href: string;
  position?: number;     // Store order (seed position). Detail nav sorts on this, never on list order.
  // Episode detail fields (optional : only full episode pages need these)
  number?: string;        // "Episode 31"
  summary?: string;       // Full episode summary
  audioUrl?: string;      // URL to audio file (supports external URLs)
  coverImage?: string;    // Square cover art for detail page
  coverAlt?: string;
  segments?: { time: string; title: string; description: string }[];
  guests?: { name: string; role: string; description: string; color: string }[];
  transcript?: { speaker: string; text: string; start?: number }[]; // start: seconds into audio, for transcript sync
  relatedReading?: { tag: string; title: string; image: string; color: string; href: string }[];
}

// ── Guide ─────────────────────────────────────────────
export interface TocItem {
  number: string;
  title: string;
  href: string;
}

export interface TipCardData {
  icon: string;
  bgClass: string;
  iconColorClass: string;
  title: string;
  description: string;
}

export interface GuideSectionData {
  number: string;
  title: string;
  id: string;
}

export interface GuideArticleData {
  id: string;
  tag: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  author: Author;
  toc: TocItem[];
  sections: GuideSectionData[];
  tipCards: TipCardData[];
  codeBlock: {
    filename: string;
    lines: Array<{ number: string; content: string }>;
  };
}

// ── Developer Story ───────────────────────────────────
export interface DeveloperStoryData {
  id: string;
  title: string;
  description: string;
  author: Author;
  location?: string;
  social?: string;
  website?: string;
  organizations?: string[];
}

// ── Pull Quote ────────────────────────────────────────
export interface PullQuoteData {
  quote: string;
  attribution?: string;
}

// ── Bento Card ────────────────────────────────────────
export interface BentoCardData {
  label: string;
  title: string;
  description: string;
}

// ── Collection covers ───────────────────────────────────
// Optional per-collection print copy. All fields optional so existing
// courses/books/series keep working: pages fall back to tagline and
// description when cover copy is absent. Longer blurbs can be LLM-drafted
// at author time and checked in like any other copy. Nothing is generated
// at print time.
export interface CollectionCover {
  /** Motif hint for the runtime-drawn SVG. Omitted = derived from slug hash. */
  pattern?: "rings" | "grid" | "stack";
  /** e.g. "Print Edition", "Cohort Notes". Omitted = "Print Edition". */
  edition?: string;
  /** Front-cover standfirst. Omitted = tagline, then description. */
  frontBlurb?: string;
  /** Back-cover blurb. Omitted = description. */
  backBlurb?: string;
}

// ── Books ─────────────────────────────────────────────
export interface BookContent {
  slug: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  author: Author;
  /** UTC ISO 8601 timestamp — formatted to display date at render time */
  publishedAt: string;
  topics?: string[];
  tagline?: string;
  archived?: boolean;
  cover?: CollectionCover;
  chapters: Array<{
    title: string;
    storySlug: string;
    description?: string;
  }>;
}

// ── Series ────────────────────────────────────────────
export interface SeriesContent {
  slug: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  author: Author;
  /** UTC ISO 8601 timestamp — formatted to display date at render time */
  publishedAt: string;
  topics?: string[];
  tagline?: string;
  archived?: boolean;
  cover?: CollectionCover;
  episodes: Array<{
    title: string;
    storySlug: string;
    description?: string;
  }>;
}

// ── Docs ──────────────────────────────────────────────
// Reference material: compressed Q&A, code, tables. No narrative arc :
// a doc is scanned and re-read, not read once front to back.
export interface DocSection {
  number: string;              // "C"
  heading: string;             // "Frontend"
  anchor: string;              // explicit id : SidebarToc points at exactly this
  intro?: string;              // markdown
  items: Array<{
    question: string;
    // Each entry is one markdown block, or a typed ContentBlock (code, table…).
    // A fenced code block must be ONE entry : never split across entries.
    answer: (string | ContentBlock)[];
  }>;
  callout?: { label: string; text: string };
}

export interface DocContent {
  slug: string;
  category: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  author: Author;
  /** UTC ISO 8601 timestamp — formatted to display date at render time */
  publishedAt: string;
  tags: string[];
  topics?: string[];
  sections: DocSection[];
  /** Ochre placeholders to fill in before the doc is useful. */
  fillMarkers?: string[];
  archived?: boolean;
}

// ── Courses ───────────────────────────────────────────
export interface CourseContent {
  slug: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  author: Author;
  /** UTC ISO 8601 timestamp — formatted to display date at render time */
  publishedAt: string;
  topics?: string[];
  tagline?: string;
  archived?: boolean;
  cover?: CollectionCover;
  lessons: Array<{
    title: string;
    storySlug: string;
    description?: string;
  }>;
}

// ── Topics ────────────────────────────────────────────
export interface TopicData {
  slug: string;
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  accentBg: string;
  accentText: string;
  category?: string;  // "Tech" | "Culture" | "Business" : for filter tabs
}

// ── Tests ─────────────────────────────────────────────
export type TestSource =
  | {
      type: "markdown";
      title: string;
      content: string;
      description?: string;
    }
  | {
      type: "story";
      storySlug: string;
      title?: string;
      description?: string;
    }
  | {
      type: "guide";
      guideSlug: string;
      title?: string;
      description?: string;
    }
  | {
      type: "doc";
      docSlug: string;
      title?: string;
      description?: string;
    }
  | {
      type: "link";
      title: string;
      url: string;
      description?: string;
    };

export interface TestQuestionOption {
  id: string;
  label: string;
  explanation?: string;
}

export interface OpenTestQuestion {
  id: string;
  type: "open";
  question: string;
  description?: string;
  placeholder?: string;
  rubric?: string;
  keyPoints?: string[];
  sampleAnswer?: string;
  timeLimitSeconds?: number; // e.g. 30, 45, 90 seconds
}

export interface MultipleChoiceTestQuestion {
  id: string;
  type: "multiple-choice";
  question: string;
  description?: string;
  options: TestQuestionOption[];
  allowMultiple?: boolean;
  correctOptionIds: string[];
  explanation?: string;
  timeLimitSeconds?: number; // e.g. 30, 45, 90 seconds
}

export type TestQuestion = OpenTestQuestion | MultipleChoiceTestQuestion;

export type TestFormat = "written" | "oral" | "hybrid";

export interface OralConfig {
  voice?: string; // defaults to "am_michael" (Kokoro Michael)
  provider?: string; // defaults to "kokoro"
  examinerName?: string; // defaults to "Michael"
  examinerTitle?: string; // e.g. "Technical Examiner"
  welcomeMessage?: string;
}

export interface TestContent {
  slug: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  format?: TestFormat;
  oralConfig?: OralConfig;
  image: string;
  imageAlt: string;
  author: Author;
  /** UTC ISO 8601 timestamp — formatted to display date at render time */
  publishedAt: string;
  tags?: string[];
  topics?: string[];
  archived?: boolean;
  storySlug?: string; // Links this test directly to a lesson story
  courseSlug?: string; // Optional course association
  estimatedMinutes?: number;
  defaultTimeLimitSeconds?: number; // fallback per question (e.g. 45)
  passingScore?: number;
  sources: TestSource[];
  questions: TestQuestion[];
  evaluationInstructions?: string;
}
