import { Link, useParams } from "react-router-dom";
import { useState, useRef } from "react";
import { Minus, Terminal, UserCheck, AlertTriangle, Lightbulb, Shield, Zap } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import Tag from "@/components/ui/Tag";
import PullQuote from "@/components/ui/PullQuote";
import TipCard from "@/components/ui/TipCard";
import ArticleCard from "@/components/cards/ArticleCard";
import BentoCard from "@/components/cards/BentoCard";
import SidebarToc from "@/components/sections/SidebarToc";
import AuthorBio from "@/components/sections/AuthorBio";
import ShareButtons from "@/components/ui/ShareButtons";
import Comments from "@/components/ui/Comments";
import NewsletterSignup from "@/components/ui/NewsletterSignup";
import ContentBlocks from "@/components/ui/ContentBlocks";
import InlineHighlights from "@/components/ui/InlineHighlights";
import PrintButton from "@/components/ui/PrintButton";
import { allGuides } from "@/content/registry";
import { useAuth } from "@/lib/AuthContext";
import { md, mdBlock, contentToMarkdown } from "@/lib/markdown";
import { type HighlightData } from "@/lib/highlights";

import type { BentoCardData, PullQuoteData } from "@/types";
import type { LucideIcon } from "lucide-react";

// Icon map for tip cards (matches generative-ai pattern)
const tipIcons: Record<string, LucideIcon> = {
  Minus, Terminal, UserCheck, AlertTriangle, Lightbulb, Shield, Zap,
};

