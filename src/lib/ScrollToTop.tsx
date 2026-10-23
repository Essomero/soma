import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { useLenis } from "lenis/react";
import type Lenis from "lenis";

// Session-level scroll position cache : persists across re-renders within the same SPA session
const scrollPositions = new Map<string, number>();

// Sections carry `scroll-mt-24` (6rem) so a native fragment jump clears the
// sticky header. Lenis positions by number instead of reading that CSS, so the
// same offset is applied by hand here and the two paths land in one place.
const ANCHOR_OFFSET = 96;

type LenisInstance = Lenis | undefined;

/** The element named by the current URL fragment, if any. */
function anchorTarget(): HTMLElement | null {
  const hash = window.location.hash;
  if (hash.length < 2) return null;
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    // Malformed escape in the fragment : not an anchor we can resolve.
    return null;
  }
}

// Go through Lenis when it's mounted: a raw window.scrollTo moves the
// native scroll but leaves Lenis' internal target stale, so the next wheel
// tick snaps back to where it thought it was.
function jumpTo(lenis: LenisInstance, top: number) {
  if (lenis) {
    lenis.scrollTo(top, { immediate: true });
  } else {
    window.scrollTo(0, top);
  }
}

// A deep link lands before lazily imported diagrams, late images and fonts have
// settled, so on a cold cache the section drifts out from under the jump
// (measured ~700px on a first visit). Re-place it on a short schedule to chase
// that growth, and release the moment the reader scrolls or presses a key.
const ANCHOR_SETTLE_DELAYS_MS = [250, 600, 1200, 2000];

/** Put `el` below the sticky header, then hold it there while layout settles. */
function jumpAndHoldAnchor(lenis: LenisInstance, el: HTMLElement) {
  const place = () => {
    jumpTo(lenis, Math.max(0, window.scrollY + el.getBoundingClientRect().top - ANCHOR_OFFSET));
  };

  place();

  const stop = () => {
    timers.forEach(clearTimeout);
    window.removeEventListener("wheel", stop);
    window.removeEventListener("touchstart", stop);
    window.removeEventListener("keydown", stop);
    window.removeEventListener("pointerdown", stop);
  };

  const timers = ANCHOR_SETTLE_DELAYS_MS.map((delay) =>
    window.setTimeout(() => {
      // A route change detaches the section, and a detached element reports a
      // zero rect : re-placing would scroll the new page by a stale offset.
      if (el.isConnected) place();
      else stop();
    }, delay),
  );

  window.addEventListener("wheel", stop, { passive: true });
  window.addEventListener("touchstart", stop, { passive: true });
  window.addEventListener("keydown", stop);
  window.addEventListener("pointerdown", stop);
}

export default function ScrollToTop() {
  const { pathname, key } = useLocation();
  const navType = useNavigationType();
  const previousKey = useRef<string | null>(null);
  const lenis = useLenis();

  useEffect(() => {
    const prev = previousKey.current;
    const target = anchorTarget();

    if (target) {
      // A deep link outranks both the saved position and scrolling to top.
      // requestAnimationFrame waits for DOM paint; story content is local, so
      // the section element is already rendered.
      requestAnimationFrame(() => {
        jumpAndHoldAnchor(lenis, target);
      });
    } else if (navType === "POP" && key) {
      // Back/forward navigation : restore saved position
      const saved = scrollPositions.get(key);
      if (saved !== undefined) {
        // Use requestAnimationFrame to wait for DOM paint
        requestAnimationFrame(() => {
          jumpTo(lenis, saved);
        });
      }
    } else {
      // New navigation (PUSH/REPLACE) : scroll to top
      jumpTo(lenis, 0);
    }

    // Save the previous page's scroll position
    if (prev && prev !== key) {
      scrollPositions.set(prev, window.scrollY);
    }

    previousKey.current = key ?? null;

    // Save scroll position on scroll (debounced by storing latest only)
    const handleScroll = () => {
      if (key) {
        scrollPositions.set(key, window.scrollY);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      // Save final position before unmount
      if (key) {
        scrollPositions.set(key, window.scrollY);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname, key, navType, lenis]);

  // In-page fragment links (a hint linking the section it references) navigate
  // natively, so react-router never sees them. The browser has already jumped
  // and honoured `scroll-margin-top`; re-assert that position through Lenis so
  // its internal target isn't left stale.
  useEffect(() => {
    const handleHashChange = () => {
      const target = anchorTarget();
      if (!target) return;
      requestAnimationFrame(() => {
        jumpAndHoldAnchor(lenis, target);
      });
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [lenis]);

  return null;
}
