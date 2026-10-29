import type { TestContent } from "@/types";

export const p1NewsTest: TestContent = {
  slug: "p1-news",
  title: "P1 Oral Exercise: News Time",
  description:
    "A friendly oral exercise for Primary 1 learners built around the News strand of the Uganda National Primary Curriculum. Children bring their recent experiences into the classroom, share them, listen to other children, and connect their news to the themes they study.",
  category: "P1 Assessment",
  subcategory: "Oral Language // News & Story Time",
  format: "oral",
  oralConfig: {
    voice: "am_michael",
    provider: "kokoro",
    examinerName: "Teacher Michael",
    examinerTitle: "Primary 1 Examiner",
    welcomeMessage:
      "Hello! I am Teacher Michael. Welcome to your News Time exercise. Every morning we share news about what happened at home, on the way to school, and with our friends. I am going to ask you some questions about news. Listen carefully, take your time, and tell me your answer. There are no wrong answers, only chances to show what you know. Are you ready? Let us begin!",
  },
  image: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=1200&h=675&fit=crop",
  imageAlt: "Children in a primary school classroom sharing news with their teacher",
  author: {
    name: "Teacher Michael",
    handle: "@teacher-michael",
  },
  date: "October 2026",
  publishedAt: "2026-10-01T00:00:00Z",
  tags: ["P1", "Primary School", "Uganda", "Oral Assessment", "News", "Story Time", "Life Skills"],
  topics: ["education"],
  estimatedMinutes: 12,
  defaultTimeLimitSeconds: 45,
  passingScore: 70,
  sources: [
    {
      type: "markdown",
      title: "Curriculum Reference: The News Strand (P1)",
      content: `# P1 News & Story Time (5 periods per week)

From the layout notes of the Uganda National Primary Curriculum (P1):
- Each day may begin with 30 minutes of News or Story Time.
- In News lessons, children bring fresh recent experiences into the classroom, share them with others, and explore connections with the themes.
- In Story Time, learners explore their own local culture and develop a feel for the structure and potential of their own language.
- The News lesson may generally be the first period of the day, since it draws on learners' immediate out-of-school experiences.

**Assessment guidelines (from the themes):**
- Listen to others attentively
- Tell his/her news appropriately
- Tell / re-tell / sign stories logically
- Talk about recent experiences at home, on the way to school, and at school
- Connect news to the current theme (people, weather, food, transport, environment, peace and security)`,
    },
    {
      type: "link",
      title: "Uganda National Primary Curriculum — P1",
      url: "https://www.ncdc.go.ug",
      description: "Official curriculum from the National Curriculum Development Centre",
    },
  ],
  questions: [
    // ── SECTION 1: MY NEWS ────────────────────────────
    {
      id: "q1-this-morning",
      type: "open",
      timeLimitSeconds: 45,
      question:
        "News time! Today starts with your news. Tell me one thing you did this morning before you came to school.",
      rubric:
        "P1 competence: Tell his/her news appropriately. Learner should produce at least one real, recent experience from home, spoken so that others can follow it.",
      keyPoints: [
        "Share a recent, real experience",
        "Speaks clearly enough for others to hear",
        "Tells the main action or event",
      ],
      sampleAnswer: "This morning I swept the compound with my mother.",
    },
    {
      id: "q2-who-with",
      type: "open",
      timeLimitSeconds: 30,
      question:
        "Who was with you this morning? Tell me the person you were with, for example mother, father, grandmother, or a friend.",
      rubric:
        "P1 competence: Give details about news. Learner should name at least one person connected to the news they just shared.",
      keyPoints: [
        "Names a person from their news",
        "Uses a correct title or name",
      ],
      sampleAnswer: "My grandmother. She told me to fetch water.",
    },
    {
      id: "q3-on-the-way",
      type: "open",
      timeLimitSeconds: 45,
      question:
        "On your way to school today, what did you see? Tell me one thing you saw on the way.",
      rubric:
        "P1 competence: Observe and report on surroundings. Learner should describe one thing seen on the way to school (animal, vehicle, person, market, weather).",
      keyPoints: [
        "Reports an observation from the journey",
        "Mentions at least one detail",
      ],
      sampleAnswer: "I saw a lorry carrying bananas. It was going to the market.",
    },
    {
      id: "q4-feelings",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "News can make us happy, sad, or worried. If your friend falls down and hurts their knee, how do you feel?",
      options: [
        { id: "a", label: "I feel sad and I want to help" },
        { id: "b", label: "I laugh at them" },
        { id: "c", label: "I feel nothing" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "The News strand helps children talk about feelings and react kindly. A caring response is the competence here, not a single correct word.",
    },
    {
      id: "q5-news-and-themes",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question:
        "We connect our news to the theme we are learning. If it rained heavily last night, which theme does your news belong to today?",
      options: [
        { id: "a", label: "Weather" },
        { id: "b", label: "Our Transport" },
        { id: "c", label: "Our School" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Rain is an element of weather. P1 learners connect daily news to the theme of the week, such as weather, food and nutrition, or the environment.",
    },

    // ── SECTION 2: LISTENING AND RETELLING ─────────────
    {
      id: "q6-listen-to-news",
      type: "open",
      timeLimitSeconds: 60,
      question:
        "Listen carefully. This is my news: 'Yesterday I helped my mother fetch water from the well. After that, I played with my little sister.' Now you tell the class what I said. What was my news?",
      rubric:
        "P1 competence: Listen to others attentively and retell. Learner should reproduce the main idea of the teacher's news with reasonable accuracy.",
      keyPoints: [
        "Retells the main idea (fetching water, playing with sister)",
        "Mentions at least one correct detail",
      ],
      sampleAnswer: "You fetched water from the well, then you played with your little sister.",
    },
    {
      id: "q7-ask-a-question",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Good listening means asking questions. My news was about fetching water. Ask me a question about my news. Any question is fine.",
      rubric:
        "P1 competence: Ask and answer questions about shared news. Learner should produce a genuine question connected to the news they heard.",
      keyPoints: [
        "Asks a real question about the news",
        "Question relates to what was heard",
      ],
      sampleAnswer: "Where is the well?",
    },

    // ── SECTION 3: STORY TIME ──────────────────────────
    {
      id: "q8-story",
      type: "open",
      timeLimitSeconds: 75,
      question:
        "Story time! Tell me a story that your mother, grandmother, or teacher tells you at home. Who is in the story, and what happens?",
      rubric:
        "P1 competence: Tell / re-tell a simple story. Learner should produce a short narrative with at least one character and one event, from memory of a known local story.",
      keyPoints: [
        "Names at least one character",
        "Tells at least one event",
        "Story has a beginning",
      ],
      sampleAnswer: "There was a hare and a tortoise. The hare ran very fast, but the tortoise walked slowly and still won the race.",
    },
    {
      id: "q9-story-parts",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Every story has parts. Which part of a story do we tell first?",
      options: [
        { id: "a", label: "The beginning" },
        { id: "b", label: "The middle" },
        { id: "c", label: "The end" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Stories start with a beginning, then the middle, then the end. P1 learners sequence pictures and events to build this idea.",
    },
    {
      id: "q10-own-news",
      type: "open",
      timeLimitSeconds: 45,
      question:
        "Last question. What news do you like to tell your friends at school? Tell me your favourite piece of news.",
      rubric:
        "P1 competence: Share news confidently with peers. Learner should choose and present one piece of news they enjoy telling.",
      keyPoints: [
        "Chooses their own news",
        "Presents it with confidence",
      ],
      sampleAnswer: "I like to tell my friends when my hen lays an egg.",
    },
  ],
};