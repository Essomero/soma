export type ContentType =
  | "story"
  | "guide"
  | "course"
  | "book"
  | "series"
  | "doc"
  | "featured"
  | "test"
  | "podcast";

export const CONTENT_TYPES: ContentType[] = [
  "story",
  "guide",
  "course",
  "book",
  "series",
  "doc",
  "featured",
  "test",
  "podcast",
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

export const CATEGORY_OPTIONS = [
  "Engineering",
  "Philosophy",
  "Design",
  "Science",
  "Technology",
  "Culture",
  "Business",
  "Arts",
  "Career",
];

export const TOPIC_OPTIONS = [
  { slug: "technology", label: "Technology" },
  { slug: "career", label: "Career" },
  { slug: "science", label: "Science" },
  { slug: "philosophy", label: "Philosophy" },
  { slug: "design", label: "Design" },
  { slug: "business", label: "Business" },
  { slug: "culture", label: "Culture" },
  { slug: "arts", label: "Arts" },
];
