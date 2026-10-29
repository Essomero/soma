import type { TestContent } from "@/types";

export const p1LiteracyOneTest: TestContent = {
  slug: "p1-literacy-i",
  title: "P1 Literacy I: Listening, Rhymes and Early Writing",
  description:
    "A friendly oral exercise for Primary 1 learners covering the Literacy I strand of the Uganda National Primary Curriculum. Literacy I focuses on listening and speaking, pre-reading skills (rhymes, matching, recognising shapes and words), and pre-writing skills (position, pencil grip, drawing, tracing patterns). In local-language schools this strand is delivered in the child's first language.",
  category: "P1 Assessment",
  subcategory: "Early Literacy // Oral & Practical",
  format: "oral",
  oralConfig: {
    voice: "am_michael",
    provider: "kokoro",
    examinerName: "Teacher Michael",
    examinerTitle: "Primary 1 Examiner",
    welcomeMessage:
      "Hello! I am Teacher Michael. Welcome to your Literacy I exercise. We are going to listen, speak, recite rhymes, and talk about reading and writing. I will ask you questions, and you can answer in your own words. Take your time, and try your best. Are you ready? Let us begin!",
  },
  image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&h=675&fit=crop",
  imageAlt: "A shelf of colourful children's books in a school library",
  author: {
    name: "Teacher Michael",
    handle: "@teacher-michael",
  },
  date: "October 2026",
  publishedAt: "2026-10-01T00:00:00Z",
  tags: ["P1", "Primary School", "Uganda", "Oral Assessment", "Literacy I", "Listening", "Pre-Reading", "Pre-Writing"],
  topics: ["education"],
  estimatedMinutes: 12,
  defaultTimeLimitSeconds: 40,
  passingScore: 70,
  sources: [
    {
      type: "markdown",
      title: "Curriculum Reference: Literacy I Strand (P1)",
      content: `# P1 Literacy I (5 periods per week)

Literacy I covers listening & speaking, pre-reading, and pre-writing competences integrated with the 12 themes.

**Key competences across the year:**

**Listening and Speaking:**
- Listen to others attentively
- Name people, objects, places, and activities
- Describe pictures and objects
- Talk about activities, events, and experiences
- Tell / re-tell / sign stories
- Recite rhymes, tongue twisters, proverbs, riddles
- Give and respond to commands
- Role-play (greetings, family roles, community situations)
- Ask and answer questions

**Pre-Reading:**
- Recite rhymes and songs
- Compare and match pictures (picture to picture, picture to object)
- Recognise shapes and objects
- Match pictures to words
- Sequence pictures by size and order
- Fit jigsaw puzzles (2-4 pieces)
- Recognise name tags and simple words
- Identify vowel letters and consonants in known words

**Pre-Writing:**
- Sit in proper posture when writing
- Hold a pencil appropriately (three-finger grip)
- Draw, scribble, colour, shade
- Trace shapes, patterns, and pictures
- Write patterns (zigzag, curves, loops)
- Join dots to form pictures
- Copy simple patterns accurately
- Tear and paste`,
    },
    {
      type: "link",
      title: "Uganda National Primary Curriculum — P1",
      url: "https://www.ncdc.go.ug",
      description: "Official curriculum from the National Curriculum Development Centre",
    },
  ],
  questions: [
    // ── SECTION 1: LISTENING AND SPEAKING ─────────────
    {
      id: "q1-listen",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Listen carefully to this sentence: 'The cat sits on the mat.' Now tell me what the cat sits on.",
      rubric:
        "P1 competence: Listen to others attentively. Learner should recall and state the key detail from the spoken sentence.",
      keyPoints: [
        "Listens to the full sentence",
        "Recalls the key detail (on the mat)",
      ],
      sampleAnswer: "The mat.",
    },
    {
      id: "q2-describe-object",
      type: "open",
      timeLimitSeconds: 45,
      question:
        "Look around the room and tell me one thing you can see. Describe it: tell me what it is and what colour it is.",
      rubric:
        "P1 competence: Describe pictures and objects. Learner should name an object and give at least one attribute such as colour.",
      keyPoints: [
        "Names a real object in the room",
        "Provides at least one attribute (e.g. colour, size)",
      ],
      sampleAnswer: "I can see a brown table. It is big.",
    },
    {
      id: "q3-best-friend",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Tell me the name of your best friend at school. Then tell me one thing you do together.",
      rubric:
        "P1 competence: Name people and talk about activities. Learner should produce a friend's name and describe a shared activity.",
      keyPoints: [
        "Names a friend",
        "Describes an activity they do together",
      ],
      sampleAnswer: "My best friend is Nakato. We play ball together.",
    },
    {
      id: "q4-command",
      type: "multiple-choice",
      timeLimitSeconds: 20,
      question:
        "When your teacher says 'Sit down quietly,' what do you do?",
      options: [
        { id: "a", label: "I sit down and keep quiet" },
        { id: "b", label: "I stand up and shout" },
        { id: "c", label: "I run outside" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "P1 learners respond appropriately to common classroom commands: sit down, stand up, come here, stop, go.",
    },

    // ── SECTION 2: RHYMES AND TONGUE TWISTERS ─────────
    {
      id: "q5-rhyme",
      type: "open",
      timeLimitSeconds: 60,
      question:
        "Say a rhyme that you know. Any rhyme is fine. For example: 'Rain, rain, go away.' What is your favourite rhyme?",
      rubric:
        "P1 competence: Recite rhymes correctly. Learner should produce a recognisable rhyme of at least 2 lines with reasonable accuracy.",
      keyPoints: [
        "Recites a recognisable rhyme",
        "Produces at least 2 lines",
        "Attempts correct rhythm and words",
      ],
      sampleAnswer: "Twinkle, twinkle, little star. How I wonder what you are!",
    },
    {
      id: "q6-tongue-twister",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Try this tongue twister after me: 'She sells shells by the seashore.' Can you say it again? Try to say it fast.",
      rubric:
        "P1 competence: Say tongue twisters. Learner should attempt the twister with reasonable accuracy; speed is not required.",
      keyPoints: [
        "Attempts to repeat the tongue twister",
        "Produces recognisable syllables and words",
      ],
      sampleAnswer: "She sells shells by the seashore.",
    },

    // ── SECTION 3: PRE-READING ────────────────────────
    {
      id: "q7-match-picture",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "I am thinking of an animal that says 'Moo!' and gives us milk. Which animal is it?",
      options: [
        { id: "a", label: "A cow" },
        { id: "b", label: "A hen" },
        { id: "c", label: "A dog" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "A cow says 'Moo!' and gives milk. P1 learners match objects and animals to their characteristics and sounds.",
    },
    {
      id: "q8-word-recognition",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "If you see your name written on a piece of paper, what should you do?",
      options: [
        { id: "a", label: "Recognise it and say 'That is my name!'" },
        { id: "b", label: "Throw the paper away" },
        { id: "c", label: "Colour over it" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "P1 learners learn to recognise their own name tags. Recognising one's name is a key pre-reading competency.",
    },

    // ── SECTION 4: PRE-WRITING ────────────────────────
    {
      id: "q9-pencil-grip",
      type: "multiple-choice",
      timeLimitSeconds: 20,
      question:
        "How should you hold a pencil when you are drawing or writing?",
      options: [
        { id: "a", label: "With three fingers, gently" },
        { id: "b", label: "With a fist like a hammer" },
        { id: "c", label: "Poking with only one finger" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "The correct three-finger grip lets you write easily and neatly. P1 learners practise the proper pencil hold.",
    },
    {
      id: "q10-posture",
      type: "multiple-choice",
      timeLimitSeconds: 20,
      question:
        "When you write at your desk, how should you sit?",
      options: [
        { id: "a", label: "Sit up straight with your feet on the floor" },
        { id: "b", label: "Lie on the desk" },
        { id: "c", label: "Stand far away from the desk" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Sitting up straight helps you write clearly and prevents your back from hurting. P1 learners practise proper sitting posture.",
    },
    {
      id: "q11-pattern",
      type: "open",
      timeLimitSeconds: 45,
      question:
        "Copy this pattern in the air with your finger: up, down, up, down. Ready? Try it. Now if you have paper, draw that pattern on it. A line that goes up and down like a zigzag.",
      rubric:
        "P1 competence: Write patterns accurately. Learner should produce a pattern that alternates direction (zigzag, wavy, or loop) with reasonable control.",
      keyPoints: [
        "Attempts to draw a pattern",
        "Pattern shows direction change",
        "Uses reasonable pencil control (if on paper)",
      ],
      sampleAnswer: "A zigzag line moving up and down across the page.",
    },
  ],
};