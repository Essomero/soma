import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// A real, reliable placeholder cover. Used whenever a content row's image
// is missing or not a URL (AI-authored rows sometimes omit it). Never
// render img src=undefined — that produces a broken icon on every card.
export const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=675&fit=crop";

/** Resolve a content image to a renderable src (falls back to FALLBACK_COVER). */
export function coverUrl(image: string | undefined | null): string {
  if (typeof image === "string" && /^https?:\/\/.+/i.test(image)) return image;
  return FALLBACK_COVER;
}
