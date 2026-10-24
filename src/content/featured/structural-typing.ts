import type { FeaturedContent, Author, ArticleCardData, BentoCardData, PullQuoteData } from "@/types";

// Legacy data for the custom FeaturedArticlePage layout
export const shapesAuthor: Author = { name: "Benjamin Mayanja", handle: "@Essomero" };

export const shapesBentoHighlights: BentoCardData[] = [
  { label: "THE CORE RULE", title: "Shapes Over Names: The Backpack Rule", description: "TypeScript does not care what class or interface created an object. It only checks the contents: does this value carry the properties the receiver demands?" },
  { label: "THE SURPRISE", title: "Why Fresh Literals Get Checked Harder", description: "Pass an existing variable with extra fields and TypeScript lets it pass. Type the exact same object directly inline, and it complains. Fresh literals get an extra sanity check to catch typos." },
  { label: "THE DANGER", title: "Don't Tape Over the Warning Light", description: "Reaching for `as` or `any` silences the compiler, but it does not fix the bug. It is like putting black tape over the check engine light on your dashboard and hoping for the best." },
];

export const shapesPullQuotes: PullQuoteData[] = [
  { quote: "Variables are checked for what is missing. Fresh object literals are also checked for what is extra.", attribution: "BENJAMIN MAYANJA" },
  { quote: "TypeScript checks shapes, not names. If your object carries what the function asked for, it fits." },
];

export const shapesMoreStories: ArticleCardData[] = [
  { id: "benjamin-mayanja", category: "COMMUNITY", title: "Think on paper, but digital: why I built Soma", excerpt: "Why Benjamin built Soma: learn in private on your own infrastructure, and make public what you wish.", image: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&h=400&fit=crop", imageAlt: "Benjamin Mayanja", href: "/stories/benjamin-mayanja" },
  { id: "fs-1-why-this-type-error", category: "ENGINEERING", title: "Why Does This Type Error?", excerpt: "The backpack rule: why TypeScript checks shapes instead of names.", image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop", imageAlt: "TypeScript code editor", href: "/stories/fs-1-why-this-type-error" },
  { id: "fs-2-generics", category: "ENGINEERING", title: "Generics as Relationships", excerpt: "Connecting input types to output types without cluttering signatures.", image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop", imageAlt: "Laptop with code", href: "/stories/fs-2-generics" },
];

export const structuralTyping: FeaturedContent = {
  slug: "structural-typing",
  tag: "FEATURED ARTICLE // TYPESCRIPT",
  title: "Why does this type error? Shapes, not names",
  description:
    "TypeScript rejects objects that look perfectly fine. The compiler is not being difficult: it checks shapes instead of names, and fresh literals get checked harder than variables.",
  image:
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=675&fit=crop",
  imageAlt: "Code editor displaying a compile error overlay on a monitor",
  author: { name: "Benjamin Mayanja", handle: "@Essomero" },
  date: "October 24, 2026",
  tagline: "Read the red squiggle like a blueprint: the compiler checks what your data carries, not what it is called.",
  bentoHighlights: [
    {
      label: "THE CORE RULE",
      title: "Shapes Over Names: The Backpack Rule",
      description:
        "TypeScript does not care what class or interface created an object. It only checks the contents: does this value carry the properties the receiver demands?",
    },
    {
      label: "THE SURPRISE",
      title: "Why Fresh Literals Get Checked Harder",
      description:
        "Pass an existing variable with extra fields and TypeScript lets it pass. Type the exact same object directly inline, and it complains. Fresh literals get an extra sanity check to catch typos.",
    },
    {
      label: "THE DANGER",
      title: "Don't Tape Over the Warning Light",
      description:
        "Reaching for `as` or `any` silences the compiler, but it does not fix the bug. It is like putting black tape over the check engine light on your dashboard and hoping for the best.",
    },
  ],
  pullQuotes: [
    {
      quote:
        "Variables are checked for what is missing. Fresh object literals are also checked for what is extra.",
      attribution: "BENJAMIN MAYANJA",
    },
    {
      quote:
        "TypeScript checks shapes, not names. If your object carries what the function asked for, it fits.",
    },
  ],
  sections: [
    {
      heading: "The red squiggle that doesn't make sense",
      paragraphs: [
        "You write an object that carries every property a function needs, plus one extra field, and TypeScript draws a red squiggle: object literal may only specify known properties. Your frustration is reasonable. The function would ignore the extra field at runtime, so why fail the build?",
        "Now store that exact same object in a variable first, and pass the variable instead. Zero errors. Same data, same function, different verdict. To understand the mystery, you have to see how TypeScript looks at your data: it checks shapes, not names, and it checks fresh literals harder than variables.",
      ],
    },
    {
      heading: "The backpack test",
      paragraphs: [
        "In nominal languages like Java or C#, types work like birth certificates. A function that asks for a Customer rejects a User with identical fields, because the names differ. TypeScript is structural. If a mountain guide says your backpack must contain water and a compass, they do not check the brand. Water, compass, plus a bag of trail mix, and you are on the trail.",
        "Fresh literals get the extra check because of typos. Write an object inline with a misspelled field and you almost certainly meant the real one. TypeScript stops you at the counter: did you really mean to put this here? Variables skip that check because they already exist somewhere else. So read every error backwards. Look at what the function asked for, look at what you handed it, and ask the only question that matters: is the data wrong, or is the type out of date?",
      ],
    },
  ],
};
