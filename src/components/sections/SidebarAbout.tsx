import ShareButtons from "@/components/ui/ShareButtons";

interface SidebarAboutProps {
  /** Story slug for the public/private toggle. Omit to hide the toggle (e.g. for books). */
  publicToggleSlug?: string;
  /** Parent collection slug (series/course) for fallback. */
  publicToggleCollection?: string;
  /** Markdown content for copy-to-clipboard button. */
  markdownContent?: string;
}

export default function SidebarAbout({ publicToggleSlug, publicToggleCollection, markdownContent }: SidebarAboutProps) {
  return (
    <div className="bg-surface-container p-lg rounded-lg border border-outline-variant">
      <h3 className="font-sora text-label-caps uppercase text-primary mb-md">
        Soma
      </h3>
      <p className="font-dm-sans text-body-base text-on-surface-variant">
        AI-assisted deep research on technology, economics, philosophy, and
        beyond. A personal publishing platform for ideas that matter.
      </p>
      <div className="mt-lg">
        <ShareButtons
          variant="row"
          publicToggleSlug={publicToggleSlug}
          publicToggleCollection={publicToggleCollection}
          markdownContent={markdownContent}
        />
      </div>
    </div>
  );
}