const guideContent: Record<string, {
  intro: string;
  body: string[];
  bentoHighlights?: BentoCardData[];
  pullQuotes?: PullQuoteData[];
  references?: { title: string; url: string; description?: string }[];
  tipCards?: { icon: string; bgClass: string; iconColorClass: string; title: string; description: string }[];
}> = {
  "accessibility-bugs": {
    intro: "Drupal's community has long understood something crucial about accessibility: it's not a feature to be added later : it's a fundamental requirement that should be treated with the same urgency as any other bug. Mike Gifford, a long-time Drupal accessibility contributor, explains why this mindset shift matters for every open source project.",
    body: [
      "When accessibility issues are filed as bugs rather than feature requests, they enter the same workflow as any other defect. They get triaged, prioritized, and fixed alongside security vulnerabilities and performance regressions. This normalizes accessibility work and ensures it doesn't get perpetually deferred in favor of 'more important' items.",
      "Drupal's approach has produced measurable results. The project has consistently improved its accessibility compliance release over release, not through heroic efforts, but through systematic, incremental fixes. Each release includes dozens of accessibility improvements, many contributed by developers who aren't accessibility specialists.",
      "The key insight is that accessibility bugs are often simpler to fix than they appear. Missing alt text, insufficient color contrast, keyboard trap issues : these are specific, testable problems with clear solutions. Treating them as bugs makes them actionable rather than aspirational.",
      "For maintainers looking to adopt this approach, the first step is simple: add an accessibility template to your issue tracker. Make it easy for users to report problems and for contributors to find them. From there, prioritize accessibility bugs alongside your other work : because they are your other work.",
    ],
  },
  "custom-codeql": {
    intro:
      "CodeQL is GitHub's semantic code analysis engine. While the standard library covers thousands of vulnerabilities, the real power lies in writing custom queries tailored to your specific codebase or internal logic. In this guide, we'll walk through the fundamentals of creating and managing these queries effectively.",
    body: [
      "Every CodeQL query (.ql) consists of three main parts: imports, the query body (from-where-select), and metadata. The metadata defines the @id, @kind, and @name : essential for query results to show up in the GitHub UI. The select clause is the output statement that defines exactly what vulnerability or pattern you are reporting.",
      "Once your query is written, you need to compile it into a pack. Managing custom queries as CodeQL Packs allows for easy versioning and distribution across teams. Always include a qlpack.yml file in your directory to define dependencies and ensure the compiler knows which language to target.",
      "Don't just search for keywords; use the DataFlow or TaintTracking libraries to track how untrusted input moves through your application. The CodeQL extension for VS Code provides real-time AST visualization, which is invaluable for understanding how CodeQL sees your code structure.",
      "When testing complex queries, run them against a small sample database first to avoid long compilation times. Mastering custom CodeQL queries turns security from a reactive chore into a proactive, automated process. Start small, use the standard library as a reference, and build your specialized detection logic piece by piece.",
    ],
  },
  "self-hosted-runners": {
    intro: "GitHub Actions runners execute your CI/CD workflows. While GitHub-hosted runners offer convenience, self-hosted runners give you control over hardware, networking, and tooling that can dramatically improve build performance and reduce costs.",
    body: [
      "The primary motivation for self-hosted runners is often cost. For teams running hundreds or thousands of workflow jobs per day, the per-minute pricing of GitHub-hosted runners can add up. Self-hosted runners, running on your own infrastructure, can reduce CI costs by 50-80%.",
      "Performance is another key factor. Self-hosted runners can be provisioned with exactly the resources your builds need : more CPU, more memory, faster disks, GPU access. You can also cache dependencies and Docker layers persistently, eliminating the cold-start penalty of hosted runners.",
      "Security considerations cut both ways. Self-hosted runners give you complete control over the execution environment, which can satisfy compliance requirements. But they also require you to manage that security yourself : patching the OS, rotating credentials, and ensuring runner isolation between workflows.",
    ],
  },
  "terraform-infrastructure": {
    intro: "Infrastructure as Code (IaC) has transformed how teams manage cloud resources. Terraform, combined with GitHub Actions, provides a powerful pipeline for provisioning, updating, and maintaining infrastructure at any scale : from startup to enterprise.",
    body: [
      "The key to scaling IaC is treating your infrastructure configurations with the same rigor as application code. This means version control, code review, automated testing, and CI/CD pipelines : all practices that GitHub and Terraform support natively.",
      "A typical workflow starts with a pull request that proposes infrastructure changes. GitHub Actions runs Terraform plan to preview the changes, and reviewers can see exactly what will be created, modified, or destroyed. Once approved, Terraform apply executes the changes automatically.",
      "For larger teams, the pattern of 'infrastructure as code review' becomes essential. Just as you wouldn't merge application code without review, infrastructure changes deserve the same scrutiny. This catches misconfigurations early and spreads knowledge across the team.",
    ],
  },
  "developer-resume": {
    intro: "In an era where AI screening tools and automated systems increasingly filter job applications, crafting a developer resume that stands out requires understanding both the human reader and the machine parser. The good news: the same qualities that make you a great developer can make your resume exceptional.",
    body: [
      "The most effective developer resumes focus on impact rather than responsibilities. Instead of listing 'maintained CI/CD pipelines,' write 'reduced deployment time by 60% through automated CI/CD pipeline optimization.' Quantifiable results speak louder than titles.",
      "Open source contributions deserve prominent placement. A strong GitHub contribution graph, well-documented projects, and meaningful pull requests to established projects demonstrate collaboration, code quality, and communication skills : often more effectively than a list of previous job titles.",
      "In the age of AI screening, keywords matter but authenticity matters more. Use industry-standard terminology naturally, but don't stuff your resume with buzzwords. AI systems are increasingly sophisticated at detecting keyword manipulation, and human reviewers can spot it instantly.",
    ],
  },
  "project-governance": {
    intro: "Sustainable open source projects don't happen by accident. They require intentional governance : clear decision-making processes, contribution guidelines, and succession planning. Nadia Eghbal's research on open source sustainability provides a framework for projects of any size.",
    body: [
      "The single most important governance decision is defining who makes decisions and how. For small projects, a BDFL (Benevolent Dictator For Life) model can work well. As projects grow, moving to a steering committee or technical oversight board spreads responsibility and prevents burnout.",
      "Contribution guidelines are your project's handshake with the community. Clear documentation about how to report bugs, propose features, and submit code reduces friction for new contributors and sets expectations for response times and review processes.",
      "Succession planning is often overlooked but critically important. Every maintainer will eventually step back. Having documented processes, multiple maintainers, and a clear path to leadership ensures the project survives any individual's departure.",
    ],
  },
  "supply-chain-sbom": {
    intro: "Software supply chain security has emerged as one of the most critical challenges in modern development. An SBOM (Software Bill of Materials) provides a comprehensive inventory of your software's components, dependencies, and their provenance : essential knowledge for vulnerability management.",
    body: [
      "The executive order on cybersecurity and initiatives like OpenSSF have made SBOMs a requirement for government software procurement. But even for private sector projects, maintaining an accurate SBOM is a security best practice that pays dividends when the next Log4j-level vulnerability emerges.",
      "Generating an SBOM can be as simple as adding a step to your CI/CD pipeline. Tools like Syft, CycloneDX, and GitHub's dependency graph can automatically produce SBOMs in standard formats. The challenge is not generation but maintenance : keeping the SBOM accurate as dependencies evolve.",
      "Beyond compliance, SBOMs enable proactive security. When a CVE is published, teams with accurate SBOMs can immediately identify affected systems rather than scrambling to audit every project. This turns security response from days of investigation into minutes of targeted action.",
    ],
  },
};

