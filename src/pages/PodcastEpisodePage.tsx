import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Star, User, PenLine, ChevronLeft, ChevronRight, Printer, Loader2 } from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import AudioPlayer from "@/components/ui/AudioPlayer";
import ShareButtons from "@/components/ui/ShareButtons";
import PrintButton from "@/components/ui/PrintButton";
import Comments from "@/components/ui/Comments";
import { contentToMarkdown, md } from "@/lib/markdown";
import { useContentItem, useContentList } from "@/lib/content";
import type { PodcastEpisodeFull } from "@/types";
import { usePageMeta } from "@/hooks/usePageMeta";
import SafeImage from "@/components/ui/SafeImage";

export default function PodcastEpisodePage() {
  const { slug } = useParams<{ slug: string }>();
  const { isOwner } = useAuth();
  const transcriptRef = useRef<HTMLDivElement>(null);

  const { data: episode, loading } = useContentItem<PodcastEpisodeFull>("podcast", slug);
  const { data: episodes } = useContentList<PodcastEpisodeFull>("podcast");
  const allEpisodes = episodes ?? [];
  usePageMeta({ title: episode?.title, description: episode?.summary || episode?.description, image: episode?.coverImage || episode?.image });

  // ── Prev / Next ──────────────────────────────────────
  const sortedByDate = allEpisodes.filter((ep) => ep.slug).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)); // seed sequence, not list order
  const idx = episode ? sortedByDate.findIndex((ep) => ep.slug === episode.slug) : -1;
  const prev = idx > 0 ? sortedByDate[idx - 1] : null;
  const next = idx >= 0 && idx < sortedByDate.length - 1 ? sortedByDate[idx + 1] : null;

  // ── Transcript sync ─────────────────────────────────
  const [activeIdx, setActiveIdx] = useState(0);
  const [seekReq, setSeekReq] = useState<{ time: number; req: number } | null>(null);
  const synced = episode?.transcript?.some((l) => l.start != null) ?? false;
  const turnRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toSeconds = (s: string) => {
    const p = s.split(":").map(Number);
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
  };

  const seekToTime = useCallback((time: number) => {
    setSeekReq((r) => ({ time, req: (r?.req ?? 0) + 1 }));
  }, []);
  const handleTimeUpdate = useCallback((t: number) => {
    const tr = episode?.transcript;
    if (!tr || tr.length === 0) return;
    let idx = 0;
    for (let i = 0; i < tr.length; i++) {
      if ((tr[i].start ?? 0) <= t) idx = i;
      else break;
    }
    setActiveIdx((prev) => (prev === idx ? prev : idx));
  }, [episode]);

  useEffect(() => {
    turnRefs.current[activeIdx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeIdx]);

  // Body text for comments context
  const bodyText = episode?.transcript
    ? episode.transcript.map((l) => `${l.speaker}: ${l.text}`).join("\n")
    : episode?.summary || "";

  if (loading) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-on-surface-muted" />
      </div>
    );
  }

  if (!episode) return <Navigate to="/podcast" replace />;

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[70vh] flex flex-col justify-end px-gutter md:px-margin-desktop py-giant overflow-hidden max-w-readme mx-auto">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        <div className="relative z-10 grid grid-cols-12 gap-lg items-end">
          <div className="col-span-12 lg:col-span-8">
            <AccentBar variant="small" className="mb-md" />
            <span className="font-sora text-metadata-tag uppercase tracking-[2px] text-primary mb-xs block">
              Soma Podcast // {episode.number || episode.episode}
            </span>
            <h1 className="font-sora text-display-lg-mobile md:text-display-lg text-on-surface mb-lg max-w-4xl">
              {episode.title}
            </h1>
            <p className="font-dm-sans text-body-base text-on-surface-variant max-w-2xl text-lg md:text-xl leading-relaxed" dangerouslySetInnerHTML={{ __html: md(episode.description) }} />
            <div className="mt-md">
              <PrintButton to={`/podcast/${slug}/print`} compact />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 flex lg:justify-end">
            <div className="relative w-64 h-64 md:w-80 md:h-80 group">
              <div className="absolute inset-0 bg-secondary-container blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <SafeImage
                alt={episode.coverAlt || episode.imageAlt}
                className="relative z-10 w-full h-full object-cover rounded-xl border border-border-default shadow-2xl"
                src={episode.coverImage || episode.image}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Audio Player */}
      {episode.audioUrl && (
        <AudioPlayer
          audioUrl={episode.audioUrl}
          duration={episode.duration}
          durationSeconds={episode.durationSeconds}
          episodeSlug={episode.slug}
          title={episode.title}
          onTimeUpdate={synced ? handleTimeUpdate : undefined}
          seekTo={seekReq}
        />
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-12 gap-giant px-gutter md:px-margin-desktop py-giant max-w-readme mx-auto">
        {/* Main Content */}
        <div className="col-span-12 lg:col-span-8 space-y-giant">
          {/* Episode Summary */}
          {episode.summary && (
            <section>
              <AccentBar variant="small" className="mb-md" />
              <h2 className="font-sora text-article-title text-on-surface mb-md">Episode Summary</h2>
              <p className="font-dm-sans text-body-base text-on-surface-variant leading-relaxed text-lg mb-xl">
                {episode.summary}
              </p>
              {episode.segments && (
                <div className="space-y-md border-l-2 border-border-default pl-xl">
                  {episode.segments.map((seg) => (
                    <button key={seg.time} onClick={() => seekToTime(toSeconds(seg.time))} className="flex gap-md group text-left w-full rounded-md px-2 -mx-2 py-1 hover:bg-surface-container transition-colors">
                      <span className="font-sora text-label-caps text-primary pt-1 shrink-0">{seg.time}</span>
                      <div>
                        <p className="font-dm-sans font-bold text-on-surface">{seg.title}</p>
                        <p className="font-dm-sans text-sm text-on-surface-muted">{seg.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Featured Guests */}
          {episode.guests && episode.guests.length > 0 && (
            <section>
              <AccentBar variant="small" className="mb-md" />
              <h2 className="font-sora text-article-title text-on-surface mb-lg">Featured Guests</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {episode.guests.map((guest) => (
                  <div
                    key={guest.name}
                    className="bg-surface border border-border-default rounded-xl p-lg flex flex-col gap-md hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-md">
                      <div className={`w-16 h-16 rounded-full overflow-hidden border-2 border-${guest.color === "primary" ? "primary" : "secondary"}-container p-1`}>
                        <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center">
                          {guest.color === "primary" ? (
                            <User className="w-8 h-8 text-primary" />
                          ) : (
                            <PenLine className="w-8 h-8 text-secondary" />
                          )}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-sora text-xl text-on-surface">{guest.name}</h3>
                        <p className={`font-sora text-xs uppercase tracking-wider text-${guest.color}`}>{guest.role}</p>
                      </div>
                    </div>
                    <p className="font-dm-sans text-on-surface-variant text-sm" dangerouslySetInnerHTML={{ __html: md(guest.description) }} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Transcript */}
          {episode.transcript && episode.transcript.length > 0 && (
            <section ref={transcriptRef} className="bg-surface-lowest border border-border-default rounded-xl overflow-hidden">
              <div className="flex justify-between items-center px-lg py-md border-b border-border-default bg-surface">
                <div className="flex items-center gap-sm">
                  <PenLine className="w-4 h-4 text-primary" />
                  <h2 className="font-sora text-metadata-tag uppercase tracking-widest text-on-surface">
                    Full Transcript
                  </h2>
                </div>
                <Link
                  to={`/podcast/${slug}/print`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="print:hidden flex items-center gap-xs font-sora text-label-caps text-primary hover:underline"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Download PDF
                </Link>
              </div>
              <div className="p-lg h-96 overflow-y-auto font-dm-sans text-on-surface-variant space-y-lg text-sm leading-relaxed">
                {episode.transcript.map((line, i) => (
                  <div
                    key={i}
                    ref={(el) => { turnRefs.current[i] = el; }}
                    onClick={() => { if (line.start != null) seekToTime(line.start); }}
                    title={line.start != null ? "Jump audio here" : undefined}
                    className={`rounded-md px-2 -mx-2 py-1 transition-colors ${line.start != null ? "cursor-pointer" : ""} ${synced && i === activeIdx ? "bg-primary/10" : ""}`}
                  >
                    <p className="font-bold text-on-surface mb-1 uppercase tracking-tighter text-xs">
                      {line.speaker}:
                    </p>
                    <p>{line.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Episode Navigation */}
          <section className="flex justify-between items-center pt-xl border-t border-border-default">
            {prev ? (
              <Link
                to={`/podcast/${prev.slug}`}
                className="flex items-center gap-sm text-on-surface-muted hover:text-primary transition-colors group"
              >
                <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <div>
                  <span className="font-sora text-xs uppercase text-on-surface-muted block">Previous</span>
                  <span className="font-sora text-sm text-on-surface group-hover:text-primary transition-colors">{prev.title}</span>
                </div>
              </Link>
            ) : <div />}
            {next ? (
              <Link
                to={`/podcast/${next.slug}`}
                className="flex items-center gap-sm text-on-surface-muted hover:text-primary transition-colors text-right group"
              >
                <div>
                  <span className="font-sora text-xs uppercase text-on-surface-muted block">Next</span>
                  <span className="font-sora text-sm text-on-surface group-hover:text-primary transition-colors">{next.title}</span>
                </div>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : <div />}
          </section>

          {/* Comments */}
          {slug && (
            <Comments
              storySlug={slug}
              storyContext={{ title: episode.title, body: bodyText }}
            />
          )}
        </div>

        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-4 space-y-giant">
          {/* Share */}
          <ShareButtons
            variant="row"
            publicToggleSlug={isOwner && slug ? slug : undefined}
            markdownContent={contentToMarkdown({
              title: episode.title,
              intro: episode.summary || episode.description,
              body: bodyText,
            })}
          />

          {/* Related Reading */}
          {episode.relatedReading && episode.relatedReading.length > 0 && (
            <section>
              <AccentBar variant="small" className="mb-md" />
              <h3 className="font-sora text-metadata-tag uppercase tracking-widest text-on-surface mb-lg">
                Related Reading
              </h3>
              <div className="space-y-lg">
                {episode.relatedReading.map((item) => (
                  <Link key={item.title} to={item.href} className="block group">
                    {item.image && (
                      <div className="mb-sm rounded-lg overflow-hidden border border-border-default aspect-[16/9]">
                        <SafeImage
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          src={item.image}
                        />
                      </div>
                    )}
                    <span className={`font-sora text-[10px] uppercase text-${item.color} mb-1 block`}>
                      // {item.tag}
                    </span>
                    <h4 className={`font-sora text-lg text-on-surface group-hover:text-${item.color} transition-colors leading-tight`}>
                      {item.title}
                    </h4>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Suggest a topic */}
          <section className="text-center p-lg border-2 border-dashed border-border-default rounded-xl">
            <Star className="w-9 h-9 text-primary mx-auto mb-md" />
            <h3 className="font-sora text-lg text-on-surface mb-sm">Suggest a topic</h3>
            <p className="font-dm-sans text-sm text-on-surface-muted mb-lg">
              Know a topic that deserves a deep dive? Let us know.
            </p>
            <a className="inline-block font-sora text-label-caps text-primary hover:underline" href="https://github.com/Essomero/soma/issues/new" target="_blank" rel="noopener noreferrer">
              Suggest Now →
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}
