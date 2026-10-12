import { useState } from "react";
import { Lightbulb, CheckCircle2, ChevronDown, ExternalLink } from "lucide-react";
import MarkdownHtml from "@/components/ui/MarkdownHtml";
import { mdBlock } from "@/lib/markdown";
import { collectLessonRefs, linkSectionRefs, type LessonLinks } from "@/lib/storyLinks";

interface PracticeHintBlockProps {
  hint: string;
  /** Section number → anchor id, so references in the hint become links. */
  sectionRefs?: Map<string, string>;
  /** Lessons the hint points at, listed after the hint text. */
  lessonLinks?: LessonLinks;
  defaultOpen?: boolean;
  className?: string;
}

export function PracticeHintBlock({ hint, sectionRefs, lessonLinks, defaultOpen = false, className = "" }: PracticeHintBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  // The hint keeps its wording; a lesson it points at is a second door, so it
  // opens in a new tab and the reader's place in this lesson survives.
  const lessonRefs = collectLessonRefs(hint, lessonLinks);

  return (
    <div
      className={`my-md rounded-xl border border-border-default/60 bg-surface-container-lowest overflow-hidden [overflow-anchor:none] transition-colors duration-200 hover:border-accent-orange/40 ${
        isOpen ? "border-accent-orange/30 shadow-sm" : ""
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-sm px-md py-2.5 cursor-pointer list-none select-none bg-surface-container-low/40 hover:bg-surface-container-low transition-colors text-left"
      >
        <div className="flex items-center gap-sm min-w-0">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-accent-orange/10 text-accent-orange shrink-0">
            <Lightbulb size={13} strokeWidth={2.2} />
          </div>

          <div className="flex items-center gap-xs truncate font-sora">
            <span className="text-xs font-semibold text-on-surface tracking-tight">
              Hint
            </span>
            <span className="text-[10px] font-bold text-accent-orange bg-accent-orange/15 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Clue
            </span>
            <span className="text-on-surface-muted text-xs mx-0.5">·</span>
            <span className="text-xs text-on-surface-muted font-medium truncate">
              {isOpen ? "Hide hint" : "Need a nudge? Click to reveal hint"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-sm shrink-0">
          <ChevronDown
            size={14}
            className={`text-on-surface-muted transition-transform duration-300 ease-out shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <div
        className="reveal-grid"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className={`p-lg border-t border-border-default/50 space-y-md text-sm font-dm-sans bg-surface-lowest/50 text-on-surface reveal-fade ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          >
            <MarkdownHtml html={mdBlock(linkSectionRefs(hint, sectionRefs ?? new Map()))} />
            {lessonRefs.length > 0 && (
              <div className="pt-md mt-md border-t border-border-default/40 flex flex-wrap items-baseline gap-x-md gap-y-xs">
                <span className="font-sora text-[10px] font-bold uppercase tracking-wider text-on-surface-muted">
                  Read next
                </span>
                {lessonRefs.map((ref) => (
                  <a
                    key={ref.id}
                    href={ref.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-xs font-sora text-xs font-semibold text-brand hover:opacity-80 transition-opacity"
                  >
                    {ref.label}
                    <ExternalLink size={11} strokeWidth={2.4} className="shrink-0 translate-y-px" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PracticeSolutionBlockProps {
  label?: string;
  solution: string;
  defaultOpen?: boolean;
  className?: string;
}

export function PracticeSolutionBlock({
  label = "Solution",
  solution,
  defaultOpen = false,
  className = "",
}: PracticeSolutionBlockProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const isFix = /fix/i.test(label);
  const isAnswer = /answer/i.test(label);
  const badgeText = isFix ? "Walkthrough & Fix" : isAnswer ? "Answer" : "Walkthrough";

  return (
    <div
      className={`my-md rounded-xl border border-border-default/60 bg-surface-container-lowest overflow-hidden [overflow-anchor:none] transition-colors duration-200 hover:border-secondary/40 ${
        isOpen ? "border-secondary/30 shadow-sm" : ""
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-sm px-md py-2.5 cursor-pointer list-none select-none bg-surface-container-low/40 hover:bg-surface-container-low transition-colors text-left"
      >
        <div className="flex items-center gap-sm min-w-0">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-secondary/10 text-secondary shrink-0">
            <CheckCircle2 size={13} strokeWidth={2.2} />
          </div>

          <div className="flex items-center gap-xs truncate font-sora">
            <span className="text-xs font-semibold text-on-surface tracking-tight">
              {label}
            </span>
            <span className="text-[10px] font-bold text-secondary bg-secondary/15 px-1.5 py-0.5 rounded uppercase tracking-wider">
              {badgeText}
            </span>
            <span className="text-on-surface-muted text-xs mx-0.5">·</span>
            <span className="text-xs text-on-surface-muted font-medium truncate">
              {isOpen ? `Hide ${label.toLowerCase()}` : `Reveal ${label.toLowerCase()}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-sm shrink-0">
          <ChevronDown
            size={14}
            className={`text-on-surface-muted transition-transform duration-300 ease-out shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      <div
        className="reveal-grid"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden min-h-0">
          <div
            className={`p-lg border-t border-border-default/50 space-y-md text-sm font-dm-sans bg-surface-lowest/50 text-on-surface reveal-fade ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          >
            <MarkdownHtml html={mdBlock(solution)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Parsing practice blocks into Question, Hint, and Solution ──────────

const HINT_REGEX = /(?:^|\n|\s)(?:\*|_){1,2}Hint:?(?:\*|_){1,2}\s*|(?:^|\n)\s*Hint:\s*|(?:\.|\?|!)\s+Hint:\s*/i;
const SOL_REGEX = /(?:^|\n|\s)(?:\*|_){1,2}(Solution(?:\s*&\s*Fix)?|Answer):?(?:\*|_){1,2}\s*|(?:^|\n)\s*(Solution(?:\s*&\s*Fix)?|Answer):\s*|(?:\.|\?|!)\s+(Solution(?:\s*&\s*Fix)?|Answer):\s*/i;

export interface ParsedPracticeBlock {
  question: string;
  hint: string;
  solution: string;
  solLabel: string;
}

export function parsePracticeBlock(text: string): ParsedPracticeBlock | null {
  const hintMatch = text.match(HINT_REGEX);
  const solMatch = text.match(SOL_REGEX);

  if (!hintMatch && !solMatch) return null;

  const hintIdx = hintMatch ? text.search(HINT_REGEX) : -1;
  const solIdx = solMatch ? text.search(SOL_REGEX) : -1;

  let question = "";
  let hint = "";
  let solution = "";
  let solLabel = "Solution";

  if (hintIdx !== -1 && solIdx !== -1 && hintIdx < solIdx) {
    question = text.slice(0, hintIdx).trim();

    const hm = text.slice(hintIdx).match(HINT_REGEX)!;
    hint = text.slice(hintIdx + hm[0].length, solIdx).trim();

    const sm = text.slice(solIdx).match(SOL_REGEX)!;
    solLabel = sm[1] || "Solution";
    solution = text.slice(solIdx + sm[0].length).trim();
  } else if (hintIdx !== -1 && (solIdx === -1 || hintIdx > solIdx)) {
    question = text.slice(0, hintIdx).trim();
    const hm = text.slice(hintIdx).match(HINT_REGEX)!;
    hint = text.slice(hintIdx + hm[0].length).trim();
  } else if (solIdx !== -1) {
    question = text.slice(0, solIdx).trim();
    const sm = text.slice(solIdx).match(SOL_REGEX)!;
    solLabel = sm[1] || "Solution";
    solution = text.slice(solIdx + sm[0].length).trim();
  }

  // If both hint and solution are empty, not a valid practice block
  if (!hint && !solution) return null;

  return { question, hint, solution, solLabel };
}
