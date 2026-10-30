import { useEffect } from "react";

/**
 * Lock document body scroll while a modal/overlay is active.
 * Pass `false` as the condition to keep scroll unlocked (useful for
 * components that mount conditionally and already gate on a prop).
 */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}