export default function GuideContentPage() {
  const { slug } = useParams<{ slug: string }>();
  const guide = allGuides.find((g) => g.href === `/guides/${slug}`);
  const content = slug ? (guideContent[slug] ?? guide ?? null) : null;

  if (!guide) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <h1 className="font-sora text-headline-md text-on-surface mb-md">Guide Not Found</h1>
        <p className="text-on-surface-muted mb-xl">The guide you're looking for doesn't exist yet.</p>
        <Link to="/guides" className="text-primary hover:underline font-bold">
          ← Browse all guides
        </Link>
      </div>
    );
  }

  const { isOwner } = useAuth();
  const otherGuides = allGuides.filter((g) => g.id !== guide.id).slice(0, 3);
  const articleRef = useRef<HTMLElement>(null);
  const [highlights, setHighlights] = useState<HighlightData[]>([]);
  const highlightClickRef = useRef<(id: number) => void>(() => {});
  const storyText = [content?.intro || "", ...(content?.body || [])].join(" ");

  // Extract TOC from ## headings only, preserving their numbers
  const tocItems = (content?.body || [])
    .filter((p) => /^##\s/.test(p.trim()))
    .map((p) => {
      const match = p.trim().match(/^##\s+(.+)$/);
      if (!match) return null;
      const rawTitle = match[1];
      const anchor = rawTitle.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
      // Extract section number from "01. Title" pattern
      const numMatch = rawTitle.match(/^(\d{1,2})\.\s+(.+)$/);
      const num = numMatch ? numMatch[1].padStart(2, "0") : "";
      const title = numMatch ? numMatch[2] : rawTitle;
      return { number: num, title, href: `#${anchor}` };
    })
    .filter(Boolean) as { number: string; title: string; href: string }[];

  return (
    <div className="pt-32 pb-giant">
      <article ref={articleRef} className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
        {/* Hero Header : matches generative-ai layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-end mb-giant">
          <div className="lg:col-span-8">
            <AccentBar variant="small" className="mb-md" />
            <Tag variant="primary" className="mb-sm block">{guide.category}</Tag>
            <h1 className="font-sora text-headline-md text-on-surface mb-md max-w-4xl">
              {guide.title}
            </h1>
            <p className="font-dm-sans text-body-base text-on-surface-variant max-w-2xl text-xl" dangerouslySetInnerHTML={{ __html: md(guide.excerpt) }} />
          </div>
          <div className="lg:col-span-4 pb-sm flex lg:justify-end">
            <div className="flex flex-col gap-xs">
              <span className="font-sora text-metadata-tag uppercase tracking-widest text-on-surface-muted">
                Written By
              </span>
              <span className="font-sora text-label-caps text-on-surface">
                {guide.author?.name || "Soma"}
              </span>
              {guide.author?.title && (
                <span className="font-sora text-metadata-tag text-on-surface-muted">
                  {guide.author.title}
                </span>
              )}
              <div className="mt-sm">
                <PrintButton to={`/guides/${slug}/print`} compact />
              </div>
            </div>
          </div>
        </div>

        {/* Featured Image : wide 21:9, matches generative-ai */}
        <div className="w-full aspect-[21/9] mb-giant overflow-hidden rounded-xl border border-border-default group">
          <img
            alt={guide.imageAlt}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            src={guide.image}
          />
        </div>

        {/* Content Grid : 12-col with sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          {/* Sidebar : order-2 on mobile, order-1 on desktop */}
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="sticky top-24 space-y-xl">
              {tocItems.length > 0 && <SidebarToc items={tocItems} />}
              {guide.author && <AuthorBio author={guide.author} />}
              <ShareButtons
                variant="row"
                className="px-sm"
                markdownContent={content ? contentToMarkdown({
                  title: guide?.title || "",
                  intro: content.intro,
                  body: content.body,
                  references: content.references,
                }) : ""}
              />
            </div>
          </aside>

          {/* Main Content : order-1 on mobile, order-2 on desktop */}
          <div className="lg:col-span-9 order-1 lg:order-2">
            <div className="prose prose-invert max-w-none">
              {content ? (
                <>
                  {/* Intro */}
                  <div className="mb-giant">
                    <div
                      className="font-dm-sans text-lg lg:text-xl text-on-surface-variant leading-relaxed drop-cap-container space-y-md"
                      dangerouslySetInnerHTML={{ __html: mdBlock(content.intro) }}
                    />
                  </div>

                  {/* Tip Cards : like generative-ai tips section */}
                  {content.tipCards && content.tipCards.length > 0 && (
                    <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-md mb-giant">
                      {content.tipCards.map((tip) => {
                        const Icon = tipIcons[tip.icon];
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
                  )}

                  {/* Bento Highlights */}
                  {content.bentoHighlights && content.bentoHighlights.length > 0 && (
                    <div className="not-prose grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md my-giant">
                      {content.bentoHighlights.map((card) => (
                        <BentoCard key={card.title} card={card} />
                      ))}
                    </div>
                  )}

                  {/* Body with optional pull quote interleaving */}
                  {content.pullQuotes && content.pullQuotes.length > 0 ? (
                    (() => {
                      const chunks: string[][] = [];
                      const chunkSize = Math.ceil(content.body.length / (content.pullQuotes!.length + 1));
                      for (let i = 0; i < content.body.length; i += chunkSize) {
                        chunks.push(content.body.slice(i, i + chunkSize));
                      }
                      return chunks.map((chunk, i) => (
                        <div key={i}>
                          <ContentBlocks
                            blocks={chunk}
                            sectionIndex={i}
                            highlights={highlights}
                            onHighlightClick={(id) => highlightClickRef.current(id)}
                          />
                          {i < content.pullQuotes!.length && (
                            <PullQuote
                              variant={i === 0 ? "gradient-bar" : "border-left"}
                              quote={content.pullQuotes![i].quote}
                              attribution={content.pullQuotes![i].attribution}
                            />
                          )}
                        </div>
                      ));
                    })()
                  ) : (
                    <ContentBlocks
                      blocks={content.body}
                      highlights={highlights}
                      onHighlightClick={(id) => highlightClickRef.current(id)}
                    />
                  )}
                </>
              ) : (
                <div className="font-dm-sans text-body-base leading-loose text-on-surface space-y-lg">
                  <p className="text-xl text-on-surface-variant">
                    Full guide content coming soon. This guide covers essential techniques and best practices for modern software development.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* References */}
      {content?.references && content.references.length > 0 && (
        <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant">
          <h2 className="font-sora text-headline-md text-on-surface mb-xl">References</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md max-w-4xl">
            {content.references.map((ref, i) => (
              <a
                key={i}
                id={`ref-${i + 1}`}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-sm p-md bg-surface-container-low border border-border-default rounded-lg hover:border-primary/50 transition-colors group scroll-mt-32"
              >
                <span className="font-sora text-xs text-on-surface-muted flex-shrink-0 mt-0.5">{i + 1}.</span>
                <div>
                  <p className="font-sora text-sm text-on-surface group-hover:text-primary transition-colors">{ref.title}</p>
                  {ref.description && (
                    <p className="font-dm-sans text-xs text-on-surface-muted mt-xs" dangerouslySetInnerHTML={{ __html: md(ref.description) }} />
                  )}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Comments */}
      {slug && content && (
        <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant">
          <Comments
            storySlug={slug}
            storyContext={{ title: guide?.title || "", body: content?.intro + "\n\n" + content?.body.join("\n\n") }}
          />
        </section>
      )}

      {/* More Guides */}
      <section className="bg-surface-container-low py-giant border-t border-border-default">
        <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
          <div className="flex justify-between items-end mb-xxl">
            <div>
              <AccentBar variant="small" className="mb-md" />
              <h2 className="font-sora text-headline-md text-on-surface">More Guides</h2>
            </div>
            <Link to="/guides" className="font-sora text-metadata-tag uppercase tracking-widest text-primary hover:underline pb-2">
              View all guides
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {otherGuides.map((g) => (
              <ArticleCard key={g.id} article={g} variant="story" />
            ))}
          </div>
        </div>
      </section>

      <NewsletterSignup variant="subtle" />

      {slug && (
        <InlineHighlights
          slug={slug}
          storyText={storyText}
          storyTitle={guide?.title || ""}
          articleRef={articleRef}
          isOwner={isOwner}
          onHighlightsChange={setHighlights}
          highlightClickRef={highlightClickRef}
        />
      )}
    </div>
  );
}
