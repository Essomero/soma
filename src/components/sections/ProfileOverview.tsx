import { MapPin, Layers } from "lucide-react";

interface ProfileOverviewProps {
  location?: string;
  social?: string;
  website?: string;
  organizations?: string[];
}

function toExternalHref(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("@")) return `https://x.com/${value.slice(1)}`;
  return `https://${value}`;
}

export default function ProfileOverview({
  location,
  social,
  website,
  organizations,
}: ProfileOverviewProps) {
  return (
    <div className="max-w-readme mx-auto px-gutter md:px-margin-desktop">
      <div className="border-y border-border-default py-lg flex flex-wrap justify-between items-start gap-lg">
        {location && (
          <div className="flex flex-col gap-xs">
            <span className="font-sora text-label-caps uppercase text-on-surface-muted">
              Location
            </span>
            <span className="font-dm-sans text-body-base flex items-center gap-xs text-on-surface">
              <MapPin className="w-4 h-4" /> {location}
            </span>
          </div>
        )}
        {social && (
          <div className="flex flex-col gap-xs">
            <span className="font-sora text-label-caps uppercase text-on-surface-muted">
              Social
            </span>
            <a
              href={toExternalHref(social)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-dm-sans text-body-base text-accent-blue-neon hover:underline"
            >
              {social}
            </a>
          </div>
        )}
        {website && (
          <div className="flex flex-col gap-xs">
            <span className="font-sora text-label-caps uppercase text-on-surface-muted">
              Website
            </span>
            <a
              href={toExternalHref(website)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-dm-sans text-body-base text-accent-blue-neon hover:underline"
            >
              {website}
            </a>
          </div>
        )}
        {organizations && organizations.length > 0 && (
          <div className="flex flex-col gap-xs">
            <span className="font-sora text-label-caps uppercase text-on-surface-muted">
              Organizations
            </span>
            <div className="flex gap-sm">
              <div className="w-8 h-8 bg-surface-container border border-border-default rounded-sm flex items-center justify-center">
                <Layers className="w-4 h-4 text-secondary" />
              </div>
            </div>
          </div>
        )}
        <button className="bg-surface border border-border-default px-xl py-sm rounded-lg font-sora text-metadata-tag uppercase tracking-widest hover:bg-surface-bright transition-all active:scale-95 text-on-surface">
          Follow
        </button>
      </div>
    </div>
  );
}
