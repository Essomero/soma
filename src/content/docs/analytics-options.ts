import type { DocContent } from "@/types";

export const analyticsOptions: DocContent = {
  slug: "analytics-options",
  category: "Infrastructure // Analytics",
  title: "Analytics for Soma: Open Options That Respect Zero Telemetry",
  description:
    "Which open analytics platforms fit a sovereign SQLite stack, where each one deploys, what reads a SQLite file directly, and why Google Analytics costs more than money.",
  image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&h=900&fit=crop",
  imageAlt: "A terminal window showing code compilation and test passes in green text",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  date: "October 2026",
  tags: ["Analytics", "Self-Hosting", "SQLite", "Privacy"],
  topics: ["technology"],

  sections: [
    {
      number: "·",
      heading: "The Map",
      anchor: "map",
      intro:
        "Soma promises zero telemetry and zero tracking scripts. That promise rules out most analytics before you compare features: anything that phones a third party home, drops third-party cookies, or needs a consent banner does not fit. What fits is first-party, cookieless, and stored in infrastructure you own.",
      items: [
        {
          question: "What are the two jobs?",
          answer: [
            "Collecting counts visits: a small script on your pages sends pageviews somewhere. Reading charts a database: a tool opens stored data and draws graphs. Different tools do each job, and this doc covers both, because the cheapest stack may split them.",
          ],
        },
        {
          question: "What does Soma rule out up front?",
          answer: [
            "Anything that needs a cookie banner in the EU, anything whose data lives on someone else's cloud with no export, and anything heavier than the site it measures. Soma is a static frontend plus serverless functions plus one Turso database. Your analytics should be shaped like that: small, boring, yours.",
          ],
        },
      ],
    },

    {
      number: "A",
      heading: "Collectors Compared",
      anchor: "collectors",
      intro:
        "Three open collectors worth comparing. One of them stores its data in a plain SQLite file, which is why it leads.",
      items: [
        {
          question: "How do the three compare?",
          answer: [
            "| Collector | Database | Weight | License |\n|---|---|---|---|\n| **GoatCounter** | SQLite file by default | One Go binary, no personal data tracked | Open source (EUPL) |\n| **Umami v3** | PostgreSQL only (min v12.14), MySQL dropped | Node app plus one Postgres | Open source (MIT) |\n| **Plausible CE** | Postgres plus ClickHouse, ~2 GB RAM, CPU needs SSE4.2 or NEON | Docker Compose stack | AGPL, read it before building commercial products on top |",
          ],
        },
        {
          question: "GoatCounter: why is it the closest fit?",
          answer: [
            "It ships as a statically compiled Go binary with no separate worker, and the default store is a SQLite file created on first run (`goatcounter serve` listens on port 8080). It tracks no personal data, so there is no cookie banner to design and no consent state to manage. The source is fully open ([arp242/goatcounter](https://github.com/arp242/goatcounter)), the hosted version lives at [goatcounter.com](https://www.goatcounter.com), and there is a one-click [Railway template](https://railway.com/deploy/goatcounter-analytics.md) if you want it running in minutes. For a sovereign SQLite stack, this is the shape you already believe in.",
          ],
        },
        {
          question: "Umami: when is it worth a Postgres?",
          answer: [
            "Umami's tracker is tiny (about 2 KB), cookieless, and served from your own domain, which keeps the privacy story clean. But since v3 it standardizes on [PostgreSQL](https://docs.umami.is/docs/install) and MySQL support is gone ([migration guide](https://docs.umami.is/docs/guides/migrate-mysql-postgresql)). So the real question is whether you want to run a Postgres for page counts. If you already have one (Neon, Supabase), Umami splits nicely: frontend on Vercel, database managed elsewhere. If you do not, that is a whole database server to babysit for a hit counter.",
          ],
        },
        {
          question: "Plausible: why is it so heavy?",
          answer: [
            "The [Community Edition](https://github.com/plausible/community-edition) is a Docker Compose stack: Plausible itself plus Postgres plus ClickHouse, asking roughly 2 GB of RAM and a CPU with SSE4.2 or NEON for ClickHouse. You get funnels, goals, and raw data access straight from ClickHouse in return. That trade only makes sense once Soma has funnels worth analyzing. Today it is a hit counter wearing a data warehouse costume.",
          ],
        },
      ],
    },

    {
      number: "B",
      heading: "Where to Deploy",
      anchor: "deploy",
      intro:
        "Soma lives on Vercel. Your analytics collector cannot live there with it, and understanding why saves you a wasted afternoon.",
      items: [
        {
          question: "Can the collector run on Vercel next to Soma?",
          answer: [
            "No, not the stateful ones. Vercel functions are short-lived and the filesystem is ephemeral, so a SQLite file written at request time evaporates. GoatCounter needs a persistent volume: a small Fly.io app with a volume, the Railway template, or any VPS you already rent. Budget one tiny always-on machine, not a cluster.",
          ],
        },
        {
          question: "What about splitting across services?",
          answer: [
            "That works for Umami: keep the dashboard on Vercel and point it at a managed Postgres (Neon and Supabase both have free tiers that swallow analytics traffic). You pay in moving parts instead of machines: two dashboards, two bills, two places to check when numbers stop flowing. Fine at scale, silly for a launch.",
          ],
        },
      ],
    },

    {
      number: "C",
      heading: "Reading SQLite Directly",
      anchor: "sqlite",
      intro:
        "The second job: once numbers sit in a SQLite file, which tools open that file and chart it without a migration step.",
      items: [
        {
          question: "Which tool reads a SQLite file natively?",
          answer: [
            "[Datasette](https://docs.datasette.io/en/stable/publish.html) is the answer. Point it at any SQLite file and you get a web UI for browsing tables plus an instant read-only JSON API, deployable to a hosting account with a single publish command. If your analytics live in a SQLite file, Datasette is the fastest path from file to graphs with no new database anywhere.",
          ],
        },
        {
          question: "What about Evidence?",
          answer: [
            "Evidence builds dashboards as code, but its current docs center the warehouse model (DuckDB, Parquet, Postgres) rather than raw SQLite files. So the path is export-then-chart: dump the SQLite tables to Parquet and build on that. One conversion step, still no database server.",
          ],
        },
        {
          question: "Can anything write events straight into Turso?",
          answer: [
            "No off-the-shelf collector speaks libSQL, so nothing writes to your Turso database directly today. The sovereign alternative is a do-it-yourself endpoint: one `pageviews` table plus one route under your existing `/api/*` pattern, following the same self-creating table convention the rest of Soma uses. Zero new infrastructure, and the data sits beside your content. The limit to watch is Turso's free-tier row caps on spike days: a Show HN front page writes a lot of rows.",
          ],
        },
      ],
    },

    {
      number: "D",
      heading: "What About Google Analytics?",
      anchor: "ga4",
      intro:
        "Google Analytics 4 (Standard) is free with no credit card. The paid tier is GA4 360. Money is not the cost.",
      items: [
        {
          question: "What does the free tier actually include?",
          answer: [
            "Full dashboarding at any traffic Soma will see for a long time, plus a BigQuery export on every property. Two caps matter. Granular data retention maxes out at [14 months](https://support.google.com/analytics/answer/11202874?hl=en) (you choose 2 or 14), after which explorations go blank unless you archived to BigQuery. And the free [BigQuery daily export is capped at 1 million events per day](https://support.google.com/analytics/answer/9823238?hl=en); 360 adds streaming export and higher quotas. BigQuery storage and queries bill separately, though tiny at your scale.",
          ],
        },
        {
          question: "Why not use it on Soma?",
          answer: [
            "Three reasons, in ascending order of pain. First, GA uses cookies that need a consent banner for EU visitors, which is a design tax on the calm reading experience Soma sells. Second, adblockers silently eat a large share of visits, and the developers you most want to reach are exactly the people running blockers, so the numbers undercount your core audience. Third, your README promises zero telemetry and zero tracking scripts, and a Google tag on every page makes that sentence false. It is the sentence your Show HN thread will quote back at you.",
          ],
        },
      ],
    },

    {
      number: "E",
      heading: "The Pick",
      anchor: "pick",
      intro:
        "One recommendation, with the runner-up named so you can disagree.",
      items: [
        {
          question: "What should I deploy first?",
          answer: [
            "GoatCounter on a Fly.io volume (or the Railway template). One binary, one SQLite file, no cookie banner, no database to babysit, and the privacy story matches the README word for word. Revisit only when you have a question GoatCounter cannot answer, like funnel drop-off between a story page and a Labs drill.",
          ],
        },
        {
          question: "When does the DIY Turso table win?",
          answer: [
            "When analytics must live inside Soma itself: per-story view counts on author dashboards, most-read shelves, or launch-day graphs next to your content. Then the endpoint-plus-table design keeps everything in the database you own, and Datasette or Evidence charts the export. More building, but nothing leaves your infrastructure.",
          ],
        },
      ],
    },
  ],
};
