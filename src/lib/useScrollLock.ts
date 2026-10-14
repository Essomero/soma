import { useEffect } from "react";
import { useLenis } from "lenis/react";

/**
 * Freeze page scrolling while `locked` is true.
 *
 * `document.body.style.overflow = "hidden"` is not enough on its own here.
 * The app runs Lenis (`<ReactLenis root>` in Layout), which drives the document
 * scroll itself and ignores the overflow property : so the page kept scrolling
 * behind open modals, and the dimmed content below moved under the user's wheel.
 * Stop the Lenis instance as well. The overflow lock stays because once Lenis is
 * stopped the wheel falls back to native scrolling, and this is what blocks it.
 */
export function useScrollLock(locked: boolean) {
  const lenis = useLenis();

  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();
    return () => {
      document.body.style.overflow = previous;
      lenis?.start();
    };
  }, [locked, lenis]);
}
