import { useEffect } from "react";

/**
 * Lock document body scroll while a modal/overlay is active.
 * Works with Lenis — stops Lenis, freezes body, hides sticky header so it doesn't peek above overlay.
 * Reference-counted so nested modals don't unlock early.
 */
let lockCount = 0;
let savedScrollY = 0;
let savedStyles: { overflow: string; position: string; top: string; width: string } | null = null;
let hiddenHeaders: HTMLElement[] = [];

function getLenis(): { stop: () => void; start: () => void } | null {
  try {
    const w = window as unknown as Record<string, unknown>;
    if (w.__lenis && typeof (w.__lenis as { stop: () => void }).stop === "function") {
      return w.__lenis as { stop: () => void; start: () => void };
    }
  } catch {}
  return null;
}

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (locked) {
      if (lockCount === 0) {
        savedScrollY = window.scrollY;
        savedStyles = {
          overflow: document.body.style.overflow,
          position: document.body.style.position,
          top: document.body.style.top,
          width: document.body.style.width,
        };
        document.body.style.overflow = "hidden";
        document.body.style.position = "fixed";
        document.body.style.top = `-${savedScrollY}px`;
        document.body.style.width = "100%";
        document.documentElement.style.overflow = "hidden";
        try {
          getLenis()?.stop();
        } catch {}
        hiddenHeaders = Array.from(document.querySelectorAll("header")) as HTMLElement[];
        hiddenHeaders = hiddenHeaders.filter((h) => {
          const pos = getComputedStyle(h).position;
          return pos === "sticky" || pos === "fixed";
        });
        hiddenHeaders.forEach((h) => {
          h.style.visibility = "hidden";
          h.style.pointerEvents = "none";
        });
      }
      lockCount++;
      return () => {
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount > 0) return;
        try {
          getLenis()?.start();
        } catch {}
        if (savedStyles) {
          document.body.style.overflow = savedStyles.overflow;
          document.body.style.position = savedStyles.position;
          document.body.style.top = savedStyles.top;
          document.body.style.width = savedStyles.width;
          document.documentElement.style.overflow = "";
          window.scrollTo(0, savedScrollY);
          savedStyles = null;
        }
        hiddenHeaders.forEach((h) => {
          h.style.visibility = "";
          h.style.pointerEvents = "";
        });
        hiddenHeaders = [];
      };
    } else {
      if (lockCount === 0) return;
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount > 0) return;
      try {
        getLenis()?.start();
      } catch {}
      if (savedStyles) {
        document.body.style.overflow = savedStyles.overflow;
        document.body.style.position = savedStyles.position;
        document.body.style.top = savedStyles.top;
        document.body.style.width = savedStyles.width;
        document.documentElement.style.overflow = "";
        window.scrollTo(0, savedScrollY);
        savedStyles = null;
      }
      hiddenHeaders.forEach((h) => {
        h.style.visibility = "";
        h.style.pointerEvents = "";
      });
      hiddenHeaders = [];
    }
  }, [locked]);
}
