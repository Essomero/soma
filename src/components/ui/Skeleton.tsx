import { cn } from "@/lib/utils";

/** Base pulsing placeholder block. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-surface-container-high", className)} />;
}

/** Stacked prose bars : last line of each group shorter, like real paragraphs. */
function ProseBars({ lines = 6, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-sm", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Standard index-page hero header: AccentBar + kicker + display title + description. */
export function SkeletonIndexHeader({ withDescription = true }: { withDescription?: boolean }) {
  return (
    <header className="mb-giant">
      <Skeleton className="h-1.5 w-16 mb-md" />
      <Skeleton className="h-3 w-28 mb-sm" />
      <Skeleton className="h-10 md:h-14 w-2/3 max-w-xl mb-lg" />
      {withDescription && <Skeleton className="h-4 w-2/5 max-w-md" />}
    </header>
  );
}

/** 2-col feature cards (books / courses / docs / series) : aspect-video cover + body copy. */
export function SkeletonFeatureGrid() {
  return (
    <>
      <div className="flex justify-end mb-lg">
        <Skeleton className="h-8 w-44" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-low border border-border-default rounded-xl overflow-hidden">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="p-xl space-y-md">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-3 w-32 pt-lg" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** 2-col test cards : 16:9 cover w/ gradient + status overlays, then title + stat rows. */
export function SkeletonTestGrid() {
  return (
    <>
      <div className="flex flex-wrap gap-sm mt-xl pt-sm mb-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-24 rounded-full" />
        ))}
      </div>
      <div className="flex justify-end mb-lg">
        <Skeleton className="h-8 w-44" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-container-low border border-border-default rounded-xl overflow-hidden">
            <div className="relative">
              <Skeleton className="aspect-[16/9] w-full rounded-none" />
              <div className="absolute top-md left-md flex gap-xs">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
            <div className="p-xl space-y-md">
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** 3-col ArticleCard grid (archive / stories "More") : rounded cover + tag + title + excerpt. */
export function SkeletonArticleGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-4/5" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Stories index : staggered 12-col editorial grid, then "More Stories" article grid. */
export function SkeletonEditorialGrid() {
  return (
    <>
      <div className="grid grid-cols-12 gap-lg md:gap-xxl">
        {/* Featured card (8-col) */}
        <div className="col-span-12 md:col-span-8">
          <div className="border border-border-default bg-surface">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="p-lg md:p-xl space-y-md">
              <div className="flex gap-xs">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
        {/* Sidebar (4-col) */}
        <div className="col-span-12 md:col-span-4 flex flex-col gap-lg">
          <div className="p-lg border-t-4 border-secondary bg-surface-lowest space-y-md">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-5/6" />
          </div>
          <div className="p-lg border-t-4 border-primary bg-surface-lowest space-y-md">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
          <Skeleton className="aspect-square w-full" />
        </div>
        {/* Course card (5-col) */}
        <div className="col-span-12 md:col-span-5">
          <div className="border border-border-default bg-surface">
            <Skeleton className="aspect-[4/5] w-full rounded-none" />
            <div className="p-lg space-y-md">
              <div className="flex gap-xs">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
        {/* Long read (7-col) */}
        <div className="col-span-12 md:col-span-7">
          <div className="h-full border border-border-default bg-surface p-xl md:p-xxl bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-surface-container-high/50 to-surface">
            <Skeleton className="h-1 w-12 mb-4" />
            <div className="flex gap-xs mb-md">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-4/5 mb-lg" />
            <ProseBars lines={3} />
            <div className="flex items-center gap-md mt-lg">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-sm">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-giant pt-giant border-t border-border-default">
        <Skeleton className="h-7 w-48 mb-xl" />
        <SkeletonArticleGrid count={6} />
      </section>
    </>
  );
}

/** Guides index : bento featured (8-col) + sidebar cards (4-col), then explore grid. */
export function SkeletonGuidesGrid() {
  return (
    <>
      <header className="mb-xxl max-w-4xl">
        <Skeleton className="h-1.5 w-16 mb-sm" />
        <Skeleton className="h-9 w-40 mb-md" />
        <Skeleton className="h-5 w-3/4" />
      </header>

      <section className="mb-giant">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          <div className="md:col-span-8">
            <Skeleton className="aspect-video w-full mb-md" />
            <div className="flex flex-col gap-xs">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-4/5" />
              <Skeleton className="h-3.5 w-full" />
              <div className="flex gap-xs mt-md">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>
          <div className="md:col-span-4 flex flex-col gap-lg">
            {[0, 1].map((i) => (
              <div key={i}>
                <Skeleton className="aspect-[1.67] w-full mb-md" />
                <Skeleton className="h-3 w-24 mb-xs" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-end border-b border-border-default pb-sm mb-lg">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-border-default bg-surface-container p-lg space-y-md">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-24 pt-md" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

/** Podcast index : full-width hero (7-col text + 5-col cover) + recent episode covers. */
export function SkeletonPodcastIndex() {
  return (
    <>
      <section className="relative w-full overflow-hidden min-h-[70vh] flex items-center bg-surface-lowest">
        <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop w-full grid grid-cols-1 lg:grid-cols-12 gap-xxl py-giant items-center">
          <div className="lg:col-span-7 space-y-lg">
            <Skeleton className="h-1.5 w-16 mb-sm" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-10 md:h-14 w-4/5" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <div className="flex gap-md pt-lg">
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-44" />
            </div>
          </div>
          <div className="lg:col-span-5">
            <Skeleton className="aspect-[1.67] w-full rounded-xl" />
          </div>
        </div>
      </section>

      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant">
        <div className="flex justify-between items-end mb-xxl border-b border-border-default pb-lg">
          <div className="space-y-sm">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      </section>
    </>
  );
}

/** Book / course / series detail : full-bleed hero with cover bleed + body, then chapter rows. */
export function SkeletonCollectionDetail({ rows = 4 }: { rows?: number }) {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border-default">
        <div className="absolute inset-0 z-0">
          <Skeleton className="w-full h-full rounded-none opacity-30" />
        </div>
        <div className="relative z-10 max-w-readme mx-auto px-gutter md:px-margin-desktop pt-32 pb-giant">
          <Skeleton className="h-1.5 w-20 mb-md" />
          <Skeleton className="h-4 w-20 mb-sm" />
          <Skeleton className="h-10 md:h-14 w-3/5 max-w-4xl mb-lg" />
          <Skeleton className="h-5 w-2/5 max-w-2xl mb-lg" />
          <Skeleton className="h-4 w-1/3 max-w-xl mb-lg" />
          <div className="flex items-center gap-md">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-2" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-2" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-2" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="mt-lg w-full max-w-md h-1 rounded-full">
            <Skeleton className="h-1 w-full rounded-full" />
          </div>
        </div>
      </section>

      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant">
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-xl">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
          <div className="space-y-md">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="p-xl bg-surface-container-low border border-border-default rounded-xl">
                <div className="flex items-start gap-lg">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0 space-y-sm">
                    <div className="flex gap-sm items-center">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Doc / guide article : hero grid (8+4), 21:9 banner, sticky TOC sidebar + prose. */
export function SkeletonDocLayout() {
  return (
    <div className="pt-32 pb-giant">
      <article className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-end mb-giant">
          <div className="lg:col-span-8">
            <Skeleton className="h-1.5 w-16 mb-md" />
            <Skeleton className="h-4 w-24 mb-sm" />
            <Skeleton className="h-10 md:h-12 w-3/5 max-w-4xl mb-md" />
            <Skeleton className="h-5 w-2/5 max-w-2xl" />
          </div>
          <div className="lg:col-span-4 pb-sm flex lg:justify-end">
            <div className="flex flex-col gap-xs lg:text-right w-full">
              <Skeleton className="h-3 w-24 lg:ml-auto" />
              <Skeleton className="h-4 w-32 lg:ml-auto" />
              <Skeleton className="h-3 w-20 lg:ml-auto" />
              <div className="mt-sm flex gap-sm lg:justify-end">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        </div>

        <Skeleton className="aspect-[21/9] w-full mb-giant rounded-xl" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <aside className="lg:col-span-3 order-2 lg:order-1">
            <div className="sticky top-24 space-y-xl">
              <div className="border border-border-default rounded-lg p-lg space-y-sm">
                <Skeleton className="h-4 w-24 mb-md" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
              <Skeleton className="h-8 w-full" />
            </div>
          </aside>
          <div className="lg:col-span-9 order-1 lg:order-2">
            <ProseBars lines={7} />
            <Skeleton className="h-5 w-2/3 mt-giant" />
            <ProseBars lines={6} className="mt-md" />
          </div>
        </div>
      </article>
    </div>
  );
}

/** Story article : hero (8-col) with tag/byline, then sidebar card + featured image + prose. */
export function SkeletonStoryLayout() {
  return (
    <div className="pt-xxl">
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop mb-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
          <div className="md:col-span-8">
            <Skeleton className="h-1.5 w-16 mb-md" />
            <Skeleton className="h-4 w-24 mb-sm" />
            <Skeleton className="h-10 md:h-12 w-4/5 mb-md" />
            <Skeleton className="h-5 w-3/5 mb-xl" />
            <div className="flex flex-wrap items-center gap-sm mb-lg">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-2" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-2" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-2" />
              <Skeleton className="h-7 w-24" />
            </div>
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
      </section>

      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop mb-giant">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-giant">
          <aside className="md:col-span-3 space-y-xl border-t border-border-default pt-xl md:border-t-0 md:pt-0">
            <div className="bg-surface-container p-lg rounded-lg border border-outline-variant space-y-md">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </aside>
          <article className="md:col-span-8 space-y-xl">
            <Skeleton className="aspect-video w-full" />
            <ProseBars lines={8} />
            <ProseBars lines={6} />
          </article>
        </div>
      </section>
    </div>
  );
}

/** Podcast episode : 70vh hero w/ cover art, player bar, then summary/transcript + sidebar. */
export function SkeletonPodcastEpisodeLayout() {
  return (
    <div>
      <section className="relative min-h-[70vh] flex flex-col justify-end px-gutter md:px-margin-desktop py-giant overflow-hidden max-w-readme mx-auto">
        <div className="relative z-10 grid grid-cols-12 gap-lg items-end">
          <div className="col-span-12 lg:col-span-8">
            <Skeleton className="h-1.5 w-16 mb-md" />
            <Skeleton className="h-3 w-40 mb-xs" />
            <Skeleton className="h-10 md:h-14 w-3/5 mb-lg" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-1/2 mt-sm" />
            <div className="mt-md flex gap-sm">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4 flex lg:justify-end">
            <Skeleton className="w-64 h-64 md:w-80 md:h-80 rounded-xl" />
          </div>
        </div>
      </section>

      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
        <Skeleton className="h-16 w-full mb-giant" />
      </div>

      <div className="grid grid-cols-12 gap-giant px-gutter md:px-margin-desktop py-giant max-w-readme mx-auto">
        <div className="col-span-12 lg:col-span-8 space-y-giant">
          <section>
            <Skeleton className="h-1.5 w-16 mb-md" />
            <Skeleton className="h-7 w-48 mb-md" />
            <ProseBars lines={3} />
            <div className="space-y-md border-l-2 border-border-default pl-xl mt-lg">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-md">
                  <Skeleton className="h-3 w-10 shrink-0 pt-1" />
                  <div className="space-y-sm flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="bg-surface-lowest border border-border-default rounded-xl p-lg space-y-md">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </section>
        </div>
        <aside className="col-span-12 lg:col-span-4 space-y-giant">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </aside>
      </div>
    </div>
  );
}

/** Featured article : immersive 85vh hero w/ photo + bottom-type block, then sidebar + body. */
export function SkeletonFeaturedLayout() {
  return (
    <div>
      <header className="relative w-full min-h-[85vh] overflow-hidden">
        <Skeleton className="absolute inset-0 w-full h-full rounded-none object-cover" />
        <div className="relative z-10 min-h-[85vh] max-w-readme mx-auto flex flex-col justify-end px-gutter md:px-margin-desktop pt-24 pb-giant">
          <div className="max-w-4xl">
            <Skeleton className="h-1.5 w-20 mb-md" />
            <Skeleton className="h-4 w-24 mb-md" />
            <Skeleton className="h-10 md:h-14 w-4/5 mb-lg" />
            <Skeleton className="h-5 w-3/5" />
            <div className="mt-xl flex gap-md">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant grid grid-cols-1 md:grid-cols-12 gap-giant">
        <aside className="md:col-span-3 space-y-xl border-t border-border-default pt-xl md:border-t-0 md:pt-0">
          <div className="bg-surface-container p-lg rounded-lg border border-outline-variant space-y-md">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </aside>
        <article className="md:col-span-8 space-y-xl">
          <Skeleton className="h-5 w-3/4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-container-low p-6 rounded-lg border border-border-default space-y-md">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-2/3" />
              </div>
            ))}
          </div>
          <Skeleton className="h-7 w-2/3 pt-lg" />
          <ProseBars lines={7} />
          <Skeleton className="h-7 w-1/2 pt-lg" />
          <ProseBars lines={6} />
        </article>
      </section>
    </div>
  );
}

/** Learn index : 3-col note cards (border-2 brutalist style). */
export function SkeletonLearnIndexGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
      {Array.from({ length: 6 }).map((_, i) => (
        <article key={i} className="flex flex-col border-2 border-inverse-surface bg-surface p-lg space-y-md">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </article>
      ))}
    </div>
  );
}

/** Learn note article : back-link row + tag + title + meta, then prose. */
export function SkeletonLearnArticle() {
  return (
    <div className="pt-32 pb-xxl">
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop mb-giant">
        <div className="flex items-center gap-sm mb-lg">
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-1.5 w-16 mb-md" />
        <Skeleton className="h-4 w-16 mb-sm" />
        <Skeleton className="h-10 md:h-12 w-3/5 max-w-4xl mb-md leading-tight" />
        <Skeleton className="h-3 w-48" />
        <div className="flex items-center gap-xs mt-lg">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </section>
      <article className="max-w-readme mx-auto px-gutter md:px-margin-desktop mb-giant">
        <div className="max-w-3xl">
          <ProseBars lines={9} />
          <ProseBars lines={7} className="mt-giant" />
        </div>
      </article>
    </div>
  );
}

/** Admin dashboard : content table rows. */
export function SkeletonAdminRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-sm">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-md border border-border-default bg-surface p-md">
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-sm min-w-0">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Admin edit / learn editor : form field groups (label + input rows). */
export function SkeletonForm({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-xl">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-sm">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className={cn("h-10 w-full", i === 3 && "h-32")} />
        </div>
      ))}
      <div className="flex gap-sm">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

/** Test drill : sticky HUD (question pills + timer) + question card + action bar. */
export function SkeletonTestDrill() {
  return (
    <div className="pb-giant">
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border-default/60">
        <div className="max-w-4xl mx-auto px-gutter md:px-margin-desktop py-sm flex items-center justify-between gap-md">
          <div className="flex items-center gap-xs">
            <Skeleton className="h-3 w-12 mr-2" />
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="w-6 h-6" />
            ))}
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-gutter md:px-margin-desktop pt-24 md:pt-32">
        <div className="mb-lg flex flex-wrap items-center justify-between gap-sm">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-24" />
        </div>

        <div className="bg-surface-container-low border border-border-default rounded-xl p-xl md:p-xxl space-y-lg">
          <Skeleton className="h-7 w-3/4" />
          <ProseBars lines={4} />
          <div className="space-y-md pt-lg">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-md border border-border-default bg-surface p-md">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-md border-t border-border-default">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </main>
    </div>
  );
}

