import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Clock, FileText, ArrowRight, Sparkles, CheckCircle2, BookOpen, Mic, Loader2 } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import Tag from "@/components/ui/Tag";
import { useContentList, sortContent } from "@/lib/content";
import type { SortKey } from "@/lib/content";
import SortControl from "@/components/ui/SortControl";
import type { TestContent } from "@/types";
import { getStoredAnswers, getStoredEvaluation } from "@/lib/testEvaluation";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function TestsIndexPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [testStatuses, setTestStatuses] = useState<
    Record<string, { answeredCount: number; hasEvaluation: boolean; evaluationModel?: string }>
  >({});
  const { data: tests, loading } = useContentList<TestContent>("test");
  const [sort, setSort] = useState<SortKey>("newest");
  const activeTests = (tests ?? []).filter((t) => !t.archived);
  usePageMeta({ title: "Tests", description: "Proof under time pressure: diagnostic screens with scored written and oral answers." });

  // Extract categories and add "Oral Exams" filter tab
  const rawCategories = Array.from(new Set(activeTests.map((t) => t.category)));
  const categories = ["All", "Oral Exams", ...rawCategories];

  const filteredTests = sortContent(
    selectedCategory === "All"
      ? activeTests
      : selectedCategory === "Oral Exams"
      ? activeTests.filter((t) => t.format === "oral")
      : activeTests.filter((t) => t.category === selectedCategory),
    sort,
  );

  useEffect(() => {
    // Check local storage for test progress
    const statuses: Record<string, { answeredCount: number; hasEvaluation: boolean; evaluationModel?: string }> = {};
    for (const test of activeTests) {
      const answers = getStoredAnswers(test.slug);
      const evalData = getStoredEvaluation(test.slug);
      const answeredCount = Object.values(answers).filter(
        (a) => (typeof a === "string" && a.trim().length > 0) || (Array.isArray(a) && a.length > 0),
      ).length;

      statuses[test.slug] = {
        answeredCount,
        hasEvaluation: Boolean(evalData),
        evaluationModel: evalData?.model,
      };
    }
    setTestStatuses(statuses);
  }, []);

  if (loading) {
    return (
      <div className="pt-32 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-on-surface-muted" />
      </div>
    );
  }

  return (
    <div>
      <main className="pt-32 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop">
        {/* Header */}
        <header className="mb-giant">
          <AccentBar variant="small" className="mb-md" />
          <p className="font-sora text-metadata-tag text-primary uppercase tracking-widest mb-sm">
            // TESTS &amp; DIAGNOSTICS
          </p>
          <h1 className="font-sora text-display-lg-mobile md:text-display-lg max-w-4xl text-on-surface">
            Timed drills, <span className="text-gradient">practical evaluation</span>.
          </h1>
          <p className="font-dm-sans text-body-lg text-on-surface-muted mt-lg max-w-2xl leading-relaxed">
            One question at a time against the clock. Test your understanding against real source materials,
            then have an LLM evaluate your answers with concrete advice for improvement. Now supporting real-time
            oral examinations with Michael's voice and Chrome speech dictation.
          </p>

          {/* Category Filter Tabs */}
          {categories.length > 2 && (
            <div className="flex flex-wrap gap-sm mt-xl pt-sm">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-md py-xs rounded-full font-sora text-xs uppercase tracking-wider transition-colors ${
                    selectedCategory === cat
                      ? "bg-primary text-background font-bold shadow-sm"
                      : "bg-surface-container-low text-on-surface-muted hover:text-on-surface border border-border-default/60"
                  }`}
                >
                  {cat === "Oral Exams" && <Mic className="w-3.5 h-3.5" />}
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          )}
        </header>

        {filteredTests.length > 1 && (
          <div className="flex justify-end mb-lg">
            <SortControl value={sort} onChange={(v) => setSort(v as SortKey)} />
          </div>
        )}

        {filteredTests.length === 0 ? (
          <div className="text-center py-xxl border-2 border-dashed border-border-default rounded-xl">
            <FileText className="w-12 h-12 text-on-surface-muted mx-auto mb-md" />
            <p className="font-dm-sans text-body-lg text-on-surface-muted">No tests found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
            {filteredTests.map((test) => {
              const status = testStatuses[test.slug];
              const totalQ = test.questions.length;
              const openCount = test.questions.filter((q) => q.type === "open").length;
              const mcCount = test.questions.filter((q) => q.type === "multiple-choice").length;
              const sourceCount = test.sources.length;
              const totalSecs = test.questions.reduce(
                (sum, q) => sum + (q.timeLimitSeconds ?? test.defaultTimeLimitSeconds ?? 60),
                0,
              );
              const totalMins = Math.floor(totalSecs / 60);
              const remSecs = totalSecs % 60;
              const formattedTime = remSecs > 0 ? `${totalMins}m ${remSecs}s` : `${totalMins} mins`;

              return (
                <Link
                  key={test.slug}
                  to={`/tests/${test.slug}`}
                  className="group flex flex-col justify-between bg-surface-container-low border border-border-default rounded-xl overflow-hidden hover:border-primary/50 hover:-translate-y-1 transition-all"
                >
                  <div>
                    {/* Test Image */}
                    <div className="aspect-[16/9] overflow-hidden relative">
                      <img
                        alt={test.imageAlt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        src={test.image}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

                      {/* Status Badges Overlay */}
                      <div className="absolute top-md left-md flex flex-wrap gap-xs">
                        <Tag variant="primary">{test.category}</Tag>
                        {test.format === "oral" && (
                          <span className="flex items-center gap-1 bg-accent-orange/20 text-accent-orange border border-accent-orange/40 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-sora font-semibold">
                            <Mic className="w-3 h-3" />
                            Oral Exam
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-md left-md right-md flex items-center justify-between text-xs font-sora text-on-surface">
                        <span className="flex items-center gap-xs bg-background/80 backdrop-blur-sm px-sm py-xs rounded border border-border-default/40">
                          <Clock className="w-3.5 h-3.5 text-accent-orange" />
                          {formattedTime}
                        </span>
                        {status?.hasEvaluation ? (
                          <span className="flex items-center gap-xs bg-secondary/15 text-secondary border border-secondary/30 px-sm py-xs rounded font-bold backdrop-blur-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Evaluated
                          </span>
                        ) : status && status.answeredCount > 0 ? (
                          <span className="flex items-center gap-xs bg-primary/15 text-primary border border-primary/30 px-sm py-xs rounded font-medium backdrop-blur-sm">
                            In progress ({status.answeredCount}/{totalQ})
                          </span>
                        ) : (
                          <span className="flex items-center gap-xs bg-surface-container-highest/80 text-on-surface-muted px-sm py-xs rounded border border-border-default/40 backdrop-blur-sm">
                            Ready to take
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-xl pb-md">
                      <div className="flex items-center gap-sm text-metadata-tag font-sora text-primary uppercase tracking-widest mb-sm">
                        <span>{totalQ} Questions</span>
                        <span>·</span>
                        <span>
                          {sourceCount} {sourceCount === 1 ? "Source" : "Sources"}
                        </span>
                      </div>

                      <h2 className="font-sora text-article-title text-on-surface group-hover:text-primary transition-colors mb-sm">
                        {test.title}
                      </h2>

                      <p className="font-dm-sans text-body-base text-on-surface-muted mb-lg line-clamp-2">
                        {test.description}
                      </p>

                      {/* Question Breakdown Pills */}
                      <div className="flex flex-wrap gap-xs mb-md">
                        {test.format === "oral" && (
                          <span className="font-sora text-[11px] px-sm py-0.5 rounded bg-accent-orange/10 border border-accent-orange/30 text-accent-orange flex items-center gap-1">
                            <Mic className="w-3 h-3" />
                            Michael Voice
                          </span>
                        )}
                        <span className="font-sora text-[11px] px-sm py-0.5 rounded bg-surface border border-border-default text-on-surface-variant">
                          {mcCount} Multiple Choice
                        </span>
                        <span className="font-sora text-[11px] px-sm py-0.5 rounded bg-surface border border-border-default text-on-surface-variant">
                          {openCount} Open Response
                        </span>
                        {sourceCount > 0 && (
                          <span className="font-sora text-[11px] px-sm py-0.5 rounded bg-surface border border-border-default text-primary flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {sourceCount} Reference Materials
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mx-xl pt-md pb-lg border-t border-border-default/60 mt-auto flex items-center justify-between text-xs font-sora text-primary uppercase tracking-wider">
                    <span className="flex items-center gap-1.5 text-on-surface-muted group-hover:text-on-surface transition-colors">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      LLM Diagnostic Guidance
                    </span>
                    <span className="inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform font-bold">
                      {status?.hasEvaluation ? "Review Feedback" : "Start Test"} <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
