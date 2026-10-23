import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { ArticleCardData } from "@/types";
import { md } from "@/lib/markdown";

interface StoryCardProps {
  article: ArticleCardData;
  className?: string;
}

export default function StoryCard({ article, className }: StoryCardProps) {
  return (
    <div
      className={cn(
        "bg-surface border border-border-default rounded-lg overflow-hidden group hover:border-primary transition-all duration-300 flex flex-col h-full",
        className
      )}
    >
      <div className="h-48 overflow-hidden bg-surface-bright relative">
        <img
          alt={article.imageAlt}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          src={article.image}
        />
        <div className="absolute top-4 left-4 bg-background/60 backdrop-blur-md px-sm py-xs rounded font-sora text-[10px] uppercase text-on-surface">
          {article.category}
        </div>
      </div>
      <div className="p-lg flex-grow flex flex-col">
        <h3 className="font-sora text-xl mb-md leading-tight group-hover:text-primary transition-colors">
          <Link to={article.href}>{article.title}</Link>
        </h3>
        {article.excerpt && (
          <p className="font-dm-sans text-sm text-on-surface-muted mb-xl line-clamp-2" dangerouslySetInnerHTML={{ __html: md(article.excerpt) }} />
        )}
        {article.author && (
          <div className="mt-auto pt-lg border-t border-border-default font-sora text-xs uppercase tracking-widest text-on-surface-muted">
            By {article.author.name}
          </div>
        )}
      </div>
    </div>
  );
}
