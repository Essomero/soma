import { cn } from "@/lib/utils";
import AccentBar from "./AccentBar";

interface PullQuoteProps {
  quote: string;
  attribution?: string;
  variant: "gradient-bar" | "border-left" | "border-y";
  className?: string;
}

export default function PullQuote({
  quote,
  attribution,
  variant,
  className,
}: PullQuoteProps) {
  if (variant === "gradient-bar") {
    return (
      <blockquote className={cn("relative py-xl my-xxl", className)}>
        <div className="absolute top-0 left-0 w-12 h-1 bg-gradient-to-r from-primary to-secondary" />
        <p className="font-sora text-headline-md text-on-surface leading-tight">
          &ldquo;{quote}&rdquo;
        </p>
        {attribution && (
          <footer className="mt-lg font-sora text-metadata-tag text-secondary uppercase tracking-widest">
            &mdash; {attribution}
          </footer>
        )}
      </blockquote>
    );
  }

  if (variant === "border-left") {
    return (
      <blockquote
        className={cn(
          "bg-surface-container border-l-4 border-secondary px-xl py-lg my-xl",
          className
        )}
      >
        <p className="font-sora text-article-title text-on-surface italic">
          &ldquo;{quote}&rdquo;
        </p>
      </blockquote>
    );
  }

  // border-y
  return (
    <blockquote
      className={cn("py-xl border-y border-border-default", className)}
    >
      <p className="font-sora text-3xl md:text-4xl text-secondary leading-tight italic">
        &ldquo;{quote}&rdquo;
      </p>
      {attribution && (
        <cite className="block mt-md font-sora text-metadata-tag uppercase tracking-widest text-on-surface not-italic">
          &mdash; {attribution}
        </cite>
      )}
    </blockquote>
  );
}
