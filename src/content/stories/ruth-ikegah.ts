import type { StoryContent, ArticleCardData } from "@/types";

// Legacy data for the custom DeveloperStoryPage layout
export const ruthStory = {
  id: "ruth-ikegah",
  title: "Putting the African open source community on the map",
  description:
    "Ruth's dream is to show people that Africans aren't just consumers of open source: They're creators as well.",
  author: { name: "Ruth Ikegah", handle: "@Ruth-ikegah" },
  location: "Lagos, Nigeria",
  social: "@ikegahruth",
  website: "ruthikegah.xyz/about-me",
  organizations: ["CHAOSS Africa"],
};

export const ruthMoreStories: ArticleCardData[] = [
  {
    id: "fs-1-why-this-type-error", category: "ENGINEERING",
    title: "Why Does This Type Error?",
    excerpt: "The backpack rule: why TypeScript checks shapes instead of names.",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop",
    imageAlt: "TypeScript code editor", href: "/stories/fs-1-why-this-type-error",
    author: { name: "Soma Editorial" },
  },
  {
    id: "fs-2-generics", category: "ENGINEERING",
    title: "Generics as Relationships",
    excerpt: "Connecting input types to output types without cluttering signatures.",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop",
    imageAlt: "Laptop with code", href: "/stories/fs-2-generics",
    author: { name: "Soma Editorial" },
  },
  {
    id: "alchemist-1-prologue", category: "PHILOSOPHY",
    title: "Prologue and the Shepherd's Dream",
    excerpt: "The alchemist reads the story of Narcissus and listens to the desert.",
    image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=600&h=400&fit=crop",
    imageAlt: "Desert dunes under sunset sky", href: "/stories/alchemist-1-prologue",
    author: { name: "Paulo Coelho" },
  },
];

export const ruthIkegah= {
  slug: "ruth-ikegah",
  category: "Community // Developer Story",
  title: "Putting the African open source community on the map",
  excerpt:
    "Ruth's dream is to show people that Africans aren't just consumers of open source: They're creators as well.",
  image:
    "https://images.unsplash.com/photo-1573164574472-797cdf4a583a?w=1200&h=675&fit=crop",
  imageAlt: "Ruth Ikegah",
  author: { name: "Ruth Ikegah", handle: "@Ruth-ikegah" },
  date: "April 22, 2024",
  added: "2026-06-27T14:51:42+03:00",
  tags: ["Community", "Open Source", "Africa"],
  intro:
    "Hey! I'm Ruth Ikegah and I'm an open source program manager, technical writer, GitHub Star, and public speaker. Currently, I'm working as an Open Source Consultant at Bitgeria and serve as the Community Lead for CHAOSS Africa.",
  body: [
    "I think it's important to change the perception that Africans are merely consumers; we are creators as well. By helping people across Africa build projects and showcase their work globally, I hope to change this narrative and demonstrate that Africa is also a hub for innovation and creativity, especially within the open source community.",
    "Right now, Africa's rate of participation and overall volume of open source projects is relatively low in comparison to other regions of the world. This level of engagement is frustrating because I've seen the motivation and passion of Africans when they go abroad, and I want to help them realize that they can create those kinds of projects right here in Africa too.",
    "Had you asked me during college if I could envision myself working in the tech industry, my answer would have been a resounding NO. I wasn't particularly enthusiastic about computers. I didn't dislike them, but they just weren't my thing. I was looking for ways to empower my community, and I didn't think that was possible from behind a computer screen.",
    "My friend Peace Ojemeh suggested that I learn Python and explained how it can be used to analyze microbiological data. I began teaching myself by seeking out online resources, watching YouTube videos, and following tech creators on Twitter. My plan was to learn the basics of programming and then find something that I could build using my knowledge from university.",
    "Things really took off when I found open source and realized that the power of community was being utilized to build world-changing digital solutions.",
    "Working with the GNOME Project helped me build connections within open source, which led me to the Community Health Analytics Open Source Software (CHAOSS) project. CHAOSS is a Linux Foundation project focused on raising awareness of open source community health on a global scale.",
    "Leading a community can be challenging and complex. With CHAOSS, my role involves overseeing community management and maintaining documentation, among other things. The project has more than 1,000 members, including drive-by contributors, so my job is to ensure everyone feels welcome and included.",
  ],
  pullQuote: {
    quote:
      "I was looking for ways to empower my community, and I didn't think that was possible from behind a computer screen.",
    attribution: "Ruth Ikegah",
  },
};
