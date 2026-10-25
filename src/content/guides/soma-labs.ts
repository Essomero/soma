export const somaLabs = {
  slug: "soma-labs",
  category: "Hands-On Drills // Companion Repo",
  title: "Soma Labs: run the drills that prove the lessons",
  excerpt:
    "One clone, one install, every drill. Run the full suite green, then break a lesson on purpose and fix it: that is the whole method.",
  image:
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=675&fit=crop",
  imageAlt: "Laptop displaying code in a focused workspace",
  author: { name: "Benjamin Mayanja", title: "Founder, Soma" },
  date: "October 2026",
  tags: ["Labs", "Drills", "TypeScript", "Deno", "Self-Hosting"],
  intro:
    "Reading about generics feels like understanding until someone asks you to write one from scratch. Soma Labs closes that gap: every course lesson points at a folder you can run, break, and fix on your own machine. Clone once, and from then on every lesson is a directory plus a verification command.",
  body: [
    "## The idea: every lesson has a folder",

    "A lesson tells you that `Partial` is a loop over keys. A drill makes you write that loop, watches the test fail, and turns green only when your version behaves like the real one. That loop from reading to doing is the entire product. [Soma Labs on GitHub](https://github.com/Essomero/soma-labs) is one repository holding every drill, in any language the track needs. Today that means TypeScript on Deno and Node; the design leaves room for Go, Rust, Python, and SQLite later.",

    "## Step 1: clone once",

    "One clone serves every course, forever. New tracks arrive as new folders, never new repositories.",

    "```bash\ngh repo clone Essomero/soma-labs\ncd soma-labs\n```\n\nNo GitHub CLI? `git clone https://github.com/Essomero/soma-labs.git` lands in the same place.",

    "## Step 2: install and let the doctor check you",

    "Install from the repository root. The install probes your workstation and reports exactly which tracks you can run, so a missing runtime shows up as a clear message instead of a mysterious failure later.",

    "```bash\nnpm install       # doctor probe runs automatically\nnpm run doctor    # re-run the diagnostics any time\n```\n\nYou only need the tools for the tracks you want. Deno 2.x runs the TypeScript track with zero configuration; Node 20+ runs the full-stack track and the root runners.",

    "## Step 3: run everything green",

    "Start with proof that your machine works. The root suite runs every track and prints a combined summary, and it is green on a fresh clone. One failing track never hides the rest.",

    "```bash\nnpm test                  # every track, combined summary\nnpm run test:typescript   # TypeScript Fast Track via Deno\nnpm run test:fullstack    # per-workspace suites across fullstack/\n```\n\n| Track | Runtime | What it tests |\n|---|---|---|\n| **TypeScript Fast Track** | Deno 2.x+ | Structural types, generics, unions, Zod boundaries |\n| **Full-Stack Interview 40** | Node 20+ | Lesson workspaces, driven per directory |",

    "## Step 4: break one drill on purpose",

    "Green everywhere means the harness works. Now pick a lesson and make it fail. Step into the workspace and run the full suite: the practice drills fail until you fix them. That failure is the drill, not breakage.",

    "```bash\ncd fullstack/01-why-this-type-error && deno test   # full suite, practice drills fail\nnpm run test:lesson                                   # baseline only, stays green\n```\n\nFix the practice file, rerun, watch it flip. The `typescript/` folder holds symlinks to the same workspaces, so either path reaches the same drill. Lesson workspaces need no install step: Deno executes them as they are.",

    "> A drill that cannot fail cannot teach. Green tells you the harness works; red tells you where you stand.",

    "## How lessons point back at Soma",

    "Inside a Soma course lesson, collapsed Lab blocks name the exact folder and the exact command, like the ones above. The pattern never changes: read the lesson on Soma, run the drill locally, return with proof. Setup details live in the [lab setup doc](/docs/lab-setup); this guide is the ten-minute path from zero to your first red-to-green flip.",
  ],

  bentoHighlights: [
    {
      label: "CLONE ONCE",
      title: "One repo for every drill",
      description:
        "Every track lives in the same checkout. New languages arrive as folders, and the doctor probe tells you which tracks your machine can run.",
    },
    {
      label: "RED IS THE LESSON",
      title: "Practice drills fail until you fix them",
      description:
        "The full suite goes red on purpose. Baseline stays green so the harness is never suspect; only your solution is.",
    },
    {
      label: "READ, RUN, RETURN",
      title: "Lessons link straight to folders",
      description:
        "Each Soma lesson names its drill folder and verification command. Read on the site, prove on your machine.",
    },
  ],

  pullQuotes: [
    {
      quote:
        "Reading about generics feels like understanding until someone asks you to write one from scratch.",
    },
    {
      quote:
        "A drill that cannot fail cannot teach. Green tells you the harness works; red tells you where you stand.",
    },
    {
      quote:
        "Clone once, and from then on every lesson is a directory plus a verification command.",
    },
  ],

  references: [
    {
      title: "Soma Labs on GitHub",
      url: "https://github.com/Essomero/soma-labs",
      description: "Companion runnable code drills for Soma courses. Clone once, run anywhere.",
    },
  ],
};
