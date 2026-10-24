import { useState } from "react";
import { Share2, MessageCircle, Linkedin, Facebook, AtSign, Clipboard, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PublicToggleButton, usePublicState } from "@/components/ui/PublicToggle";
import Tooltip from "@/components/ui/Tooltip";

interface ShareButtonsProps {
  variant: "column" | "row" | "small-circle";
  className?: string;
  url?: string;
  title?: string;
  /** Story slug for the public/private toggle (row variant only). */
  publicToggleSlug?: string;
  /** Parent collection slug for fallback (series/course). */
  publicToggleCollection?: string;
  /** Markdown content for copy-to-clipboard. When provided, shows "Copy as Markdown" button. */
  markdownContent?: string;
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function getShareUrl(platform: string, url: string, title: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  switch (platform) {
    case "x":
    case "twitter":
      return `https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    default:
      return "#";
  }
}

function handleNativeShare(url: string, title: string) {
  if (navigator.share) {
    navigator.share({ url, title }).catch(() => {});
  } else {
    window.open(getShareUrl("x", url, title), "_blank", "noopener,noreferrer");
  }
}

export default function ShareButtons({
  variant,
  className,
  url = typeof window !== "undefined" ? window.location.href : "",
  title = typeof document !== "undefined" ? document.title : "",
  publicToggleSlug,
  publicToggleCollection,
  markdownContent,
}: ShareButtonsProps) {
  const { isPublic, toggle } = usePublicState(publicToggleSlug ?? "", publicToggleCollection);
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = async () => {
    if (!markdownContent) return;
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = markdownContent;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (variant === "column") {
    return (
      <div className={cn("flex flex-col gap-sm", className)}>
        <h4 className="font-sora text-label-caps uppercase text-on-surface mb-2">
          Share this story
        </h4>
        <a
          href={getShareUrl("x", url, title)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center border border-border-default rounded py-sm font-sora text-metadata-tag hover:border-primary transition-all text-on-surface-variant hover:text-on-surface"
        >
          X
        </a>
        <a
          href={getShareUrl("facebook", url, title)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center border border-border-default rounded py-sm font-sora text-metadata-tag hover:border-primary transition-all text-on-surface-variant hover:text-on-surface"
        >
          FACEBOOK
        </a>
        <a
          href={getShareUrl("linkedin", url, title)}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center border border-border-default rounded py-sm font-sora text-metadata-tag hover:border-primary transition-all text-on-surface-variant hover:text-on-surface"
        >
          LINKEDIN
        </a>
      </div>
    );
  }

  if (variant === "small-circle") {
    return (
      <div className={cn("flex flex-col gap-md", className)}>
        <span className="font-sora text-label-caps uppercase text-on-surface-muted">
          Share Story
        </span>
        <div className="flex gap-md">
          <Tooltip label="Share" align="start">
            <button
              onClick={() => handleNativeShare(url, title)}
              className="w-10 h-10 border border-border-default rounded-full flex items-center justify-center hover:bg-surface-bright transition-colors text-on-surface-muted hover:text-on-surface"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip label="Share via email" align="start">
            <a
              href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`}
              className="w-10 h-10 border border-border-default rounded-full flex items-center justify-center hover:bg-surface-bright transition-colors text-on-surface-muted hover:text-on-surface"
              aria-label="Share via email"
            >
              <AtSign className="w-4 h-4" />
            </a>
          </Tooltip>
          {markdownContent && (
            <Tooltip label={copied ? "Copied!" : "Copy as Markdown"} align="start">
              <button
                onClick={handleCopyMarkdown}
                className="w-10 h-10 border border-border-default rounded-full flex items-center justify-center hover:bg-surface-bright transition-colors text-on-surface-muted hover:text-on-surface"
                aria-label="Copy as Markdown"
              >
                {copied ? <Check className="w-4 h-4 text-secondary" /> : <Clipboard className="w-4 h-4" />}
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    );
  }

  // row (default icon row)
  return (
    <div className={cn("flex flex-wrap gap-md", className)}>
      <Tooltip label="Share" align="start">
        <button
          onClick={() => handleNativeShare(url, title)}
          className="text-on-surface-muted hover:text-primary transition-colors"
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </Tooltip>
      <Tooltip label="Share on X" align="start">
        <a
          href={getShareUrl("x", url, title)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-on-surface-muted hover:text-primary transition-colors"
          aria-label="Share on X"
        >
          <XIcon className="w-5 h-5" />
        </a>
      </Tooltip>
      <Tooltip label="Share via email" align="start">
        <a
          href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`}
          className="text-on-surface-muted hover:text-primary transition-colors"
          aria-label="Share via email"
        >
          <MessageCircle className="w-5 h-5" />
        </a>
      </Tooltip>
      {markdownContent && (
        <Tooltip label={copied ? "Copied!" : "Copy as Markdown"} align="start">
          <button
            onClick={handleCopyMarkdown}
            className="text-on-surface-muted hover:text-secondary transition-colors"
            aria-label="Copy as Markdown"
          >
            {copied ? <Check className="w-5 h-5 text-secondary" /> : <Clipboard className="w-5 h-5" />}
          </button>
        </Tooltip>
      )}
      {publicToggleSlug && (
        <PublicToggleButton isPublic={isPublic} onToggle={toggle} className="text-on-surface-muted hover:text-primary transition-colors" />
      )}
    </div>
  );
}
