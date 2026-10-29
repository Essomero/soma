import type { TestContent } from "@/types";

export const p1FreeActivityTest: TestContent = {
  slug: "p1-free-activity",
  title: "P1 Free Activity Check: Playing and Working Together",
  description:
    "A friendly oral check for Primary 1 learners covering the Free Activity strand of the Uganda National Primary Curriculum. Free Activity consists of two lessons per week (one double lesson) where children engage in play-based learning, choosing games and activities they enjoy. The period supports cooperation, sharing, creativity, safe play, and following rules. Some Creative Performing Arts activities may also take place during free activity.",
  category: "P1 Assessment",
  subcategory: "Play-Based Learning // Oral",
  format: "oral",
  oralConfig: {
    voice: "am_michael",
    provider: "kokoro",
    examinerName: "Teacher Michael",
    examinerTitle: "Primary 1 Examiner",
    welcomeMessage:
      "Hello! I am Teacher Michael. Welcome to your Free Activity Check. Free Activity is a special time when you play, build, make things, and have fun with your friends. I am going to ask you some questions about playing, sharing, and the games you like. There are no wrong answers, only chances to show what you know. Are you ready? Let us begin!",
  },
  image: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=1200&h=675&fit=crop",
  imageAlt: "A child swinging and playing outside during a sunny day",
  author: {
    name: "Teacher Michael",
    handle: "@teacher-michael",
  },
  publishedAt: "2026-10-01T00:00:00Z",
  tags: ["P1", "Primary School", "Uganda", "Oral Assessment", "Free Activity", "Play", "Cooperation"],
  topics: ["education"],
  estimatedMinutes: 10,
  defaultTimeLimitSeconds: 30,
  passingScore: 70,
  sources: [
    {
      type: "markdown",
      title: "Curriculum Reference: Free Activity Strand (P1)",
      content: `# P1 Free Activity (2 periods per week, double lesson)

From the P1 Thematic Curriculum Notes (Section 5.2-5.3):
- "The learner-centred approach underlying the Thematic Curriculum is reinforced by the provision of two lessons per week (in a single hour) of Free Activities."
- "Many of these Free Activity lessons will be based on play, although teachers are free to structure the lessons in any appropriate way."
- "Some of the CPA (Creative Performing Arts) activities can still be used during free activity periods."
- Free Activity is a double lesson, meaning children get an extended period for play and self-directed activity.

**Key skills and values developed during Free Activity:**
- Playing cooperatively with others
- Sharing toys, balls, and play materials
- Making friends and interacting positively
- Creative thinking: building, constructing, making things
- Following rules of chosen games
- Playing safely and respecting others' space
- Enjoying physical movement and imaginative play
- Developing self-esteem and confidence`,
    },
    {
      type: "link",
      title: "Uganda National Primary Curriculum — P1",
      url: "https://www.ncdc.go.ug",
      description: "Official curriculum from the National Curriculum Development Centre",
    },
  ],
  questions: [
    // ── SECTION 1: FAVOURITE GAMES ────────────────────
    {
      id: "q1-favourite-activity",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Free Activity time! What do you like to play the most? Tell me your favourite game or activity.",
      rubric:
        "P1 competence: Talk about play preferences. Learner should name a game or activity they genuinely enjoy during free play.",
      keyPoints: [
        "Names a specific game or activity",
        "Shows enthusiasm or preference",
      ],
      sampleAnswer: "I like to play ball with my friends.",
    },
    {
      id: "q2-who-with",
      type: "open",
      timeLimitSeconds: 30,
      question:
        "Who do you like to play with during Free Activity? Tell me their name or names.",
      rubric:
        "P1 competence: Name their playmates. Learner should name one or more friends they play with.",
      keyPoints: [
        "Names one or more playmates",
        "Shows positive social awareness",
      ],
      sampleAnswer: "I play with Nakato and Musa.",
    },

    // ── SECTION 2: SHARING AND COOPERATION ────────────
    {
      id: "q3-sharing",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "If there is one toy car and two children want to play with it, what should you do?",
      options: [
        { id: "a", label: "Share it and take turns" },
        { id: "b", label: "Snatch it and run away" },
        { id: "c", label: "Cry until I get it" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Sharing and taking turns is the right way to play together. Free Activity helps children learn cooperation and positive interaction.",
    },
    {
      id: "q4-play-together",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "When a new child wants to join your game, what should you say?",
      options: [
        { id: "a", label: "Come and play with us." },
        { id: "b", label: "Go away." },
        { id: "c", label: "I am not playing." },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Welcoming new friends is kind and makes play more fun. Free Activity builds friendship formation skills.",
    },

    // ── SECTION 3: MAKING AND BUILDING ────────────────
    {
      id: "q5-make-things",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "During Free Activity, you can make things. Tell me something you can build or make with boxes, paper, sand, or clay.",
      rubric:
        "P1 competence: Create and build during play. Learner should describe a creative activity they do during free time.",
      keyPoints: [
        "Names something they can make or build",
        "Shows creativity",
        "May describe the materials they use",
      ],
      sampleAnswer: "I can build a house with sand or make a ball from paper.",
    },
    {
      id: "q6-drawing",
      type: "open",
      timeLimitSeconds: 30,
      question:
        "Sometimes we draw during Free Activity. What do you like to draw the most?",
      rubric:
        "P1 competence: Express through drawing. Learner should name or describe what they draw during free play.",
      keyPoints: [
        "Names something they draw",
        "Shows personal interest",
      ],
      sampleAnswer: "I draw my house and my dog.",
    },

    // ── SECTION 4: SAFE PLAY ──────────────────────────
    {
      id: "q7-safe-place",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Where is the safest place to play during Free Activity at school?",
      options: [
        { id: "a", label: "In the play area where the teacher can see us" },
        { id: "b", label: "On the road" },
        { id: "c", label: "Behind the latrine alone" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Playing where the teacher can see you keeps everyone safe. Learners learn to play safely and follow school rules (also links to Theme 6: Accidents and Safety).",
    },
    {
      id: "q8-safe-toy",
      type: "multiple-choice",
      timeLimitSeconds: 20,
      question:
        "Which of these is safe to play with during Free Activity?",
      options: [
        { id: "a", label: "A soft ball" },
        { id: "b", label: "A sharp stick" },
        { id: "c", label: "Broken glass" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Soft balls are safe to play with. Sharp sticks and broken glass can cause injuries. Learners choose safe toys and materials.",
    },

    // ── SECTION 5: PLAYING WITH FRIENDS ───────────────
    {
      id: "q9-rules",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "When everyone follows the rules of a game, what happens?",
      options: [
        { id: "a", label: "The game is fun and fair for everyone" },
        { id: "b", label: "The game gets boring" },
        { id: "c", label: "People start fighting" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Following rules makes games fun and fair for all players. Free Activity helps children learn to follow game rules and resolve little conflicts.",
    },
    {
      id: "q10-ending",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Last question. Tell me one thing you love about Free Activity time. What makes it special for you?",
      rubric:
        "P1 competence: Express personal feelings about play. Learner should share a positive feeling or memory about free play time.",
      keyPoints: [
        "Shares a personal feeling",
        "Reflects positively on play",
        "Shows enjoyment",
      ],
      sampleAnswer: "I love Free Activity because I get to play with my best friends.",
    },
  ],
};