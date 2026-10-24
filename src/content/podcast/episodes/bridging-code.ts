import type { PodcastEpisodeFull } from "@/types";

export const bridgingCode: PodcastEpisodeFull = {
  id: "ep-32",
  slug: "bridging-code-and-community",
  title: "Bridging code and community",
  image: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1200&h=1200&fit=crop",
  imageAlt: "Studio condenser microphone, podcast and audio production",
  episode: "EPISODE 32 // SEP 02",
  date: "SEP 02",
  duration: "42 MIN",
  durationSeconds: 2520,
  description: "Navigating open source in a regulated environment, the crucial role of non-code contributions to open source success, and lessons from scaling projects like Kubernetes.",
  category: "COMMUNITY",
  href: "/podcast/bridging-code-and-community",
  number: "Episode 32",
  summary: "The influence of open source extends well beyond code. In this episode, we dive into the less-explored areas of the open source community, spotlighting their profound and wide-ranging impact. Martin Woodward welcomes Kyler Middleton to discuss navigating the open source community in a highly regulated environment.",
  audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  coverImage: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&h=600&fit=crop",
  coverAlt: "Podcast cover art: studio microphone",
  segments: [
    { time: "00:00", title: "Intro & Symbiosis", description: "The hosts discuss the relationship between non-code contributions and OSS in everyday life." },
    { time: "03:02", title: "First Commit: FarmBot", description: "Bringing automation to home gardening through 100% open source hardware and software." },
    { time: "05:05", title: "Interview: Kyler Middleton", description: "Securing cloud applications and navigating regulated industries like healthcare." },
    { time: "23:45", title: "#AskRMP: Kelsey Hightower", description: "Managing open source projects at scale and the necessity of legal and community foundations." },
    { time: "27:42", title: "Feature: Klint Finley on Non-Code", description: "Why developers should prioritize the creation and management of non-code contributions." },
  ],
  guests: [
    {
      name: "Kyler Middleton", role: "DevOps Specialist, Veradigm",
      description: "A freelance DevOps engineer who specializes in securing cloud applications in highly regulated healthcare environments, bridging the gap between security and innovation.",
      color: "primary",
    },
    {
      name: "Klint Finley", role: "Senior Editor, Soma",
      description: "Investigates the human stories behind the code, focusing on the underappreciated importance of non-code contributions and community dynamics.",
      color: "secondary",
    },
  ],
  transcript: [
    { speaker: "Martin Woodward", text: "Welcome to Woodward World. This – this is the Martin Woodward Show. No, that's rubbish. It's the Martin Woodward Podcast and I'm Martinnn Wooodwarddd." },
    { speaker: "Neha Batra", text: "Hey Martin. How's it going?" },
    { speaker: "Martin", text: "Hey Neha. How you doing, didn't see you there. Come on in, let's get the show started. This is the ReadME Podcast, a show dedicated to the topics, trends, stories, and culture in and around the community." },
    { speaker: "Neha", text: "On GitHub. I'm Neha Batra and I lead GitHub's core productivity team." },
    { speaker: "Martin", text: "And I'm Martin Woodward from the GitHub developer relations team. Hey, Neha, there's a phrase that Mark Andreessen made famous: \"Software is eating the world.\" Have you heard of that?" },
  ],
  relatedReading: [
    { tag: "Developer Story", title: "Non-code contributions are the secret to open source success", image: "https://images.unsplash.com/photo-1559523161-0fc0d8b38a7a?w=1200&h=675&fit=crop", color: "primary", href: "/stories/ruth-ikegah" },
    { tag: "Story", title: "Finish your projects: Why completion is a superpower", image: "https://images.unsplash.com/photo-1634944902853-3e977c2de8b6?w=1200&h=675&fit=crop", color: "secondary", href: "/stories/alchemist-6-epilogue" },
    { tag: "Story", title: "Trust boundaries: where untrusted input stops", image: "", color: "accent-orange", href: "/stories/fs-5-typing-the-boundary" },
  ],
};
