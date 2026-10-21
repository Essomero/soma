import type { FeaturedContent, Author, ArticleCardData, BentoCardData, PullQuoteData } from "@/types";

// Legacy data for the custom FeaturedArticlePage layout
export const nvdaAuthor: Author = { name: "Mike Melanson" };

export const nvdaBentoHighlights: BentoCardData[] = [
  { label: "FORCE MULTIPLIER", title: "OSARA", description: "Gives blind and low-vision people better access to REAPER, empowering musicians, engineers, and podcasters worldwide." },
  { label: "FOUNDATION", title: "NV Access", description: "A non-profit ensuring at least a third of its board are blind, putting the community in charge of the technology they use." },
];

export const nvdaPullQuotes: PullQuoteData[] = [
  { quote: "Everything that we do should ultimately be empowering other people to make the world better.", attribution: "JAMIE TEH, CO-FOUNDER" },
  { quote: 'A product built by the community, for the community, is better than one built by some company, simply because the community is in charge of what goes into it.' },
];

export const nvdaMoreStories: ArticleCardData[] = [
  { id: "ruth-ikegah", category: "COMMUNITY", title: "Putting the African open source community on the map", excerpt: "Ruth's mission to show the world that Africans are creators of open source, not just consumers.", image: "https://images.unsplash.com/photo-1573164574472-797cdf4a583a?w=600&h=400&fit=crop", imageAlt: "Ruth Ikegah", href: "/stories/ruth-ikegah" },
  { id: "fs-1-why-this-type-error", category: "ENGINEERING", title: "Why Does This Type Error?", excerpt: "The backpack rule: why TypeScript checks shapes instead of names.", image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop", imageAlt: "TypeScript code editor", href: "/stories/fs-1-why-this-type-error" },
  { id: "fs-2-generics", category: "ENGINEERING", title: "Generics as Relationships", excerpt: "Connecting input types to output types without cluttering signatures.", image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop", imageAlt: "Laptop with code", href: "/stories/fs-2-generics" },
];

export const nvdaAccessibility: FeaturedContent = {
  slug: "nvda-accessibility",
  tag: "FEATURED ARTICLE // ACCESSIBILITY",
  title: "Coding accessibility: Software by the blind, for the blind",
  description:
    "The NVDA screen reader has helped empower a new generation of blind and low-vision developers.",
  image:
    "https://images.unsplash.com/photo-1634944902853-3e977c2de8b6?w=1200&h=675&fit=crop",
  imageAlt: "Accessibility illustration",
  author: { name: "Mike Melanson" },
  date: "May 16, 2024",
  tagline: "The NVDA screen reader has helped empower a new generation of blind and low-vision developers.",
  bentoHighlights: [
    {
      label: "FORCE MULTIPLIER",
      title: "OSARA",
      description:
        "Gives blind and low-vision people better access to REAPER, empowering musicians, engineers, and podcasters worldwide.",
    },
    {
      label: "FOUNDATION",
      title: "NV Access",
      description:
        "A non-profit ensuring at least a third of its board are blind, putting the community in charge of the technology they use.",
    },
  ],
  pullQuotes: [
    {
      quote:
        "Everything that we do should ultimately be empowering other people to make the world better.",
      attribution: "JAMIE TEH, CO-FOUNDER",
    },
    {
      quote:
        'A product built by the community, for the community, is better than one built by some company, simply because the community is in charge of what goes into it.',
    },
  ],
  sections: [
    {
      heading: "Software by the blind, for the blind",
      paragraphs: [
        "The NVDA screen reader gives blind and low-vision people access to fundamentals like education and employment, as well as everyday functions such as online banking, shopping, and getting the news. The overwhelming majority of people who build and translate NVDA are blind or low-vision themselves, and Riemer says this is key.",
        '"A product built by the community, for the community, is better than one built by some company, simply because the community is in charge of what goes into it," says Riemer. "I can build an add-on when I need something and don\'t need to wait for some company to choose to actually fix the issue for me."',
      ],
    },
    {
      heading: "Community amplification",
      paragraphs: [
        "Community plays a big role for both OSARA and NVDA, and Teh says that's on purpose. 'It was really important to us that we foster a healthy, open, well-functioning, and friendly community,' he says.",
        "If you follow these communities one step further, you'll quickly find things like the Eyes On Success podcast, which Peter Torpey produces with his wife Nancy using OSARA. They discuss 'products, services, and daily living tips for people with vision loss,' empowering others to empower themselves: and the cycle continues.",
      ],
    },
  ],
};
