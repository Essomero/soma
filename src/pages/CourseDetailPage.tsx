import { useParams, Link } from "react-router-dom";
import { ArrowRight, Clock, BookOpen, Check, ExternalLink, Sparkles, Printer, Loader2 } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import AccentBar from "@/components/ui/AccentBar";
import Tag from "@/components/ui/Tag";
import { useContentItem, useContentList } from "@/lib/content";
import type { CourseContent, StoryContent, TestContent } from "@/types";
import { useProgress } from "@/lib/useProgress";
import { getTotalReadingTime } from "@/lib/readingTime";
import { PublicToggleInline, useCollectionPublicState } from "@/components/ui/PublicToggle";
import { md } from "@/lib/markdown";
import { usePageMeta } from "@/hooks/usePageMeta";
import { coverUrl } from "@/lib/utils";

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: course, loading } = useContentItem<CourseContent>("course", slug);
  const { data: stories } = useContentList<StoryContent>("story");
  const { data: tests } = useContentList<TestContent>("test");
  const allStories = stories ?? [];
  const allTests = tests ?? [];
  const lessonSlugs = course ? course.lessons.map((l) => l.storySlug) : [];
  const { isCompleted, toggle, progress } = useProgress(slug ?? "", lessonSlugs);
  const totalMinutes = course
    ? getTotalReadingTime(course.lessons.map((l) => l.storySlug), allStories)
    : 0;
  usePageMeta({ title: course?.title, description: course?.description, image: course?.image });

  if (loading) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-on-surface-muted" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <h1 className="font-sora text-headline-md text-on-surface mb-md">Course Not Found</h1>
        <Link to="/courses" className="text-primary hover:underline font-bold">
          ← Browse all courses
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border-default">
        <div className="absolute inset-0 z-0">
          <img
            alt={course.imageAlt}
            className="w-full h-full object-cover opacity-30"
            src={coverUrl(course?.image)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        <div className="relative z-10 max-w-readme mx-auto px-gutter md:px-margin-desktop pt-32 pb-giant">
          <AccentBar variant="editorial" className="mb-md" />
          <Tag variant="primary" className="mb-sm block">COURSE</Tag>
          <h1 className="font-sora text-display-lg-mobile md:text-display-lg text-on-surface mb-lg max-w-4xl">
            {course.title}
          </h1>
          <p className="font-sora text-article-title text-on-surface-variant max-w-2xl mb-lg" dangerouslySetInnerHTML={{ __html: md(course.description) }} />
          {course.tagline && (
            <p className="font-dm-sans text-body-lg text-on-surface-muted italic max-w-2xl mb-xl" dangerouslySetInnerHTML={{ __html: md(course.tagline) }} />
          )}
          <div className="flex items-center gap-md font-sora text-metadata-tag text-on-surface-muted">
            <span>{course.author.name}</span>
            <span className="text-secondary">//</span>
            <span>{course.lessons.length} lessons</span>
            <span className="text-secondary">//</span>
            <span>{progress}/{course.lessons.length} completed</span>
            <span className="text-secondary">//</span>
            <span>~{totalMinutes} min</span>
          </div>
          <div className="mt-lg w-full max-w-md h-1 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${course.lessons.length > 0 ? (progress / course.lessons.length) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-lg">
            <CourseCollectionToggle slug={course.slug} lessonSlugs={course.lessons.map((l) => l.storySlug)} />
          </div>
        </div>
      </section>

      {/* Lessons */}
      <section className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant">
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-xl">
            <h2 className="font-sora text-headline-md text-on-surface flex items-center gap-sm">
              <BookOpen className="w-6 h-6 text-primary" />
              Lessons
            </h2>
            <Tooltip label="Download entire course as a PDF or printable book">
            <Link
              to={`/courses/${course.slug}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-sm px-xl py-md rounded-lg font-sora text-sm font-semibold bg-surface-container-low border border-border-default text-on-surface hover:border-primary/50 hover:text-primary transition-all shadow-sm print:hidden"
            >
              <Printer className="w-4 h-4 text-primary" />
              <span>Download PDF</span>
            </Link>
            </Tooltip>
          </div>
          {/* General Course Assessment Card (Opens in external tab) */}
          {(() => {
            const courseTest =
              allTests.find((t) => t.courseSlug === slug && !t.storySlug) ||
              allTests.find((t) => t.slug === slug);
            if (!courseTest) return null;
            return (
              <div className="mb-xl p-xl bg-surface-container-low border border-primary/40 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-md mb-sm">
                  <Tag variant="primary">COURSE MILESTONE ASSESSMENT</Tag>
                  <span className="flex items-center gap-1.5 text-xs font-sora text-secondary font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Diagnostic Evaluation
                  </span>
                </div>
                <h3 className="font-sora text-lg md:text-xl font-bold text-on-surface mb-xs">
                  {courseTest.title}
                </h3>
                <p className="font-dm-sans text-sm text-on-surface-muted mb-lg leading-relaxed">
                  {courseTest.description}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-md pt-sm border-t border-border-default/40">
                  <span className="text-xs font-sora text-on-surface-muted">
                    {courseTest.questions.length} Timed Questions · ~{courseTest.estimatedMinutes || 10} mins
                  </span>
                  <a
                    href={`/tests/${courseTest.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-lg py-2 rounded-lg bg-primary text-background font-sora text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
                  >
                    <span>Take Course Assessment</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })()}

          <div className="space-y-md">
            {course.lessons.map((lesson, i) => {
              const story = allStories.find((s) => s.slug === lesson.storySlug);
              return (
                <Link
                  key={lesson.storySlug}
                  to={story ? `/stories/${lesson.storySlug}` : "#"}
                  className="block group p-xl bg-surface-container-low border border-border-default rounded-xl hover:border-primary/50 hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start gap-lg">
                    <Tooltip label={isCompleted(lesson.storySlug) ? "Mark as unread" : "Mark as completed"}>
                    <button
                      onClick={(e) => { e.preventDefault(); toggle(lesson.storySlug); }}
                      className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center font-sora text-sm font-bold transition-all ${
                        isCompleted(lesson.storySlug)
                          ? "bg-secondary/20 border-secondary text-secondary"
                          : "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20"
                      }`}
                    >
                      {isCompleted(lesson.storySlug) ? <Check className="w-4 h-4" /> : i + 1}
                    </button>
                    </Tooltip>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-sm mb-sm">
                        <span className="font-sora text-metadata-tag text-on-surface-muted uppercase">
                          LESSON {i + 1}
                        </span>
                        {story && (
                          <span className="flex items-center gap-xs text-on-surface-muted">
                            <Clock className="w-3 h-3" />
                            <span className="font-sora text-[10px] uppercase">{story.date}</span>
                          </span>
                        )}
                        {(() => {
                          const lessonTest = allTests.find((t) => t.storySlug === lesson.storySlug);
                          if (!lessonTest) return null;
                          return (
                            <a
                              href={`/tests/${lessonTest.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-sm py-0.5 rounded bg-primary/10 border border-primary/30 text-primary text-[10px] font-sora font-semibold hover:bg-primary hover:text-background transition-colors"
                            >
                              <span>Lesson Test</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          );
                        })()}
                      </div>
                      <h3 className="font-sora text-article-title text-on-surface group-hover:text-primary transition-colors mb-sm">
                        {lesson.title}
                      </h3>
                      {lesson.description && (
                        <p className="font-dm-sans text-body-base text-on-surface-muted" dangerouslySetInnerHTML={{ __html: md(lesson.description) }} />
                      )}
                      {!story && (
                        <p className="font-dm-sans text-sm text-error mt-sm">Story not yet published</p>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-on-surface-muted group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-2" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}

function CourseCollectionToggle({ slug, lessonSlugs }: { slug: string; lessonSlugs: string[] }) {
  const { isPublic, toggle } = useCollectionPublicState(slug, lessonSlugs);
  return <PublicToggleInline isPublic={isPublic} onToggle={toggle} label="Course" />;
}
