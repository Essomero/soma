import type { GuideContent, Author, TocItem, GuideSectionData, TipCardData } from "@/types";

// Legacy data for the custom GuidePage layout
export const guideAuthor: Author = {
  name: "Benjamin Mayanja", title: "Founder, Soma",
  bio: "Benjamin builds Soma, a personal learning and publishing platform that runs entirely on infrastructure you own. He writes about sovereign software, TypeScript, and learning you can prove.",
};

export const guideToc: TocItem[] = [
  { number: "01", title: "Fork your copy, import it into Vercel", href: "#section-1" },
  { number: "02", title: "One password plus the Turso card", href: "#section-2" },
  { number: "03", title: "Deploy, then stay updated forever", href: "#section-3" },
  { number: "04", title: "Optional: add AI keys and publish with agents", href: "#section-4" },
];

export const guideSections: GuideSectionData[] = [
  { number: "01", title: "Fork your copy, import it into Vercel", id: "section-1" },
  { number: "02", title: "One password plus the Turso card", id: "section-2" },
  { number: "03", title: "Deploy, then stay updated forever", id: "section-3" },
  { number: "04", title: "Optional: add AI keys and publish with agents", id: "section-4" },
];

export const guideTipCards: TipCardData[] = [
  { icon: "AlertTriangle", bgClass: "bg-error-container/20", iconColorClass: "text-error", title: "Set the password before you deploy", description: "Deploying without SITE_PASSWORD breaks login and forces a redeploy to fix. Add it on the Vercel configure page first." },
  { icon: "Terminal", bgClass: "bg-secondary/20", iconColorClass: "text-secondary", title: "Keep VITE_ vars local", description: "Local-only keys stay in .env.local. Baking them into Vercel would ship your database token inside public JavaScript." },
  { icon: "Minus", bgClass: "bg-primary-container/20", iconColorClass: "text-primary", title: "One toggle publishes", description: "Notes are private by default. Flip the lock/globe toggle and the same page is public. There is no migration step." },
  { icon: "UserCheck", bgClass: "bg-tertiary-container/20", iconColorClass: "text-tertiary", title: "New work stays private", description: "New pieces land as private rows in your database. Flip the toggle when ready; updates never touch your writing." },
];

export const guideCodeBlock = {
  filename: ".env.local",
  lines: [
    { number: "01", content: "SITE_PASSWORD=your-secure-site-password" },
    { number: "02", content: "TURSO_DATABASE_URL=libsql://your-db.turso.io" },
    { number: "03", content: "TURSO_AUTH_TOKEN=your-turso-token" },
  ],
};

export const shipSoma = {
  slug: "ship-soma",
  category: "Infrastructure // Self-Hosting",
  title: "Ship Soma on your own infrastructure in minutes",
  excerpt:
    "Three moves: fork the repo, import it into Vercel, add one password, click Add on the Turso card, deploy. Your notes live in your database, never in git.",
  image:
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=675&fit=crop",
  imageAlt: "Server racks in a data center",
  author: { name: "Benjamin Mayanja", title: "Founder, Soma" },
  date: "October 24, 2026",
  publishedAt: "2026-10-24T00:00:00Z",
  tags: ["Self-Hosting", "Vercel", "Turso", "Sovereignty"],
  intro:
    "Soma runs entirely on infrastructure you own: a Vercel project for hosting, a Turso database for your writing, and one password that gates your studio. Three moves get you deployed, and because your notes live in your database instead of git, pulling my updates later never touches your words.",
  body: [
    "Start with your own copy. Fork Essomero/soma on GitHub and accept the defaults. This fork is yours and it stays linked for one-click updates later. No git commands needed for any of this.",
    "Next, open Vercel and Add New Project, then Import your soma fork. On the configure page, open Environment Variables and add one variable: SITE_PASSWORD, any strong string you invent. Do this before pressing Deploy. Deploying without it breaks login and forces a redeploy to fix. Do not add any VITE_ variables here: those are local-development only, and baking them into Vercel would expose your database token in the shipped JavaScript.",
    "Further down the same page, under Optional Integrations, click Add on the Turso card. Vercel provisions the database and injects TURSO_DATABASE_URL and TURSO_AUTH_TOKEN into your project on its own. Then press Deploy. Tables initialize automatically on the first API request: no migrations, no SQL to run by hand.",
    "Staying updated is a habit, not a project. Your fork stays linked to Essomero/soma. When I ship fixes, open your fork on GitHub, click Sync fork, then Update branch. If Vercel is connected, it redeploys on its own. One rule keeps merges clean forever: keep your own pieces as new slugs instead of editing mine.",
    "Two optional moves complete the setup. Add a provider key like OPENROUTER_API_KEY or GROQ_API_KEY to enable the inline margin AI. And when you want words on the site, ask any coding assistant to draft typed content and stage it into your database as a private piece. Flipping it public is one toggle, no rebuild, no redeploy.",
  ],
};
