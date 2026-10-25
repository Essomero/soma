import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE = "https://soma.mayanja.dev";
const DEFAULT_DESCRIPTION =
  "Deep research, synthesized. A personal publishing platform for ideas that matter.";
const DEFAULT_IMAGE = `${BASE}/og-image.png`;

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

interface PageMeta {
  title?: string;
  description?: string;
  image?: string;
  /** Override the canonical path (defaults to the current pathname). */
  path?: string;
}

/**
 * Per-route head tags for crawlers and share cards.
 * Call unconditionally near the top of every page; missing fields fall back
 * to the site defaults and fill in once content rows load.
 */
export function usePageMeta({ title, description, image, path }: PageMeta) {
  const { pathname } = useLocation();

  useEffect(() => {
    const pageTitle = title ? `${title} | Soma` : "Soma";
    const desc = description || DEFAULT_DESCRIPTION;
    const img = image || DEFAULT_IMAGE;
    const url = BASE + (path ?? pathname);

    document.title = pageTitle;
    setMeta("name", "description", desc);
    setMeta("property", "og:title", pageTitle);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:image", img);
    setMeta("property", "og:url", url);
    setMeta("property", "og:type", title ? "article" : "website");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", pageTitle);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", img);
    setCanonical(url);
  }, [title, description, image, path, pathname]);
}
