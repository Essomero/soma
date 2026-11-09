import { useEffect, useRef } from "react";
/**
 * Lock document body scroll while a modal/overlay is active.
 * Works with Lenis smooth scroll (ReactLenis root) — stops Lenis and freezes
 * body position so background content cannot scroll while zoomed.
 * Reference-counted so nested modals don't unlock early.
 */
let lockCount = 0;
let savedScrollY = 0;
let savedStyles: { overflow: string; position: string; top: string; width: string; left: string; right: string } | null = null;

function getLenis(): { stop: () => void; start: () => void } | null {
  try {
    // lenis/react exposes instance via window.__lenis or via DOM __lenis if mounted
    // Fallback to global if present
    const w = window as unknown as Record<string, unknown>;
    if (w.__lenis && typeof (w.__lenis as { stop: () => void }).stop === "function") return w.__lenis as { stop: () => void; start: () => void };
  } catch {}
  return null;
}

export function useScrollLock(locked: boolean) {
  const wasLocked = useRef(false);
  useEffect(() => {
    if (locked === wasLocked.current) return;
    wasLocked.current = locked;
    if (!locked) {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount > 0) return;
      const lenis = getLenis();
      try { lenis?.start(); } catch {}
      if (savedStyles) {
        document.body.style.overflow = savedStyles.overflow;
        document.body.style.position = savedStyles.position;
        document.body.style.top = savedStyles.top;
        document.body.style.width = savedStyles.width;
        const html = document.documentElement;
        html.style.overflow = "";
        window.scrollTo(0, savedScrollY);
        savedStyles = null;
      } else {
        document.body.style.overflow = "";
      }
      return;
    }
    // locking
    if (lockCount === 0) {
      savedScrollY = window.scrollY;
      savedStyles = {
        overflow: document.body.style.overflow,
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
        left: document.body.style.left,
        right: document.body.style.right,
      };
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${savedScrollY}px`;
      document.body.style.width = "100%";
      document.documentElement.style.overflow = "hidden";
      const lenis = getLenis();
      try { lenis?.stop(); } catch {}
      // Block wheel/touchmove on window
      const prevent = (e: Event) => {
        if (!(e.target as HTMLElement)?.closest?.("[data-allow-scroll]")) e.preventDefault();
      };
      // Store for cleanup
      (document.body as unknown as { __lockPrevent: typeof prevent }).__lockPrevent = prevent;
    }
    lockCount++;
    return () => {
      if (!locked) return;
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount > 0) return;
      const lenis = getLenis();
      try { lenis?.start(); } catch {}
      if (savedStyles) {
        document.body.style.overflow = savedStyles.overflow;
        document.body.style.position = savedStyles.position;
        document.body.style.top = savedStyles.top;
        document.body.style.width = savedStyles.width;
        document.documentElement.style.overflow = "";
        window.scrollTo(0, savedScrollY);
        savedStyles = null;
      }
    };
  }, [locked]);
}