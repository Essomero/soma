import { useState, useEffect } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  storySlug: string;
  initialRating?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

export default function StarRating({ storySlug, initialRating, onChange, readonly, size = "md" }: StarRatingProps) {
  const [rating, setRating] = useState(initialRating || 0);
  const [hovered, setHovered] = useState(0);

  useEffect(() => {
    // Reset on slug change so unrated stories don't bleed the previous story's rating
    setRating(initialRating || 0);
    if (!initialRating) {
      fetch(`/api/ratings?slug=${encodeURIComponent(storySlug)}`)
        .then(r => r.json())
        .then(data => { if (data?.rating) setRating(data.rating); })
        .catch(() => {});
    }
  }, [storySlug, initialRating]);

  const handleClick = (value: number) => {
    if (readonly) return;
    setRating(value);
    fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: storySlug, rating: value }),
    }).catch(() => {});
    onChange?.(value);
  };

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          onClick={() => handleClick(value)}
          onMouseEnter={() => !readonly && setHovered(value)}
          disabled={readonly}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer"}`}
          aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
        >
          <Star
            className={`${iconSize} ${(hovered || rating) >= value ? "text-accent-orange fill-accent-orange" : "text-on-surface-muted"}`}
          />
        </button>
      ))}
    </div>
  );
}
