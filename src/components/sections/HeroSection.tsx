import { ArrowRight } from "lucide-react";
import Tag from "@/components/ui/Tag";
import Button from "@/components/ui/Button";
import { md } from "@/lib/markdown";
import { coverUrl } from "@/lib/utils";
import type { FeaturedStoryData } from "@/types";

interface HeroSectionProps {
  story: FeaturedStoryData;
}

export default function HeroSection({ story }: HeroSectionProps) {
  return (
    <section className="mb-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7">
          <Tag variant="brand" className="mb-4 inline-block">
            {story.tag}
          </Tag>
          <h2 className="text-5xl lg:text-7xl font-extrabold leading-[1.1] text-balance mb-6 text-on-surface">
            {story.title}
          </h2>
          <p className="text-xl text-on-surface-muted leading-relaxed mb-8 max-w-2xl" dangerouslySetInnerHTML={{ __html: md(story.description) }} />
          <Button
            variant="primary"
            size="lg"
            href={story.cta.href}
            icon={
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            }
          >
            {story.cta.label}
          </Button>
        </div>
        <div className="lg:col-span-5">
          <div className="aspect-[4/5] rounded-lg overflow-hidden border border-surface-bright shadow-2xl">
            <img
              alt={story.imageAlt}
              className="w-full h-full object-cover"
              src={coverUrl(story.image)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
