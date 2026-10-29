import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Plus, Trash2, GripVertical, X, Eye, Pencil, AlertTriangle } from "lucide-react";
import BlockEditor from "./BlockEditor";
import ContentPreview from "./ContentPreview";
import type { ContentBlock } from "@/types";
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPES,
  getSchema,
  type ContentType,
  type FieldSchema,
} from "@/lib/admin-prompts";
import type { AIDraft } from "./AIDraftPanel";
import TestEditor from "./TestEditor";
import AIEditPanel from "./AIEditPanel";

interface ContentFormProps {
  initial: AIDraft | null;
  onSave: (data: SavePayload) => void;
  onCancel: () => void;
  saving: boolean;
}

export interface SavePayload {
  slug: string;
  type: ContentType;
  title: string;
  excerpt: string;
  category: string;
  author: { name: string; handle?: string };
  publishedAt: string;
  image?: string;
  imageAlt?: string;
  tags?: string[];
  topics?: string[];
  status: "private" | "published";
  body: Record<string, unknown>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

// ── Field value state ────────────────────────────────
// A single object keyed by field name, initialized from the draft or schema.
// Complex sub-fields (sections, pullQuotes, etc.) are stored under their
// field name as arrays of objects.

type FormValues = Record<string, unknown>;

// Type-safe readers for the dynamic form state.
// These narrow unknown to the expected shape with runtime checks.

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function isRecordArray(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.every((x) => x !== null && typeof x === "object" && !Array.isArray(x));
}

function recordArray(v: unknown): Record<string, unknown>[] {
  return isRecordArray(v) ? v : [];
}

function strArray(v: unknown): string[] {
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[];
  return [""];
}

/** Narrow unknown to a mixed (string | ContentBlock)[] for BlockEditor. */
function blockArray(v: unknown): (string | ContentBlock)[] {
  if (!Array.isArray(v)) return [""];
  const out: (string | ContentBlock)[] = [];
  for (const item of v) {
    if (typeof item === "string") {
      out.push(item);
    } else if (item && typeof item === "object") {
      out.push(item as ContentBlock);
    }
  }
  return out.length > 0 ? out : [""];
}

function initFromDraft(draft: AIDraft | null): FormValues {
  const now = new Date().toISOString().split("T")[0];
  if (!draft) return {
    authorName: "Soma Editorial",
    publishedAt: now,
  };
  return {
    title: draft.title || "",
    excerpt: draft.excerpt || "",
    category: draft.category || "Engineering",
    authorName: "Soma Editorial",               // AI never controls this
    authorHandle: "",                            // AI never controls this
    publishedAt: now,                            // AI never controls this — always the current time
    image: draft.image || "",
    imageAlt: draft.imageAlt || "",
    tagsText: (draft.tags || []).join(", "),
    topics: draft.topics || [],
    intro: draft.intro || "",
    body: draft.body?.length ? [...draft.body] : [""],
    sections: draft.sections || [],
    pullQuotes: draft.pullQuotes || [],
    bentoHighlights: draft.bentoHighlights || [],
    references: draft.references || [],
    tipCards: draft.tipCards || [],
    tagline: draft.tagline || "",
    lessons: draft.lessons || [],
    chapters: draft.chapters || [],
    episodes: draft.episodes || [],
    docSections: draft.docSections || [],
    format: draft.format || "written",
    estimatedMinutes: draft.estimatedMinutes || 30,
    passingScore: draft.passingScore || 70,
    sources: draft.sources || [],
    questions: draft.questions || [],
    episode: draft.episode || "",
    duration: draft.duration || "",
    summary: draft.summary || "",
    segments: draft.segments || [],
    guests: draft.guests || [],
    relatedReading: draft.relatedReading || [],
  };
}

/**
 * Merge a partial AIDraft returned by an AI edit into the current form values.
 * Only fields present in `draft` are updated; everything else keeps its value.
 * This is the same shape mapping as initFromDraft but non-destructive.
 */
function mergeDraft(current: FormValues, draft: Record<string, unknown>): FormValues {
  const next = { ...current };
  if (typeof draft.title === "string") next.title = draft.title;
  if (typeof draft.excerpt === "string") next.excerpt = draft.excerpt;
  if (typeof draft.category === "string") next.category = draft.category;
  // AI edit never touches author or publishedAt — hardcoded defaults always win
  if (typeof draft.image === "string") next.image = draft.image;
  if (typeof draft.imageAlt === "string") next.imageAlt = draft.imageAlt;
  if (Array.isArray(draft.tags)) next.tagsText = draft.tags.join(", ");
  if (Array.isArray(draft.topics)) next.topics = draft.topics;
  if (typeof draft.intro === "string") next.intro = draft.intro;
  if (Array.isArray(draft.body)) next.body = [...draft.body];
  if (Array.isArray(draft.sections)) next.sections = draft.sections;
  if (Array.isArray(draft.pullQuotes)) next.pullQuotes = draft.pullQuotes;
  if (Array.isArray(draft.bentoHighlights)) next.bentoHighlights = draft.bentoHighlights;
  if (Array.isArray(draft.references)) next.references = draft.references;
  if (Array.isArray(draft.tipCards)) next.tipCards = draft.tipCards;
  if (typeof draft.tagline === "string") next.tagline = draft.tagline;
  if (typeof draft.format === "string") next.format = draft.format;
  if (typeof draft.estimatedMinutes === "number") next.estimatedMinutes = draft.estimatedMinutes;
  if (typeof draft.passingScore === "number") next.passingScore = draft.passingScore;
  if (Array.isArray(draft.lessons)) next.lessons = draft.lessons;
  if (Array.isArray(draft.chapters)) next.chapters = draft.chapters;
  if (Array.isArray(draft.episodes)) next.episodes = draft.episodes;
  if (Array.isArray(draft.docSections)) next.docSections = draft.docSections;
  if (Array.isArray(draft.sources)) next.sources = draft.sources;
  if (Array.isArray(draft.questions)) next.questions = draft.questions;
  if (typeof draft.episode === "string") next.episode = draft.episode;
  if (typeof draft.duration === "string") next.duration = draft.duration;
  if (typeof draft.summary === "string") next.summary = draft.summary;
  if (Array.isArray(draft.segments)) next.segments = draft.segments;
  if (Array.isArray(draft.guests)) next.guests = draft.guests;
  if (Array.isArray(draft.relatedReading)) next.relatedReading = draft.relatedReading;
  return next;
}

export default function ContentForm({ initial, onSave, onCancel, saving }: ContentFormProps) {
  const [type, setType] = useState<ContentType>("story");
  const [values, setValues] = useState<FormValues>({});
  const [useCustomSlug, setUseCustomSlug] = useState(false);
  const [customSlug, setCustomSlug] = useState("");
  const [status, setStatus] = useState<"private" | "published">("private");
  const [reasoning, setReasoning] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [aiEdited, setAiEdited] = useState(false);
  // Shared drag state for array editors (sections, items, etc.)
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const dragToRef = useRef<number | null>(null);

  const schema = getSchema(type);

  // Populate from initial draft
  useEffect(() => {
    if (!initial) return;
    setType(initial.type);
    setValues(initFromDraft(initial));
    setReasoning(initial.reasoning || "");
  }, [initial]);

  const title = str(values.title);
  const slug = useCustomSlug ? customSlug : slugify(title);

  const setVal = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const buildBody = useCallback((): Record<string, unknown> => {
    const body: Record<string, unknown> = {};

    body.intro = values.intro;
    body.body = values.body;

    const sections = recordArray(values.sections);
    if (sections.length > 0) body.sections = sections;

    const pullQuotes = recordArray(values.pullQuotes);
    if (pullQuotes.length > 0) body.pullQuotes = pullQuotes;

    const bento = recordArray(values.bentoHighlights);
    if (bento.length > 0) body.bentoHighlights = bento;

    const refs = recordArray(values.references);
    if (refs.length > 0) body.references = refs;

    const tipCards = recordArray(values.tipCards);
    if (tipCards.length > 0) body.tipCards = tipCards;

    const tagline = str(values.tagline);
    if (tagline) body.tagline = tagline;

    const image = str(values.image);
    if (image) body.image = image;
    const imageAlt = str(values.imageAlt);
    if (imageAlt) body.imageAlt = imageAlt;

    // Doc
    const docSections = recordArray(values.docSections);
    if (docSections.length > 0) body.sections = docSections;

    // Collection items
    const lessons = recordArray(values.lessons);
    if (lessons.length > 0) body.lessons = lessons;
    const chapters = recordArray(values.chapters);
    if (chapters.length > 0) body.chapters = chapters;
    const episodes = recordArray(values.episodes);
    if (episodes.length > 0) body.episodes = episodes;

    // Test
    body.format = values.format;
    body.estimatedMinutes = values.estimatedMinutes;
    body.passingScore = values.passingScore;
    const sources = recordArray(values.sources);
    if (sources.length > 0) body.sources = sources;
    const questions = recordArray(values.questions);
    if (questions.length > 0) body.questions = questions;

    // Podcast
    if (values.episode) body.episode = values.episode;
    if (values.duration) body.duration = values.duration;
    if (values.summary) body.summary = values.summary;
    const segments = recordArray(values.segments);
    if (segments.length > 0) body.segments = segments;
    const guests = recordArray(values.guests);
    if (guests.length > 0) body.guests = guests;
    const relatedReading = recordArray(values.relatedReading);
    if (relatedReading.length > 0) body.relatedReading = relatedReading;

    // Featured tag
    if (type === "featured") body.tag = "FEATURED ARTICLE // SOMA";

    return body;
  }, [values, type]);

  const handleSave = () => {
    const tagsText = str(values.tagsText);
    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    const topicsRaw = values.topics;
    const topics = strArray(topicsRaw).filter(Boolean);
    setAiEdited(false);

    onSave({
      slug,
      type,
      title: str(values.title),
      excerpt: str(values.excerpt),
      category: str(values.category),
      author: { name: str(values.authorName), handle: str(values.authorHandle) || undefined },
      publishedAt: str(values.publishedAt),
      image: str(values.image) || undefined,
      imageAlt: str(values.imageAlt) || undefined,
      tags: tags.length > 0 ? tags : undefined,
      topics: topics.length > 0 ? topics : undefined,
      status,
      body: buildBody(),
    });
  };

  // Live preview: mirror the current form state back into a draft shape.
  const previewDraft: AIDraft = useMemo(() => ({
    type,
    reasoning: "",
    title: str(values.title),
    excerpt: str(values.excerpt),
    category: str(values.category),
    author: { name: str(values.authorName), handle: str(values.authorHandle) || undefined },
    publishedAt: str(values.publishedAt),
    image: str(values.image),
    imageAlt: str(values.imageAlt),
    tags: (() => { const t = str(values.tagsText); return t ? t.split(",").map((s) => s.trim()).filter(Boolean) : []; })(),
    topics: strArray(values.topics),
    intro: str(values.intro),
    tagline: str(values.tagline),
    body: strArray(values.body),
    sections: type === "doc" ? [] : recordArray(values.sections).map((s) => ({
      heading: str(s.heading),
      paragraphs: blockArray(s.paragraphs),
    })),
    docSections: type === "doc" ? recordArray(values.docSections).map((s) => ({
      number: str(s.number),
      heading: str(s.heading),
      anchor: str(s.anchor),
      items: recordArray(s.items).map((item) => ({
        question: str(item.question),
        answer: blockArray(item.answer),
      })),
    })) : [],
    pullQuotes: recordArray(values.pullQuotes).map((q) => ({
      quote: str(q.quote),
      attribution: str(q.attribution) || undefined,
    })),
    bentoHighlights: recordArray(values.bentoHighlights).map((b) => ({
      label: str(b.label),
      title: str(b.title),
      description: str(b.description),
    })),
    references: recordArray(values.references).map((r) => ({
      title: str(r.title),
      url: str(r.url),
      description: str(r.description) || undefined,
    })),
    tipCards: recordArray(values.tipCards).map((t) => ({
      icon: str(t.icon),
      bgClass: str(t.bgClass),
      iconColorClass: str(t.iconColorClass),
      title: str(t.title),
      description: str(t.description),
    })),
    lessons: type === "course" ? recordArray(values.lessons).map((c) => ({
      title: str(c.title),
      storySlug: str(c.storySlug),
      description: str(c.description) || undefined,
    })) : undefined,
    chapters: type === "book" ? recordArray(values.chapters).map((c) => ({
      title: str(c.title),
      storySlug: str(c.storySlug),
      description: str(c.description) || undefined,
    })) : undefined,
    episodes: recordArray(values.episodes).map((c) => ({
      title: str(c.title),
      storySlug: str(c.storySlug),
      description: str(c.description) || undefined,
    })),
    format: str(values.format) as "written" | "oral" | "hybrid" | undefined,
    estimatedMinutes: typeof values.estimatedMinutes === "number" ? values.estimatedMinutes : undefined,
    passingScore: typeof values.passingScore === "number" ? values.passingScore : undefined,
    sources: recordArray(values.sources).map((s) => ({
      type: str(s.type),
      storySlug: str(s.storySlug) || undefined,
      guideSlug: str(s.guideSlug) || undefined,
      docSlug: str(s.docSlug) || undefined,
      title: str(s.title) || undefined,
      url: str(s.url) || undefined,
    })),
    questions: recordArray(values.questions).map((q) => ({
      id: str(q.id),
      type: str(q.type),
      question: str(q.question),
      options: recordArray(q.options).map((o) => ({ id: str(o.id), label: str(o.label) })),
      correctOptionIds: strArray(q.correctOptionIds),
      explanation: str(q.explanation) || undefined,
    })),
    episode: str(values.episode),
    duration: str(values.duration),
    summary: str(values.summary),
    segments: recordArray(values.segments).map((s) => ({
      time: str(s.time),
      title: str(s.title),
      description: str(s.description),
    })),
    guests: recordArray(values.guests).map((g) => ({
      name: str(g.name),
      role: str(g.role),
      description: str(g.description),
    })),
    relatedReading: recordArray(values.relatedReading).map((r) => ({
      tag: str(r.tag),
      title: str(r.title),
    })),
  }), [values, type]);

  // ── Schema-driven field renderers ──

  /** Render a simple field (string, markdown, select, boolean) */
  const renderField = (field: FieldSchema) => {
    const val = str(values[field.name]);
    const set = (v: string) => setVal(field.name, v);

    if (field.type === "select" && field.options) {
      return (
        <div key={field.name}>
          <label className="font-sora text-sm text-on-surface block mb-xs">
            {field.label || field.name}
            {field.required && <span className="text-error ml-xs">*</span>}
          </label>
          {field.options.length <= 8 ? (
            <div className="flex flex-wrap gap-sm">
              {field.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => set(opt)}
                  className={`px-md py-sm font-sora text-xs uppercase tracking-widest border transition-colors ${
                    val === opt
                      ? "bg-primary text-on-primary border-primary"
                      : "bg-surface text-on-surface-muted border-border-default hover:border-outline"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <select
              value={val || ""}
              onChange={(e) => set(e.target.value)}
              className="w-full p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
            >
              {field.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
        </div>
      );
    }

    if (field.type === "boolean") {
      return (
        <div key={field.name} className="flex items-center gap-sm">
          <input
            type="checkbox"
            checked={!!val}
            onChange={(e) => set(e.target.checked ? "true" : "")}
            className="accent-primary"
          />
          <label className="font-sora text-sm text-on-surface">
            {field.label || field.name}
          </label>
        </div>
      );
    }

    if (field.type === "markdown") {
      return (
        <div key={field.name}>
          <label className="font-sora text-sm text-on-surface block mb-xs">
            {field.label || field.name}
            {field.required && <span className="text-error ml-xs">*</span>}
          </label>
          <textarea
            value={val || ""}
            onChange={(e) => set(e.target.value)}
            placeholder={field.placeholder || field.description}
            rows={3}
            className="w-full p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary resize-y"
          />
        </div>
      );
    }

    if (field.type === "string[]") {
      return (
        <div key={field.name}>
          <label className="font-sora text-sm text-on-surface block mb-xs">
            {field.label || field.name}
          </label>
          <input
            value={val || ""}
            onChange={(e) => set(e.target.value)}
            placeholder={field.placeholder || "comma-separated values"}
            className="w-full p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
          />
        </div>
      );
    }

    // Default: string input
    return (
      <div key={field.name}>
        <label className="font-sora text-sm text-on-surface block mb-xs">
          {field.label || field.name}
          {field.required && <span className="text-error ml-xs">*</span>}
        </label>
        <input
          value={val || ""}
          onChange={(e) => set(e.target.value)}
          placeholder={field.placeholder || field.description}
          className="w-full p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
        />
      </div>
    );
  };

  // ── Complex array editors ──
  // These handle the rich object[] fields that are too complex for generic rendering.

  const renderArrayEditor = (key: string, label: string, fields: FieldSchema[], initialItem: Record<string, unknown>) => {
    const items = recordArray(values[key]);
    const setItems = (next: Record<string, unknown>[]) => setVal(key, next);

    const onDragStart = (i: number, e: React.DragEvent) => {
      setDragFrom(i);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(i));
    };
    const onDragOver = (i: number, e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      dragToRef.current = i;
    };
    const onDrop = () => {
      const from = dragFrom;
      const to = dragToRef.current;
      if (from === null || to === null || from === to) { setDragFrom(null); dragToRef.current = null; return; }
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setItems(next);
      setDragFrom(null); dragToRef.current = null;
    };
    const onDragEnd = () => { setDragFrom(null); dragToRef.current = null; };

    return (
      <div className="space-y-md" key={key}>
        <label className="font-sora text-sm text-on-surface block">{label}</label>
        {items.map((item: Record<string, unknown>, i: number) => (
          <div
            key={i}
            draggable
            onDragStart={(e) => onDragStart(i, e)}
            onDragOver={(e) => onDragOver(i, e)}
            onDragLeave={() => { if (dragToRef.current === i) dragToRef.current = null; }}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={`p-lg bg-surface-container border space-y-sm transition-colors cursor-grab active:cursor-grabbing ${
              dragFrom === i ? "opacity-40 border-primary" : "border-border-default"
            }`}
          >
            <div className="flex items-center gap-sm">
              <GripVertical className="w-4 h-4 text-on-surface-muted shrink-0" />
              {fields.map((f) => {
                if (f.type === "string" || f.type === "select") {
                  return f.type === "select" && f.options && f.options.length <= 8 ? (
                    <div key={f.name} className="flex flex-wrap gap-sm">
                      {f.options.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            const next = [...items];
                            next[i] = { ...next[i], [f.name]: opt };
                            setItems(next);
                          }}
                          className={`px-sm py-xs font-sora text-xs uppercase tracking-widest border transition-colors ${
                            item[f.name] === opt
                              ? "bg-primary text-on-primary border-primary"
                              : "bg-surface text-on-surface-muted border-border-default"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      key={f.name}
                      value={str(item[f.name])}
                      onChange={(e) => {
                        const next = [...items];
                        next[i] = { ...next[i], [f.name]: e.target.value };
                        setItems(next);
                      }}
                      placeholder={f.placeholder || f.name}
                      className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-sora text-sm focus:outline-none focus:border-primary"
                    />
                  );
                }
                return null;
              })}
              <button
                onClick={() => setItems(items.filter((_, j) => j !== i))}
                className="p-sm text-on-surface-muted hover:text-error transition-colors shrink-0"
                title={`Remove ${label.slice(0, -1)}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {fields.map((f) => {
              if (f.type === "markdown") {
                const itemVal = str(item[f.name]);
                return (
                  <textarea
                    key={f.name}
                    value={itemVal}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = { ...next[i], [f.name]: e.target.value };
                      setItems(next);
                    }}
                    placeholder={f.placeholder || f.description}
                    rows={2}
                    className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary resize-y"
                  />
                );
              }
              if (f.type === "markdown[]") {
                const pars = strArray(item[f.name]);
                return (
                  <div key={f.name} className="space-y-sm ml-md">
                    {pars.map((p: string, j: number) => (
                      <div key={j} className="flex gap-sm items-start">
                        <textarea
                          value={p}
                          onChange={(e) => {
                            const next = [...items];
                            const itemPars = strArray(next[i][f.name]);
                            itemPars[j] = e.target.value;
                            next[i] = { ...next[i], [f.name]: itemPars };
                            setItems(next);
                          }}
                          placeholder={f.placeholder || "Paragraph (markdown)..."}
                          rows={2}
                          className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary resize-y"
                        />
                        {pars.length > 1 && (
                          <button
                            onClick={() => {
                              const next = [...items];
                              const itemPars = strArray(next[i][f.name]);
                              next[i] = { ...next[i], [f.name]: itemPars.filter((_, k) => k !== j) };
                              setItems(next);
                            }}
                            className="p-sm text-on-surface-muted hover:text-error transition-colors shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const next = [...items];
                        const itemPars = [...strArray(next[i][f.name]), ""];
                        next[i] = { ...next[i], [f.name]: itemPars };
                        setItems(next);
                      }}
                      className="text-xs text-primary hover:text-primary-hover font-dm-sans"
                    >
                      + Add paragraph
                    </button>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}
        <button
          onClick={() => setItems([...items, { ...initialItem }])}
          className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
        >
          <Plus className="w-4 h-4" /> Add {label.slice(0, -1)}
        </button>
      </div>
    );
  };

  const isRichText = type === "story" || type === "guide" || type === "featured";
  const isCollection = type === "course" || type === "book" || type === "series";

  // ── Render ──

  return (
    <div className="space-y-xl">
      {/* Sticky save bar : identical in edit and preview. The toggle below
          only swaps the content pane, save works from either mode. */}
      <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur border border-border-default px-md py-sm flex flex-wrap items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          <button
            onClick={() => setMode((m) => (m === "edit" ? "preview" : "edit"))}
            disabled={saving}
            className="inline-flex items-center gap-sm px-xl py-md bg-surface border border-border-default text-on-surface font-sora text-label-caps uppercase tracking-widest hover:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mode === "edit" ? (
              <>
                <Eye className="w-4 h-4" />
                Preview
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                Back to Edit
              </>
            )}
          </button>
          <span className="hidden md:inline font-sora text-xs text-on-surface-muted">
            {status === "published" ? "Will save &amp; publish" : "Will save as private"}
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !title || !slug}
          className="px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : status === "published" ? "Publish" : "Save Private"}
        </button>
      </div>

      {/* Content pane : mode only swaps the layout (fields vs rendered page). */}
      {mode === "preview" ? (
        <ContentPreview
          draft={previewDraft}
        />
      ) : (
        <>
      {/* AI Edit — modifies current content via LLM. Applies to the form;
          persistence requires the explicit Save button below. */}
      <AIEditPanel
        currentJson={JSON.stringify(previewDraft)}
        onUpdate={(partial) => {
          setValues(mergeDraft(values, partial));
          setAiEdited(true);
        }}
      />
      {aiEdited && (
        <div className="flex items-center gap-2 p-sm bg-accent-orange/10 border border-accent-orange/40 rounded text-xs font-dm-sans text-on-surface">
          <AlertTriangle className="w-3.5 h-3.5 text-accent-orange shrink-0" />
          <span>
            AI edits applied to the form. <strong>Save</strong> (above or below) to persist them — the published page
            still shows the previous version until you save.
          </span>
        </div>
      )}

      {/* Reasoning / type suggestion from AI */}
      {reasoning && (
        <div className="p-lg bg-surface-container border border-border-default border-l-4 border-l-primary">
          <p className="font-sora text-xs text-primary uppercase tracking-widest mb-xs">AI SUGGESTION</p>
          <p className="font-dm-sans text-sm text-on-surface">{reasoning}</p>
        </div>
      )}

      {/* Type selector */}
      <div className="flex items-center gap-md flex-wrap">
        <label className="font-sora text-sm text-on-surface">Type:</label>
        {CONTENT_TYPES.map((ct) => (
          <button
            key={ct}
            onClick={() => setType(ct)}
            className={`px-md py-sm font-sora text-xs uppercase tracking-widest border transition-colors ${
              type === ct
                ? "bg-primary text-on-primary border-primary"
                : "bg-surface text-on-surface-muted border-border-default hover:border-outline"
            }`}
          >
            {CONTENT_TYPE_LABELS[ct]}
          </button>
        ))}
      </div>

      {/* Schema-driven metadata fields */}
      {schema.fields
        .filter((f) => ["title", "excerpt", "category", "author", "publishedAt", "image", "imageAlt", "tags", "topics", "tagline", "format", "estimatedMinutes", "passingScore", "episode", "duration", "summary"].includes(f.name))
        .map((f) => {
          // Special handling for fields that use sub-keys
          if (f.name === "author") {
            return (
              <div key="author" className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                {f.children?.map((child) => renderField({
                  ...child,
                  name: child.name === "name" ? "authorName" : "authorHandle",
                  label: child.name === "name" ? "Author Name" : "Author Handle",
                }))}
              </div>
            );
          }
          if (f.name === "tags") {
            return renderField({
              ...f,
              name: "tagsText",
              type: "string[]",
              label: "Tags (comma-separated)",
            });
          }
          if (f.name === "topics") {
            return renderField(f);
          }
          if (f.name === "format" || f.name === "category") {
            return renderField(f);
          }
          if (["tagline", "episode", "duration", "summary"].includes(f.name)) {
            return renderField(f);
          }
          if (["estimatedMinutes", "passingScore"].includes(f.name)) {
            return renderField(f);
          }
          return renderField(f);
        })}

      {/* Custom slug */}
      <div className="flex items-center gap-md">
        <label className="flex items-center gap-sm cursor-pointer">
          <input
            type="checkbox"
            checked={useCustomSlug}
            onChange={(e) => setUseCustomSlug(e.target.checked)}
            className="accent-primary"
          />
          <span className="font-sora text-sm text-on-surface">Custom slug</span>
        </label>
        {useCustomSlug ? (
          <input
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value)}
            placeholder={slugify(title) || "custom-slug"}
            className="flex-1 p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
          />
        ) : (
          <span className="font-dm-sans text-xs text-on-surface-muted">
            Slug: <code className="bg-surface-container px-sm py-xs">{slug || "auto"}</code>
          </span>
        )}
      </div>

      {/* Intro (for rich-text types) */}
      {isRichText && (
        <div>
          <label className="font-sora text-sm text-on-surface block mb-xs">Intro *</label>
          <textarea
            value={str(values.intro)}
            onChange={(e) => setVal("intro", e.target.value)}
            placeholder="Opening hook (markdown)..."
            rows={3}
            className="w-full p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary resize-y"
          />
        </div>
      )}

      {/* Body paragraphs (for rich-text types) */}
      {isRichText && (
        <div className="space-y-sm">
          <label className="font-sora text-sm text-on-surface block">Body Paragraphs *</label>
          {strArray(values.body).map((p: string, i: number) => (
            <div key={i} className="flex gap-sm items-start">
              <textarea
                value={p}
                onChange={(e) => {
                  const next = [...strArray(values.body)];
                  next[i] = e.target.value;
                  setVal("body", next);
                }}
                placeholder="Markdown paragraph..."
                rows={2}
                className="flex-1 p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary resize-y"
              />
              {strArray(values.body).length > 1 && (
                <button
                  onClick={() => setVal("body", strArray(values.body).filter((_, j) => j !== i))}
                  className="p-sm text-on-surface-muted hover:text-error transition-colors shrink-0"
                  title="Remove paragraph"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setVal("body", [...strArray(values.body), ""])}
            className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
          >
            <Plus className="w-4 h-4" /> Add paragraph
          </button>
        </div>
      )}

      {/* Sections (rich-text types) */}
      {isRichText && (
        <div className="space-y-lg">
          <label className="font-sora text-sm text-on-surface block">Sections</label>
          {recordArray(values.sections).map((sec, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; dragToRef.current = i; }}
              onDragLeave={() => { if (dragToRef.current === i) dragToRef.current = null; }}
              onDrop={() => {
                const from = dragFrom; const to = dragToRef.current;
                if (from === null || to === null || from === to) { setDragFrom(null); dragToRef.current = null; return; }
                const next = [...recordArray(values.sections)];
                const [moved] = next.splice(from, 1);
                next.splice(to, 0, moved);
                setVal("sections", next);
                setDragFrom(null); dragToRef.current = null;
              }}
              onDragEnd={() => { setDragFrom(null); dragToRef.current = null; }}
              className={`p-lg bg-surface-container border transition-colors cursor-grab active:cursor-grabbing ${
                dragFrom === i ? "opacity-40 border-primary" : "border-border-default"
              }`}
            >
              <div className="flex items-center gap-sm mb-md">
                <GripVertical className="w-4 h-4 text-on-surface-muted shrink-0" />
                <input
                  value={str(sec.heading)}
                  onChange={(e) => {
                    const next = [...recordArray(values.sections)];
                    next[i] = { ...next[i], heading: e.target.value };
                    setVal("sections", next);
                  }}
                  placeholder="Section heading"
                  className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-sora text-sm focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => setVal("sections", recordArray(values.sections).filter((_, j) => j !== i))}
                  className="p-sm text-on-surface-muted hover:text-error transition-colors"
                  title="Remove section"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="ml-md">
                <BlockEditor
                  blocks={blockArray(sec.paragraphs)}
                  onChange={(blocks) => {
                    const next = [...recordArray(values.sections)];
                    next[i] = { ...next[i], paragraphs: blocks };
                    setVal("sections", next);
                  }}
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => setVal("sections", [...recordArray(values.sections), { heading: "", paragraphs: [""] }])}
            className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
          >
            <Plus className="w-4 h-4" /> Add section
          </button>
        </div>
      )}

      {/* Pull quotes (rich-text types) */}
      {isRichText && renderArrayEditor("pullQuotes", "Pull Quotes", [
        { name: "quote", type: "markdown", required: true, description: "Quote text" },
        { name: "attribution", type: "string", required: false, description: "Attribution" },
      ] satisfies FieldSchema[], { quote: "", attribution: "" })}

      {/* Bento highlights (rich-text types) */}
      {isRichText && renderArrayEditor("bentoHighlights", "Bento Highlights", [
        { name: "label", type: "string", required: true, description: "Card label" },
        { name: "title", type: "string", required: true, description: "Card title" },
        { name: "description", type: "markdown", required: true, description: "Card content" },
      ] satisfies FieldSchema[], { label: "", title: "", description: "" })}

      {/* References (rich-text types) */}
      {isRichText && renderArrayEditor("references", "References", [
        { name: "title", type: "string", required: true, description: "Reference title" },
        { name: "url", type: "string", required: true, description: "URL" },
        { name: "description", type: "string", required: false, description: "Optional note" },
      ] satisfies FieldSchema[], { title: "", url: "", description: "" })}

      {/* Tip cards (guide only) */}
      {type === "guide" && renderArrayEditor("tipCards", "Tip Cards", [
        { name: "icon", type: "string", required: true, description: "Icon identifier" },
        { name: "title", type: "string", required: true, description: "Tip card title" },
        { name: "description", type: "markdown", required: true, description: "Tip content" },
        { name: "bgClass", type: "string", required: false, description: "Background class" },
        { name: "iconColorClass", type: "string", required: false, description: "Icon color class" },
      ] satisfies FieldSchema[], { icon: "", bgClass: "", iconColorClass: "", title: "", description: "" })}

      {/* Doc sections */}
      {type === "doc" && (
        <div className="space-y-lg">
          <label className="font-sora text-sm text-on-surface block">Doc Sections</label>
          {recordArray(values.docSections).map((sec: Record<string, unknown>, i: number) => (
            <div key={i} className="p-lg bg-surface-container border border-border-default">
              <div className="flex items-center gap-sm mb-sm">
                <input
                  value={str(sec.number)}
                  onChange={(e) => {
                    const next = [...recordArray(values.docSections)];
                    next[i] = { ...next[i], number: e.target.value };
                    setVal("docSections", next);
                  }}
                  placeholder="Section number (e.g. A, B)"
                  className="w-20 p-sm bg-surface border border-border-default text-on-surface font-sora text-sm focus:outline-none focus:border-primary"
                />
                <input
                  value={str(sec.heading)}
                  onChange={(e) => {
                    const next = [...recordArray(values.docSections)];
                    next[i] = { ...next[i], heading: e.target.value };
                    setVal("docSections", next);
                  }}
                  placeholder="Section heading"
                  className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-sora text-sm focus:outline-none focus:border-primary"
                />
                <input
                  value={str(sec.anchor)}
                  onChange={(e) => {
                    const next = [...recordArray(values.docSections)];
                    next[i] = { ...next[i], anchor: e.target.value };
                    setVal("docSections", next);
                  }}
                  placeholder="Anchor id"
                  className="w-40 p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => setVal("docSections", recordArray(values.docSections).filter((_, j) => j !== i))}
                  className="p-sm text-on-surface-muted hover:text-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {recordArray(sec.items).map((item: Record<string, unknown>, j: number) => (
                <div key={j} className="ml-md mb-sm p-sm bg-surface border border-border-default">
                  <div className="flex items-center gap-sm mb-xs">
                    <input
                      value={str(item.question)}
                      onChange={(e) => {
                        const next = [...recordArray(values.docSections)];
                        const items = [...recordArray(next[i].items)];
                        items[j] = { ...items[j], question: e.target.value };
                        next[i] = { ...next[i], items };
                        setVal("docSections", next);
                      }}
                      placeholder="Question"
                      className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => {
                        const next = [...recordArray(values.docSections)];
                        next[i] = { ...next[i], items: recordArray(next[i].items).filter((_, k) => k !== j) };
                        setVal("docSections", next);
                      }}
                      className="p-sm text-on-surface-muted hover:text-error transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="mt-sm">
                    <BlockEditor
                      blocks={blockArray(item.answer)}
                      onChange={(blocks) => {
                        const next = [...recordArray(values.docSections)];
                        const items = [...recordArray(next[i].items)];
                        items[j] = { ...items[j], answer: blocks };
                        next[i] = { ...next[i], items };
                        setVal("docSections", next);
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => {
                  const next = [...recordArray(values.docSections)];
                  next[i] = { ...next[i], items: [...recordArray(next[i].items), { question: "", answer: [""] }] };
                  setVal("docSections", next);
                }}
                className="ml-md text-xs text-primary hover:text-primary-hover font-dm-sans"
              >
                + Add Q&A item
              </button>
            </div>
          ))}
          <button
            onClick={() => setVal("docSections", [...recordArray(values.docSections), { number: "", heading: "", anchor: "", items: [{ question: "", answer: [""] }] }])}
            className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
          >
            <Plus className="w-4 h-4" /> Add section
          </button>
        </div>
      )}

      {/* Collection items (course/book/series) */}
      {isCollection && renderArrayEditor(
        type === "course" ? "lessons" : type === "book" ? "chapters" : "episodes",
        type === "course" ? "Lessons" : type === "book" ? "Chapters" : "Episodes",
        [
          { name: "title", type: "string", required: true, description: "Title" },
          { name: "storySlug", type: "string", required: true, description: "Story slug" },
          { name: "description", type: "string", required: false, description: "Optional description" },
        ] satisfies FieldSchema[],
        { title: "", storySlug: "", description: "" },
      )}

      {/* Podcast segments */}
      {type === "podcast" && renderArrayEditor("segments", "Segments", [
        { name: "time", type: "string", required: true, description: "Timestamp" },
        { name: "title", type: "string", required: true, description: "Segment title" },
        { name: "description", type: "string", required: true, description: "Segment description" },
      ] satisfies FieldSchema[], { time: "", title: "", description: "" })}

      {/* Podcast guests */}
      {type === "podcast" && renderArrayEditor("guests", "Guests", [
        { name: "name", type: "string", required: true, description: "Guest name" },
        { name: "role", type: "string", required: false, description: "Role/title" },
        { name: "description", type: "string", required: false, description: "Bio" },
      ] satisfies FieldSchema[], { name: "", role: "", description: "" })}

      {/* Test sources + questions */}
      {type === "test" && (
        <TestEditor
          sources={recordArray(values.sources)}
          questions={recordArray(values.questions)}
          onSourcesChange={(next) => setVal("sources", next)}
          onQuestionsChange={(next) => setVal("questions", next)}
        />
      )}

      {/* Visibility */}
      <div className="flex items-center gap-lg pt-lg border-t border-border-default">
        <label className="flex items-center gap-sm cursor-pointer">
          <input
            type="radio"
            name="status"
            checked={status === "private"}
            onChange={() => setStatus("private")}
            className="accent-primary"
          />
          <span className="font-sora text-sm text-on-surface">Save as Private</span>
        </label>
        <label className="flex items-center gap-sm cursor-pointer">
          <input
            type="radio"
            name="status"
            checked={status === "published"}
            onChange={() => setStatus("published")}
            className="accent-primary"
          />
          <span className="font-sora text-sm text-on-surface">Save &amp; Publish</span>
        </label>
      </div>
        </>
      )}

      {/* Save — at the bottom after all fields, present in both modes */}
      <div className="flex items-center gap-md">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !title || !slug}
          className="px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : status === "published" ? "Publish" : "Save Private"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-xl py-md bg-surface border border-border-default text-on-surface font-sora text-label-caps uppercase tracking-widest hover:border-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}