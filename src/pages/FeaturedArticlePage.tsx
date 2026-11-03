import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import ImmersiveHero from "@/components/sections/ImmersiveHero";
import SidebarAbout from "@/components/sections/SidebarAbout";
import ShareButtons from "@/components/ui/ShareButtons";
import { contentToMarkdown } from "@/lib/markdown";
import BentoCard from "@/components/cards/BentoCard";
import PullQuote from "@/components/ui/PullQuote";
import PrintButton from "@/components/ui/PrintButton";
import ArticleCard from "@/components/cards/ArticleCard";
import AccentBar from "@/components/ui/AccentBar";
import InlineHighlights from "@/components/ui/InlineHighlights";
import StaticHighlightPaint from "@/components/ui/StaticHighlightPaint";
import type { HighlightData } from "@/lib/highlights";
import Comments from "@/components/ui/Comments";
import { useAuth } from "@/lib/AuthContext";
import { useContentItem, useContentList, toCard } from "@/lib/content";
import type { FeaturedContent, StoryContent, Author, BentoCardData, PullQuoteData } from "@/types";
import { usePageMeta } from "@/hooks/usePageMeta";

const STORY_SLUG = "why-i-built-soma";

// Bespoke layout config for this static page (not prose content).
const somaAuthor: Author = { name: "Benjamin Mayanja", handle: "@Essomero" };

const somaBentoHighlights: BentoCardData[] = [
  { label: "SOVEREIGN BY DEFAULT", title: "Your Words Live in Your Database", description: "Notes, highlights, and publishing toggles sit in your own Turso edge SQLite behind one password you invent. There is no Soma cloud holding your writing hostage." },
  { label: "LEARN OUT LOUD", title: "Reading You Can Prove", description: "Margin AI explains any paragraph, Soma Labs turns lessons into runnable drills, and Son, a standalone speech platform, speaks your oral exam questions." },
  { label: "AGENTS THAT PUBLISH", title: "Staged Private, Shared by Choice", description: "Soma ships the same skills its author writes with, so any coding assistant can draft typed content and stage it into your database as a private piece. One toggle makes it public." },
];

const somaPullQuotes: PullQuoteData[] = [
  { quote: "Think in private on your own infrastructure, and make public what you wish.", attribution: "BENJAMIN MAYANJA" },
  { quote: "You either publish too early or you never ship at all. Soma ends that trade." },
];

