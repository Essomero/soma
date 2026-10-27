import { Play } from "lucide-react";
import { coverUrl } from "@/lib/utils";
import type { PodcastEpisode } from "@/types";

interface PodcastCardProps {
  episode: PodcastEpisode;
}

export default function PodcastCard({ episode }: PodcastCardProps) {
  return (
    <div className="group relative aspect-square rounded-lg overflow-hidden shadow-xl hover:-translate-y-2 transition-transform">
      <img
        alt={episode.imageAlt}
        className="w-full h-full object-cover"
        src={coverUrl(episode.image)}
      />
      <div className="absolute inset-0 bg-brand/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button className="bg-white text-surface p-4 rounded-full shadow-lg hover:scale-110 transition-transform">
          <Play className="w-6 h-6 fill-current" />
        </button>
      </div>
    </div>
  );
}
