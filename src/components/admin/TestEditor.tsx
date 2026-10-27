import { Plus, Trash2, X, GripVertical } from "lucide-react";

// ── Test editor ─────────────────────────────────────
// Edits the `sources` and `questions` arrays of a test row. The general
// ContentForm saves them through buildBody but had no editor UI: creating
// a test in-app produced an empty test. Values are plain records; the
// parent form already treats sources/questions via recordArray.

interface TestEditorProps {
  sources: Record<string, unknown>[];
  questions: Record<string, unknown>[];
  onSourcesChange: (next: Record<string, unknown>[]) => void;
  onQuestionsChange: (next: Record<string, unknown>[]) => void;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function arr(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x !== null && typeof x === "object" && !Array.isArray(x)) as Record<string, unknown>[];
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function setIn(item: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  return { ...item, [key]: value };
}

/** Field label + children, matching the file's Field component style. */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-sm">
      <label className="font-sora text-xs text-on-surface block mb-xs">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary";
const monoCls =
  "w-full p-sm bg-surface border border-border-default text-on-surface font-mono text-sm focus:outline-none focus:border-primary";

// ── Sources ─────────────────────────────────────────

const SOURCE_TYPES = ["markdown", "story", "guide", "doc", "link"] as const;

function SourceEditor({ source, onChange }: { source: Record<string, unknown>; onChange: (s: Record<string, unknown>) => void }) {
  const type = str(source.type) || "markdown";
  return (
    <div className="ml-md mb-sm p-sm bg-surface border border-border-default">
      <div className="flex items-center gap-sm mb-sm">
        <select
          value={type}
          onChange={(e) => onChange({ type: e.target.value })}
          className="p-sm bg-surface border border-border-default text-on-surface font-sora text-xs focus:outline-none focus:border-primary"
        >
          {SOURCE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <span className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">Source</span>
      </div>

      {type === "markdown" && (
        <>
          <Field label="Title"><input className={monoCls} value={str(source.title)} onChange={(e) => onChange(setIn(source, "title", e.target.value))} placeholder="Reading Passage Title" /></Field>
          <Field label="Content (markdown)"><textarea rows={8} className={inputCls} value={str(source.content)} onChange={(e) => onChange(setIn(source, "content", e.target.value))} placeholder="## Passage heading&#10;Passage text..." /></Field>
          <Field label="Description (optional)"><textarea rows={2} className={inputCls} value={str(source.description)} onChange={(e) => onChange(setIn(source, "description", e.target.value))} placeholder="One-line note about the source" /></Field>
        </>
      )}
      {type === "story" && (
        <>
          <Field label="Story slug"><input className={monoCls} value={str(source.storySlug)} onChange={(e) => onChange(setIn(source, "storySlug", e.target.value))} placeholder="fs-1-why-this-type-error" /></Field>
          <Field label="Title (optional)"><input className={inputCls} value={str(source.title)} onChange={(e) => onChange(setIn(source, "title", e.target.value))} /></Field>
          <Field label="Description (optional)"><textarea rows={2} className={inputCls} value={str(source.description)} onChange={(e) => onChange(setIn(source, "description", e.target.value))} /></Field>
        </>
      )}
      {type === "guide" && (
        <>
          <Field label="Guide slug"><input className={monoCls} value={str(source.guideSlug)} onChange={(e) => onChange(setIn(source, "guideSlug", e.target.value))} /></Field>
          <Field label="Title (optional)"><input className={inputCls} value={str(source.title)} onChange={(e) => onChange(setIn(source, "title", e.target.value))} /></Field>
          <Field label="Description (optional)"><textarea rows={2} className={inputCls} value={str(source.description)} onChange={(e) => onChange(setIn(source, "description", e.target.value))} /></Field>
        </>
      )}
      {type === "doc" && (
        <>
          <Field label="Doc slug"><input className={monoCls} value={str(source.docSlug)} onChange={(e) => onChange(setIn(source, "docSlug", e.target.value))} /></Field>
          <Field label="Title (optional)"><input className={inputCls} value={str(source.title)} onChange={(e) => onChange(setIn(source, "title", e.target.value))} /></Field>
          <Field label="Description (optional)"><textarea rows={2} className={inputCls} value={str(source.description)} onChange={(e) => onChange(setIn(source, "description", e.target.value))} /></Field>
        </>
      )}
      {type === "link" && (
        <>
          <Field label="Title"><input className={inputCls} value={str(source.title)} onChange={(e) => onChange(setIn(source, "title", e.target.value))} /></Field>
          <Field label="URL"><input className={monoCls} value={str(source.url)} onChange={(e) => onChange(setIn(source, "url", e.target.value))} placeholder="https://..." /></Field>
          <Field label="Description (optional)"><textarea rows={2} className={inputCls} value={str(source.description)} onChange={(e) => onChange(setIn(source, "description", e.target.value))} /></Field>
        </>
      )}
    </div>
  );
}

function SourcesEditor({ sources, onChange }: { sources: Record<string, unknown>[]; onChange: (s: Record<string, unknown>[]) => void }) {
  return (
    <div className="space-y-sm">
      <label className="font-sora text-sm text-on-surface block">Sources (source material the test is based on)</label>
      {sources.map((src, i) => (
        <div key={i} className="relative p-sm bg-surface-container border border-border-default">
          <div className="flex items-center justify-between mb-sm">
            <span className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">Source #{i + 1}</span>
            <button
              onClick={() => onChange(sources.filter((_, j) => j !== i))}
              className="p-sm text-on-surface-muted hover:text-error transition-colors"
              title="Remove source"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <SourceEditor source={src} onChange={(s) => onChange(sources.map((x, j) => (j === i ? s : x)))} />
        </div>
      ))}
      <button
        onClick={() => onChange([...sources, { type: "markdown" }])}
        className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
      >
        <Plus className="w-4 h-4" /> Add source
      </button>
    </div>
  );
}

// ── Questions ───────────────────────────────────────

function OptionEditor({ option, onChange }: { option: Record<string, unknown>; onChange: (o: Record<string, unknown>) => void }) {
  return (
    <div className="flex items-start gap-sm mb-xs">
      <span className="font-sora text-xs font-bold text-on-surface-muted bg-surface border border-border-default rounded w-6 h-6 flex items-center justify-center shrink-0">
        {str(option.id).toUpperCase() || "?"}
      </span>
      <input
        className={monoCls}
        value={str(option.id)}
        onChange={(e) => onChange(setIn(option, "id", e.target.value))}
        placeholder="id (a, b, c...)"
        style={{ width: "12ch" }}
      />
      <textarea
        rows={2}
        className={`${inputCls} flex-1`}
        value={str(option.label)}
        onChange={(e) => onChange(setIn(option, "label", e.target.value))}
        placeholder="Option text"
      />
    </div>
  );
}

function QuestionEditor({ question, onChange }: { question: Record<string, unknown>; onChange: (q: Record<string, unknown>) => void }) {
  const qType = str(question.type) || "multiple-choice";
  const options = arr(question.options);
  const correct = strArr(question.correctOptionIds);

  const toggleCorrect = (id: string) => {
    const allowMultiple = question.allowMultiple === true;
    const next = allowMultiple
      ? correct.includes(id) ? correct.filter((c) => c !== id) : [...correct, id]
      : [id];
    onChange(setIn(question, "correctOptionIds", next));
  };

  return (
    <div className="relative p-lg bg-surface-container border border-border-default">
      <div className="flex flex-wrap items-center gap-sm mb-md">
        <input
          className={monoCls}
          value={str(question.id)}
          onChange={(e) => onChange(setIn(question, "id", e.target.value))}
          placeholder="id (q1)"
          style={{ width: "14ch" }}
        />
        <select
          value={qType}
          onChange={(e) => onChange(setIn(question, "type", e.target.value))}
          className="p-sm bg-surface border border-border-default text-on-surface font-sora text-xs focus:outline-none focus:border-primary"
        >
          <option value="multiple-choice">Multiple Choice</option>
          <option value="open">Open</option>
        </select>
        <span className="font-sora text-xs text-on-surface-muted uppercase tracking-widest">Question</span>
      </div>

      <Field label="Question *">
        <textarea rows={3} className={inputCls} value={str(question.question)} onChange={(e) => onChange(setIn(question, "question", e.target.value))} placeholder="Question text" />
      </Field>
      <Field label="Description (optional)">
        <textarea rows={2} className={inputCls} value={str(question.description)} onChange={(e) => onChange(setIn(question, "description", e.target.value))} placeholder="Shown under the question" />
      </Field>
      <Field label="Time limit (seconds, optional)">
        <input type="number" min={10} step={5} className={monoCls} value={typeof question.timeLimitSeconds === "number" ? question.timeLimitSeconds : ""} onChange={(e) => onChange(setIn(question, "timeLimitSeconds", e.target.value ? Number(e.target.value) : undefined))} placeholder="e.g. 60" />
      </Field>

      {qType === "multiple-choice" ? (
        <>
          <div className="mb-sm">
            <div className="flex items-center gap-sm mb-xs">
              <label className="font-sora text-xs text-on-surface block">Options</label>
              <label className="ml-auto flex items-center gap-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={question.allowMultiple === true}
                  onChange={(e) => onChange(setIn(question, "allowMultiple", e.target.checked))}
                  className="accent-primary"
                />
                <span className="font-sora text-xs text-on-surface-muted">Allow multiple</span>
              </label>
            </div>
            {options.map((opt, i) => (
              <div key={i}>
                <OptionEditor option={opt} onChange={(o) => onChange(setIn(question, "options", options.map((x, j) => (j === i ? o : x))))} />
              </div>
            ))}
            <button
              onClick={() => onChange(setIn(question, "options", [...options, { id: String.fromCharCode(97 + options.length), label: "" }]))}
              className="text-xs text-primary hover:text-primary-hover font-dm-sans"
            >
              + Add option
            </button>
          </div>
          <Field label="Correct answer(s)">
            <div className="flex flex-wrap gap-sm">
              {options.length === 0 && (
                <span className="font-dm-sans text-xs text-on-surface-muted italic">Add options first.</span>
              )}
              {options.map((opt) => {
                const id = str(opt.id);
                const isCorrect = correct.includes(id);
                return (
                  <button
                    key={id || `opt-${options.indexOf(opt)}`}
                    type="button"
                    onClick={() => toggleCorrect(id)}
                    className={`px-md py-sm font-sora text-xs uppercase tracking-widest border transition-colors ${
                      isCorrect ? "bg-primary text-on-primary border-primary" : "bg-surface text-on-surface-muted border-border-default hover:border-primary"
                    }`}
                  >
                    {id || "?"}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Explanation (shown after answering, optional)">
            <textarea rows={2} className={inputCls} value={str(question.explanation)} onChange={(e) => onChange(setIn(question, "explanation", e.target.value))} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Placeholder (optional)">
            <textarea rows={2} className={inputCls} value={str(question.placeholder)} onChange={(e) => onChange(setIn(question, "placeholder", e.target.value))} placeholder="Hint shown in the answer box" />
          </Field>
          <Field label="Rubric (grading guidance, never shown on the paper)">
            <textarea rows={4} className={inputCls} value={str(question.rubric)} onChange={(e) => onChange(setIn(question, "rubric", e.target.value))} />
          </Field>
          <Field label="Key points (one per line)">
            <textarea rows={3} className={inputCls} value={strArr(question.keyPoints).join("\n")} onChange={(e) => onChange(setIn(question, "keyPoints", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)))} placeholder={"Two-phase scan\nBitmap of page offsets"} />
          </Field>
          <Field label="Sample answer">
            <textarea rows={5} className={inputCls} value={str(question.sampleAnswer)} onChange={(e) => onChange(setIn(question, "sampleAnswer", e.target.value))} />
          </Field>
        </>
      )}
    </div>
  );
}

function QuestionsEditor({ questions, onChange }: { questions: Record<string, unknown>[]; onChange: (q: Record<string, unknown>[]) => void }) {
  return (
    <div className="space-y-lg">
      <label className="font-sora text-sm text-on-surface block">Questions</label>
      {questions.map((q, i) => (
        <div key={i} className="relative">
          <div className="flex items-center justify-between mb-sm">
            <span className="font-sora text-xs text-on-surface-muted uppercase tracking-widest flex items-center gap-sm">
              <GripVertical className="w-3.5 h-3.5" /> Question #{i + 1} {str(q.id) ? `(${str(q.id)})` : ""}
            </span>
            <button
              onClick={() => onChange(questions.filter((_, j) => j !== i))}
              className="p-sm text-on-surface-muted hover:text-error transition-colors"
              title="Remove question"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <QuestionEditor question={q} onChange={(nq) => onChange(questions.map((x, j) => (j === i ? nq : x)))} />
        </div>
      ))}
      <button
        onClick={() => onChange([...questions, { id: `q${questions.length + 1}`, type: "multiple-choice", question: "", options: [{ id: "a", label: "" }, { id: "b", label: "" }], correctOptionIds: [], allowMultiple: false }])}
        className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
      >
        <Plus className="w-4 h-4" /> Add question
      </button>
    </div>
  );
}

export default function TestEditor({ sources, questions, onSourcesChange, onQuestionsChange }: TestEditorProps) {
  return (
    <div className="space-y-xl">
      <SourcesEditor sources={sources} onChange={onSourcesChange} />
      <QuestionsEditor questions={questions} onChange={onQuestionsChange} />
    </div>
  );
}