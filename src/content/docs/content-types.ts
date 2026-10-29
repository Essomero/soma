import type { DocContent } from "@/types";

export const contentTypes: DocContent = {
  slug: "content-types",
  category: "Publishing // Content Model",
  title: "Content Types: What Each One Is For",
  description:
    "Story, lesson, lab, guide, doc, course, and the rest: what job each type does, when to reach for it instead of the others, and a canonical example of each.",
  image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1600&h=900&fit=crop",
  imageAlt: "A fountain pen resting on handwritten manuscript pages",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  publishedAt: "2026-10-01T00:00:00Z",
  tags: ["Publishing", "Content Model", "Writing"],
  topics: ["technology"],

  sections: [
    {
      number: "·",
      heading: "The Rule",
      anchor: "rule",
      intro:
        "Soma has ten content types because reading, learning, and proving are different jobs. Picking the wrong one is the most common way a good idea becomes an unreadable page. The rule is simple: match the type to what you want the reader to walk away able to do.",
      items: [
        {
          question: "How do I choose in under ten seconds?",
          answer: [
            "Ask what changes for the reader:\n\n| If the reader should... | Use | Example |\n|---|---|---|\n| Feel one idea deeply | Story | `/stories/benjamin-mayanja` |\n| Follow steps to build something | Guide | `/guides/ship-soma` |\n| Look something up fast | Doc | `/docs/lab-setup` |\n| Prove they can do it | Test | `/tests/sql-query-optimization` |\n| Learn a skill across sittings | Course | `/courses/typescript-interview-fast-track` |\n| Read a long arc in order | Book or Series | `/books/the-prophet`, `/series/the-craft-of-software` |\n| Listen instead of read | Podcast | `/podcast/bridging-code-and-community` |\n\nFeatured is not a topic, it is a stage: any story strong enough to carry the front page. Topics are not content at all, they are the shelves content sits on.",
          ],
        },
      ],
    },

    {
      number: "A",
      heading: "Story, Lesson, and Lab",
      anchor: "story-lesson-lab",
      intro:
        "These three get confused because a course lesson looks like a story with homework. The difference is what the page demands from the reader.",
      items: [
        {
          question: "What is a story?",
          answer: [
            "A story carries one idea from confusion to clarity. It opens with something concrete that breaks, then earns the general principle. It never asks the reader to run anything. Canonical example: `/stories/fs-1-why-this-type-error` starts with a red squiggle anyone has seen, then derives why the checker complains.",
            "Use a story when the win is understanding. If the reader needs to type to get it, you want a lesson or a lab instead.",
          ],
        },
        {
          question: "What is a lesson, and what is a lab?",
          answer: [
            "A lesson is a story plus proof: the same narrative arc, with collapsed Lab blocks that point at a folder in `soma-labs` and a command that checks the reader's fix. The five TypeScript lessons (`fs-1` through `fs-5`) are stories first; the labs are how the reader confirms the mental model stuck.",
            "A lab is not a page type, it is a block type inside a lesson. It states the exact source file, the exact function, and the exact command. If a lab can be read passively, it is badly written: rewrite it until the reader must change an input and observe the effect.",
          ],
        },
        {
          question: "What is a course?",
          answer: [
            "A course is an ordered list of lessons where each one assumes the previous. It has its own page with a tagline and a lesson list, but no prose of its own: the lessons do the teaching. Canonical example: `/courses/typescript-interview-fast-track` is five lessons, each pointing at its drill folder.",
            "Use a course when the skill takes sittings. One idea, one story. Five ideas that stack, one course.",
          ],
        },
      ],
    },

    {
      number: "B",
      heading: "Guide Versus Doc",
      anchor: "guide-vs-doc",
      intro:
        "Both are practical. The difference is direction: a guide walks forward, a doc lets you jump in anywhere.",
      items: [
        {
          question: "When do I write a guide?",
          answer: [
            "When the reader follows steps in order to end somewhere new: set up an environment, integrate a library, ship a workflow. Canonical example: `/guides/ship-soma` moves from fork to deploy to agent publishing in sequence. Skip a step and the rest stops making sense.",
          ],
        },
        {
          question: "When do I write a doc?",
          answer: [
            "When the reader arrives with a question and leaves with an answer: how setup works, what each content type does, how the labs map to lessons. Canonical examples: `/docs/lab-setup` and this page. Sections stand alone, anchors let anyone link straight at the answer.",
            "Rule of thumb: if reordering the sections would break it, it is a guide. If reordering changes nothing, it is a doc.",
          ],
        },
      ],
    },

    {
      number: "C",
      heading: "Book, Series, Featured, Test, Podcast, Topic",
      anchor: "the-rest",
      intro: "The remaining types handle length, sequence, proof, audio, and discovery.",
      items: [
        {
          question: "Book versus series?",
          answer: [
            "A book is one long work read in chapter order, where chapters are stories that only make sense together. Canonical example: `/books/the-prophet` reads six chapter stories front to back, each pairing a short public-domain excerpt with notes for learners. A series is a log of work released over time, where each episode stands alone but gains meaning in sequence. Canonical example: `/series/the-craft-of-software` documents building in the open, episode by episode. Use a book for a finished arc. Use a series for work that is still happening.",
          ],
        },
        {
          question: "What makes something featured?",
          answer: [
            "Featured is a stage, not a topic. A featured piece is any story the editor judges strong enough to carry the front page hero, with bento highlights and pull quotes doing the visual lifting. Canonical example: `/featured/why-i-built-soma`. Anything can be promoted to featured; nothing is born there.",
          ],
        },
        {
          question: "What is a test for?",
          answer: [
            "A test proves the reader can do the thing, under time pressure, with scoring. Each test names its source material so gaps map back to lessons. Canonical example: `/tests/sql-query-optimization` links its questions to the stories that teach them, and supports oral questions through Son. Write a test when you need evidence of skill, not vibes of comprehension.",
          ],
        },
        {
          question: "Podcast and topic?",
          answer: [
            "A podcast episode is the audio twin of the platform: segments, guests, and a player, for ideas better heard than read. Canonical example: `/podcast/bridging-code-and-community`. A topic is a shelf, not content: it groups stories, guides, and courses so readers can browse by interest instead of by format.",
          ],
        },
      ],
    },
  ],
};
