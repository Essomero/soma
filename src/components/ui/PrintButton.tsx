import { Link } from "react-router-dom";
import { Printer } from "lucide-react";

interface PrintButtonProps {
  /** Print-route href (e.g. `/stories/foo/print`). Opens in a new tab. */
  to?: string;
  label?: string;
  title?: string;
  compact?: boolean;
  className?: string;
}

// NOTE: print actions must never leak into printed output : whether printing
// a full collection or a single piece : so `print:hidden` is baked in here,
// not left to each call site.
const baseClass =
  "print:hidden inline-flex items-center gap-sm rounded-lg font-sora font-semibold bg-surface-container-low border border-border-default text-on-surface hover:border-primary/50 hover:text-primary transition-all shadow-sm";

export default function PrintButton({
  to,
  label = "Download PDF",
  title = "Open a print-friendly version (Print / Save as PDF)",
  compact = false,
  className = "",
}: PrintButtonProps) {
  const sizeClass = compact ? "px-md py-sm text-xs" : "px-xl py-md text-sm";
  const cls = `${baseClass} ${sizeClass} ${className}`.trim();

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
