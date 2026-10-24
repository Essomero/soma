// ── Content Registry ──────────────────────────────────
// Taxonomy + site config ONLY. Prose content lives in Turso
// (see api/content.js) and is NEVER imported into the client bundle:
// the .ts files under src/content/<type>/ are the versioned seed
// corpus, read solely by `npm run seed`. Importing them into a page
// or component would ship every draft to every visitor.
export { allTopics } from "./topics";
export {
  readmeNavLinks, innerNavLinks, siteTitle,
} from "./navigation";
