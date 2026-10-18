import { md } from "@/lib/markdown";
import { useParams, Link } from "react-router-dom";
import AccentBar from "@/components/ui/AccentBar";
import ArticleCard from "@/components/cards/ArticleCard";
import NewsletterSignup from "@/components/ui/NewsletterSignup";
import { allTopics, allStories } from "@/content/registry";

export default function TopicDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const topic = allTopics.find((t) => t.slug === (slug ?? ""));

  if (!topic) {
    return (
      <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop py-giant text-center">
        <h1 className="font-sora text-headline-md text-on-surface mb-md">Topic Not Found</h1>
        <p className="text-on-surface-muted mb-xl">This topic doesn't exist yet.</p>
        <Link to="/topics" className="text-primary hover:underline font-bold">
          ← Browse all topics
        </Link>
      </div>
    );
  }

  const matchingStories = allStories.filter(
    (s) => s.topics?.includes(slug ?? "")
  );

  const otherTopics = allTopics.filter((t) => t.slug !== slug);

  return (
    <div>
      <main className="pt-32 pb-giant max-w-readme mx-auto px-gutter md:px-margin-desktop">
        {/* Topic Header */}
        <section className="relative mb-xxl">
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_50%,_rgba(33,139,255,0.15)_0%,_transparent_50%)]" />
          <div className="relative z-10">
            <AccentBar variant="small" className="mb-md" />
            <h1 className="font-sora text-display-lg-mobile md:text-display-lg mb-md text-on-surface">
              {topic.title}
            </h1>
            <p className="font-dm-sans text-body-base text-on-surface-muted max-w-2xl">
              <span dangerouslySetInnerHTML={{ __html: md(topic.description) }} />
            </p>
          </div>
        </section>

        {/* Stories in this topic */}
        {matchingStories.length > 0 ? (
          <section className="mb-giant">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
              {matchingStories.map((story) => (
                <ArticleCard
                  key={story.id}
                  article={{
                    id: story.id,
                    category: story.category,
                    title: story.title,
                    excerpt: story.excerpt,
                    image: story.image,
                    imageAlt: story.imageAlt,
                    href: story.href,
                    author: story.author,
                    date: story.date,
                    tags: story.tags,
                  }}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="mb-giant text-center py-xxl border-2 border-dashed border-border-default rounded-xl">
            <p className="font-dm-sans text-body-lg text-on-surface-muted">
              No stories yet in {topic.title}. Check back soon.
            </p>
          </section>
        )}

        {/* Related Topics */}
        <section className="mt-giant pt-giant border-t border-border-default">
          <h2 className="font-sora text-article-title mb-xl text-on-surface">
            Explore More Topics
          </h2>
          <div className="flex flex-wrap gap-sm">
            {otherTopics.map((t) => (
              <Link
                key={t.slug}
                to={`/topics/${t.slug}`}
                className="px-lg py-sm bg-surface-container border border-border-default rounded-full font-sora text-label-caps text-on-surface-muted hover:border-primary hover:text-primary cursor-pointer transition-all"
              >
                {t.title}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <NewsletterSignup variant="subtle" />
    </div>
  );
}
