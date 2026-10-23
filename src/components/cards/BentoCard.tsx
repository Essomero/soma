import { cn } from "@/lib/utils";
import { md } from "@/lib/markdown";
import type { BentoCardData } from "@/types";

interface BentoCardProps {
  card: BentoCardData;
  className?: string;
}

export default function BentoCard({ card, className }: BentoCardProps) {
  return (
    <div
      className={cn(
        "bg-surface-container-low p-6 md:p-8 rounded-lg border border-border-default flex flex-col h-full min-w-0 overflow-hidden",
        className
      )}
    >
      <span className="font-sora text-label-caps text-secondary mb-3 block tracking-wider uppercase">
        {card.label}
      </span>
      <h4
        className="font-sora text-xl sm:text-2xl font-semibold text-on-surface mb-3 leading-snug tracking-tight break-words"
        dangerouslySetInnerHTML={{ __html: md(card.title) }}
      />
      <p
        className="font-dm-sans text-sm sm:text-base text-on-surface-muted leading-relaxed break-words mt-auto"
        dangerouslySetInnerHTML={{ __html: md(card.description) }}
      />
    </div>
  );
}
