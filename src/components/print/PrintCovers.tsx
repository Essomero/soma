import { md } from "@/lib/markdown";
import type { CollectionCover } from "@/types";

export type CoverPattern = NonNullable<CollectionCover["pattern"]>;

const PATTERNS: CoverPattern[] = ["rings", "grid", "stack"];

/** Simple deterministic hash so a slug always maps to the same motif. */
export function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Runtime motif choice. An explicit per-collection override wins, else hash. */
export function pickPattern(slug: string, override?: CoverPattern): CoverPattern {
  if (override) return override;
  return PATTERNS[hashSlug(slug) % PATTERNS.length];
}

/** Deterministic PRNG (mulberry32) so a slug always draws the same composition. */
function rngFor(slug: string): () => number {
  let a = hashSlug(slug) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface MotifShape {
  sw: number;
  fill?: boolean;
}

export interface MotifParts {
  pattern: CoverPattern;
  circles: Array<{ cx: number; cy: number; r: number } & MotifShape>;
  lines: Array<{ x1: number; y1: number; x2: number; y2: number } & MotifShape>;
  rects: Array<{ x: number; y: number; w: number; h: number; rx?: number } & MotifShape>;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Full composition for a slug. Pure function of slug, auditable for uniqueness. */
export function motifParts(slug: string, override?: CoverPattern): MotifParts {
  const pattern = pickPattern(slug, override);
  const rand = rngFor(`${slug}:${pattern}`);
  const circles: MotifParts["circles"] = [];
  const lines: MotifParts["lines"] = [];
  const rects: MotifParts["rects"] = [];

  if (pattern === "rings") {
    const cx = 150 + rand() * 100;
    const cy = 58 + rand() * 44;
    const maxR = Math.min(46 + rand() * 22, cx - 24, 376 - cx, cy - 14, 146 - cy);
    const n = 2 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const r = n === 1 ? maxR : maxR - (i * (maxR - 12)) / (n - 1);
      circles.push({ cx, cy, r, sw: 1.5 });
    }
    circles.push({ cx, cy, r: 8 + rand() * 5, sw: 0, fill: true });
    const sats = Math.floor(rand() * 3);
    for (let i = 0; i < sats; i++) {
      circles.push({ cx: 28 + rand() * 344, cy: 24 + rand() * 112, r: 2.5 + rand() * 1.5, sw: 0, fill: true });
    }
  }

  if (pattern === "grid") {
    const rows = 2 + Math.floor(rand() * 3);
    const top = 28 + rand() * 16;
    const bottom = 132 - rand() * 16;
    for (let i = 0; i < rows; i++) {
      const y = rows === 1 ? (top + bottom) / 2 : top + (i * (bottom - top)) / (rows - 1);
      lines.push({ x1: 20, y1: y, x2: 380, y2: y, sw: 1 });
    }
    const cols = 3 + Math.floor(rand() * 3);
    const left = 28 + rand() * 40;
    const right = 372 - rand() * 40;
    for (let i = 0; i < cols; i++) {
      const x = cols === 1 ? (left + right) / 2 : left + (i * (right - left)) / (cols - 1);
      lines.push({ x1: x, y1: 16, x2: x, y2: 144, sw: 1 });
    }
    const w = 48 + rand() * 64;
    const h = 40 + rand() * 44;
    const x = clamp(200 - w / 2 + (rand() * 80 - 40), 20, 380 - w);
    const y = clamp(80 - h / 2 + (rand() * 32 - 16), 16, 144 - h);
    rects.push({ x, y, w, h, sw: 2 });
    circles.push({ cx: x + w / 2, cy: y + h / 2, r: 4 + rand() * 3, sw: 0, fill: true });
  }

  if (pattern === "stack") {
    const n = 3 + Math.floor(rand() * 3);
    const barH = 18 + rand() * 6;
    const gap = 6;
    const total = n * barH + (n - 1) * gap;
    const startY = clamp(80 - total / 2 + (rand() * 16 - 8), 16, 144 - total);
    const wTop = 110 + rand() * 60;
    const step = 12 + rand() * 28;
    for (let i = 0; i < n; i++) {
      const w = wTop + i * step;
      const x = clamp(200 - w / 2 + (rand() * 40 - 20), 20, 380 - w);
      rects.push({ x, y: startY + i * (barH + gap), w, h: barH, rx: 4, sw: 1.5 });
    }
    circles.push({ cx: clamp(200 + (rand() * 60 - 30), 20, 380), cy: Math.max(8, startY - 12), r: 4 + rand() * 2, sw: 0, fill: true });
  }

  return { pattern, circles, lines, rects };
}

/** Compact signature used to prove no two collections share a composition. */
export function motifSignature(slug: string, override?: CoverPattern): string {
  const p = motifParts(slug, override);
  const n = (v: number) => Math.round(v * 10);
  return [
    p.pattern,
    ...p.circles.map((c) => `c${n(c.cx)},${n(c.cy)},${n(c.r)}`),
    ...p.lines.map((l) => `l${n(l.x1)},${n(l.y1)},${n(l.x2)},${n(l.y2)}`),
    ...p.rects.map((r) => `r${n(r.x)},${n(r.y)},${n(r.w)},${n(r.h)}`),
  ].join("|");
}

/** Decorative vector motif. Drawn at render time, sharp at any print size. */
export function CoverMotif({
  slug,
  pattern,
  className = "",
}: {
  slug: string;
  pattern?: CoverPattern;
  className?: string;
}) {
  const parts = motifParts(slug, pattern);
  const opacity = parts.pattern === "grid" ? 0.55 : 0.7;
  return (
    <svg
      viewBox="0 0 400 160"
      role="img"
      aria-hidden="true"
      className={`w-full text-primary ${className}`}
      fill="none"
      stroke="currentColor"
    >
      <g opacity={opacity}>
        {parts.lines.map((l, i) => (
          <line key={`l${i}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={l.sw} />
        ))}
        {parts.rects.map((r, i) => (
          <rect key={`r${i}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx ?? 0} strokeWidth={r.sw} />
        ))}
        {parts.circles.map((c, i) =>
          c.fill ? (
            <circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} fill="currentColor" stroke="none" />
          ) : (
            <circle key={`c${i}`} cx={c.cx} cy={c.cy} r={c.r} strokeWidth={c.sw} />
          ),
        )}
      </g>
    </svg>
  );
}

