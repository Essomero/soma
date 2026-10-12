import { useState } from "react";

interface LoadMoreProps {
  initialCount?: number;
  increment?: number;
  total: number;
  children: (visibleCount: number) => React.ReactNode;
}

export default function LoadMore({
  initialCount = 6,
  increment = 6,
  total,
  children,
}: LoadMoreProps) {
  const [count, setCount] = useState(initialCount);
  const remaining = total - count;

  return (
    <>
      {children(count)}
      {remaining > 0 && (
        <div className="flex justify-center mt-xxl">
          <button
            className="px-xl py-md border border-border-default rounded-lg font-sora text-label-caps text-on-surface hover:bg-surface-container transition-colors"
            onClick={() => setCount((c) => Math.min(c + increment, total))}
          >
            Load {Math.min(increment, remaining)} more ({remaining} remaining)
          </button>
        </div>
      )}
    </>
  );
}
