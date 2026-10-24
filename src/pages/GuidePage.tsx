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
import {
  antonAuthor,
  guideToc,
  guideSections,
  guideTipCards,
  guideCodeBlock,
} from "@/content/registry";
import { generativeAi } from "@/content/guides/generative-ai";

const GUIDE_SLUG = "generative-ai";

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
  const storyText = [generativeAi.intro, ...(generativeAi.body || [])].join(" ");
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
              Harness the power of generative AI for software development
            </h1>
            <p className="font-dm-sans text-body-base text-on-surface-variant max-w-2xl text-xl">
              Tools like GitHub Copilot and ChatGPT can change the way you build
              software, from architecture to environment configuration to the
              code itself.
            </p>
          </div>
          <div className="lg:col-span-4 pb-sm flex lg:justify-end">
            <div className="flex flex-col gap-xs">
              <span className="font-sora text-metadata-tag uppercase tracking-widest text-on-surface-muted">
                Written By
              </span>
              <span className="font-sora text-label-caps text-on-surface">
                {antonAuthor.name}
              </span>
              <span className="font-sora text-metadata-tag text-on-surface-muted">
                {antonAuthor.title}
              </span>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        <div className="w-full aspect-[21/9] mb-giant overflow-hidden rounded-xl border border-border-default group">
          <img
            alt="Generative AI concept illustration"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&h=675&fit=crop"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          {/* Sidebar */}
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="sticky top-24 space-y-xl">
              <SidebarToc items={guideToc} />
              <AuthorBio author={antonAuthor} />
              <ShareButtons
                variant="row"
                className="px-sm"
                markdownContent={contentToMarkdown({
                  title: "Harness the power of generative AI for software development",
                  intro: "Across industries, large language models (LLMs), such as the ones powering tools like ChatGPT and GitHub Copilot, are automating tasks and revolutionizing the way we interact with both technology and one another.",
                  body: [
                    "## 01. Approximations of intelligence, nothing more",
                    "An LLM, like any other neural network, should be regarded primarily as complex mathematical objects.",
                    "## 02. Tips and tricks for effective LLM use",
                    "Minimize text inputs. Use domain terminology. Use the 'Act as' trick. Be deliberate with wording.",
                    "## 03. AI-assisted coding: lessons learned",
                    "Use ChatGPT for higher-level operations and GitHub Copilot for code generation.",
                    "## 04. The Expert requirement",
                    "Using AI tools effectively requires you to be an expert in the domain you're working in.",
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
                  Across industries, large language models (LLMs), such as the
                  ones powering tools like ChatGPT and GitHub Copilot, are
                  automating tasks and revolutionizing the way we interact with
                  both technology and one another. But despite their growing
                  prominence, LLMs are frequently misunderstood or misused,
                  leading to unrealistic expectations:and a certain
                  disenchantment when they're not met.
                </p>
              </div>

              {/* Section 1 */}
              <section className="mb-giant" id="section-1">
                <div className="flex items-center gap-md mb-xl">
                  <span className="font-sora text-[40px] font-extrabold text-border-default">
                    01
                  </span>
                  <h2 className="font-sora text-article-title text-on-surface">
                    Approximations of intelligence, nothing more
                  </h2>
                </div>
                <div className="space-y-md font-dm-sans text-body-base text-on-surface-variant leading-relaxed">
                  <p>
                    An LLM, like any other neural network, should be regarded
                    primarily as complex mathematical objects. Although there is a
                    strong association between AI and the human brain, it is a
                    misconception. Neural networks only mimic a small fraction of
                    the brain's processes:enough to achieve notable practical
                    results and successfully approximate real intelligence:but not
                    more.
                  </p>
                  <PullQuote
                    variant="border-left"
                    quote="In essence, LLMs provide a reasonable approximation of human language and knowledge, but their approximations aren't always optimal and they can still make significant errors."
                  />
                  <p>
                    As an end-user, you need to understand that LLMs aim to
                    accurately predict the correct output by taking into account
                    the context and meaning of the input. As the input's length
                    increases, it becomes more challenging to find connections
                    between words, leading to a decline in accuracy.
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
                    Tips and tricks for effective LLM use
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
                    AI-assisted coding: lessons learned
                  </h2>
                </div>
                <p className="font-dm-sans text-body-base text-on-surface-variant mb-xl leading-relaxed">
                  I recently conducted research on the effective use of AI for
                  creating quality code, published in an open source project
                  called User Country Analytics. My goal was to see if AI could
                  help me use Laravel and Redux effectively, as I had limited
                  prior knowledge.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                  <div className="space-y-md">
                    <h4 className="font-sora text-label-caps text-on-surface double-slash">
                      The Strategy
                    </h4>
                    <p className="font-dm-sans text-sm text-on-surface-muted">
                      Use ChatGPT for higher-level operations: task description,
                      breaking down tasks, complexity estimation, and
                      architectural templates.
                    </p>
                  </div>
                  <div className="space-y-md">
                    <h4 className="font-sora text-label-caps text-on-surface double-slash">
                      The Execution
                    </h4>
                    <p className="font-dm-sans text-sm text-on-surface-muted">
                      Use GitHub Copilot for the actual code generation. It
                      understands comments and individual nuances far better for
                      implementation.
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
                    The Expert requirement
                  </h2>
                </div>
                <div className="space-y-md font-dm-sans text-body-base text-on-surface-variant leading-relaxed">
                  <p>
                    Using AI tools effectively requires you to be an expert in
                    the domain you're working in. You need to understand what good
                    code looks like before you can judge whether the AI has
                    produced something correct.
                  </p>
                  <p>
                    The AI can accelerate your workflow dramatically, but it
                    cannot replace your judgment. The best results come from
                    treating AI as a powerful junior developer on your team:one
                    who works incredibly fast but needs careful code review.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </article>

      {/* Comments */}
      <Comments storySlug={GUIDE_SLUG} storyContext={{ title: generativeAi.title, body: storyText }} refreshSignal={commentsRefresh} />

      <InlineHighlights
        slug={GUIDE_SLUG}
        storyText={storyText}
        storyTitle={generativeAi.title}
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
