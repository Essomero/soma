import { useState } from "react";
import { md } from "@/lib/markdown";
import { Link } from "react-router-dom";
import { BookOpen, ArrowRight } from "lucide-react";
import { SkeletonIndexHeader, SkeletonFeatureGrid } from "@/components/ui/Skeleton";
import AccentBar from "@/components/ui/AccentBar";
import LoadMore from "@/components/ui/LoadMore";
import { useContentList, sortContent } from "@/lib/content";
import type { SortKey } from "@/lib/content";
import SortControl from "@/components/ui/SortControl";
import type { CourseContent } from "@/types";
import { usePageMeta } from "@/hooks/usePageMeta";
import SafeImage from "@/components/ui/SafeImage";

export default function CoursesIndexPage() {
  const { data: courses, loading } = useContentList<CourseContent>("course");
  const [sort, setSort] = useState<SortKey>("newest");
  usePageMeta({ title: "Courses", description: "Ordered lessons that build on each other, with drills to prove every idea." });
  if (loading) {
    return (
      <div className="pt-32 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop">
        <SkeletonIndexHeader />
        <SkeletonFeatureGrid />
      </div>
    );
  }
  const active = sortContent((courses ?? []).filter((c) => !c.archived), sort);

  return (
    <div>
      <main className="pt-32 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop">
        <header className="mb-giant">
          <AccentBar variant="small" className="mb-md" />
          <p className="font-sora text-metadata-tag text-primary uppercase tracking-widest mb-sm">
            // COURSES
          </p>
          <h1 className="font-sora text-display-lg-mobile md:text-display-lg max-w-4xl text-on-surface">
            Structured <span className="text-gradient">learning</span> paths.
          </h1>
          <p className="font-dm-sans text-body-lg text-on-surface-muted mt-lg max-w-2xl">
            Multi-lesson courses that build understanding from the ground up. Each lesson is a full article : read in sequence or jump to what you need.
          </p>
        </header>

        {active.length > 1 && (
          <div className="flex justify-end mb-lg">
            <SortControl value={sort} onChange={(v) => setSort(v as SortKey)} />
          </div>
        )}

        {active.length === 0 ? (
          <div className="text-center py-xxl border-2 border-dashed border-border-default rounded-xl">
            <BookOpen className="w-12 h-12 text-on-surface-muted mx-auto mb-md" />
            <p className="font-dm-sans text-body-lg text-on-surface-muted">No courses yet. Check back soon.</p>
          </div>
        ) : (
          <LoadMore total={active.length} initialCount={4} increment={4}>
            {(count) => (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                {active.slice(0, count).map((course) => (
                  <Link
                    key={course.slug}
                    to={`/courses/${course.slug}`}
                    className="group block bg-surface-container-low border border-border-default rounded-xl overflow-hidden hover:border-primary/50 hover:-translate-y-1 transition-all"
                  >
                    <div className="aspect-video overflow-hidden">
                      <SafeImage alt={course.imageAlt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        src={course?.image}
                      />
                    </div>
                    <div className="p-xl">
                      <span className="font-sora text-metadata-tag text-primary uppercase tracking-widest">
                        {course.lessons.length} LESSONS
                      </span>
                      <h2 className="font-sora text-article-title text-on-surface group-hover:text-primary transition-colors mt-sm mb-sm">
                        {course.title}
                      </h2>
                      <p className="font-dm-sans text-body-base text-on-surface-muted mb-lg">
                        <span dangerouslySetInnerHTML={{ __html: md(course.description) }} />
                      </p>
                      <span className="inline-flex items-center gap-sm font-sora text-label-caps text-primary uppercase">
                        Start course <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </LoadMore>
        )}
      </main>

    </div>
  );
}
