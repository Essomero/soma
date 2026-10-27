import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import ContentForm from "@/components/admin/ContentForm";
import AccentBar from "@/components/ui/AccentBar";
import { usePageMeta } from "@/hooks/usePageMeta";
import { ROUTE_BASE, CONTENT_TYPE_LABELS, type ContentType } from "@/lib/admin-prompts";
import type { AIDraft } from "@/components/admin/AIDraftPanel";
import type { SavePayload } from "@/components/admin/ContentForm";

// ── Row → draft conversion ───────────────────────────
// The GET response (mapRow in api/content.js) spreads body_json at the
// top level: category/author/date/tags/image live alongside intro/body/
// sections. We reshape into the AIDraft the form consumes.

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asRecordArray(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v) && v.every((x) => !!x && typeof x === "object" && !Array.isArray(x))) {
    return v as Record<string, unknown>[];
  }
  return [];
}

function asStringArray(v: unknown): string[] | undefined {
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v as string[];
  return undefined;
}

/** Mixed (string | ContentBlock)[] — keep strings, keep objects as blocks. */
function blockOrArray(v: unknown): (string | object)[] {
  if (!Array.isArray(v)) return [""];
  const out: (string | object)[] = [];
  for (const item of v) {
    if (typeof item === "string") out.push(item);
    else if (item && typeof item === "object" && !Array.isArray(item)) out.push(item);
  }
  return out.length > 0 ? out : [""];
}

function rowToDraft(row: Record<string, unknown>, type: ContentType): AIDraft {
  const author = (row.author && typeof row.author === "object" ? row.author : {}) as Record<string, unknown>;
  const draft: AIDraft = {
    type,
    reasoning: "",
    title: str(row.title),
    excerpt: str(row.excerpt),
    category: str(row.category),
    author: { name: str(author.name), handle: str(author.handle) || undefined },
    date: str(row.date),
    image: str(row.image) || undefined,
    imageAlt: str(row.imageAlt) || undefined,
    tags: asStringArray(row.tags),
    topics: asStringArray(row.topics),
    intro: str(row.intro),
    body: asStringArray(row.body) ?? [""],
  };

  // Rich text appendices
  draft.sections = asRecordArray(row.sections).map((s) => ({
    heading: str(s.heading),
    paragraphs: blockOrArray(s.paragraphs),
  }));
  draft.pullQuotes = asRecordArray(row.pullQuotes).map((q) => ({
    quote: str(q.quote),
    attribution: str(q.attribution) || undefined,
  }));
  draft.bentoHighlights = asRecordArray(row.bentoHighlights).map((b) => ({
    label: str(b.label),
    title: str(b.title),
    description: str(b.description),
  }));
  draft.references = asRecordArray(row.references).map((r) => ({
    title: str(r.title),
    url: str(r.url),
    description: str(r.description) || undefined,
  }));

  // Guide tips
  draft.tipCards = asRecordArray(row.tipCards).map((t) => ({
    icon: str(t.icon),
    bgClass: str(t.bgClass),
    iconColorClass: str(t.iconColorClass),
    title: str(t.title),
    description: str(t.description),
  }));

  // Collections
  draft.tagline = str(row.tagline) || undefined;
  draft.lessons = asRecordArray(row.lessons).map((c) => ({
    title: str(c.title),
    storySlug: str(c.storySlug),
    description: str(c.description) || undefined,
  }));
  draft.chapters = asRecordArray(row.chapters).map((c) => ({
    title: str(c.title),
    storySlug: str(c.storySlug),
    description: str(c.description) || undefined,
  }));
  draft.episodes = asRecordArray(row.episodes).map((c) => ({
    title: str(c.title),
    storySlug: str(c.storySlug),
    description: str(c.description) || undefined,
  }));

  // Doc: sections mean DocSection[] (number/heading/anchor/items)
  if (type === "doc") {
    draft.docSections = asRecordArray(row.sections).map((s) => ({
      number: str(s.number),
      heading: str(s.heading),
      anchor: str(s.anchor),
      items: asRecordArray(s.items).map((item) => ({
        question: str(item.question),
        answer: blockOrArray(item.answer),
      })),
    }));
    draft.sections = [];
  }

  // Test
  draft.format = (row.format === "oral" || row.format === "hybrid" ? row.format : "written") as "written" | "oral" | "hybrid";
  draft.estimatedMinutes = typeof row.estimatedMinutes === "number" ? row.estimatedMinutes : undefined;
  draft.passingScore = typeof row.passingScore === "number" ? row.passingScore : undefined;
  draft.sources = asRecordArray(row.sources).map((s) => ({
    type: str(s.type),
    storySlug: str(s.storySlug) || undefined,
    guideSlug: str(s.guideSlug) || undefined,
    docSlug: str(s.docSlug) || undefined,
    title: str(s.title) || undefined,
    url: str(s.url) || undefined,
  }));
  draft.questions = asRecordArray(row.questions).map((q) => ({
    id: str(q.id),
    type: str(q.type),
    question: str(q.question),
    options: asRecordArray(q.options).map((o) => ({ id: str(o.id), label: str(o.label) })),
    correctOptionIds: asStringArray(q.correctOptionIds),
    explanation: str(q.explanation) || undefined,
  }));

  // Podcast
  draft.episode = str(row.episode) || undefined;
  draft.duration = str(row.duration) || undefined;
  draft.summary = str(row.summary) || undefined;
  draft.segments = asRecordArray(row.segments).map((s) => ({
    time: str(s.time),
    title: str(s.title),
    description: str(s.description),
  }));
  draft.guests = asRecordArray(row.guests).map((g) => ({
    name: str(g.name),
    role: str(g.role),
    description: str(g.description),
  }));
  draft.relatedReading = asRecordArray(row.relatedReading).map((r) => ({
    tag: str(r.tag),
    title: str(r.title),
  }));

  return draft;
}

