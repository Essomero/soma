import type { PodcastEpisodeFull } from "@/types";
import { bridgingCode } from "./bridging-code";

const rawEpisodes: PodcastEpisodeFull[] = [bridgingCode];

// Inject computed fields
export const allEpisodes: PodcastEpisodeFull[] = rawEpisodes.map((ep) => ({
  ...ep,
  href: `/podcast/${ep.slug}`,
}));

// Lightweight card data for listing pages
export function toEpisodeCard(ep: PodcastEpisodeFull) {
  return {
    id: ep.id,
    title: ep.title,
    image: ep.image,
    imageAlt: ep.imageAlt,
    episode: ep.episode,
    date: ep.date,
    publishedAt: ep.publishedAt,
    duration: ep.duration,
    description: ep.description,
    category: ep.category,
    href: ep.href,
  };
}
