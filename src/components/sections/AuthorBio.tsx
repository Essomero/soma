import type { Author } from "@/types";
import { md } from "@/lib/markdown";

interface AuthorBioProps {
  author: Author;
}

export default function AuthorBio({ author }: AuthorBioProps) {
  return (
    <div className="p-lg border border-border-default rounded-xl bg-surface-container-low">
      <div className="flex items-center gap-md mb-md">
        {author.avatar && (
          <div className="w-12 h-12 rounded-full bg-primary-container overflow-hidden shrink-0">
            <img
              alt={author.name}
              className="w-full h-full object-cover"
              src={author.avatar}
            />
          </div>
        )}
        <div>
          <p className="font-sora text-label-caps text-on-surface">
            {author.name}
          </p>
          {author.title && (
            <p className="text-[12px] text-on-surface-muted">{author.title}</p>
          )}
        </div>
      </div>
      {author.bio && (
        <p className="font-dm-sans text-[14px] text-on-surface-variant" dangerouslySetInnerHTML={{ __html: md(author.bio) }} />
      )}
    </div>
  );
}
