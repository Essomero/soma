import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ArrowRight,
  ArrowLeft,
  GitFork,
  Settings,
  Users,
  GraduationCap,
  Building2,
  Terminal,
  Database,
  Accessibility,
  TrendingUp,
  Cpu,
  Lightbulb,
  Shield,
} from "lucide-react";
import AccentBar from "@/components/ui/AccentBar";
import LoadMore from "@/components/ui/LoadMore";
import { allTopics } from "@/content/registry";
import { useContentList } from "@/lib/content";
import type { StoryContent } from "@/types";
import type { TopicData } from "@/types";
import type { LucideIcon } from "lucide-react";
import { md } from "@/lib/markdown";

const iconMap: Record<string, LucideIcon> = {
  GitFork,
  Settings,
  Users,
  GraduationCap,
  Building2,
  Terminal,
  Database,
  Accessibility,
  TrendingUp,
  Cpu,
  Lightbulb,
  Search,
};

const filterTabs = ["All", "Tech", "Culture", "Business"];

export default function TopicsPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stories } = useContentList<StoryContent>("story");
  const storyCount = (topicSlug: string) =>
    (stories ?? []).filter((s) => s.topics?.includes(topicSlug)).length;

  const techCount = storyCount("technology");
  const careerCount = storyCount("career");

  const filteredTopics = allTopics.filter((topic) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      topic.title.toLowerCase().includes(q) ||
      topic.description.toLowerCase().includes(q) ||
      (topic.category?.toLowerCase().includes(q) ?? false);
    const matchesFilter = activeFilter === "All" || topic.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-giant px-gutter md:px-margin-desktop border-b border-border-default"
          style={{
            backgroundColor: "#10141a",
            backgroundImage:
              "radial-gradient(at 0% 0%, #1c2026 0, transparent 50%), radial-gradient(at 100% 100%, #151b23 0, transparent 50%)",
          }}
        >
          <div className="max-w-readme mx-auto flex flex-col md:flex-row items-center gap-xxl relative z-10">
            <div className="flex-1 space-y-lg">
              <div className="flex items-center gap-sm">
                <div className="w-10 h-1 bg-secondary-container" />
                <span className="font-sora text-metadata-tag uppercase tracking-widest text-primary">
                  Explore All Knowledge
                </span>
              </div>
              <h1 className="font-sora text-display-lg-mobile md:text-display-lg leading-none text-on-surface">
                CURATED <br />
                <span className="text-gradient">TOPICS</span>
              </h1>
              <p className="font-dm-sans text-body-base text-on-surface-muted max-w-xl">
                Deep dives into the technologies, cultures, and practices shaping
                the future of software development. Filter by category or search
                for specific insights.
              </p>
              {/* Search Bar */}
              <div className="relative max-w-lg mt-xl group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-muted group-focus-within:text-primary transition-colors" />
                <input
                  className="w-full bg-surface-container border border-border-default focus:border-primary focus:ring-0 text-on-surface pl-12 pr-4 py-4 rounded-lg transition-all font-dm-sans placeholder-on-surface-muted"
                  placeholder="Search topics (e.g. AI, DevOps, Rust)..."
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="hidden lg:block flex-1 relative h-[400px]" />
          </div>
        </section>

        {/* Featured Highlights Bento */}
        <section className="py-xxl px-gutter md:px-margin-desktop max-w-readme mx-auto">
          <div className="flex items-center justify-between mb-xl">
            <h2 className="font-sora text-article-title text-on-surface">
              Featured Highlights
            </h2>
            <div className="hidden md:flex gap-sm">
              <button className="p-2 border border-border-default rounded-full hover:bg-surface-container transition-colors text-on-surface-muted">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button className="p-2 border border-border-default rounded-full hover:bg-surface-container transition-colors text-on-surface-muted">
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
            {/* Large Featured Card - AI */}
            <Link to="/topics/technology" className="md:col-span-8 group overflow-hidden border border-border-default bg-surface-container-low hover:border-on-surface hover:-translate-y-1 transition-all duration-300 block">
              <div className="relative h-80 overflow-hidden">
                <img
                  alt="Code editor displaying TypeScript types"
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
                  src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=675&fit=crop"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-primary text-on-primary font-sora text-metadata-tag uppercase rounded-sm">
                    Leading Now
                  </span>
                </div>
              </div>
              <div className="p-xl">
                <p className="font-sora text-metadata-tag text-primary mb-sm uppercase tracking-widest">
                  Core // TypeScript
                </p>
                <h3 className="font-sora text-article-title group-hover:text-primary transition-colors mb-md text-on-surface">
                  Shapes Over Names
                </h3>
                <p className="font-dm-sans text-body-base text-on-surface-muted">
                  Five visual lessons that make the type system click: the backpack rule, generics as relationships, and boundaries you can trust.
                </p>
              </div>
            </Link>

            {/* Vertical Featured Card - Security */}
            <Link to="/topics/career" className="md:col-span-4 group overflow-hidden border border-border-default bg-surface-container-low hover:border-on-surface hover:-translate-y-1 transition-all duration-300 block">
              <div className="p-xl h-full flex flex-col">
                <div className="mb-auto">
                  <GraduationCap className="w-12 h-12 text-secondary-container mb-lg" />
                  <p className="font-sora text-metadata-tag text-on-surface-muted mb-sm uppercase tracking-widest">
                    Essential // Interview Prep
                  </p>
                  <h3 className="font-sora text-article-title group-hover:text-secondary-container transition-colors text-on-surface">
                    The Fast Track
                  </h3>
                  <p className="font-dm-sans text-body-base text-on-surface-muted mt-md">
                    Full-stack prep lessons that turn type errors into blueprints: read the checker, prove you know it, say it out loud.
                  </p>
                </div>
                <div className="mt-xl pt-lg border-t border-border-default flex items-center justify-between">
                  <span className="font-sora text-label-caps uppercase text-on-surface-muted">
                    {careerCount} Articles
                  </span>
                  <TrendingUp className="w-5 h-5 text-on-surface-muted" />
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* All Topics Grid */}
        <section className="py-xxl bg-surface-lowest border-y border-border-default">
          <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-giant gap-lg">
              <div className="max-w-2xl">
                <div className="w-10 h-1 bg-accent-blue-neon mb-sm" />
                <h2 className="font-sora text-headline-md mb-md text-on-surface">
                  All Topics
                </h2>
                <p className="font-dm-sans text-body-base text-on-surface-muted">
                  Browse our complete archive of deep-dive articles across technology, economics, philosophy, and beyond.
                </p>
              </div>
              {/* Filter Pills */}
              <div className="flex flex-wrap gap-sm">
                {filterTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`px-4 py-2 font-sora text-label-caps uppercase rounded-lg transition-colors ${
                      activeFilter === tab
                        ? "bg-primary text-on-primary"
                        : "bg-surface border border-border-default text-on-surface-muted hover:text-on-surface"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <LoadMore total={filteredTopics.length} initialCount={8} increment={8}>
              {(visibleCount) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
                  {filteredTopics.slice(0, visibleCount).map((topic) => {
                    const Icon = iconMap[topic.icon];
                    return (
                      <Link
                        key={topic.slug}
                        to={`/topics/${topic.slug}`}
                        className="bg-surface border border-border-default p-xl hover:border-on-surface hover:-translate-y-1 transition-all cursor-pointer group"
                      >
                        <div
                          className={`w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center mb-xl group-hover:bg-${topic.accentColor}/20 transition-colors`}
                        >
                          {Icon && <Icon className={`w-6 h-6 ${topic.accentText}`} />}
                        </div>
                        <h4 className={`font-sora text-[24px] mb-sm group-hover:${topic.accentText} transition-colors text-on-surface`}>
                          {topic.title}
                        </h4>
                        <p className="font-dm-sans text-on-surface-muted text-sm mb-lg" dangerouslySetInnerHTML={{ __html: md(topic.description) }} />
                        <div className={`flex items-center gap-xs ${topic.accentText} font-sora text-[12px] uppercase`}>
                          <span>Browse Stories</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </LoadMore>
          </div>
        </section>
      </main>
    </div>
  );
}
