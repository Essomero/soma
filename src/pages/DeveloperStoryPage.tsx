import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Stars } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import ProfileOverview from "@/components/sections/ProfileOverview";
import ShareButtons from "@/components/ui/ShareButtons";
import PrintButton from "@/components/ui/PrintButton";
import PullQuote from "@/components/ui/PullQuote";
import StoryCard from "@/components/cards/StoryCard";
import InlineHighlights from "@/components/ui/InlineHighlights";
import StaticHighlightPaint from "@/components/ui/StaticHighlightPaint";
import type { HighlightData } from "@/lib/highlights";
import Comments from "@/components/ui/Comments";
import { PublicToggleButton, usePublicState } from "@/components/ui/PublicToggle";
import { useAuth } from "@/lib/AuthContext";
import { useContentItem, useContentList, toCard } from "@/lib/content";
import type { StoryContent } from "@/types";
import { md, contentToMarkdown } from "@/lib/markdown";

const STORY_SLUG = "benjamin-mayanja";

// Author-profile config for this bespoke page (not prose content).
const benjaminStory = {
  id: "benjamin-mayanja",
  title: "Think on paper, but digital: why I built Soma",
  description:
    "Most tools force a trade: publish before you understand, or understand in a silo nobody can see. I built Soma so learning and publishing live in the same place, on infrastructure you own.",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  location: "Kampala, Uganda",
  social: "@Essomero",
  website: "github.com/Essomero",
  organizations: ["Soma"],
};