/** Homepage : hero (7-col text + 5-col 4:5 cover), staggered story grid, podcast section, secondary grid. */
export function SkeletonHome() {
  return (
    <div className="mx-auto max-w-readme px-6 py-12">
      {/* Hero : mirrors HeroSection */}
      <section className="mb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <Skeleton className="h-6 w-24 mb-4" />
            <Skeleton className="h-12 md:h-14 w-full mb-6" />
            <Skeleton className="h-5 w-4/5 mb-md" />
            <Skeleton className="h-5 w-1/2 mb-8" />
            <Skeleton className="h-11 w-40" />
          </div>
          <div className="lg:col-span-5">
            <Skeleton className="aspect-[4/5] w-full rounded-lg" />
          </div>
        </div>
      </section>

      {/* Staggered stories grid */}
      <section className="mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 items-start">
          {[0, 1, 2].map((i) => (
            <div key={i} className={i === 1 ? "lg:mt-16 flex flex-col gap-4" : "flex flex-col gap-4"}>
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          ))}
        </div>
      </section>

      {/* Podcast section */}
      <section className="mb-24 py-16 px-8 rounded-2xl bg-surface-low border border-surface-bright">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2 space-y-md">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-10 w-44" />
          </div>
          <div className="md:w-1/2 grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className={cn("aspect-square w-full rounded-lg", i % 2 === 1 && "lg:mt-8")} />
            ))}
          </div>
        </div>
      </section>

      {/* Secondary grid : featured guide 8-col + sidebar 4-col */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 flex flex-col gap-12">
          <div className="grid md:grid-cols-2 gap-8 bg-surface-low rounded-xl p-8 border border-surface-bright">
            <div className="flex flex-col justify-center gap-sm order-2 md:order-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="aspect-square w-full rounded-lg order-1 md:order-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-col gap-4">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-3.5 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-4 space-y-12">
          {[0, 1].map((i) => (
            <div key={i} className="p-8 rounded-xl bg-brand/5 border border-brand/20 space-y-md">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}