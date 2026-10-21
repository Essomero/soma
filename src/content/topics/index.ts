import type { TopicData } from "@/types";

export const allTopics: TopicData[] = [
  {
    slug: "technology", title: "Technology",
    description: "AI, robotics, and the engineering forces reshaping our world.",
    icon: "Cpu", accentColor: "primary", accentBg: "primary/20", accentText: "text-primary", category: "Tech",
  },
  {
    slug: "economics", title: "Economics",
    description: "Markets, poverty, distribution, and the systems that govern prosperity.",
    icon: "TrendingUp", accentColor: "accent-orange", accentBg: "accent-orange/20", accentText: "text-accent-orange", category: "Business",
  },
  {
    slug: "philosophy", title: "Philosophy",
    description: "Ideas, ethics, and the deeper questions behind the headlines.",
    icon: "Lightbulb", accentColor: "secondary", accentBg: "secondary/20", accentText: "text-secondary", category: "Culture",
  },
  {
    slug: "open-source", title: "Open Source",
    description: "Sustainability, governance, and the heart of collective innovation.",
    icon: "GitFork", accentColor: "tertiary", accentBg: "tertiary/20", accentText: "text-tertiary", category: "Tech",
  },
  {
    slug: "career", title: "Career",
    description: "Growth paths, interviewing, and navigating the tech industry.",
    icon: "GraduationCap", accentColor: "primary", accentBg: "primary/20", accentText: "text-primary", category: "Culture",
  },
  {
    slug: "accessibility", title: "Accessibility",
    description: "Ensuring the web remains open and usable for everyone.",
    icon: "Accessibility", accentColor: "error", accentBg: "error/20", accentText: "text-error", category: "Tech",
  },
  {
    slug: "fact-check", title: "Fact Check",
    description: "Adversarially verified research separating signal from noise.",
    icon: "Search", accentColor: "accent-blue-neon", accentBg: "accent-blue-neon/20", accentText: "text-accent-blue-neon", category: "Culture",
  },
  {
    slug: "devops", title: "DevOps",
    description: "Automation, cloud-native architecture, and infrastructure.",
    icon: "Settings", accentColor: "primary", accentBg: "primary/20", accentText: "text-primary", category: "Tech",
  },
  {
    slug: "startups", title: "Startups",
    description: "Indie hacking, bootstrapping, and building businesses outside the VC path.",
    icon: "Rocket", accentColor: "accent-orange", accentBg: "accent-orange/20", accentText: "text-accent-orange", category: "Business",
  },
  {
    slug: "marketing", title: "Marketing",
    description: "Distribution, growth channels, and the art of getting products in front of people.",
    icon: "Megaphone", accentColor: "secondary", accentBg: "secondary/20", accentText: "text-secondary", category: "Business",
  },
];