export default function FeaturedArticlePage() {
  const { isOwner } = useAuth();
  const articleRef = useRef<HTMLElement>(null);
  const highlightClickRef = useRef<(id: number) => void>(() => {});
  const [pageHighlights, setPageHighlights] = useState<HighlightData[]>([]);
  const [commentsRefresh, setCommentsRefresh] = useState(0);
  const { data: row } = useContentItem<FeaturedContent>("featured", STORY_SLUG);
  const { data: storyRows } = useContentList<StoryContent>("story");
  const sections = Array.isArray(row?.sections) ? row.sections : [];
  const rowTitle = typeof row?.title === "string" ? row.title : "";
  const rowDescription = typeof row?.description === "string" ? row.description : "";
  usePageMeta({ title: rowTitle || undefined, description: rowDescription || undefined, image: row?.image });
  const storyText = [
    rowDescription,
    ...sections.flatMap((s) => [s.heading, ...(s.paragraphs || []).filter((p): p is string => typeof p === "string")]),
  ].join(" ");
  const featuredMarkdown = contentToMarkdown({ title: rowTitle, intro: rowDescription, sections });
  const somaMoreStories = (storyRows ?? []).slice(0, 3).map(toCard);
  return (
    <div>
      {/* Immersive Hero */}
      <ImmersiveHero
        tag="FEATURED ARTICLE // SOMA"
        title="AI-accelerated learning you own"
        description="I love to learn. I love markdown, graphs, illustrations, and maths laid out beautifully. Obsidian was my go-to for local notes, but it never cut it for shareability, online access, or the web. I built Soma to close that gap."
        author={somaAuthor}
        date="October 29, 2026"
        image="https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=1200&h=675&fit=crop"
        imageAlt="Writing by hand in a paper planner next to a laptop, coffee, and books"
      />

      {/* Article Content */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant grid grid-cols-1 md:grid-cols-12 gap-giant print:block">
        {/* Print-only cover: mirrors the story article title block so the printed page opens like a normal story */}
        <div className="hidden print:block mb-8">
          <p className="font-sora text-xs font-bold text-primary uppercase tracking-widest mb-3">
            Featured Article // Soma
          </p>
          <h1 className="font-sora text-3xl font-extrabold text-on-surface leading-tight mb-3">
            AI-accelerated learning you own
          </h1>
          <p className="font-dm-sans text-base text-on-surface-muted leading-relaxed mb-3">
            I love to learn. I love markdown, graphs, illustrations, and maths laid out beautifully. Obsidian was my go-to for local notes, but it never cut it for shareability, online access, or the web. I built Soma to close that gap.
          </p>
          <p className="font-sora text-xs text-on-surface-muted">
            Benjamin Mayanja // @Essomero <span className="text-secondary mx-1">//</span> October 29, 2026
          </p>
        </div>
        {/* Sidebar */}
        <aside className="md:col-span-3 space-y-xl border-t border-border-default pt-xl md:pt-0 print:hidden">
          <SidebarAbout publicToggleSlug={isOwner ? STORY_SLUG : undefined} markdownContent={featuredMarkdown} />
          <div className="hidden md:block">
            <ShareButtons variant="column" markdownContent={featuredMarkdown} />
          </div>
          <div className="hidden md:block">
            <PrintButton to="/featured/why-i-built-soma/print" stretch label="Print / Save PDF" />
          </div>
        </aside>

        {/* Main Body */}
        <article ref={articleRef} data-section-index={0} data-paragraph-index={0} className="md:col-span-8 space-y-xl">
          <div className="font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl space-y-md">
            <p className="drop-cap">
              Hey, I am Benjamin Mayanja. I build Soma, an AI-native learning
              and publishing platform that treats reading like thinking on
              paper: private by default, public when you choose, and running
              entirely on infrastructure you own.
            </p>
            <p>
              Every publishing tool I tried forced the same trade. Blogging
              platforms push you to perform for an audience before you have
              understood the topic yourself. Note-taking apps keep your
              thinking trapped in proprietary clouds or fragile sync setups.
              You either publish too early or you never ship at all.
            </p>
            <p>
              So I stopped shopping for tools and started building one. Soma
              (Luganda: to read, study, learn) puts the private notebook, the
              editorial reading experience, and the publish button in one
              place. Draft the way you would on paper, flip one toggle, and
              the same page is on the public web.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md my-giant">
            {somaBentoHighlights.map((card) => (
              <BentoCard key={card.title} card={card} />
            ))}
          </div>

          {/* Pull Quote 1 */}
          <PullQuote
            variant="gradient-bar"
            quote={somaPullQuotes[0].quote}
            attribution={somaPullQuotes[0].attribution}
          />

          <div className="font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl space-y-md">
            <h2 className="font-sora text-article-title text-on-surface pt-lg pb-md">
              Owning the loop
            </h2>
            <p>
              Owning the loop mattered more than any feature. Fork the repo,
              import it into Vercel, add one password, click Add on the Turso
              card, deploy. Tables initialize on their own, and pulling my
              updates later never touches your words, because your writing
              lives in your database, never in git.
            </p>
            <p>
              Your notes, highlights, and publishing toggles sit in your own
              Turso edge SQLite behind one password you invent. There is no
              Soma cloud holding your writing hostage, which means my fixes
              can never overwrite a single sentence of yours.
            </p>
          </div>

          {/* Pull Quote 2 */}
          <PullQuote
            variant="border-left"
            quote={somaPullQuotes[1].quote}
          />

          <div className="font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl">
            <h2 className="font-sora text-article-title text-on-surface pt-lg pb-md">
              Three pieces, one loop
            </h2>
            <p className="mb-xl">
              Reading a chapter feels like progress. Then someone asks you to
              explain it a week later and you say, uh, it was about types.
              Nothing stuck.
            </p>

            <div className="space-y-xxl">
              <div className="border-t border-border-default/70 pt-xl">
                <p className="font-sora text-metadata-tag uppercase tracking-widest mb-md">
                  <span className="font-bold text-on-surface">Soma</span>
                  <span className="text-on-surface-variant"> // the platform</span>
                </p>
                <p className="font-sora text-xl md:text-2xl text-on-surface leading-snug mb-md">
                  <strong>Soma</strong> is where the learning lives.
                </p>
                <p>
                  You write in markdown, drop a Mermaid diagram next to KaTeX
                  math, and add a 3D scene where a picture won&apos;t do. Select
                  any paragraph and the margin AI explains, challenges, or
                  simplifies it. Notes stay private until you flip one toggle,
                  and every word sits in your own Turso database. Point a
                  coding agent at the repo and it drafts content too, staged
                  private until you say otherwise. The repo is{" "}
                  <a
                    href="https://github.com/Essomero/soma"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline hover:opacity-80"
                  >
                    Soma on GitHub
                  </a>
                  : fork it, import it into Vercel, add one password, and
                  you&apos;re running.
                </p>
              </div>

              <div className="border-t border-border-default/70 pt-xl">
                <p className="font-sora text-metadata-tag uppercase tracking-widest mb-md">
                  <span className="font-bold text-on-surface">Soma Labs</span>
                  <span className="text-on-surface-variant"> // the drills</span>
                </p>
                <p className="font-sora text-xl md:text-2xl text-on-surface leading-snug mb-md">
                  <strong>Soma Labs</strong> is where you find out whether you
                  actually know it.
                </p>
                <p>
                  Each lesson turns into a drill: a failing test, a function
                  you write, then a green check when your version behaves like
                  the real one. Reading about generics is easy. Writing them
                  until the test passes is the part that sticks. The drills
                  live at{" "}
                  <a
                    href="https://github.com/Essomero/soma-labs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline hover:opacity-80"
                  >
                    Soma Labs on GitHub
                  </a>
                  .
                </p>
              </div>

              <div className="border-t border-border-default/70 pt-xl">
                <p className="font-sora text-metadata-tag uppercase tracking-widest mb-md">
                  <span className="font-bold text-on-surface">Son</span>
                  <span className="text-on-surface-variant"> // the speech platform</span>
                </p>
                <p className="font-sora text-xl md:text-2xl text-on-surface leading-snug mb-md">
                  <strong>Son</strong> is its own thing. It&apos;s a personal
                  speech platform.
                </p>
                <p>
                  Pick a role, talk to it in the browser, and hear it answer,
                  with barge-in when you cut in. It reads anything you paste
                  out loud and saves the audio as MP3. It dictates your speech
                  straight into whatever box has the cursor. It tags a folder
                  of podcast episodes or an album in one pass. Speech-to-text
                  and text-to-speech are both swappable, from local models to
                  cloud ones, so the whole voice path can run on your machine.
                  Soma borrows it for one job: speaking your oral exam
                  questions. I bundled it here because that&apos;s a good use
                  case, not because either repo needs the other. The repo is{" "}
                  <a
                    href="https://github.com/Essomero/son"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline hover:opacity-80"
                  >
                    Son on GitHub
                  </a>
                  .
                </p>
              </div>
            </div>

            <p className="font-sora text-lg text-on-surface leading-snug mt-xxl">
              Three repos, one loop. Read it in Soma, drill it in Soma Labs,
              explain it to Son. When all three feel easy, you know it.
            </p>
          </div>
        </article>
      </section>

      {/* Comments */}
      <div className="print:hidden">
      <Comments storySlug={STORY_SLUG} storyContext={{ title: "AI-accelerated learning you own", body: storyText }} refreshSignal={commentsRefresh} />
      </div>

      <InlineHighlights
        slug={STORY_SLUG}
        storyText={storyText}
        storyTitle="AI-accelerated learning you own"
        articleRef={articleRef}
        isOwner={isOwner}
        onHighlightsChange={(hs) => { setPageHighlights(hs); setCommentsRefresh((n: number) => n + 1); }}
        highlightClickRef={highlightClickRef}
        selectionAi
      />
      <StaticHighlightPaint
        containerRef={articleRef}
        highlights={pageHighlights}
        onOpen={(id) => highlightClickRef.current(id)}
      />

      {/* More Stories */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant print:hidden">
        <div className="flex justify-between items-end mb-xl">
          <div>
            <AccentBar variant="editorial" className="mb-md" />
            <h2 className="font-sora text-headline-md text-on-surface">
              More Stories
            </h2>
          </div>
          <Link
            to="/stories"
            className="font-sora text-metadata-tag text-primary hover:underline"
          >
            VIEW ALL STORIES
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {somaMoreStories.map((story) => (
            <ArticleCard key={story.id} article={story} />
          ))}
        </div>
      </section>
    </div>
  );
}
