import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import ImmersiveHero from "@/components/sections/ImmersiveHero";
import SidebarAbout from "@/components/sections/SidebarAbout";
import ShareButtons from "@/components/ui/ShareButtons";
import BentoCard from "@/components/cards/BentoCard";
import PullQuote from "@/components/ui/PullQuote";
import PrintButton from "@/components/ui/PrintButton";
import ArticleCard from "@/components/cards/ArticleCard";
import NewsletterSignup from "@/components/ui/NewsletterSignup";
import AccentBar from "@/components/ui/AccentBar";
import InlineHighlights from "@/components/ui/InlineHighlights";
import StaticHighlightPaint from "@/components/ui/StaticHighlightPaint";
import type { HighlightData } from "@/lib/highlights";
import Comments from "@/components/ui/Comments";
import { PublicToggleButton, usePublicState } from "@/components/ui/PublicToggle";
import { useAuth } from "@/lib/AuthContext";
import {
  nvdaAuthor,
  nvdaBentoHighlights,
  nvdaPullQuotes,
  nvdaMoreStories,
} from "@/content/registry";
import { nvdaAccessibility } from "@/content/featured/nvda-accessibility";

const STORY_SLUG = "nvda-accessibility";

export default function FeaturedArticlePage() {
  const { isOwner } = useAuth();
  const articleRef = useRef<HTMLElement>(null);
  const highlightClickRef = useRef<(id: number) => void>(() => {});
  const [pageHighlights, setPageHighlights] = useState<HighlightData[]>([]);
  const [commentsRefresh, setCommentsRefresh] = useState(0);
  const { isPublic, toggle } = usePublicState(STORY_SLUG);
  const storyText = [
    nvdaAccessibility.description,
    ...(nvdaAccessibility.sections || []).flatMap((s) => [s.heading, ...(s.paragraphs || []).filter((p): p is string => typeof p === "string")]),
  ].join(" ");
  return (
    <div>
      {/* Immersive Hero */}
      <ImmersiveHero
        tag="FEATURED ARTICLE // ACCESSIBILITY"
        title="Coding accessibility: Software by the blind, for the blind"
        description="The NVDA screen reader has helped empower a new generation of blind and low-vision developers."
        author={nvdaAuthor}
        date="May 16, 2024"
        image="https://images.unsplash.com/photo-1634944902853-3e977c2de8b6?w=1200&h=675&fit=crop"
        imageAlt="A cinematic, vibrant editorial illustration for a technology article"
      />

      {/* Article Content */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant grid grid-cols-1 md:grid-cols-12 gap-giant">
        {/* Sidebar */}
        <aside className="md:col-span-3 space-y-xl border-t border-border-default pt-xl md:border-t-0 md:pt-0">
          <SidebarAbout />
          <div className="hidden md:block">
            <ShareButtons variant="column" />
          </div>
          <div className="hidden md:block">
            <PrintButton compact label="Print / Save PDF" className="w-full justify-center" />
            {isOwner && (
              <div className="mt-md">
                <PublicToggleButton isPublic={isPublic} onToggle={toggle} />
              </div>
            )}
          </div>
        </aside>

        {/* Main Body */}
        <article ref={articleRef} data-section-index={0} data-paragraph-index={0} className="md:col-span-8 space-y-xl">
          <div className="font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl space-y-md">
            <p className="drop-cap">
              A lot of what Derek Riemer needed to know to become a professional
              software developer, he learned during his years involved with the
              NVDA (NonVisual Desktop Access) project, an open source screen
              reader for Microsoft Windows.
            </p>
            <p>
              Like most of those involved with NVDA and its development, Riemer
              is blind. He found NVDA in 2011, while still in high school, when
              he was looking for a free alternative to his proprietary screen
              reader. He quickly became involved in the community, taught himself
              to code, and offered support where he could.
            </p>
            <p>
              By 2013, he'd written his first NVDA add-on, and he's since
              written 20 more and contributed code to NVDA itself. Today, Riemer
              works as a software engineer at Google.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md my-giant">
            {nvdaBentoHighlights.map((card) => (
              <BentoCard key={card.title} card={card} />
            ))}
          </div>

          {/* Pull Quote 1 */}
          <PullQuote
            variant="gradient-bar"
            quote={nvdaPullQuotes[0].quote}
            attribution={nvdaPullQuotes[0].attribution}
          />

          <div className="font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl space-y-md">
            <h2 className="font-sora text-article-title text-on-surface pt-lg pb-md">
              Software by the blind, for the blind
            </h2>
            <p>
              The NVDA screen reader gives blind and low-vision people access to
              fundamentals like education and employment, as well as everyday
              functions such as online banking, shopping, and getting the news.
              The overwhelming majority of people who build and translate NVDA
              are blind or low-vision themselves, and Riemer says this is key.
            </p>
            <p>
              "A product built by the community, for the community, is better
              than one built by some company, simply because the community is in
              charge of what goes into it," says Riemer. "I can build an add-on
              when I need something and don't need to wait for some company to
              choose to actually fix the issue for me."
            </p>
          </div>

          {/* Pull Quote 2 */}
          <PullQuote
            variant="border-left"
            quote={nvdaPullQuotes[1].quote}
          />

          <div className="font-dm-sans text-body-base text-on-surface leading-relaxed max-w-3xl space-y-md">
            <h2 className="font-sora text-article-title text-on-surface pt-lg pb-md">
              Community amplification
            </h2>
            <p>
              Community plays a big role for both OSARA and NVDA, and Teh says
              that's on purpose. "It was really important to us that we foster a
              healthy, open, well-functioning, and friendly community," he says.
            </p>
            <p>
              If you follow these communities one step further, you'll quickly
              find things like the Eyes On Success podcast, which Peter Torpey
              produces with his wife Nancy using OSARA. They discuss "products,
              services, and daily living tips for people with vision loss,"
              empowering others to empower themselves:and the cycle continues.
            </p>
          </div>
        </article>
      </section>

      {/* Comments */}
      <Comments storySlug={STORY_SLUG} storyContext={{ title: "Coding accessibility: Software by the blind, for the blind", body: storyText }} refreshSignal={commentsRefresh} />

      <InlineHighlights
        slug={STORY_SLUG}
        storyText={storyText}
        storyTitle="Coding accessibility: Software by the blind, for the blind"
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

      {/* Newsletter CTA - Brand variant */}
      <NewsletterSignup variant="brand" />

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
          {nvdaMoreStories.map((story) => (
            <ArticleCard key={story.id} article={story} />
          ))}
        </div>
      </section>
    </div>
  );
}
