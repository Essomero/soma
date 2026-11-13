/**
 * useShiftTabToggle — Shift+Tab to switch between write/edit and preview modes.
 *
 * Attach the returned handler to the textarea (write mode) and optionally to
 * the preview container. Shift+Tab toggles to the opposite mode.
 *
 * If switching from preview → write, the setter is called and a ref is returned
 * to auto-focus the textarea.
 *
 * @example
 *   const { onKeyDown, textareaRef } = useShiftTabToggle(tab, setTab);
 *   // tab === "write" ? <textarea onKeyDown={onKeyDown} ref={textareaRef} />
 *   //   : <div onKeyDown={onKeyDown}>preview</div>
 */

import { useCallback, useRef } from "react";

type WriteTab = "write" | "edit";
type ReadTab = "preview";

export function useShiftTabToggle<T extends WriteTab | ReadTab>(
  tab: T,
  setTab: (t: T) => void,
  opts?: { writeValue?: WriteTab },
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const writeValue = (opts?.writeValue ?? "write") as T;

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        if (tab === "preview") {
          setTab(writeValue);
          // Auto-focus textarea on next render
          requestAnimationFrame(() => textareaRef.current?.focus());
        } else {
          setTab("preview" as T);
        }
      }
    },
    [tab, setTab, writeValue],
  );

  return { onKeyDown, textareaRef };
}
