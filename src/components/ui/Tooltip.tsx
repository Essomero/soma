import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  /** Text shown in the bubble. */
  label: string;
  /** Element the tooltip anchors to (usually an icon button). */
  children: ReactNode;
  /** Bubble side. Defaults to top; toolbars under header content use bottom. */
  position?: "top" | "bottom" | "left" | "right";
  /** Horizontal anchor for top/bottom bubbles. Edge buttons use start/end to stay on screen. */
  align?: "start" | "center" | "end";
  className?: string;
}

const POSITION_CLASSES: Record<NonNullable<TooltipProps["position"]>, string> = {
  top: "bottom-full mb-2",
  bottom: "top-full mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const ALIGN_CLASSES: Record<NonNullable<TooltipProps["align"]>, string> = {
  start: "left-0",
  center: "left-1/2 -translate-x-1/2",
  end: "right-0",
};

/**
 * Fast themed tooltip replacing native `title=` (browser delay ~1s, unstyleable).
 * CSS-only: appears on hover/focus within ~100ms, matches site surface tokens.
 * The wrapper owns hover so it also works around disabled buttons.
 */
export default function Tooltip({ label, children, position = "top", align = "center", className }: TooltipProps) {
  if (!label) return <>{children}</>;
  return (
    <span className={cn("group/tooltip relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap",
          "rounded-md border border-border-default bg-surface-container-high px-sm py-xs",
          "font-sora text-[11px] text-on-surface shadow-xl",
          "opacity-0 transition-opacity duration-100",
          "group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          POSITION_CLASSES[position],
          (position === "top" || position === "bottom") && ALIGN_CLASSES[align],
        )}
      >
        {label}
      </span>
    </span>
  );
}
