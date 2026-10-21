import type { PodcastEpisode, PodcastEpisodeFull } from "@/types";
import { bridgingCode } from "./episodes/bridging-code";

export const podcastEpisodes: PodcastEpisode[] = [
  {
    id: bridgingCode.id,
    title: bridgingCode.title,
    image: bridgingCode.image,
    imageAlt: bridgingCode.imageAlt,
    href: bridgingCode.href,
  },
];

export const recentEpisodes: PodcastEpisodeFull[] = [
  bridgingCode,
];

export const podcastTopics = [
  "Open Source", "Software Engineering", "Systems Architecture", "Community",
];
