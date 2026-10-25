/**
 * Sitemap generator: seed corpus -> public/sitemap.xml
 * Only the versioned corpus is listed: it is the public baseline.
 * Private store rows are never in the sitemap.
 * Run: npm run sitemap (also runs as part of npm run build)
 */
import * as fs from "fs";
import * as path from "path";
import { loadCorpus } from "./corpus.ts";

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

async function main() {
  const corpus = loadCorpus();
  const urls = new Set<string>(STATIC_ROUTES);
  for (const entry of corpus) {
    const route = ROUTES[entry.type];
    if (!route || !entry.slug) continue;
    urls.add(`/${route}/${entry.slug}`);
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
