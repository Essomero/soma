import type { CourseContent } from "@/types";

export const typescriptInterviewFastTrack: CourseContent = {
  slug: "typescript-interview-fast-track",
  title: "TypeScript Fast Track: 5 Essential Mental Models",
  description:
    "Need to run the code drills locally? See [Soma Labs Setup](/docs/lab-setup) for the companion workspace: clone `Essomero/soma-labs` and run `npm run test:typescript` (or `deno task test:typescript`). The labs run natively in TypeScript (.ts) with Deno (`brew install deno` or `curl -fsSL https://deno.land/install.sh | sh`) for instant execution with zero build configuration.\n\nA 5-lesson journey designed to make TypeScript's type system feel intuitive rather than intimidating. Instead of memorizing compiler error codes and academic jargon, this course builds five concrete physical mental models: how the compiler inspects shapes, how generics connect inputs to outputs, how discriminated unions eliminate impossible states, how utility types loop over properties, and how schemas guard your runtime boundary.",
  image:
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1600&h=900&fit=crop",
  imageAlt:
    "Code editor displaying clean TypeScript type definitions on a dark monitor",
  author: { name: "Soma Editorial" },
  date: "2026-10-16",
  added: "2026-10-16T00:00:00+03:00",
  topics: ["technology", "career"],
  tagline:
    "Five visual lessons that make TypeScript click: shapes over names, generics as relationships, impossible states, utility loops, and runtime boundaries.",
  lessons: [
    {
      title: "L1: Why Does This Type Error?",
      storySlug: "fs-1-why-this-type-error",
      description:
        "The backpack rule: why TypeScript checks shapes instead of names, why fresh object literals get checked harder to prevent typos, and how to read red squiggles without panic.",
    },
    {
      title: "L2: Generics as Relationships",
      storySlug: "fs-2-generics",
      description:
        "The luggage claim ticket: connecting input types to output types, setting requirements with extends, and knowing when to delete unnecessary type parameters.",
    },
    {
      title: "L3: Discriminated Unions & Narrowing",
      storySlug: "fs-3-discriminated-unions",
      description:
        "Eliminating the 2 AM boolean trap: stamping a bright label on the box, watching the compiler discard impossible states, and catching unhandled cases with never.",
    },
    {
      title: "L4: How Utility Types Work",
      storySlug: "fs-4-utility-types",
      description:
        "Building Partial, Pick, and Omit from scratch: how mapped types act like for...in loops, conditional types act like if-statements, and infer unpacks types.",
    },
    {
      title: "L5: Typing the Boundary",
      storySlug: "fs-5-typing-the-boundary",
      description:
        "Border control: why casting with 'as' is a fake passport, why 'unknown' is the honest type, and how to parse untrusted JSON at the door with Zod schemas.",
    },
  ],
};