export default function DeveloperStoryPage() {
  const { isOwner } = useAuth();
  const articleRef = useRef<HTMLElement>(null);
  const highlightClickRef = useRef<(id: number) => void>(() => {});
  const [pageHighlights, setPageHighlights] = useState<HighlightData[]>([]);
  const [commentsRefresh, setCommentsRefresh] = useState(0);
  const { isPublic, toggle } = usePublicState(STORY_SLUG);
  const { data: storyRow } = useContentItem<StoryContent>("story", STORY_SLUG);
  const { data: storyRows } = useContentList<StoryContent>("story");
  const intro = typeof storyRow?.intro === "string" ? storyRow.intro : "";
  const body = Array.isArray(storyRow?.body) ? (storyRow.body as string[]) : [];
  const storyText = [intro, ...body].join(" ");
  const moreStories = (storyRows ?? []).filter((s) => s.slug !== STORY_SLUG).slice(0, 3).map(toCard);
  return (
    <div>
      {/* Hero Section */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop pt-xxl mb-giant">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          <div className="md:col-span-8">
            <AccentBar variant="small" className="mb-md" />
            <h1 className="font-sora text-headline-md mb-md leading-tight text-on-surface">
              {benjaminStory.title}
            </h1>
            <p className="font-sora text-article-title text-on-surface-variant mb-xl" dangerouslySetInnerHTML={{ __html: md(benjaminStory.description) }} />
            <div className="flex items-center gap-sm font-sora text-metadata-tag text-primary uppercase tracking-widest mb-xxl">
              <span>{benjaminStory.author.name}</span>
              {benjaminStory.author.handle && (
                <>
                  <span className="text-on-surface-muted">//</span>
                  <span className="text-on-surface-muted">
                    {benjaminStory.author.handle}
                  </span>
                </>
              )}
            </div>
            {isOwner && (
              <div className="mb-xxl">
                <PublicToggleButton isPublic={isPublic} onToggle={toggle} />
              </div>
            )}
          </div>
        </div>

        {/* Profile Bar */}
        <ProfileOverview
          location={benjaminStory.location}
          social={benjaminStory.social}
          website={benjaminStory.website}
          organizations={benjaminStory.organizations}
        />
      </section>

      {/* Main Content */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop mb-giant">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          {/* Sidebar */}
          <aside className="hidden md:block md:col-span-3">
            <div className="sticky top-32 space-y-xl">
              <div className="p-lg bg-surface-container border border-border-default rounded-lg">
                <p className="font-dm-sans text-body-base italic text-on-surface-variant">
                  "Soma: AI-assisted deep research on technology, economics, philosophy, and beyond. A personal publishing platform for ideas that matter."
                </p>
              </div>
              <ShareButtons variant="small-circle" markdownContent={contentToMarkdown({ title: benjaminStory.title, intro, body })} />
              <PrintButton compact label="Print / Save PDF" />
            </div>
          </aside>

          {/* Article Body */}
          <article ref={articleRef} data-section-index={0} data-paragraph-index={0} className="md:col-span-8 md:col-start-5 space-y-xl">
            {/* Intro pullout */}
            <div className="p-xl bg-surface-container-low border-l-4 border-secondary">
              <p className="font-dm-sans text-xl md:text-2xl leading-relaxed text-on-surface">
                Hey, I am Benjamin Mayanja. I build Soma, an AI-native learning
                and publishing platform that treats reading like thinking on
                paper: private by default, public when you choose, and running
                entirely on infrastructure you own.
              </p>
            </div>

            <div className="space-y-lg font-dm-sans text-body-base leading-loose text-on-surface">
              <p>
                Every publishing tool I tried forced the same trade. Blogging
                platforms like Ghost and Substack push you to perform for an
                audience before you have understood the topic yourself.
                Note-taking apps like Notion and Obsidian keep your thinking
                trapped in proprietary clouds or fragile sync setups with
                clumsy export pipelines. You either publish too early or you
                never ship at all.
              </p>
              <p>
                So I stopped shopping for tools and started building one. Soma
                (Luganda: to read, study, learn) is a single place where the
                private notebook, the editorial reading experience, and the
                publish button live together. You draft in the open the way you
                would on paper, then flip one toggle and the same page is on
                the public web. Nothing to migrate, nothing to reformat.
              </p>
            </div>

            {/* Featured Image */}
            <figure className="my-xxl">
              <img
                alt="Notebook and pen beside a laptop, the paper-first workflow Soma is built around"
                className="w-full h-auto aspect-[1.67] object-cover rounded-lg border border-border-default"
                src="https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=675&fit=crop"
              />
              <figcaption className="mt-sm font-sora text-xs text-on-surface-muted italic">
                The paper-first workflow Soma is built around: draft in
                private, publish when ready.
              </figcaption>
            </figure>

            <h2 className="font-sora text-article-title pt-lg text-on-surface">
              Owning the loop
            </h2>
            <div className="space-y-lg font-dm-sans text-body-base leading-loose text-on-surface">
              <p>
                Owning the loop mattered more than any feature. Your notes,
                highlights, and publishing toggles live in your own Turso
                database, an edge SQLite you control, behind one password you
                invent. Fork the repo, import it into Vercel, add the password,
                click Add on the Turso card, deploy. There is no Soma cloud
                holding your writing hostage, which means pulling my updates
                later never touches your words.
              </p>
            </div>

            {/* Pull Quote */}
            <PullQuote
              variant="border-y"
              quote="Think in private on your own infrastructure, and make public what you wish."
              attribution="Benjamin Mayanja"
            />

            <div className="space-y-lg font-dm-sans text-body-base leading-loose text-on-surface">
              <p>
                Learning here is not passive reading. Select any paragraph to
                ask a margin AI to explain, challenge, or simplify it. Run
                hands-on drills in the companion Soma Labs repo instead of
                copying code into a void. Then prove you actually know it: the
                Son voice agent reads diagnostic test questions aloud and
                scores your spoken answers in real time, all from your own
                machine.
              </p>
              <p>
                Agents are first-class citizens too. Soma ships the same skills
                I write with, so any coding assistant can draft a course, a
                guide, or a story as typed TypeScript under src/content/, run
                the build, and open a pull request. Publishing becomes a git
                push, and the site redeploys on its own.
              </p>
            </div>

            <h2 className="font-sora text-article-title pt-lg text-on-surface">
              Learning you can prove
            </h2>
            <div className="space-y-lg font-dm-sans text-body-base leading-loose text-on-surface">
              <p>
                That is the whole bet: think in private on your own
                infrastructure, and make public what you wish. If one reader
                prints a course, runs every lab, and passes an oral screen
                without ever touching someone else's server, Soma did its job.
              </p>
            </div>

            {/* Visual Accent Block */}
            <div className="p-xl bg-surface-container border border-border-default rounded-xl relative overflow-hidden group hover:border-primary transition-all duration-300">
              <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary to-secondary" />
              <h3 className="font-sora text-xl mb-md text-on-surface">
                Think on paper, but digital
              </h3>
              <p className="font-dm-sans text-body-base text-on-surface-variant leading-relaxed">
                Soma combines the tactile focus of paper with sovereign edge
                infrastructure, in-app AI interaction, oral audio Q and A, and
                autonomous agent publishing. Learn anything at your pace, in
                your own infrastructure, and make public what you wish.
              </p>
              <div className="mt-lg flex items-center gap-md">
                <Stars className="w-5 h-5 text-secondary" />
                <span className="font-sora text-metadata-tag text-on-surface uppercase tracking-widest">
                  Founder // Soma
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* Comments */}
      <Comments storySlug={STORY_SLUG} storyContext={{ title: benjaminStory.title, body: storyText }} refreshSignal={commentsRefresh} />

      <InlineHighlights
        slug={STORY_SLUG}
        storyText={storyText}
        storyTitle={benjaminStory.title}
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
      <section className="bg-surface-container-low py-giant border-t border-border-default">
        <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
          <div className="flex justify-between items-end mb-xxl">
            <div>
              <AccentBar variant="small" className="mb-md" />
              <h2 className="font-sora text-headline-md text-on-surface">
                More Stories
              </h2>
            </div>
            <Link
              to="/stories"
              className="font-sora text-metadata-tag uppercase tracking-widest text-primary hover:underline pb-2"
            >
              View all articles
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {moreStories.map((story) => (
              <StoryCard key={story.id} article={story} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
