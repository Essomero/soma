import { md } from "@/lib/markdown";
import { Mic, ArrowRight } from "lucide-react";
import ReadMENav from "@/components/layout/ReadMENav";
import HeroSection from "@/components/sections/HeroSection";
import ArticleCard from "@/components/cards/ArticleCard";
import PodcastCard from "@/components/cards/PodcastCard";
import NewsletterSignup from "@/components/ui/NewsletterSignup";
import Button from "@/components/ui/Button";
import Tag from "@/components/ui/Tag";
import {
  featuredHero,
  featuredStories,
  secondaryGuide,
  secondaryStories,
  latestUpdates,
  featuredGuide,
  podcastEpisodes,
} from "@/content/registry";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-readme px-6 py-12">
      {/* ReadME Nav */}
      <ReadMENav />

      {/* Hero */}
      <HeroSection story={featuredHero} />

      {/* Staggered Stories Grid */}
      <section className="mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 items-start">
          {featuredStories.map((story, i) => (
            <ArticleCard
              key={story.id}
              article={story}
              className={i === 1 ? "lg:mt-16" : ""}
            />
          ))}
        </div>
      </section>

      {/* Podcast Section */}
      <section className="mb-24 py-16 px-8 rounded-2xl bg-surface-low border border-surface-bright relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-brand/5 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
          <div className="md:w-1/2">
            <div className="mb-4 inline-flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-[0.2em]">
              <Mic className="w-5 h-5" />
              The Soma Podcast
            </div>
            <h2 className="text-4xl font-extrabold mb-6 leading-tight text-on-surface">
              Deep conversations with the people building tomorrow.
            </h2>
            <p className="text-on-surface-muted mb-8 max-w-md">
              Conversations with thinkers, builders, and researchers exploring ideas that shape our world.
            </p>
            <Button variant="outline" size="md" href="/podcast">
              Browse all episodes
            </Button>
          </div>
          <div className="md:w-1/2 grid grid-cols-2 gap-4">
            <div className="space-y-4">
              {podcastEpisodes.slice(0, 2).map((ep) => (
                <PodcastCard key={ep.id} episode={ep} />
              ))}
            </div>
            <div className="space-y-4 pt-8">
              {podcastEpisodes.slice(2, 4).map((ep) => (
                <PodcastCard key={ep.id} episode={ep} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-24">
        {/* Left Column */}
        <div className="lg:col-span-8 flex flex-col gap-12">
          {/* Featured Guide */}
          <article className="relative group grid md:grid-cols-2 gap-8 bg-surface-low rounded-xl p-8 border border-surface-bright hover:border-brand/50 transition-colors">
            <div className="order-2 md:order-1 flex flex-col justify-center">
              <Tag variant="primary" className="mb-4 block">
                {secondaryGuide.category}
              </Tag>
              <h3 className="text-3xl font-bold mb-4 text-on-surface">
                {secondaryGuide.title}
              </h3>
              <p className="text-on-surface-muted mb-6">
                <span dangerouslySetInnerHTML={{ __html: md(secondaryGuide.excerpt) }} />
              </p>
              <Link
                to={secondaryGuide.href}
                className="text-brand font-bold flex items-center gap-2 hover:underline"
              >
                Read guide{" "}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="order-1 md:order-2 aspect-square rounded-lg overflow-hidden">
              <img
                alt={secondaryGuide.imageAlt}
                className="w-full h-full object-cover"
                src={secondaryGuide.image}
              />
            </div>
          </article>

          {/* Two Smaller Stories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {secondaryStories.map((story) => (
              <article key={story.id} className="group">
                <div className="aspect-video bg-surface-bright rounded-lg mb-6 overflow-hidden">
                  <img
                    alt={story.imageAlt}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    src={story.image}
                  />
                </div>
                <Tag variant="primary">{story.category}</Tag>
                <h4 className="text-xl font-bold mb-2 mt-2 group-hover:text-brand transition-colors text-on-surface">
                  <Link to={story.href}>{story.title}</Link>
                </h4>
                <p className="text-sm text-on-surface-muted"><span dangerouslySetInnerHTML={{ __html: md(story.excerpt) }} /></p>
              </article>
            ))}
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="lg:col-span-4 space-y-12">
          {/* Nomination CTA */}
          <div className="p-8 rounded-xl bg-brand/5 border border-brand/20">
            <h4 className="text-2xl font-bold mb-4 text-gradient">
              Suggest a topic
            </h4>
            <p className="text-sm text-on-surface-muted mb-6">
              Have a topic or question that deserves a deep dive? Let us know.
            </p>
            <a
              href="#"
              className="inline-flex items-center gap-2 font-bold rounded-full transition-all font-sora bg-brand text-white hover:bg-brand/90 px-6 py-3 text-sm w-full justify-center rounded-md"
            >
              Send suggestion
            </a>
          </div>

          {/* Latest Updates */}
          <div className="space-y-8">
            <h4 className="text-lg font-bold uppercase tracking-widest border-b border-surface-bright pb-4 text-on-surface">
              Latest Updates
            </h4>
            <div className="space-y-6">
              {latestUpdates.map((update) => (
                <Link
                  key={update.title}
                  to={update.href}
                  className="group block"
                >
                  <span className="text-xs text-on-surface-muted font-mono">
                    {update.date}
                  </span>
                  <h5 className="font-bold group-hover:text-brand transition-colors text-on-surface mt-1">
                    {update.title}
                  </h5>
                </Link>
              ))}
            </div>
          </div>

          {/* Featured Guide Card */}
          <article className="group">
            <Link to={featuredGuide.href} className="block">
              <div className="aspect-[3/4] bg-surface-bright rounded-lg mb-6 overflow-hidden relative">
                <img
                  alt="Testing"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  src={featuredGuide.image}
                />
                <div className="absolute bottom-4 left-4 right-4 p-4 bg-surface/90 backdrop-blur rounded border border-surface-bright">
                  <span className="text-[10px] font-bold uppercase text-brand">
                    Featured Guide
                  </span>
                  <h5 className="text-lg font-bold text-on-surface">
                    {featuredGuide.title}
                  </h5>
                </div>
              </div>
            </Link>
          </article>
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSignup variant="centered" />
    </div>
  );
}
