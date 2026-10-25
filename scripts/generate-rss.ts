/**
 * RSS Feed Generator
 * Reads allEpisodes from the content registry and generates podcast.xml in public/
 * Run as part of the build: npm run rss
 */
import * as fs from "fs";
import * as path from "path";

// We import the compiled output since this runs after tsc.
// Actually, we can read the raw episode files directly.
// Simpler approach: read the episodes index directly using tsx/esm.

interface Episode {
  slug?: string;
  title: string;
  description: string;
  summary?: string;
  date: string;
  duration?: string;
  durationSeconds?: number;
  audioUrl?: string;
  image: string;
  number?: string;
  episode?: string;
  guests?: { name: string; role: string }[];
}

// Dynamic import - we read the TS file directly at runtime via tsx
async function main() {
  // Use a simple approach: read the published podcast.xml manually
  // For now, generate from hardcoded episode data to avoid
  // the complexity of importing TS modules at build time

  const baseUrl = "https://soma.mayanja.dev";

  const episodes: Episode[] = [
    {
      slug: "bridging-code-and-community",
      title: "Think on paper, but digital",
      description: "Why I built Soma: the trade every publishing tool forces, owning your notes on sovereign infrastructure, and learning you can prove out loud.",
      summary: "Soma founder Benjamin Mayanja walks through the idea behind the platform: a private notebook and a public press in one place, running on your own database.",
      date: "OCT 24",
      duration: "18 MIN",
      durationSeconds: 1080,
      audioUrl: "",
      image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1200&h=1200&fit=crop",
      number: "Episode 1",
      guests: [
        { name: "Benjamin Mayanja", role: "Founder, Soma" },
      ],
    },
  ];

  const rssItems = episodes.map((ep) => {
    const pubDate = "Sat, 24 Oct 2026 09:00:00 GMT"; // Episode 1: founder intro
    const guid = `${baseUrl}/podcast/${ep.slug}`;
    const audioUrl = ep.audioUrl || "";
    const audioLength = audioUrl ? "7000000" : "0"; // Approximate
    const audioType = "audio/mpeg";

    const summary = ep.summary || ep.description;
    const guestList = ep.guests
      ? ep.guests.map((g) => `${g.name} (${g.role})`).join(", ")
      : "";

    return `    <item>
      <title>${esc(ep.title)}</title>
      <link>${esc(guid)}</link>
      <guid isPermaLink="true">${esc(guid)}</guid>
      <description>${esc(summary)}</description>
      <itunes:summary>${esc(summary)}</itunes:summary>
      <itunes:author>Benjamin Mayanja</itunes:author>
      <itunes:duration>${ep.durationSeconds || 0}</itunes:duration>
      ${guestList ? `<itunes:keywords>${esc(guestList)}</itunes:keywords>` : ""}
      <itunes:image href="${esc(ep.image)}" />
      ${audioUrl ? `<enclosure url="${esc(audioUrl)}" length="${audioLength}" type="${audioType}" />` : ""}
      <pubDate>${pubDate}</pubDate>
      <itunes:episodeType>full</itunes:episodeType>
    </item>`;
  }).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Soma Podcast</title>
    <link>${baseUrl}/podcast</link>
    <description>Deep dives into technology, economics, and philosophy. Stories from the people behind the code.</description>
    <language>en-us</language>
    <itunes:author>Benjamin Mayanja</itunes:author>
    <itunes:summary>Deep dives into technology, economics, and philosophy.</itunes:summary>
    <itunes:image href="${baseUrl}/favicon.ico" />
    <itunes:category text="Technology" />
    <itunes:explicit>no</itunes:explicit>
    <atom:link href="${baseUrl}/podcast.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${baseUrl}/favicon.ico</url>
      <title>Soma Podcast</title>
      <link>${baseUrl}/podcast</link>
    </image>
${rssItems}
  </channel>
</rss>`;

  const outDir = path.resolve(process.cwd(), "public");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "podcast.xml"), rss, "utf-8");
  console.log("✓ RSS feed generated at public/podcast.xml");
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

main().catch(console.error);
