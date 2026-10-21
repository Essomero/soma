import type { GuideContent, Author, TocItem, GuideSectionData, TipCardData } from "@/types";

// Legacy data for the custom GuidePage layout
export const antonAuthor: Author = {
  name: "Anton Mirhorodchenko", title: "Software Developer",
  avatar: "https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=200&h=200&fit=crop",
  bio: "Anton has been passionate about AI for several years, particularly in reinforcement learning and using AI to tackle accessibility issues.",
};

export const guideToc: TocItem[] = [
  { number: "01", title: "Approximations of intelligence", href: "#section-1" },
  { number: "02", title: "Tips and tricks for LLMs", href: "#section-2" },
  { number: "03", title: "AI-assisted coding lessons", href: "#section-3" },
  { number: "04", title: "The Expert requirement", href: "#section-4" },
];

export const guideSections: GuideSectionData[] = [
  { number: "01", title: "Approximations of intelligence, nothing more", id: "section-1" },
  { number: "02", title: "Tips and tricks for effective LLM use", id: "section-2" },
  { number: "03", title: "AI-assisted coding: lessons learned", id: "section-3" },
  { number: "04", title: "The Expert requirement", id: "section-4" },
];

export const guideTipCards: TipCardData[] = [
  { icon: "Minus", bgClass: "bg-primary-container/20", iconColorClass: "text-primary", title: "Shorten requests", description: "Minimizing text inputs lets you significantly reduce typing and increases communication efficiency." },
  { icon: "Terminal", bgClass: "bg-secondary/20", iconColorClass: "text-secondary", title: "Use domain terminology", description: "Use concise language to convey complex ideas. Helps LLMs recognize patterns in technical fields." },
  { icon: "UserCheck", bgClass: "bg-tertiary-container/20", iconColorClass: "text-tertiary", title: 'The "Act as" Trick', description: "Prompt LLMs to take on a specific role to help generate more accurate and context-aware outputs." },
  { icon: "AlertTriangle", bgClass: "bg-error-container/20", iconColorClass: "text-error", title: "Curse of Wording", description: 'Small differences in language can have big impacts. Choose "fix" vs "investigate" deliberately.' },
];

export const guideCodeBlock = {
  filename: "prompt_engineering.sh",
  lines: [
    { number: "01", content: 'Human: I need help to integrate a CMS system. Start with, "As an IT Architect, I"' },
    { number: "02", content: "ChatGPT: As an IT Architect, I would suggest a step-by-step approach for integrating a CMS system: 1. Identify the CMS... 2. Develop an integration plan... 3. Ensure compatibility..." },
  ],
};

export const generativeAi= {
  slug: "generative-ai",
  category: "GitHub Actions // AI & ML",
  title: "Harness the power of generative AI for software development",
  excerpt:
    "Tools like GitHub Copilot and ChatGPT can change the way you build software, from architecture to environment configuration to the code itself.",
  image:
    "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&h=675&fit=crop",
  imageAlt: "Circuit board with a brain, representing artificial intelligence",
  author: { name: "Anton Mirhorodchenko", title: "Software Developer" },
  date: "June 20, 2024",
  tags: ["Automation", "Productivity"],
  intro:
    "Across industries, large language models (LLMs), such as the ones powering tools like ChatGPT and GitHub Copilot, are automating tasks and revolutionizing the way we interact with both technology and one another. But despite their growing prominence, LLMs are frequently misunderstood or misused, leading to unrealistic expectations: and a certain disenchantment when they're not met.",
  body: [
    "An LLM, like any other neural network, should be regarded primarily as complex mathematical objects. Although there is a strong association between AI and the human brain, it is a misconception. Neural networks only mimic a small fraction of the brain's processes: enough to achieve notable practical results and successfully approximate real intelligence: but not more.",
    "In essence, LLMs provide a reasonable approximation of human language and knowledge, but their approximations aren't always optimal and they can still make significant errors.",
    "As an end-user, you need to understand that LLMs aim to accurately predict the correct output by taking into account the context and meaning of the input. As the input's length increases, it becomes more challenging to find connections between words, leading to a decline in accuracy.",
    "I recently conducted research on the effective use of AI for creating quality code, published in an open source project called User Country Analytics. My goal was to see if AI could help me use Laravel and Redux effectively, as I had limited prior knowledge.",
    "The strategy: Use ChatGPT for higher-level operations: task description, breaking down tasks, complexity estimation, and architectural templates. The execution: Use GitHub Copilot for the actual code generation. It understands comments and individual nuances far better for implementation.",
  ],
};
