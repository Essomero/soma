import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Printer, FileText, Palette, Monitor } from "lucide-react";
import { useContentItem } from "@/lib/content";
import { mdBlock } from "@/lib/markdown";
import type {
  TestContent,
  OpenTestQuestion,
  MultipleChoiceTestQuestion,
} from "@/types";

function calcTotalSeconds(test: TestContent): number {
  return test.questions.reduce((sum, q) => {
    return sum + (q.timeLimitSeconds ?? test.defaultTimeLimitSeconds ?? 60);
  }, 0);
}

function formatExamTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `${m} minutes`;
  if (m === 0) return `${s} seconds`;
  return `${m} minutes ${s} seconds`;
}

function formatLabel(seconds: number): string {
  if (seconds <= 30) return `${seconds}s`;
  if (seconds <= 60) return `1 min`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${Math.floor(seconds / 60)} min ${seconds % 60}s`;
}

export default function TestPrintPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: test, loading } = useContentItem<TestContent>("test", slug);

  useEffect(() => {
    if (test?.title) {
      const prev = document.title;
      document.title = `${test.title} : Soma Print Edition`;
      return () => { document.title = prev; };
    }
  }, [test?.title]);

  const [bw, setBw] = useState(false);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-on-surface-muted">Loading print edition…</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h1 className="font-sora text-3xl font-bold mb-4">Test Not Found</h1>
        <p className="text-on-surface-muted mb-8">The requested test could not be located.</p>
        <Link to="/tests" className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
          <ArrowLeft className="w-4 h-4" /> Go to Tests
        </Link>
      </div>
    );
  }

  const totalSeconds = calcTotalSeconds(test);
  const qCount = test.questions.length;
  const openCount = test.questions.filter((q) => q.type === "open").length;
  const mcCount = test.questions.filter((q) => q.type === "multiple-choice").length;
  const marksTotal = qCount;

  return (
    <div className={`min-h-screen bg-background text-on-surface print-preview${bw ? " print-bw" : ""}`}>
      {/* Controls bar — hidden in print */}
      <aside className="print:hidden sticky top-0 z-40 w-full bg-surface-container/90 backdrop-blur-md border-b border-border-default px-4 sm:px-8 py-3.5 shadow-md">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <Link to={`/tests/${test.slug}`}
            className="inline-flex items-center gap-2 text-sm font-sora font-semibold text-on-surface-muted hover:text-on-surface transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to test</span>
          </Link>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setBw((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-sora text-xs font-semibold border transition-all ${
                bw
                  ? "bg-surface-container border-border-default text-on-surface"
                  : "bg-primary text-on-primary border-primary shadow-sm"
              }`}>
              {bw ? <Monitor className="w-3.5 h-3.5" /> : <Palette className="w-3.5 h-3.5" />}
              <span>{bw ? "B/W" : "Color"}</span>
            </button>
            <span className="text-xs text-on-surface-muted hidden sm:inline">
              Tip: Set margins to Narrow &amp; enable Background graphics
            </span>
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary font-sora text-sm font-bold shadow hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]">
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Exam Paper ───────────────────────────────────────────── */}
      <main className="max-w-3xl mx-auto px-6 sm:px-8 py-12">
        <table className="print-lesson-table">
          <thead className="print-lesson-thead">
            <tr>
              <td style={{ padding: 0, height: "12mm", verticalAlign: "bottom" }}>
                <div style={{ height: "12mm", fontSize: "1pt", lineHeight: "12mm" }}>&nbsp;</div>
              </td>
            </tr>
          </thead>
          <tbody className="print-lesson-tbody">
            <tr>
              <td className="print-lesson-body-cell">

        {/* Header */}
        <header className="border-b-2 border-on-surface pb-6 mb-8 chapter-header">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-sora text-xs font-bold uppercase tracking-[0.2em] text-primary mb-1">
                {test.category}{test.subcategory ? ` // ${test.subcategory}` : ""}
              </p>
              <h1 className="font-sora text-3xl font-bold text-on-surface leading-tight">{test.title}</h1>
              <p className="font-dm-sans text-sm text-on-surface-muted mt-2 max-w-xl leading-relaxed">{test.description}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-sora text-xs font-bold text-on-surface-muted uppercase tracking-wider">Soma</p>
              <p className="font-sora text-xs text-on-surface-muted mt-1">{test.date}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border-default/60 text-sm font-sora">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-muted font-semibold">Time Allowed</p>
              <p className="font-bold text-on-surface text-base mt-0.5">{formatExamTime(totalSeconds)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-muted font-semibold">Total Marks</p>
              <p className="font-bold text-on-surface text-base mt-0.5">{marksTotal}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-muted font-semibold">Format</p>
              <p className="font-bold text-on-surface text-base mt-0.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" />
                Written
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-muted font-semibold">Structure</p>
              <p className="font-bold text-on-surface text-base mt-0.5">{mcCount} MCQ &middot; {openCount} Open</p>
            </div>
          </div>
        </header>

        {/* Instructions */}
        <section className="bg-surface-container-low border border-border-default rounded-xl p-5 mb-8">
          <h2 className="font-sora text-sm font-bold text-on-surface mb-2">
            Instructions to Candidates
          </h2>
          <ol className="font-dm-sans text-sm text-on-surface-muted space-y-1.5 ml-5 list-decimal">
            <li>Write your name and candidate number at the top of this paper.</li>
            <li>Answer <strong>all</strong> questions in the spaces provided.</li>
            <li>Total time allowed is {formatExamTime(totalSeconds)} across all {qCount} questions, about {formatExamTime(Math.round(totalSeconds / qCount))} each on average, including reading.</li>
            <li>Read each passage and question carefully before writing your answer.</li>
            <li>Marks for each question are shown in brackets.</li>
          </ol>
        </section>

        {/* Section A: Reading Passage */}
        {test.sources.filter((s) => s.type === "markdown").length > 0 && (
          <section className="mb-10">
            <h2 className="font-sora text-lg font-bold text-on-surface mb-4 pb-1 border-b border-border-default/50">Section A: Reading Passage</h2>
            {test.sources
              .filter((s): s is { type: "markdown"; title: string; content: string; description?: string } => s.type === "markdown")
              .map((source, i) => (
                <div key={i} className="mb-6">
                  <p className="font-sora text-xs font-bold text-primary uppercase tracking-wider mb-2">{source.title}</p>
                  {source.description && <p className="font-dm-sans text-xs text-on-surface-muted mb-3 italic">{source.description}</p>}
                  <div className="font-dm-sans text-sm text-on-surface leading-relaxed space-y-3 print-passage"
                    dangerouslySetInnerHTML={{ __html: mdBlock(source.content) }} />
                </div>
              ))}
          </section>
        )}

        {/* Section B: Multiple Choice */}
        {mcCount > 0 && (
          <section className="mb-10">
            <h2 className="font-sora text-lg font-bold text-on-surface mb-1">Section B: Multiple-Choice Questions</h2>
            <p className="font-dm-sans text-xs text-on-surface-muted mb-5">Select the best answer for each question. Circle the letter of your chosen answer. Each question carries 1 mark.</p>
            <div className="space-y-8">
              {test.questions.filter((q): q is MultipleChoiceTestQuestion => q.type === "multiple-choice").map((q) => {
                const qNum = test.questions.indexOf(q) + 1;
                return (
                  <div key={q.id} className="avoid-break">
                    <div className="flex items-start gap-3 mb-2">
                      <span className="font-sora text-sm font-bold text-primary shrink-0 mt-0.5">{qNum}.</span>
                      <div>
                        <p className="font-dm-sans text-sm text-on-surface leading-relaxed">{q.question}</p>
                        {q.description && <p className="font-dm-sans text-xs text-on-surface-muted mt-1">{q.description}</p>}
                        <p className="font-mono text-[10px] text-on-surface-variant mt-1">Suggested time: {formatLabel(q.timeLimitSeconds ?? test.defaultTimeLimitSeconds ?? 60)} &middot; Marks: 1</p>
                      </div>
                    </div>
                    <div className="ml-8 mt-2 space-y-2">
                      {q.options.map((opt) => (
                        <div key={opt.id} className="flex items-start gap-3">
                          <span className="font-sora text-xs font-bold text-on-surface-muted border border-border-default rounded w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">{opt.id.toUpperCase()}</span>
                          <p className="font-dm-sans text-xs text-on-surface leading-relaxed">{opt.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="ml-8 mt-3 border-b border-dashed border-[#94a3b8] pb-2">
                      <span className="font-sora text-[10px] text-on-surface-muted italic">Answer: ___</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Section C: Open Questions */}
        {openCount > 0 && (
          <section className="mb-10">
            <h2 className="font-sora text-lg font-bold text-on-surface mb-1">Section C: Written-Response Questions</h2>
            <p className="font-dm-sans text-xs text-on-surface-muted mb-5">Answer each question in the space provided. Marks are indicated per question. Write clearly and support your answers with reference to the passage where appropriate.</p>
            <div className="space-y-12">
              {test.questions.filter((q): q is OpenTestQuestion => q.type === "open").map((q) => {
                const qNum = test.questions.indexOf(q) + 1;
                const lineCount = (q.timeLimitSeconds ?? 120) >= 120 ? 14 : 10;
                return (
                  <div key={q.id} className="avoid-break">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="font-sora text-sm font-bold text-primary shrink-0 mt-0.5">{qNum}.</span>
                      <div>
                        <p className="font-dm-sans text-sm text-on-surface leading-relaxed">{q.question}</p>
                        {q.description && <p className="font-dm-sans text-xs text-on-surface-muted mt-1 italic">{q.description}</p>}
                        <p className="font-mono text-[10px] text-on-surface-variant mt-1">
                          Suggested time: {formatLabel(q.timeLimitSeconds ?? test.defaultTimeLimitSeconds ?? 60)} &middot;
                          Marks: {(q.timeLimitSeconds ?? 60) >= 120 ? 3 : 2}
                        </p>
                      </div>
                    </div>
                    <div className="ml-8">
                      <div className="border-b border-dashed border-[#94a3b8] h-6 print:h-[18px]" />
                      {Array.from({ length: lineCount - 1 }).map((_, i) => (
                        <div key={i} className="border-b border-dashed border-[#cbd5e1] h-6 print:h-[18px]" />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* End of Paper */}
        <footer className="border-t-2 border-on-surface pt-4 mt-12 text-center">
          <p className="font-sora text-sm font-bold text-on-surface uppercase tracking-widest">End of Paper</p>
          <p className="font-dm-sans text-xs text-on-surface-muted mt-1">{test.title} &middot; Soma Print Edition &middot; {test.questions.length} questions</p>
        </footer>
              </td>
            </tr>
          </tbody>
        </table>
      </main>
    </div>
  );
}