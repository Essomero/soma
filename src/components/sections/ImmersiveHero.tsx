import AccentBar from "@/components/ui/AccentBar";
import Tag from "@/components/ui/Tag";
import { md } from "@/lib/markdown";
import type { Author } from "@/types";

interface ImmersiveHeroProps {
  tag: string;
  title: string;
  description: string;
  author: Author;
  date: string;
  image: string;
  imageAlt: string;
}

export default function ImmersiveHero({
  tag,
  title,
  description,
  author,
  date,
  image,
  imageAlt,
}: ImmersiveHeroProps) {
  return (
    <header className="relative w-full min-h-[85vh] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          alt={imageAlt}
          className="w-full h-full object-cover object-top opacity-60 md:opacity-100"
          src={image}
        />
        {/* Theme-aware scrim: no photo survives both themes (light mode sets
            dark type, dark mode sets white type), so the text zone is pulled
            toward the theme background instead of hunting for safe images. */}
        <div className="absolute inset-0 bg-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>
      <div className="relative z-10 min-h-[85vh] max-w-readme mx-auto flex flex-col justify-end px-gutter md:px-margin-desktop pt-24 pb-giant">
        <div className="max-w-4xl">
          <AccentBar variant="editorial" className="mb-md" />
          <Tag variant="primary" className="mb-md block">
            {tag}
          </Tag>
          <h1 className="font-sora text-headline-md md:text-display-lg text-on-surface mb-lg">
            {title}
          </h1>
          <p className="font-sora text-article-title text-on-surface-variant max-w-2xl" dangerouslySetInnerHTML={{ __html: md(description) }} />
          <div className="mt-xl flex items-center gap-md font-sora text-metadata-tag text-on-surface-muted">
            <span>{author.name}</span>
            <span className="text-secondary">//</span>
            <span>{date}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
