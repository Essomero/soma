import { Link } from "react-router-dom";
import { cn, coverUrl } from "@/lib/utils";
import Tag from "@/components/ui/Tag";
import type { ArticleCardData } from "@/types";
import { md } from "@/lib/markdown";

interface ArticleCardProps {
  article: ArticleCardData;
  variant?: "default" | "story";
  className?: string;
}

export default function ArticleCard({
  article,
  variant = "default",
  className,
}: ArticleCardProps) {
  return (
    <article className={cn("flex flex-col gap-4 group", className)}>
      <Link to={article.href} className="block">
        <div className="aspect-video rounded-lg overflow-hidden mb-4 grayscale group-hover:grayscale-0 transition-all duration-500">
          <img
            alt={article.imageAlt}
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
            src={coverUrl(article.image)}
          />
        </div>
      </Link>
      <Tag variant="primary">{article.category}</Tag>
      <h3 className="text-2xl font-bold leading-tight group-hover:text-brand transition-colors">
        <Link to={article.href}>{article.title}</Link>
      </h3>
      {article.excerpt && (
        <p className="text-on-surface-muted text-sm" dangerouslySetInnerHTML={{ __html: md(article.excerpt) }} />
      )}
      {variant === "story" && article.author && (
        <div className="mt-auto pt-lg border-t border-border-default font-sora text-xs uppercase tracking-widest text-on-surface-muted">
          By {article.author.name}
        </div>
      )}
    </article>
  );
}
