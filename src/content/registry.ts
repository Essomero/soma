// ── Content Registry ──────────────────────────────────
// The single import point for all content. Every page imports from here.

export { allStories } from "./stories";
export { allFeatured } from "./featured";
export { allGuides, toArticleCard } from "./guides";
export { allBooks } from "./books";
export { allCourses } from "./courses";
export { allSeries } from "./series";
export { allDocs } from "./docs";
export { allTests } from "./tests";
export { allTopics } from "./topics";
export { podcastEpisodes, recentEpisodes, podcastTopics } from "./podcast/episodes";
export { allEpisodes, toEpisodeCard } from "./podcast/episodes/index";
export {
  featuredHero, featuredStories, secondaryGuide,
  secondaryStories, latestUpdates, featuredGuide,
} from "./homepage";
export {
  readmeNavLinks, innerNavLinks, siteTitle,
} from "./navigation";

// Legacy exports for custom page layouts
export { ruthStory, ruthMoreStories } from "./stories/ruth-ikegah";
export { nvdaAuthor, nvdaBentoHighlights, nvdaPullQuotes, nvdaMoreStories } from "./featured/nvda-accessibility";
export { antonAuthor, guideToc, guideSections, guideTipCards, guideCodeBlock } from "./guides/generative-ai";
