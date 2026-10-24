import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import ImmersiveHero from "@/components/sections/ImmersiveHero";
import SidebarAbout from "@/components/sections/SidebarAbout";
import ShareButtons from "@/components/ui/ShareButtons";
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
  shapesAuthor,
  shapesBentoHighlights,
  shapesPullQuotes,
  shapesMoreStories,
} from "@/content/registry";
import { structuralTyping } from "@/content/featured/structural-typing";

const STORY_SLUG = "structural-typing";

export default function FeaturedArticlePage() {
  const { isOwner } = useAuth();
  const articleRef = useRef<HTMLElement>(null);
  const highlightClickRef = useRef<(id: number) => void>(() => {});
  const [pageHighlights, setPageHighlights] = useState<HighlightData[]>([]);
  const [commentsRefresh, setCommentsRefresh] = useState(0);
  const storyText = [
    structuralTyping.description,
    ...(structuralTyping.sections || []).flatMap((s) => [s.heading, ...(s.paragraphs || []).filter((p): p is string => typeof p === "string")]),
  ].join(" ");
  return (
    <div>
      {/* Immersive Hero */}
      <ImmersiveHero
        tag="FEATURED ARTICLE // TYPESCRIPT"
        title="Why does this type error? Shapes, not names"
        description="TypeScript rejects objects that look perfectly fine. The compiler is not being difficult: it checks shapes instead of names, and fresh literals get checked harder than variables."
        author={shapesAuthor}
        date="October 24, 2026"
        image="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=675&fit=crop"
        imageAlt="Code editor displaying a compile error overlay on a monitor"
      />

      {/* Article Content */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant grid grid-cols-1 md:grid-cols-12 gap-giant">
        {/* Sidebar */}
        <aside className="md:col-span-3 space-y-xl border-t border-border-default pt-xl md:border-t-0 md:pt-0">
          <SidebarAbout publicToggleSlug={isOwner ? STORY_SLUG : undefined} />
          <div className="hidden md:block">
            <ShareButtons variant="column" />
          </div>
          <div className="hidden md:block">
            <PrintButton stretch label="Print / Save PDF" />
          </div>
        </aside>

        {/* Main Body */}
        <article ref={articleRef} data-section-index={0} data-paragraph-index={0} className="md:col-span-8 space-y-xl">
          <div className="font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl space-y-md">
            <p className="drop-cap">
              You write an object that carries every property a function needs,
              plus one extra field, and TypeScript draws a red squiggle: object
              literal may only specify known properties. Your frustration is
              reasonable. The function would ignore the extra field at runtime,
              so why fail the build?
            </p>
            <p>
              Now store that exact same object in a variable first, and pass the
              variable instead. Zero errors. Same data, same function, different
              verdict. Most developers meet TypeScript as an obstacle course of
              red squiggles and reach for a hammer like `as any` to make them
              vanish.
            </p>
            <p>
              But the checker runs on one simple physical rule. Learn it, and
              the red lines stop reading like noise. They start reading like a
              blueprint.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md my-giant">
            {shapesBentoHighlights.map((card) => (
              <BentoCard key={card.title} card={card} />
            ))}
          </div>

          {/* Pull Quote 1 */}
          <PullQuote
            variant="gradient-bar"
            quote={shapesPullQuotes[0].quote}
            attribution={shapesPullQuotes[0].attribution}
          />

          <div className="font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl space-y-md">
            <h2 className="font-sora text-article-title text-on-surface pt-lg pb-md">
              The backpack test
            </h2>
            <p>
              In nominal languages like Java or C#, types work like birth
              certificates. A function that asks for a Customer rejects a User
              with identical fields, because the names differ. TypeScript is
              structural. If a mountain guide says your backpack must contain
              water and a compass, they do not check the brand. Water, compass,
              plus a bag of trail mix, and you are on the trail.
            </p>
            <p>
              Fresh literals get the extra check because of typos. Write an
              object inline with a misspelled field and you almost certainly
              meant the real one. TypeScript stops you at the counter: did you
              really mean to put this here? Variables skip that check because
              they already exist somewhere else.
            </p>
          </div>

          {/* Pull Quote 2 */}
          <PullQuote
            variant="border-left"
            quote={shapesPullQuotes[1].quote}
          />

          <div className="font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl space-y-md">
            <h2 className="font-sora text-article-title text-on-surface pt-lg pb-md">
              Read the error backwards
            </h2>
            <p>
              Almost every compiler message belongs to one of a few simple
              situations. A type is not assignable means the hole expects one
              shape and you brought a different one. An excess property on a
              fresh literal means a typo or an interface missing a field you
              actually need.
            </p>
            <p>
              Always read the message backwards. Look at the very end to see
              what the function asked for, then look at the beginning to see
              what you handed it. Then ask the only question that matters: is
              the data wrong, or is the type out of date? And never reach for
              `as` or `any` to end the conversation. That does not fix the bug.
              It only tapes over the warning light.
            </p>
          </div>
        </article>
      </section>

      {/* Comments */}
      <Comments storySlug={STORY_SLUG} storyContext={{ title: "Why does this type error? Shapes, not names", body: storyText }} refreshSignal={commentsRefresh} />

      <InlineHighlights
        slug={STORY_SLUG}
        storyText={storyText}
        storyTitle="Why does this type error? Shapes, not names"
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
          {shapesMoreStories.map((story) => (
            <ArticleCard key={story.id} article={story} />
          ))}
        </div>
      </section>
    </div>
  );
}
