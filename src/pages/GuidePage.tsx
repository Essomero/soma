import { useRef, useState } from "react";
import { Minus, Terminal, UserCheck, AlertTriangle } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import Tag from "@/components/ui/Tag";
import SidebarToc from "@/components/sections/SidebarToc";
import AuthorBio from "@/components/sections/AuthorBio";
import ShareButtons from "@/components/ui/ShareButtons";
import { contentToMarkdown } from "@/lib/markdown";
import TipCard from "@/components/ui/TipCard";
import CodeBlock from "@/components/ui/CodeBlock";
import PullQuote from "@/components/ui/PullQuote";
import PrintButton from "@/components/ui/PrintButton";
import InlineHighlights from "@/components/ui/InlineHighlights";
import StaticHighlightPaint from "@/components/ui/StaticHighlightPaint";
import type { HighlightData } from "@/lib/highlights";
import Comments from "@/components/ui/Comments";
import { PublicToggleButton, usePublicState } from "@/components/ui/PublicToggle";
import { useAuth } from "@/lib/AuthContext";
import { useContentItem } from "@/lib/content";
import type { GuideContent, Author, TocItem, TipCardData } from "@/types";

const GUIDE_SLUG = "ship-soma";

// Bespoke layout config for this static page (not prose content).
const guideAuthor: Author = {
  name: "Benjamin Mayanja", title: "Founder, Soma",
  bio: "Benjamin builds Soma, a personal learning and publishing platform that runs entirely on infrastructure you own. He writes about sovereign software, TypeScript, and learning you can prove.",
};

const guideToc: TocItem[] = [
  { number: "01", title: "Fork your copy, import it into Vercel", href: "#section-1" },
  { number: "02", title: "One password plus the Turso card", href: "#section-2" },
  { number: "03", title: "Deploy, then stay updated forever", href: "#section-3" },
  { number: "04", title: "Optional: add AI keys and publish with agents", href: "#section-4" },
];

const guideTipCards: TipCardData[] = [
  { icon: "AlertTriangle", bgClass: "bg-error-container/20", iconColorClass: "text-error", title: "Set the password before you deploy", description: "Deploying without SITE_PASSWORD breaks login and forces a redeploy to fix. Add it on the Vercel configure page first." },
  { icon: "Terminal", bgClass: "bg-secondary/20", iconColorClass: "text-secondary", title: "Keep VITE_ vars local", description: "Local-only keys stay in .env.local. Baking them into Vercel would ship your database token inside public JavaScript." },
  { icon: "Minus", bgClass: "bg-primary-container/20", iconColorClass: "text-primary", title: "One toggle publishes", description: "Notes are private by default. Flip the lock/globe toggle and the same page is public. There is no migration step." },
  { icon: "UserCheck", bgClass: "bg-tertiary-container/20", iconColorClass: "text-tertiary", title: "New work means new slugs", description: "Agents publish by adding new files under src/content/ with new slugs. Writing in your database is already safe from updates." },
];

const guideCodeBlock = {
  filename: ".env.local",
  lines: [
    { number: "01", content: "SITE_PASSWORD=your-secure-site-password" },
    { number: "02", content: "TURSO_DATABASE_URL=libsql://your-db.turso.io" },
    { number: "03", content: "TURSO_AUTH_TOKEN=your-turso-token" },
  ],
};

import type { LucideIcon } from "lucide-react";

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Minus,
  Terminal,
  UserCheck,
  AlertTriangle,
};

