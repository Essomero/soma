import { useCallback } from "react";
import { useLenis } from "lenis/react";

/**
 * A lightly underdamped spring (ζ = 0.72, ω = 6) as a Lenis easing function.
 *
 * Two things matter here:
 *
 * 1. Lenis interpolates with the easing's *output*, so an easing that ends at
 *    0.98 leaves the scroll 2% short of the anchor : permanently, since there
 *    is no second pass to correct it. The curve is therefore normalised by its
 *    own value at t=1 so f(1) is exactly 1.
 * 2. The overshoot is the point. An ease curve decelerates into the target and
 *    reads as a slide; a spring passes it slightly and settles back, which is
 *    what makes the jump feel physical.
 */
const ZETA = 0.72;
const OMEGA = 6;
const OMEGA_D = OMEGA * Math.sqrt(1 - ZETA * ZETA);

function spring(t: number): number {
  return (
    1 -
    Math.exp(-ZETA * OMEGA * t) *
      (Math.cos(OMEGA_D * t) + ((ZETA * OMEGA) / OMEGA_D) * Math.sin(OMEGA_D * t))
  );
}

const SPRING_END = spring(1);

function springEasing(t: number): number {
  return t >= 1 ? 1 : spring(t) / SPRING_END;
}

/**
 * Returns a `(hash) => boolean` jump helper: spring-scrolls to the element the
 * hash names, landing `offset` pixels above it so a sticky header doesn't
 * cover the heading. Returns false when the target doesn't exist, letting the
 * caller fall through to the browser's default.
 *
 * Reduced motion is handled by Lenis itself : with `respectReducedMotion`
 * (its default) a programmatic `scrollTo` is forced to `immediate`, so there's
 * no second check to keep in sync here.
 */
export function useSpringScroll(offset = -100) {
  const lenis = useLenis();

  return useCallback(
    (hash: string): boolean => {
      const id = hash.startsWith("#") ? hash.slice(1) : hash;
      const el = document.getElementById(id);
      if (!el) return false;

      if (lenis) {
        lenis.scrollTo(el, { offset, duration: 1.1, easing: springEasing });
      } else {
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY + offset,
          behavior: "auto",
        });
      }
      return true;
    },
    [lenis, offset],
  );
}
