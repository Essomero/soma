import type { DocContent } from "@/types";

export const labSetup: DocContent = {
  slug: "lab-setup",
  category: "Hands-On Drills // Environment",
  title: "Soma Labs Setup: The Single Companion Workspace",
  description:
    "How to set up the single local companion repo for running drills that prove each TypeScript lesson. Clone once, run anywhere.",
  image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&h=900&fit=crop",
  imageAlt: "A terminal window showing code compilation and test passes in green text",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  publishedAt: "2026-09-01T00:00:00Z",
  tags: ["Labs", "Dev Environment", "TypeScript", "Deno", "Node"],
  topics: ["technology"],

  sections: [
    {
      number: "·",
      heading: "The Map",
      anchor: "map",
      intro:
        "Every lesson on Soma that has code you can run points to a folder in one companion repository: `Essomero/soma-labs`. You clone it once. From that point forward, every course lesson gives you the exact directory and verification command to run.",
      items: [
        {
          question: "Why a single companion repository?",
          answer: [
            "Cloning a new repository per course wastes time, eats disk space, and clutters your computer. With one repo, moving from type errors to generics to narrowing is just a `cd` command.",
            "All test runners are configured in one place, and every lesson verifies the same way: run the command, read the output.",
          ],
        },
        {
          question: "What tools do I need installed?",
          answer: [
            "| Tool | Minimum Version | Used In |\n|---|---|---|\n| **Deno** | 2.x+ | TypeScript labs (zero-config .ts execution, type checking, and tests) |\n| **Node.js** | 20+ | Test runners and workspace scripts |\n| **GitHub CLI (`gh`)** | Latest | Quick cloning (optional, plain `git clone` works too) |",
            "You only need Deno to run the drills (`brew install deno` or `curl -fsSL https://deno.land/install.sh | sh`). It runs .ts files directly with zero build configuration. Node runs the root scripts that drive whole-track runs.",
          ],
        },
        {
          question: "What's in the repository right now?",
          answer: [
            "One track, one workspace per lesson:\n\n| Track | Folder | Course |\n|---|---|---|\n| **TypeScript Fast Track** | `fullstack/01-why-this-type-error` … `fullstack/05-typing-the-boundary` | TypeScript Fast Track: 5 Essential Mental Models |\n\nThe `typescript/` folder holds symlinks to the same five workspaces, so `typescript/01-why-this-type-error` and `fullstack/01-why-this-type-error` are the same drill. Run the whole track with `npm run test:typescript` from the repository root.",
          ],
        },
        {
          question: "I want to contribute content. Where do I start?",
          answer: [
            "Read [Content Types](/docs/content-types) first. It explains what each type is for (story, lesson, lab, guide, doc, course, series, test) with one canonical example of each, so you create the right thing instead of reshaping the wrong one.",
          ],
        },
      ],
    },

    {
      number: "A",
      heading: "One-Time Clone & Setup",
      anchor: "clone",
      intro: "Open your terminal and clone the repository to your local dev directory.",
      items: [
        {
          question: "How do I clone the companion repo?",
          answer: [
            "Using GitHub CLI (recommended):\n```bash\ngh repo clone Essomero/soma-labs\ncd soma-labs\n```\n\nOr using standard Git over SSH:\n```bash\ngit clone git@github.com:Essomero/soma-labs.git\ncd soma-labs\n```",
          ],
        },
        {
          question: "How do I install dependencies?",
          answer: [
            "From the repository root, install the root workspace dependencies:\n```bash\nnpm install\n```\n\nThis also runs the environment doctor, which tells you exactly which tracks are runnable on your machine. The lesson workspaces themselves need no install step: TypeScript lessons run on Deno with zero-config execution.",
          ],
        },
      ],
    },

    {
      number: "B",
      heading: "Running Drills from Course Lessons",
      anchor: "workflow",
      intro: "How the lessons inside the course connect to your local terminal.",
      items: [
        {
          question: "How do lessons point to code?",
          answer: [
            "Every lesson that benefits from runnable code has collapsed Lab blocks directly inside the text. They stay out of the way while you're reading.",
            "When you click to expand a lab, it gives you two things:\n1. The relative folder path (e.g. `fullstack/02-generics`).\n2. The terminal command that runs the drill and checks the result (e.g. `deno test`).",
            "You `cd` into that folder in your local clone and run the command. The terminal output tells you immediately if the tests pass or where the bug is.",
          ],
        },
        {
          question: "Can I run all drills across a course at once?",
          answer: [
            "Yes. From the root of `soma-labs`, run:\n```bash\n# Run the full TypeScript track (lesson suites)\nnpm run test:typescript\n\n# Or step through interactively, one lab at a time\ncd fullstack/01-why-this-type-error && deno test\n```",
          ],
        },
      ],
    },

    {
      number: "C",
      heading: "Track Directory Map",
      anchor: "tracks",
      intro: "A map of the workspaces available in the companion repo.",
      items: [
        {
          question: "What workspaces exist in the repository?",
          answer: [
            "| Lesson | Folder | Covers |\n|---|---|---|\n| **L1: Why This Type Error** | `fullstack/01-why-this-type-error` | Structural assignability, the five error families, excess-property checks |\n| **L2: Generics** | `fullstack/02-generics` | Constrained generics, inference sites, when not to generalize |\n| **L3: Discriminated Unions** | `fullstack/03-discriminated-unions` | Tagged unions, narrowing, exhaustiveness with never |\n| **L4: Utility Types** | `fullstack/04-utility-types` | Mapped types, keyof, conditional types, infer |\n| **L5: Typing the Boundary** | `fullstack/05-typing-the-boundary` | Trust boundaries, unknown vs any, Zod schemas |",
          ],
        },
      ],
    },
  ],
};