export default function AdminEditPage() {
  const { type = "", slug = "" } = useParams<{ type: string; slug: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<AIDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const contentType = ROUTE_BASE[type as ContentType] ? (type as ContentType) : null;

  usePageMeta({ title: "Edit Content", description: `Edit ${slug}` });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const r = await fetch(`/api/content?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`);
        if (r.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const row = (await r.json()) as Record<string, unknown>;
        if (!cancelled) setDraft(rowToDraft(row, type as ContentType));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [type, slug]);

  const handleSave = async (data: SavePayload) => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const bodyPayload = {
        ...data.body,
        category: data.category,
        author: data.author,
        date: data.date,
        tags: data.tags,
        topics: data.topics,
        image: data.image,
        imageAlt: data.imageAlt,
      };

      const r = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: data.slug,
          type: data.type,
          title: data.title,
          excerpt: data.excerpt,
          meta: {},
          body: bodyPayload,
          status: data.status,
        }),
      });

      if (!r.ok) {
        const errBody = await r.text().catch(() => "");
        throw new Error(`Save failed (${r.status}): ${errBody}`);
      }

      const baseRoute = ROUTE_BASE[data.type] || data.type;
      setSuccess(`"${data.title}" saved. Redirecting...`);
      setTimeout(() => navigate(`/${baseRoute}/${data.slug}`), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-32 pb-xxl max-w-readme mx-auto px-gutter md:px-margin-desktop">
      <header className="mb-xl">
        <AccentBar variant="small" className="mb-md" />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-sora text-metadata-tag text-primary uppercase tracking-widest mb-sm">
              // ADMIN
            </p>
            <h1 className="font-sora text-display-md text-on-surface">
              {contentType ? `Edit ${CONTENT_TYPE_LABELS[contentType]}` : "Edit Content"}
            </h1>
            <p className="font-dm-sans text-sm text-on-surface-muted mt-sm">
              /{type}/{slug}
            </p>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center gap-sm text-sm text-on-surface-muted hover:text-on-surface transition-colors font-dm-sans"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        </div>
      </header>

      {error && (
        <div className="mb-xl p-lg bg-surface-container border border-border-default border-l-4 border-l-error">
          <p className="font-sora text-sm text-error font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-xl p-lg bg-surface-container border border-border-default border-l-4 border-l-success">
          <p className="font-sora text-sm text-success font-medium">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-xxl">
          <Loader2 className="w-6 h-6 animate-spin text-on-surface-muted" />
        </div>
      ) : notFound ? (
        <div className="py-xxl text-center border border-dashed border-border-default">
          <p className="font-dm-sans text-sm text-on-surface-muted">
            Content not found or not visible. It may be private or deleted.
          </p>
        </div>
      ) : !contentType ? (
        <div className="py-xxl text-center border border-dashed border-border-default">
          <p className="font-dm-sans text-sm text-on-surface-muted">Unknown content type: {type}</p>
        </div>
      ) : draft ? (
        <section className="p-xl bg-surface border border-border-default">
          <ContentForm
              initial={draft}
              onSave={handleSave}
              onCancel={() => navigate("/admin")}
              saving={saving}
            />
        </section>
      ) : null}
    </div>
  );
}