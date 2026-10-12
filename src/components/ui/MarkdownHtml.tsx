import { useRef } from "react";
import { useInjectCopyButtons } from "@/lib/useInjectCopyButtons";

interface MarkdownHtmlProps {
  html: string;
  className?: string;
  /** data-section-index for highlight targeting */
  "data-section-index"?: number;
  /** data-paragraph-index for highlight targeting */
  "data-paragraph-index"?: number;
}

/**
 * Renders raw HTML (from markdown) and injects copy buttons into
 * every <pre> code block found in the output.
 */
export default function MarkdownHtml({
  html,
  className,
  "data-section-index": sectionIndex,
  "data-paragraph-index": paragraphIndex,
}: MarkdownHtmlProps) {
  const ref = useRef<HTMLDivElement>(null);
  useInjectCopyButtons(ref, html);

  return (
    <div
      ref={ref}
      className={className}
      data-section-index={sectionIndex}
      data-paragraph-index={paragraphIndex}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
