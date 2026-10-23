import { useEffect, type RefObject } from "react";

const CLIPBOARD_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

const CHECK_SVG =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

function injectButton(pre: HTMLPreElement) {
  if (pre.querySelector("[data-copy-btn]")) return;

  // Set relative position directly without calling getComputedStyle (which causes forced layout reflow)
  if (!pre.style.position || pre.style.position === "static") {
    pre.style.position = "relative";
  }
  const code = pre.querySelector("code") || pre;
  const text = code.textContent || "";

  const btn = document.createElement("button");
  btn.setAttribute("data-copy-btn", "true");
  btn.setAttribute("aria-label", "Copy code");
  btn.className = "copy-code-btn";
  btn.innerHTML = CLIPBOARD_SVG;

  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      btn.innerHTML = CHECK_SVG;
      btn.classList.add("copied");
      setTimeout(() => {
        btn.innerHTML = CLIPBOARD_SVG;
        btn.classList.remove("copied");
      }, 2000);
    } catch {
      // clipboard unavailable : silently ignore
    }
  });

  pre.appendChild(btn);
}

/**
 * Injects copy-to-clipboard buttons into every <pre> element inside the
 * given container. Re-runs when `html` changes (e.g. after a re-render
 * with new markdown output).
 */
export function useInjectCopyButtons(
  ref: RefObject<HTMLElement | null>,
  html: string,
) {
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    // Debounce to avoid querying and mutating DOM during rapid streaming
    const timer = setTimeout(() => {
      container.querySelectorAll("pre").forEach(injectButton);
    }, 200);

    return () => clearTimeout(timer);
  }, [html, ref]);
}
