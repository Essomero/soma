import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { md } from "@/lib/markdown";

interface TipCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  bgClass: string;
  iconColorClass: string;
  className?: string;
}

export default function TipCard({
  icon: Icon,
  title,
  description,
  bgClass,
  iconColorClass,
  className,
}: TipCardProps) {
  return (
    <div
      className={cn(
        "glass-card p-lg rounded-xl flex flex-col gap-sm",
        className
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded flex items-center justify-center mb-xs",
          bgClass,
          iconColorClass
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="font-sora text-label-caps text-on-surface">{title}</h4>
      <p className="font-dm-sans text-sm text-on-surface-muted" dangerouslySetInnerHTML={{ __html: md(description) }} />
    </div>
  );
}
