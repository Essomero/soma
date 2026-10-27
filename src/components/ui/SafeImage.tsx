import { useState } from "react";
import { FALLBACK_COVER } from "@/lib/utils";

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
}

/**
 * Renders a content cover image that never shows the broken-image icon.
 * The src is sanitized through coverUrl's fallback for missing/invalid URLs;
 * on a load error (dead hotlink, deleted Unsplash photo) it swaps to the
 * bundled placeholder. Once an error fires the fallback is used for the
 * lifetime of this mount, so a dead URL does not re-request.
 */
export default function SafeImage({ src, alt = "", className }: SafeImageProps) {
  const [errored, setErrored] = useState(false);
  const resolved = src && /^https?:\/\/.+/i.test(src) ? src : FALLBACK_COVER;

  return (
    <img
      src={errored ? FALLBACK_COVER : resolved}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  );
}