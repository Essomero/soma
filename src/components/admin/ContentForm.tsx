import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, GripVertical, X } from "lucide-react";
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPES,
  CATEGORY_OPTIONS,
  TOPIC_OPTIONS,
  type ContentType,
} from "./types";
import type { AIDraft } from "./AIDraftPanel";

interface ContentFormProps {
  initial: AIDraft | null;
  onSave: (data: SavePayload) => void;
  saving: boolean;
}

export interface SavePayload {
  slug: string;
  type: ContentType;
  title: string;
  excerpt: string;
  category: string;
  author: { name: string; handle?: string };
  date: string;
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

export default function ContentForm({ initial, onSave, saving }: ContentFormProps) {
  const [type, setType] = useState<ContentType>("story");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("Engineering");
  const [authorName, setAuthorName] = useState("");
  const [authorHandle, setAuthorHandle] = useState("");
  const [date, setDate] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [intro, setIntro] = useState("");
  const [body, setBody] = useState<string[]>([""]);
  const [sections, setSections] = useState<{ heading: string; paragraphs: string[] }[]>([]);
  const [pullQuotes, setPullQuotes] = useState<{ quote: string; attribution?: string }[]>([]);
  const [bentoHighlights, setBentoHighlights] = useState<{ label: string; title: string; description: string }[]>([]);
  const [references, setReferences] = useState<{ title: string; url: string; description?: string }[]>([]);
  const [tipCards, setTipCards] = useState<{ icon: string; bgClass: string; iconColorClass: string; title: string; description: string }[]>([]);
  const [tagline, setTagline] = useState("");
  const [status, setStatus] = useState<"private" | "published">("private");
  const [customSlug, setCustomSlug] = useState("");
  const [useCustomSlug, setUseCustomSlug] = useState(false);
  const [reasoning, setReasoning] = useState("");

  // Fields for doc type
  const [docSections, setDocSections] = useState<{ number: string; heading: string; anchor: string; items: { question: string; answer: string[] }[] }[]>([]);

  // Fields for test type
  const [testFormat, setTestFormat] = useState<"written" | "oral" | "hybrid">("written");
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [passingScore, setPassingScore] = useState(70);
  const [testSources, setTestSources] = useState<{ type: string; storySlug?: string; guideSlug?: string; docSlug?: string; title?: string; url?: string }[]>([]);
  const [questions, setQuestions] = useState<{ id: string; type: string; question: string; options?: { id: string; label: string }[]; correctOptionIds?: string[]; explanation?: string }[]>([]);

  // Fields for collections (course/book/series)
  const [collectionItems, setCollectionItems] = useState<{ title: string; storySlug: string; description?: string }[]>([]);

  // Fields for podcast
  const [episodeLabel, setEpisodeLabel] = useState("");
  const [duration, setDuration] = useState("");
  const [podcastSummary, setPodcastSummary] = useState("");
  const [segments, setSegments] = useState<{ time: string; title: string; description: string }[]>([]);
  const [guests, setGuests] = useState<{ name: string; role: string; description: string }[]>([]);
  const [relatedReading, setRelatedReading] = useState<{ tag: string; title: string }[]>([]);

  // Populate from initial draft
  useEffect(() => {
    if (!initial) return;
    setType(initial.type);
    setTitle(initial.title || "");
    setExcerpt(initial.excerpt || "");
    setCategory(initial.category || "Engineering");
    setAuthorName(initial.author?.name || "");
    setAuthorHandle(initial.author?.handle || "");
    setDate(initial.date || new Date().toISOString().split("T")[0]);
    setTagsText((initial.tags || []).join(", "));
    setTopics(initial.topics || []);
    setIntro(initial.intro || "");
    setBody(initial.body?.length ? initial.body : [""]);
    setSections(initial.sections || []);
    setPullQuotes(initial.pullQuotes || []);
    setBentoHighlights(initial.bentoHighlights || []);
    setReferences(initial.references || []);
    setTipCards(initial.tipCards || []);
    setTagline(initial.tagline || "");
    setReasoning(initial.reasoning || "");

    // Doc-specific
    if (initial.docSections) setDocSections(initial.docSections);

    // Test-specific
    if (initial.format) setTestFormat(initial.format);
    if (initial.estimatedMinutes) setEstimatedMinutes(initial.estimatedMinutes);
    if (initial.passingScore) setPassingScore(initial.passingScore);
    if (initial.sources) setTestSources(initial.sources);
    if (initial.questions) setQuestions(initial.questions);

    // Collection items
    if (initial.lessons) setCollectionItems(initial.lessons);
    else if (initial.chapters) setCollectionItems(initial.chapters);
    else if (initial.episodes) setCollectionItems(initial.episodes);
    else setCollectionItems([]);

    // Podcast-specific
    if (initial.episode) setEpisodeLabel(initial.episode);
    if (initial.duration) setDuration(initial.duration);
    if (initial.summary) setPodcastSummary(initial.summary);
    if (initial.segments) setSegments(initial.segments);
    if (initial.guests) setGuests(initial.guests);
    if (initial.relatedReading) setRelatedReading(initial.relatedReading);
  }, [initial]);

  const slug = useCustomSlug ? customSlug : slugify(title);

  const buildBody = useCallback((): Record<string, unknown> => {
    const base: Record<string, unknown> = {
      intro,
      body,
    };

    if (sections.length > 0) base.sections = sections;
    if (pullQuotes.length > 0) base.pullQuotes = pullQuotes;
    if (bentoHighlights.length > 0) base.bentoHighlights = bentoHighlights;
    if (references.length > 0) base.references = references;

    if (type === "guide" && tipCards.length > 0) base.tipCards = tipCards;

    if (type === "doc" && docSections.length > 0) base.sections = docSections;

    if (type === "test") {
      base.format = testFormat;
      base.estimatedMinutes = estimatedMinutes;
      base.passingScore = passingScore;
      if (testSources.length > 0) base.sources = testSources;
      if (questions.length > 0) base.questions = questions;
    }

    if (type === "course" && collectionItems.length > 0) base.lessons = collectionItems;
    if (type === "book" && collectionItems.length > 0) base.chapters = collectionItems;
    if (type === "series" && collectionItems.length > 0) base.episodes = collectionItems;

    if (tagline) base.tagline = tagline;

    if (type === "podcast") {
      if (episodeLabel) base.episode = episodeLabel;
      if (duration) base.duration = duration;
      if (podcastSummary) base.summary = podcastSummary;
      if (segments.length > 0) base.segments = segments;
      if (guests.length > 0) base.guests = guests;
      if (relatedReading.length > 0) base.relatedReading = relatedReading;
    }

    if (type === "featured") {
      base.tag = "FEATURED ARTICLE // SOMA";
    }

    return base;
  }, [
    intro, body, sections, pullQuotes, bentoHighlights, references,
    tipCards, docSections, testFormat, estimatedMinutes, passingScore,
    testSources, questions, collectionItems, tagline,
    episodeLabel, duration, podcastSummary, segments, guests, relatedReading, type,
  ]);

  const handleSave = () => {
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onSave({
      slug,
      type,
      title,
      excerpt,
      category,
      author: { name: authorName, handle: authorHandle || undefined },
      date,
      tags: tags.length > 0 ? tags : undefined,
      topics: topics.length > 0 ? topics : undefined,
      status,
      body: buildBody(),
    });
  };

  const isCollection = type === "course" || type === "book" || type === "series";
  const isRichText = type === "story" || type === "guide" || type === "featured";

  // ── Shared field renderers ──

  const TextField = ({
    label,
    value,
    onChange,
    placeholder,
    multiline,
    hint,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    multiline?: boolean;
    hint?: string;
  }) => (
    <div>
      <label className="font-sora text-sm text-on-surface block mb-xs">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary resize-y"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary"
        />
      )}
      {hint && <p className="font-dm-sans text-xs text-on-surface-muted mt-xs">{hint}</p>}
    </div>
  );

  // ── Body paragraphs ──
  const renderBodyEditor = () => (
    <div className="space-y-sm">
      <label className="font-sora text-sm text-on-surface block">Body Paragraphs</label>
      {body.map((p, i) => (
        <div key={i} className="flex gap-sm items-start">
          <textarea
            value={p}
            onChange={(e) => {
              const next = [...body];
              next[i] = e.target.value;
              setBody(next);
            }}
            placeholder="Markdown paragraph..."
            rows={2}
            className="flex-1 p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary resize-y"
          />
          {body.length > 1 && (
            <button
              onClick={() => setBody(body.filter((_, j) => j !== i))}
              className="p-sm text-on-surface-muted hover:text-error transition-colors shrink-0"
              title="Remove paragraph"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => setBody([...body, ""])}
        className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
      >
        <Plus className="w-4 h-4" /> Add paragraph
      </button>
    </div>
  );

  // ── Sections ──
  const renderSectionsEditor = () => (
    <div className="space-y-lg">
      <label className="font-sora text-sm text-on-surface block">Sections</label>
      {sections.map((sec, i) => (
        <div key={i} className="p-lg bg-surface-container border border-border-default">
          <div className="flex items-center gap-sm mb-sm">
            <GripVertical className="w-4 h-4 text-on-surface-muted shrink-0" />
            <input
              value={sec.heading}
              onChange={(e) => {
                const next = [...sections];
                next[i] = { ...next[i], heading: e.target.value };
                setSections(next);
              }}
              placeholder="Section heading"
              className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-sora text-sm focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => setSections(sections.filter((_, j) => j !== i))}
              className="p-sm text-on-surface-muted hover:text-error transition-colors"
              title="Remove section"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {sec.paragraphs.map((p, j) => (
            <div key={j} className="flex gap-sm items-start ml-md mb-sm">
              <textarea
                value={p}
                onChange={(e) => {
                  const next = [...sections];
                  const pars = [...next[i].paragraphs];
                  pars[j] = e.target.value;
                  next[i] = { ...next[i], paragraphs: pars };
                  setSections(next);
                }}
                placeholder="Paragraph (markdown)..."
                rows={2}
                className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm placeholder:text-on-surface-muted focus:outline-none focus:border-primary resize-y"
              />
              {sec.paragraphs.length > 1 && (
                <button
                  onClick={() => {
                    const next = [...sections];
                    next[i] = { ...next[i], paragraphs: next[i].paragraphs.filter((_, k) => k !== j) };
                    setSections(next);
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
              const next = [...sections];
              next[i] = { ...next[i], paragraphs: [...next[i].paragraphs, ""] };
              setSections(next);
            }}
            className="ml-md text-xs text-primary hover:text-primary-hover font-dm-sans"
          >
            + Add paragraph
          </button>
        </div>
      ))}
      <button
        onClick={() => setSections([...sections, { heading: "", paragraphs: [""] }])}
        className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
      >
        <Plus className="w-4 h-4" /> Add section
      </button>
    </div>
  );

  // ── Pull Quotes ──
  const renderPullQuotes = () => (
    <div className="space-y-md">
      <label className="font-sora text-sm text-on-surface block">Pull Quotes</label>
      {pullQuotes.map((pq, i) => (
        <div key={i} className="p-md bg-surface-container border border-border-default flex gap-sm items-start">
          <div className="flex-1 space-y-sm">
            <textarea
              value={pq.quote}
              onChange={(e) => {
                const next = [...pullQuotes];
                next[i] = { ...next[i], quote: e.target.value };
                setPullQuotes(next);
              }}
              placeholder="Quote text..."
              rows={2}
              className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary resize-y"
            />
            <input
              value={pq.attribution || ""}
              onChange={(e) => {
                const next = [...pullQuotes];
                next[i] = { ...next[i], attribution: e.target.value || undefined };
                setPullQuotes(next);
              }}
              placeholder="Attribution (optional)"
              className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={() => setPullQuotes(pullQuotes.filter((_, j) => j !== i))}
            className="p-sm text-on-surface-muted hover:text-error transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={() => setPullQuotes([...pullQuotes, { quote: "", attribution: "" }])}
        className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
      >
        <Plus className="w-4 h-4" /> Add pull quote
      </button>
    </div>
  );

  // ── Collection items (lessons/chapters/episodes) ──
  const renderCollectionItems = () => {
    const label = type === "course" ? "Lessons" : type === "book" ? "Chapters" : "Episodes";
    return (
      <div className="space-y-md">
        <label className="font-sora text-sm text-on-surface block">{label}</label>
        {collectionItems.map((item, i) => (
          <div key={i} className="p-md bg-surface-container border border-border-default space-y-sm">
            <div className="flex items-center gap-sm">
              <GripVertical className="w-4 h-4 text-on-surface-muted shrink-0" />
              <input
                value={item.title}
                onChange={(e) => {
                  const next = [...collectionItems];
                  next[i] = { ...next[i], title: e.target.value };
                  setCollectionItems(next);
                }}
                placeholder="Title"
                className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-sora text-sm focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => setCollectionItems(collectionItems.filter((_, j) => j !== i))}
                className="p-sm text-on-surface-muted hover:text-error transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input
              value={item.storySlug}
              onChange={(e) => {
                const next = [...collectionItems];
                next[i] = { ...next[i], storySlug: e.target.value };
                setCollectionItems(next);
              }}
              placeholder="Story slug (e.g. fs-1-why-this-type-error)"
              className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
            />
            <input
              value={item.description || ""}
              onChange={(e) => {
                const next = [...collectionItems];
                next[i] = { ...next[i], description: e.target.value || undefined };
                setCollectionItems(next);
              }}
              placeholder="Description (optional)"
              className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
            />
          </div>
        ))}
        <button
          onClick={() => setCollectionItems([...collectionItems, { title: "", storySlug: "" }])}
          className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
        >
          <Plus className="w-4 h-4" /> Add {label.slice(0, -1)}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-xl">
      {/* Reasoning / type suggestion */}
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

      {/* Core metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <TextField label="Title" value={title} onChange={setTitle} placeholder="Article title" />
        <TextField label="Excerpt" value={excerpt} onChange={setExcerpt} placeholder="Card summary" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div>
          <label className="font-sora text-sm text-on-surface block mb-xs">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <TextField label="Date" value={date} onChange={setDate} placeholder="YYYY-MM-DD" />
        <TextField label="Tags (comma-separated)" value={tagsText} onChange={setTagsText} placeholder="TypeScript, Cloudflare" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <TextField label="Author Name" value={authorName} onChange={setAuthorName} placeholder="Benjamin Mayanja" />
        <TextField label="Author Handle" value={authorHandle} onChange={setAuthorHandle} placeholder="@Essomero" />
      </div>

      {/* Topics */}
      <div>
        <label className="font-sora text-sm text-on-surface block mb-xs">Topics</label>
        <div className="flex flex-wrap gap-sm">
          {TOPIC_OPTIONS.map((t) => (
            <button
              key={t.slug}
              onClick={() =>
                setTopics(
                  topics.includes(t.slug)
                    ? topics.filter((s) => s !== t.slug)
                    : [...topics, t.slug]
                )
              }
              className={`px-md py-sm font-sora text-xs border transition-colors ${
                topics.includes(t.slug)
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface text-on-surface-muted border-border-default hover:border-outline"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

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
        {useCustomSlug && (
          <input
            value={customSlug}
            onChange={(e) => setCustomSlug(e.target.value)}
            placeholder={slugify(title) || "custom-slug"}
            className="flex-1 p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
          />
        )}
        {!useCustomSlug && (
          <span className="font-dm-sans text-xs text-on-surface-muted">
            Slug: <code className="bg-surface-container px-sm py-xs">{slug || "auto"}</code>
          </span>
        )}
      </div>

      {/* Intro */}
      <TextField
        label="Intro"
        value={intro}
        onChange={setIntro}
        placeholder="Opening hook (markdown)..."
        multiline
      />

      {/* Type-specific fields */}
      {isRichText && (
        <>
          {renderBodyEditor()}
          {renderSectionsEditor()}
          {renderPullQuotes()}

          {/* Bento highlights */}
          <div className="space-y-md">
            <label className="font-sora text-sm text-on-surface block">Bento Highlights</label>
            {bentoHighlights.map((bh, i) => (
              <div key={i} className="p-md bg-surface-container border border-border-default space-y-sm">
                <div className="flex items-center gap-sm">
                  <input
                    value={bh.label}
                    onChange={(e) => {
                      const next = [...bentoHighlights];
                      next[i] = { ...next[i], label: e.target.value };
                      setBentoHighlights(next);
                    }}
                    placeholder="Label (e.g. 01 // CONCEPT)"
                    className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-sora text-xs focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => setBentoHighlights(bentoHighlights.filter((_, j) => j !== i))}
                    className="p-sm text-on-surface-muted hover:text-error transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <input
                  value={bh.title}
                  onChange={(e) => {
                    const next = [...bentoHighlights];
                    next[i] = { ...next[i], title: e.target.value };
                    setBentoHighlights(next);
                  }}
                  placeholder="Title"
                  className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
                />
                <textarea
                  value={bh.description}
                  onChange={(e) => {
                    const next = [...bentoHighlights];
                    next[i] = { ...next[i], description: e.target.value };
                    setBentoHighlights(next);
                  }}
                  placeholder="Description"
                  rows={2}
                  className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary resize-y"
                />
              </div>
            ))}
            <button
              onClick={() => setBentoHighlights([...bentoHighlights, { label: "", title: "", description: "" }])}
              className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
            >
              <Plus className="w-4 h-4" /> Add highlight
            </button>
          </div>

          {/* References */}
          <div className="space-y-md">
            <label className="font-sora text-sm text-on-surface block">References</label>
            {references.map((ref, i) => (
              <div key={i} className="p-md bg-surface-container border border-border-default space-y-sm">
                <div className="flex items-center gap-sm">
                  <input
                    value={ref.title}
                    onChange={(e) => {
                      const next = [...references];
                      next[i] = { ...next[i], title: e.target.value };
                      setReferences(next);
                    }}
                    placeholder="Reference title"
                    className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => setReferences(references.filter((_, j) => j !== i))}
                    className="p-sm text-on-surface-muted hover:text-error transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <input
                  value={ref.url}
                  onChange={(e) => {
                    const next = [...references];
                    next[i] = { ...next[i], url: e.target.value };
                    setReferences(next);
                  }}
                  placeholder="URL"
                  className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
                />
                <input
                  value={ref.description || ""}
                  onChange={(e) => {
                    const next = [...references];
                    next[i] = { ...next[i], description: e.target.value || undefined };
                    setReferences(next);
                  }}
                  placeholder="Description (optional)"
                  className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
                />
              </div>
            ))}
            <button
              onClick={() => setReferences([...references, { title: "", url: "" }])}
              className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
            >
              <Plus className="w-4 h-4" /> Add reference
            </button>
          </div>
        </>
      )}

      {/* Tip cards (guide only) */}
      {type === "guide" && (
        <div className="space-y-md">
          <label className="font-sora text-sm text-on-surface block">Tip Cards</label>
          {tipCards.map((tc, i) => (
            <div key={i} className="p-md bg-surface-container border border-border-default space-y-sm">
              <div className="flex items-center gap-sm">
                <input
                  value={tc.icon}
                  onChange={(e) => {
                    const next = [...tipCards];
                    next[i] = { ...next[i], icon: e.target.value };
                    setTipCards(next);
                  }}
                  placeholder="Icon (e.g. terminal, lightbulb)"
                  className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => setTipCards(tipCards.filter((_, j) => j !== i))}
                  className="p-sm text-on-surface-muted hover:text-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                value={tc.title}
                onChange={(e) => {
                  const next = [...tipCards];
                  next[i] = { ...next[i], title: e.target.value };
                  setTipCards(next);
                }}
                placeholder="Title"
                className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
              />
              <textarea
                value={tc.description}
                onChange={(e) => {
                  const next = [...tipCards];
                  next[i] = { ...next[i], description: e.target.value };
                  setTipCards(next);
                }}
                placeholder="Description"
                rows={2}
                className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary resize-y"
              />
            </div>
          ))}
          <button
            onClick={() => setTipCards([...tipCards, { icon: "", bgClass: "", iconColorClass: "", title: "", description: "" }])}
            className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
          >
            <Plus className="w-4 h-4" /> Add tip card
          </button>
        </div>
      )}

      {/* Tagline (featured, course, book, series) */}
      {(type === "featured" || isCollection) && (
        <TextField label="Tagline" value={tagline} onChange={setTagline} placeholder="Short subtitle" />
      )}

      {/* Collections */}
      {isCollection && renderCollectionItems()}

      {/* Doc sections */}
      {type === "doc" && (
        <div className="space-y-lg">
          <label className="font-sora text-sm text-on-surface block">Doc Sections</label>
          {docSections.map((sec, i) => (
            <div key={i} className="p-lg bg-surface-container border border-border-default">
              <div className="flex items-center gap-sm mb-sm">
                <input
                  value={sec.number}
                  onChange={(e) => {
                    const next = [...docSections];
                    next[i] = { ...next[i], number: e.target.value };
                    setDocSections(next);
                  }}
                  placeholder="Section number (e.g. A, B, C)"
                  className="w-20 p-sm bg-surface border border-border-default text-on-surface font-sora text-sm focus:outline-none focus:border-primary"
                />
                <input
                  value={sec.heading}
                  onChange={(e) => {
                    const next = [...docSections];
                    next[i] = { ...next[i], heading: e.target.value };
                    setDocSections(next);
                  }}
                  placeholder="Section heading"
                  className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-sora text-sm focus:outline-none focus:border-primary"
                />
                <input
                  value={sec.anchor}
                  onChange={(e) => {
                    const next = [...docSections];
                    next[i] = { ...next[i], anchor: e.target.value };
                    setDocSections(next);
                  }}
                  placeholder="Anchor id"
                  className="w-40 p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => setDocSections(docSections.filter((_, j) => j !== i))}
                  className="p-sm text-on-surface-muted hover:text-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {sec.items.map((item, j) => (
                <div key={j} className="ml-md mb-sm p-sm bg-surface border border-border-default">
                  <div className="flex items-center gap-sm mb-xs">
                    <input
                      value={item.question}
                      onChange={(e) => {
                        const next = [...docSections];
                        const items = [...next[i].items];
                        items[j] = { ...items[j], question: e.target.value };
                        next[i] = { ...next[i], items };
                        setDocSections(next);
                      }}
                      placeholder="Question"
                      className="flex-1 p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => {
                        const next = [...docSections];
                        next[i] = { ...next[i], items: next[i].items.filter((_, k) => k !== j) };
                        setDocSections(next);
                      }}
                      className="p-sm text-on-surface-muted hover:text-error transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <textarea
                    value={item.answer.join("\n\n")}
                    onChange={(e) => {
                      const next = [...docSections];
                      const items = [...next[i].items];
                      items[j] = { ...items[j], answer: e.target.value.split("\n\n") };
                      next[i] = { ...next[i], items };
                      setDocSections(next);
                    }}
                    placeholder="Answer (separate blocks with blank lines)"
                    rows={3}
                    className="w-full p-sm bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary resize-y"
                  />
                </div>
              ))}
              <button
                onClick={() => {
                  const next = [...docSections];
                  next[i] = { ...next[i], items: [...next[i].items, { question: "", answer: [""] }] };
                  setDocSections(next);
                }}
                className="ml-md text-xs text-primary hover:text-primary-hover font-dm-sans"
              >
                + Add Q&A item
              </button>
            </div>
          ))}
          <button
            onClick={() => setDocSections([...docSections, { number: "", heading: "", anchor: "", items: [{ question: "", answer: [""] }] }])}
            className="inline-flex items-center gap-sm text-sm text-primary hover:text-primary-hover font-dm-sans"
          >
            <Plus className="w-4 h-4" /> Add section
          </button>
        </div>
      )}

      {/* Test-specific fields */}
      {type === "test" && (
        <div className="space-y-lg">
          <div className="grid grid-cols-3 gap-lg">
            <div>
              <label className="font-sora text-sm text-on-surface block mb-xs">Format</label>
              <select
                value={testFormat}
                onChange={(e) => setTestFormat(e.target.value as "written" | "oral" | "hybrid")}
                className="w-full p-md bg-surface border border-border-default text-on-surface font-dm-sans text-sm focus:outline-none focus:border-primary"
              >
                <option value="written">Written</option>
                <option value="oral">Oral</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <TextField label="Est. Minutes" value={String(estimatedMinutes)} onChange={(v) => setEstimatedMinutes(Number(v))} />
            <TextField label="Passing Score" value={String(passingScore)} onChange={(v) => setPassingScore(Number(v))} />
          </div>
        </div>
      )}

      {/* Podcast-specific fields */}
      {type === "podcast" && (
        <div className="space-y-lg">
          <div className="grid grid-cols-2 gap-lg">
            <TextField label="Episode Label" value={episodeLabel} onChange={setEpisodeLabel} placeholder="EPISODE 1 // JAN 24" />
            <TextField label="Duration" value={duration} onChange={setDuration} placeholder="30 MIN" />
          </div>
          <TextField label="Summary" value={podcastSummary} onChange={setPodcastSummary} placeholder="Full episode summary" multiline />
        </div>
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

      {/* Actions */}
      <div className="flex items-center gap-md">
        <button
          onClick={handleSave}
          disabled={saving || !title || !slug}
          className="px-xl py-md bg-primary text-on-primary font-sora text-label-caps uppercase tracking-widest hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : status === "published" ? "Publish" : "Save Draft"}
        </button>
      </div>
    </div>
  );
}
