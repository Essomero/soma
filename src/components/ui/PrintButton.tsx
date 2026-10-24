import { Link } from "react-router-dom";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  /** Print-route href (e.g. `/stories/fs-1-why-this-type-error/print`). Opens in a new tab. */
  to?: string;
  label?: string;
  title?: string;
  compact?: boolean;
  /** Full-width sidebar style: same height, type, and radius as the column share buttons. Takes precedence over `compact`. */
  stretch?: boolean;
  className?: string;
}

// NOTE: print actions must never leak into printed output : whether printing
// a full collection or a single piece : so `print:hidden` is baked in here,
// not left to each call site.
const baseClass =
  "print:hidden inline-flex items-center gap-sm font-sora bg-surface-container-low border border-border-default text-on-surface hover:border-primary/50 hover:text-primary transition-all shadow-sm";

export default function PrintButton({
  to,
  label = "Download PDF",
  title = "Open a print-friendly version (Print / Save as PDF)",
  compact = false,
  stretch = false,
  className = "",
}: PrintButtonProps) {
  // `stretch` mirrors the column share buttons exactly: py-sm (8px) +
  // text-metadata-tag (14px / 1.4 = 19.6px) + 2px border = 37.6px tall.
  // The 16px printer icon fits inside the 19.6px line box, so heights match.
  // Shape/weight live here (not in className) because `rounded` vs
  // `rounded-lg` conflicts resolve by stylesheet order, not class order.
  const shapeClass = stretch ? "rounded font-medium" : "rounded-lg font-semibold";
  const sizeClass = stretch
    ? "px-md py-sm text-metadata-tag"
    : compact
      ? "px-md py-sm text-xs"
      : "px-xl py-md text-sm";
  const widthClass = stretch ? "w-full justify-center" : "";
  const cls = `${baseClass} ${shapeClass} ${sizeClass} ${widthClass} ${className}`.trim();

  if (to) {
    return (
      <Link to={to} target="_blank" rel="noopener noreferrer" className={cls} title={title}>
        <Printer className="w-4 h-4 text-primary" />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => window.print()} className={cls} title={title}>
      <Printer className="w-4 h-4 text-primary" />
      <span>{label}</span>
    </button>
  );
}