interface FrontProps {
  typeLabel: string;
  title: string;
  /** Resolved standfirst markdown: cover.frontBlurb ?? tagline ?? description. */
  blurb: string;
  authorName: string;
  date: string;
  itemCount: number;
  itemNoun: string;
  totalMinutes: number;
  slug: string;
  pattern?: CoverPattern;
  edition?: string;
  /** Raw SVG markup from the cover-art registry. Omitted = seeded motif. */
  art?: string;
}

/** Collection front cover. Own page: ends with a page break. */
export function PrintCoverFront({
  typeLabel,
  title,
  blurb,
  authorName,
  date,
  itemCount,
  itemNoun,
  totalMinutes,
  slug,
  pattern,
  edition = "Print Edition",
  art,
}: FrontProps) {
  return (
    <section className="break-after-page flex min-h-[75vh] flex-col py-10 print:min-h-[250mm] print:py-2">
      <p className="font-sora text-xs font-bold uppercase tracking-widest text-primary mb-4">
        {typeLabel} · {edition} // Soma
      </p>
      <h1 className="font-sora text-4xl sm:text-5xl font-extrabold text-on-surface leading-tight tracking-tight mb-6">
        {title}
      </h1>
      <div className="flex flex-1 items-center justify-center py-6">
        {art ? (
          <div
            className="h-64 w-full sm:h-80 print:h-[80mm] [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: art }}
          />
        ) : (
          <CoverMotif slug={slug} pattern={pattern} className="h-64 w-full sm:h-80 print:h-[80mm]" />
        )}
      </div>
      <div>
      {blurb && (
        <div
          className="font-dm-sans text-lg text-on-surface-variant italic leading-relaxed mb-8"
          dangerouslySetInnerHTML={{ __html: md(blurb) }}
        />
      )}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6 font-sora text-xs pt-6 border-t border-border-default/60">
        <div>
          <dt className="text-on-surface-muted uppercase tracking-wider mb-1">Author</dt>
          <dd className="font-semibold text-on-surface">{authorName}</dd>
        </div>
        <div>
          <dt className="text-on-surface-muted uppercase tracking-wider mb-1">Date</dt>
          <dd className="font-semibold text-on-surface">{date}</dd>
        </div>
        <div>
          <dt className="text-on-surface-muted uppercase tracking-wider mb-1">Length</dt>
          <dd className="font-semibold text-on-surface">
            {itemCount} {itemNoun}
          </dd>
        </div>
        <div>
          <dt className="text-on-surface-muted uppercase tracking-wider mb-1">Reading Time</dt>
          <dd className="font-semibold text-on-surface">~{totalMinutes} mins</dd>
        </div>
      </dl>
      </div>
    </section>
  );
}

