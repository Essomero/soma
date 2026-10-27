/**
 * Sitemap generator: content corpus -> public/sitemap.xml
 * Only the versioned corpus is listed: it is the public baseline.
 * Private store rows are never in the sitemap.
 * Run: npm run sitemap (also runs as part of npm run build)
 */
import * as fs from "fs";
import * as path from "path";
import { allStories } from "../src/content/stories/index.ts";
import { allGuides } from "../src/content/guides/index.ts";
import { allDocs } from "../src/content/docs/index.ts";
import { allCourses } from "../src/content/courses/index.ts";
import { allBooks } from "../src/content/books/index.ts";
import { allSeries } from "../src/content/series/index.ts";
import { allTests } from "../src/content/tests/index.ts";
import { allFeatured } from "../src/content/featured/index.ts";
import { allEpisodes } from "../src/content/podcast/episodes/index.ts";
import { allTopics } from "../src/content/topics/index.ts";

const BASE = "https://soma.mayanja.dev";

const ROUTES: Record<string, string> = {
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

const STATIC_ROUTES = [
  "/",
  "/stories",
  "/guides",
  "/docs",
  "/courses",
  "/books",
  "/series",
  "/tests",
  "/podcast",
  "/topics",
];

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

async function main() {
  const collections: Array<{ type: string; items: Record<string, unknown>[] }> = [
    { type: "story", items: allStories },
    { type: "guide", items: allGuides },
    { type: "doc", items: allDocs },
    { type: "course", items: allCourses },
    { type: "book", items: allBooks },
    { type: "series", items: allSeries },
    { type: "test", items: allTests },
    { type: "featured", items: allFeatured },
    { type: "podcast", items: allEpisodes },
    { type: "topic", items: allTopics },
  ];

  const urls = new Set<string>(STATIC_ROUTES);
  for (const { type, items } of collections) {
    const route = ROUTES[type];
    if (!route) continue;
    for (const item of items) {
      const slug = str(item.slug);
      if (!slug) continue;
      urls.add(`/${route}/${slug}`);
    }
  }

  const items = [...urls]
    .sort()
    .map((u) => `  <url>\n    <loc>${esc(BASE + u)}</loc>\n  </url>`)
    .join("\n");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;

  const outDir = path.resolve(process.cwd(), "public");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "sitemap.xml"), xml, "utf-8");
  console.log(`✓ Sitemap written with ${urls.size} URLs`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
