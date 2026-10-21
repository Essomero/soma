import type { BookContent } from "@/types";

export const theAlchemist: BookContent = {
  slug: "the-alchemist",
  title: "The Alchemist",
  description:
    "Paulo Coelho's masterpiece follows Santiago, a young Andalusian shepherd, on his journey to find a treasure buried near the Egyptian pyramids: and the wisdom he discovers along the way.",
  image: "https://images.unsplash.com/photo-1539768942893-daf53e448371?w=1600&h=900&fit=crop",
  imageAlt: "Camels riding past the Pyramids of Egypt at sunset",
  author: { name: "Paulo Coelho" },
  date: "1988-01-01",
  topics: ["philosophy"],
  tagline: "25th Anniversary Edition: a fable about following your dream.",
  chapters: [
    {
      title: "Prologue and the Shepherd's Dream",
      storySlug: "alchemist-1-prologue",
      description: "The alchemist reads the story of Narcissus. Santiago, a young shepherd in Andalusia, has a recurring dream about treasure at the Pyramids.",
    },
    {
      title: "Tangier and the Crystal Merchant",
      storySlug: "alchemist-2-tangier",
      description: "Santiago arrives in Africa, loses his money, and finds work with a crystal merchant who teaches him about patience and opportunity.",
    },
    {
      title: "The Englishman and the Caravan",
      storySlug: "alchemist-3-caravan",
      description: "Joining a caravan across the Sahara, Santiago meets an Englishman searching for the legendary Alchemist. Together they learn the language of the desert.",
    },
    {
      title: "The Oasis and Fatima",
      storySlug: "alchemist-4-oasis",
      description: "At the oasis of Al-Fayoum, Santiago falls in love with Fatima and finally meets the Alchemist, who sets him on the final leg of his journey.",
    },
    {
      title: "The Desert and the Wind",
      storySlug: "alchemist-5-desert",
      description: "The Alchemist teaches Santiago to listen to his heart and to speak the Language of the World. Captured by tribesmen, Santiago must turn himself into the wind.",
    },
    {
      title: "The Pyramids and Epilogue",
      storySlug: "alchemist-6-epilogue",
      description: "Santiago reaches the Pyramids: and discovers that the real treasure was the journey itself.",
    },
  ],
};
