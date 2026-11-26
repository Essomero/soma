/**
 * useAutoResize — automatically grow a textarea's height as content changes.
 *
 * Returns a ref to attach to the textarea. Call `resize()` after external
 * value changes (e.g. clearing the field) to reset height.
 */

import { useCallback, useRef } from "react";

export function useAutoResize() {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  return { ref, resize };
}