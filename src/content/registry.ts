// ── Content Registry ──────────────────────────────────
// Taxonomy + site config ONLY. Prose content lives in Turso
// (see api/content.js) and is NEVER imported into the client bundle:
// the .ts files under src/content/<type>/ are the versioned content
// source, published via `npm run publish-all`. Importing them into a page
// or component would ship private content to every visitor.
export { allTopics } from "./topics";
export {
  readmeNavLinks, innerNavLinks, siteTitle,
} from "./navigation";