interface OpenerProps {
  kicker: string;
  /** Big numeral, e.g. "03". Omitted for single-piece openers. */
  indexLabel?: string;
  title: string;
  standfirst?: string;
  meta?: string;
  /** Up to 3 section headings. Omitted = no box. */
  goals?: string[];
}

/** Lesson/chapter opener. First page of a lesson, no front/back covers. */
export function PrintLessonOpener({ kicker, indexLabel, title, standfirst, meta, goals }: OpenerProps) {
  const items = (goals ?? []).filter(Boolean).slice(0, 3);
  return (
    <div className="mb-8 pb-6 border-b border-border-default/60 avoid-break break-after-avoid">
      <div className="flex items-baseline gap-4 mb-3">
        {indexLabel && (
          <span className="font-sora text-5xl font-extrabold text-primary/30 tabular-nums leading-none">
            {indexLabel}
          </span>
        )}
        <div>
          <p className="font-sora text-xs font-bold text-primary uppercase tracking-widest">{kicker}</p>
          {meta && <p className="font-sora text-xs text-on-surface-muted mt-1">{meta}</p>}
        </div>
      </div>
      <h2 className="font-sora text-2xl sm:text-3xl font-extrabold text-on-surface leading-tight mb-3">
        {title}
      </h2>
      {standfirst && (
        <div
          className="font-dm-sans text-sm text-on-surface-muted italic leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: md(standfirst) }}
        />
      )}
      {items.length > 0 && (
        <div className="rounded-lg border border-border-default bg-surface-container-low p-4">
          <p className="font-sora text-xs font-bold uppercase tracking-widest text-on-surface mb-2">
            In this lesson
          </p>
          <ol className="list-decimal pl-5 space-y-1 font-dm-sans text-sm text-on-surface-variant">
            {items.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

interface BackProps {
  title: string;
  typeLabel: string;
  /** Resolved markdown: cover.backBlurb ?? description. */
  blurb: string;
  livePath: string;
  date: string;
  totalMinutes: number;
  itemCount: number;
  itemNoun: string;
  highlights: string[];
}

/** Collection back cover. Own page: starts with a page break. */
export function PrintCoverBack({
  title,
  typeLabel,
  blurb,
  livePath,
  date,
  totalMinutes,
  itemCount,
  itemNoun,
  highlights,
}: BackProps) {
  return (
    <section className="break-before-page py-10 print:py-8">
      <p className="font-sora text-xs font-bold uppercase tracking-widest text-primary mb-4">
        About this edition
      </p>
      <h2 className="font-sora text-2xl font-extrabold text-on-surface leading-tight mb-4">
        {title}
      </h2>
      {blurb && (
        <div
          className="font-dm-sans text-base text-on-surface-variant leading-relaxed mb-8"
          dangerouslySetInnerHTML={{ __html: md(blurb) }}
        />
      )}
      {highlights.length > 0 && (
        <div className="mb-8">
          <p className="font-sora text-xs font-bold uppercase tracking-widest text-on-surface mb-3">
            Inside · {itemCount} {itemNoun}
          </p>
          <ol className="list-decimal pl-5 space-y-1 font-dm-sans text-sm text-on-surface-variant">
            {highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ol>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-6 font-sora text-xs pt-6 border-t border-border-default/60">
        <div>
          <dt className="text-on-surface-muted uppercase tracking-wider mb-1">Published</dt>
          <dd className="font-semibold text-on-surface">{date}</dd>
        </div>
        <div>
          <dt className="text-on-surface-muted uppercase tracking-wider mb-1">Reading Time</dt>
          <dd className="font-semibold text-on-surface">~{totalMinutes} mins</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-on-surface-muted uppercase tracking-wider mb-1">Live version</dt>
          <dd className="font-semibold text-on-surface break-all">{livePath}</dd>
        </div>
      </dl>
      <p className="font-sora text-xs text-on-surface-muted mt-8">
        {typeLabel} · Soma Print Edition
      </p>
    </section>
  );
}
