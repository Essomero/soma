import { useState, useEffect, useCallback } from "react";
import { useLenis } from "lenis/react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Tooltip from "@/components/ui/Tooltip";

export default function StoryJumpButtons() {
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);
  const [canScroll, setCanScroll] = useState(true);

  const updateScrollState = useCallback(() => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    const isScrollable = docHeight > viewportHeight + 100;
    setCanScroll(isScrollable);

    setAtTop(scrollY <= 80);
    setAtBottom(scrollY + viewportHeight >= docHeight - 80);
  }, []);

  const lenis = useLenis(updateScrollState);

  useEffect(() => {
    updateScrollState();
    // Delay check for dynamic content, lazily loaded charts, images, and fonts to settle layout
    const timer = setTimeout(updateScrollState, 350);
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const scrollToTop = () => {
    if (atTop) return;
    if (lenis) {
      lenis.scrollTo(0, { duration: 0.8 });
    } else {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
  };

  const scrollToBottom = () => {
    if (atBottom) return;
    if (lenis) {
      lenis.scrollTo("bottom", { duration: 0.8 });
    } else {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }
  };

  if (!canScroll) return null;

  return (
    <div
      className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-30 flex flex-col items-center bg-surface/80 backdrop-blur-md border border-border-default rounded-full shadow-lg p-1 gap-1"
      role="group"
      aria-label="Story jump navigation"
    >
      <Tooltip label="Jump to top">
        <button
          type="button"
          onClick={scrollToTop}
          disabled={atTop}
          aria-label="Jump to top"
          className={cn(
            "group relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-150",
            atTop
              ? "text-on-surface-muted/30 cursor-not-allowed"
              : "text-on-surface-muted hover:text-primary hover:bg-surface-container active:scale-95 cursor-pointer"
          )}
        >
          <ArrowUp
            className={cn(
              "w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform",
              !atTop && "group-hover:-translate-y-0.5"
            )}
          />
        </button>
      </Tooltip>

      <div className="w-5 h-px bg-border-default/60" />

      <Tooltip label="Jump to bottom">
        <button
          type="button"
          onClick={scrollToBottom}
          disabled={atBottom}
          aria-label="Jump to bottom"
          className={cn(
            "group relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-150",
            atBottom
              ? "text-on-surface-muted/30 cursor-not-allowed"
              : "text-on-surface-muted hover:text-primary hover:bg-surface-container active:scale-95 cursor-pointer"
          )}
        >
          <ArrowDown
            className={cn(
              "w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform",
              !atBottom && "group-hover:translate-y-0.5"
            )}
          />
        </button>
      </Tooltip>
    </div>
  );
}