export default function GuidePage() {
  const { isOwner } = useAuth();
  const articleRef = useRef<HTMLElement>(null);
  const highlightClickRef = useRef<(id: number) => void>(() => {});
  const [pageHighlights, setPageHighlights] = useState<HighlightData[]>([]);
  const [commentsRefresh, setCommentsRefresh] = useState(0);
  const { isPublic, toggle } = usePublicState(GUIDE_SLUG);
  const { data: guideRow } = useContentItem<GuideContent>("guide", GUIDE_SLUG);
  const guideTitle = typeof guideRow?.title === "string" ? guideRow.title : "";
  const guideIntro = typeof guideRow?.intro === "string" ? guideRow.intro : "";
  const guideBody = Array.isArray(guideRow?.body) ? (guideRow.body as string[]) : [];
  const storyText = [guideIntro, ...guideBody].join(" ");
  return (
    <div className="pt-32 pb-giant">
      <article ref={articleRef} data-section-index={0} data-paragraph-index={0} className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
        {/* Hero Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-end mb-giant">
          <div className="lg:col-span-8">
            <AccentBar variant="small" className="mb-md" />
            <Tag variant="primary" className="mb-sm block">
              Technical Guide
            </Tag>
            <h1 className="font-sora text-headline-md text-on-surface mb-md max-w-4xl">
              Ship Soma on your own infrastructure in minutes
            </h1>
            <p className="font-dm-sans text-body-base text-on-surface-variant max-w-2xl text-xl">
              Three moves: fork the repo, import it into Vercel, add one
              password, click Add on the Turso card, deploy. Your notes live in
              your database, never in git.
            </p>
          </div>
          <div className="lg:col-span-4 pb-sm flex lg:justify-end">
            <div className="flex flex-col gap-xs">
              <span className="font-sora text-metadata-tag uppercase tracking-widest text-on-surface-muted">
                Written By
              </span>
              <span className="font-sora text-label-caps text-on-surface">
                {guideAuthor.name}
              </span>
              <span className="font-sora text-metadata-tag text-on-surface-muted">
                {guideAuthor.title}
              </span>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="w-full aspect-[21/9] mb-giant overflow-hidden rounded-xl border border-border-default group">
          <img
            alt="Server racks in a data center"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=675&fit=crop"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          {/* Sidebar */}
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="sticky top-24 space-y-xl">
              <SidebarToc items={guideToc} />
              <AuthorBio author={guideAuthor} />
              <ShareButtons
                variant="row"
                className="px-sm"
                markdownContent={contentToMarkdown({
                  title: "Ship Soma on your own infrastructure in minutes",
                  intro: "Three moves get you deployed: fork the repo, import it into Vercel with one password, and add the Turso card. Your notes live in your database, never in git.",
                  body: [
                    "## 01. Fork your copy, import it into Vercel",
                    "Fork Essomero/soma, import it into Vercel, and add SITE_PASSWORD before you press Deploy.",
                    "## 02. One password plus the Turso card",
                    "Set the password first, never bake VITE_ vars into Vercel, and let the Turso card inject your database credentials.",
                    "## 03. Deploy, then stay updated forever",
                    "Tables self-create on first request. Sync your fork to pull updates; your database writing is never touched.",
                    "## 04. Optional: add AI keys and publish with agents",
                    "Add a provider key for margin AI, and let any coding assistant draft typed content and ship it with a git push.",
                  ],
                })}
              />
              <PrintButton compact label="Print / Save PDF" />
              {isOwner && (
                <div className="px-sm">
                  <PublicToggleButton isPublic={isPublic} onToggle={toggle} />
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-9 order-1 lg:order-2">
            <div className="prose prose-invert max-w-none">
              {/* Intro */}
              <div className="mb-giant">
                <p className="font-dm-sans text-lg lg:text-xl text-on-surface-variant leading-relaxed drop-cap">
                  Soma runs entirely on infrastructure you own: a Vercel project
                  for hosting, a Turso database for your writing, and one
                  password that gates your studio. Three moves get you deployed,
                  and because your notes live in your database instead of git,
                  pulling my updates later never touches your words.
                </p>
              </div>

              {/* Section 1 */}
              <section className="mb-giant" id="section-1">
                <div className="flex items-center gap-md mb-xl">
                  <span className="font-sora text-[40px] font-extrabold text-border-default">
                    01
                  </span>
                  <h2 className="font-sora text-article-title text-on-surface">
                    Fork your copy, import it into Vercel
                  </h2>
                </div>
                <div className="space-y-md font-dm-sans text-body-base text-on-surface-variant leading-relaxed">
                  <p>
                    Start with your own copy. Fork Essomero/soma on GitHub and
                    accept the defaults. This fork is yours: agents publish by
                    adding files to it, and it stays linked for one-click
                    updates later. No git commands needed for any of this.
                  </p>
                  <PullQuote
                    variant="border-left"
                    quote="Three moves: fork, import, deploy. Your notes live in your database, never in git."
                  />
                  <p>
                    Next, open Vercel and Add New Project, then Import your soma
                    fork. On the configure page, open Environment Variables and
                    add one variable: SITE_PASSWORD, any strong string you
                    invent. Do this before pressing Deploy. Deploying without
                    it breaks login and forces a redeploy to fix.
                  </p>
                </div>
              </section>

              <hr className="border-border-default mb-giant" />

              {/* Section 2: Tips */}
              <section className="mb-giant" id="section-2">
                <div className="flex items-center gap-md mb-xl">
                  <span className="font-sora text-[40px] font-extrabold text-border-default">
                    02
                  </span>
                  <h2 className="font-sora text-article-title text-on-surface">
                    One password plus the Turso card
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {guideTipCards.map((tip) => {
                    const Icon = iconMap[tip.icon];
                    return Icon ? (
                      <TipCard
                        key={tip.title}
                        icon={Icon}
                        title={tip.title}
                        description={tip.description}
                        bgClass={tip.bgClass}
                        iconColorClass={tip.iconColorClass}
                      />
                    ) : null;
                  })}
                </div>
              </section>

              {/* Code Block */}
              <CodeBlock
                filename={guideCodeBlock.filename}
                lines={guideCodeBlock.lines}
              />

              {/* Section 3 */}
              <section className="mb-giant" id="section-3">
                <div className="flex items-center gap-md mb-xl">
                  <span className="font-sora text-[40px] font-extrabold text-border-default">
                    03
                  </span>
                  <h2 className="font-sora text-article-title text-on-surface">
                    Deploy, then stay updated forever
                  </h2>
                </div>
                <p className="font-dm-sans text-body-base text-on-surface-variant mb-xl leading-relaxed">
                  Further down the Vercel configure page, under Optional
                  Integrations, click Add on the Turso card. Vercel provisions
                  the database and injects its URL and token into your project
                  on its own. Then press Deploy. Tables initialize automatically
                  on the first API request: no migrations, no SQL to run by
                  hand.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                  <div className="space-y-md">
                    <h4 className="font-sora text-label-caps text-on-surface double-slash">
                      The First Boot
                    </h4>
                    <p className="font-dm-sans text-sm text-on-surface-muted">
                      Open /learn, log in with your SITE_PASSWORD, and write
                      one note. The tables self-create on first use. Flip the
                      lock/globe toggle and check the page in a private window
                      to confirm public access.
                    </p>
                  </div>
                  <div className="space-y-md">
                    <h4 className="font-sora text-label-caps text-on-surface double-slash">
                      Every Update After
                    </h4>
                    <p className="font-dm-sans text-sm text-on-surface-muted">
                      When I ship fixes, open your fork on GitHub, click Sync
                      fork, then Update branch. Vercel redeploys on its own.
                      Keep your own pieces as new files with new slugs and
                      merges stay clean forever.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section className="mb-giant" id="section-4">
                <div className="flex items-center gap-md mb-xl">
                  <span className="font-sora text-[40px] font-extrabold text-border-default">
                    04
                  </span>
                  <h2 className="font-sora text-article-title text-on-surface">
                    Optional: add AI keys and publish with agents
                  </h2>
                </div>
                <div className="space-y-md font-dm-sans text-body-base text-on-surface-variant leading-relaxed">
                  <p>
                    To enable the inline margin AI, add one or more provider
                    keys in your Vercel project settings: OPENROUTER_API_KEY,
                    DEEPSEEK_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY. The
                    writing experience works fully without them; the AI buttons
                    simply stay quiet until a provider is configured.
                  </p>
                  <p>
                    When you want words on the site, ask any coding assistant
                    to draft typed TypeScript content under src/content/, run
                    the build, and push. Publishing is a git push, and the
                    site redeploys on its own.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </article>

      {/* Comments */}
      <Comments storySlug={GUIDE_SLUG} storyContext={{ title: guideTitle, body: storyText }} refreshSignal={commentsRefresh} />

      <InlineHighlights
        slug={GUIDE_SLUG}
        storyText={storyText}
        storyTitle={guideTitle}
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

    </div>
  );
}
