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
import {
  somaAuthor,
  somaBentoHighlights,
  somaPullQuotes,
  somaMoreStories,
} from "@/content/registry";
import { whyIBuiltSoma } from "@/content/featured/why-i-built-soma";

const STORY_SLUG = "why-i-built-soma";

export default function FeaturedArticlePage() {
  const { isOwner } = useAuth();
  const articleRef = useRef<HTMLElement>(null);
  const highlightClickRef = useRef<(id: number) => void>(() => {});
  const [pageHighlights, setPageHighlights] = useState<HighlightData[]>([]);
  const [commentsRefresh, setCommentsRefresh] = useState(0);
  const storyText = [
    whyIBuiltSoma.description,
    ...(whyIBuiltSoma.sections || []).flatMap((s) => [s.heading, ...(s.paragraphs || []).filter((p): p is string => typeof p === "string")]),
  ].join(" ");
  return (
    <div>
      {/* Immersive Hero */}
      <ImmersiveHero
        tag="FEATURED ARTICLE // SOMA"
        title="Think on paper, but digital: why I built Soma"
        description="Most tools force a trade: publish before you understand, or understand in a silo nobody can see. I built Soma so learning and publishing live in the same place, on infrastructure you own."
        author={somaAuthor}
        date="October 24, 2026"
        image="https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=675&fit=crop"
        imageAlt="Benjamin Mayanja"
      />

      {/* Article Content */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant grid grid-cols-1 md:grid-cols-12 gap-giant">
        {/* Sidebar */}
        <aside className="md:col-span-3 space-y-xl border-t border-border-default pt-xl md:pt-0">
          <SidebarAbout publicToggleSlug={isOwner ? STORY_SLUG : undefined} />
          <div className="hidden md:block">
            <ShareButtons variant="column" markdownContent={contentToMarkdown({ title: whyIBuiltSoma.title, intro: whyIBuiltSoma.description, sections: whyIBuiltSoma.sections })} />
          </div>
          <div className="hidden md:block">
            <PrintButton stretch label="Print / Save PDF" />
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

          <div className="font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl space-y-md">
            <h2 className="font-sora text-article-title text-on-surface pt-lg pb-md">
              Learn it, prove it, publish it
            </h2>
            <p>
              Learning here is something you do, not something you consume.
              Select any paragraph and ask the margin AI to explain, challenge,
              or simplify it. Open the companion Soma Labs repo and run the
              drills with your own hands instead of copying code into a void.
            </p>
            <p>
              Then say it out loud. The Son voice agent reads diagnostic test
              questions to you and scores your spoken answers in real time,
              all from your own machine. And when the words are ready, any
              coding assistant can draft them as typed content and ship with
              a git push. If one reader prints a course, runs every lab, and
              passes an oral screen without ever touching someone else's
              server, Soma did its job.
            </p>
          </div>
        </article>
      </section>

      {/* Comments */}
      <Comments storySlug={STORY_SLUG} storyContext={{ title: "Think on paper, but digital: why I built Soma", body: storyText }} refreshSignal={commentsRefresh} />

      <InlineHighlights
        slug={STORY_SLUG}
        storyText={storyText}
        storyTitle="Think on paper, but digital: why I built Soma"
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
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant">
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
