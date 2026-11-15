import { Link } from "react-router-dom";
import { FileText, ExternalLink } from "lucide-react";

interface SourceNoteInfo {
  slug: string;
  title: string;
}

interface SourceNoteBannerProps {
  /** Source note info stored in the content's meta_json */
  sourceNote: SourceNoteInfo;
}

/**
 * Banner shown to the owner on published content pages when the content
 * was generated from a note. Links back to the source note.
 *
 * Callers MUST gate with `isOwner` before rendering — this component
 * does not check auth itself.
 */
export default function SourceNoteBanner({ sourceNote }: SourceNoteBannerProps) {
  return (
    <div className="flex items-start gap-md p-lg bg-surface-container border border-border-default border-l-4 border-l-primary rounded-lg mt-lg">
      <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-sora text-xs text-primary uppercase tracking-widest mb-xs">
          Source note
        </p>
        <p className="font-dm-sans text-sm text-on-surface truncate">
          {sourceNote.title}
        </p>
      </div>
      <Link
        to={`/notes/${sourceNote.slug}`}
        className="inline-flex items-center gap-xs shrink-0 font-sora text-xs text-on-surface-muted hover:text-primary transition-colors"
      >
        View
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}