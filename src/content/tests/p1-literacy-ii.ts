import type { TestContent } from "@/types";

export const p1LiteracyTwoTest: TestContent = {
  slug: "p1-literacy-ii",
  title: "P1 Literacy II: Reading and Writing",
  description:
    "A written paper for Primary 1 learners covering the Literacy II strand of the Uganda National Primary Curriculum. Literacy II covers reading readiness, word recognition, reading simple sentences, and writing words and short sentences. The paper uses familiar vocabulary from all 12 themes: school, home, family, body, weather, food, transport, animals, and the environment.",
  category: "P1 Assessment",
  subcategory: "Early Literacy // Written",
  format: "written",
  image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&h=675&fit=crop",
  imageAlt: "A child reading and writing at a desk in a bright classroom",
  author: {
    name: "Teacher Michael",
    handle: "@teacher-michael",
  },
  date: "October 2026",
  tags: ["P1", "Primary School", "Uganda", "Written Assessment", "Literacy II", "Reading", "Writing"],
  topics: ["education"],
  estimatedMinutes: 25,
  defaultTimeLimitSeconds: 60,
  passingScore: 70,
  sources: [
    {
      type: "markdown",
      title: "Curriculum Reference: Literacy II Strand (P1)",
      content: `# P1 Literacy II (5 periods per week)

Literacy II focuses on reading and writing competences. Key milestones across the year:

**Reading:**
- Match pictures to pictures, pictures to words
- Recognise up to 15 sight words (school, home, family, food, animals, weather)
- Read 2-syllable words
- Read words with double vowels
- Read simple sentences with link verbs (to be, to have)
- Read singular and plural words
- Recognise vowel letters and consonants in known words
- Read days of the week

**Writing:**
- Write patterns (zigzag, curves, loops)
- Write letters of the alphabet
- Copy simple words and labels for pictures
- Fill in missing letters in known words
- Write syllables and short words
- Write 2-5 simple sentences by end of year
- Use possessive adjectives with nouns (my, his, her)`,
    },
    {
      type: "link",
      title: "Uganda National Primary Curriculum — P1",
      url: "https://www.ncdc.go.ug",
      description: "Official curriculum from the National Curriculum Development Centre",
    },
  ],
  questions: [
    // ── SECTION A: PICTURE WORDS (word recognition) ───
    {
      id: "q1-word-hen",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question: "Read these words. Which one says 'hen'?",
      options: [
        { id: "a", label: "cat" },
        { id: "b", label: "hen" },
        { id: "c", label: "dog" },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        "h-e-n spells 'hen'. P1 learners recognise familiar sight words related to animals found at home.",
    },
    {
      id: "q2-word-milk",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question: "Which word says 'milk'?",
      options: [
        { id: "a", label: "milk" },
        { id: "b", label: "cold" },
        { id: "c", label: "goat" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "m-i-l-k spells 'milk'. P1 learners read words related to food and animals.",
    },
    {
      id: "q3-word-egg",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question: "Which of these words says 'egg'?",
      options: [
        { id: "a", label: "cow" },
        { id: "b", label: "hen" },
        { id: "c", label: "egg" },
      ],
      allowMultiple: false,
      correctOptionIds: ["c"],
      explanation:
        "e-g-g spells 'egg'. Learners match the written word to its spoken form.",
    },
    {
      id: "q4-word-ball",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question: "Read carefully. Which word says 'ball'?",
      options: [
        { id: "a", label: "book" },
        { id: "b", label: "ball" },
        { id: "c", label: "bell" },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        "b-a-l-l spells 'ball'. P1 learners match familiar words by their first letter and overall shape.",
    },
    {
      id: "q5-word-tree",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question: "Which word says 'tree'?",
      options: [
        { id: "a", label: "tree" },
        { id: "b", label: "three" },
        { id: "c", label: "tray" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "t-r-e-e spells 'tree'. By Theme 11 (Our Environment), learners read words related to nature and plants.",
    },

    // ── SECTION B: MATCHING PICTURES TO WORDS ─────────
    {
      id: "q6-match-mango",
      type: "multiple-choice",
      timeLimitSeconds: 35,
      question:
        "A mango is a sweet fruit we eat. Which word below means mango?",
      options: [
        { id: "a", label: "milk" },
        { id: "b", label: "mango" },
        { id: "c", label: "millet" },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        "m-a-n-g-o spells 'mango'. P1 learners match the names of familiar foods to their written form.",
    },
    {
      id: "q7-match-cup",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question:
        "We drink from a cup. Which word says 'cup'?",
      options: [
        { id: "a", label: "car" },
        { id: "b", label: "cap" },
        { id: "c", label: "cup" },
      ],
      allowMultiple: false,
      correctOptionIds: ["c"],
      explanation:
        "c-u-p spells 'cup'. P1 learners distinguish between similar-looking words (cap vs cup).",
    },

    // ── SECTION C: READING SENTENCES ──────────────────
    {
      id: "q8-sentence-cow",
      type: "multiple-choice",
      timeLimitSeconds: 40,
      question:
        "Read these sentences. Which sentence says 'The cow gives milk.'?",
      options: [
        { id: "a", label: "The cow gives milk." },
        { id: "b", label: "The hen lays eggs." },
        { id: "c", label: "The dog barks." },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "P1 learners read simple sentences about animals and their products by Theme 2 (Our Home).",
    },
    {
      id: "q9-sentence-school",
      type: "multiple-choice",
      timeLimitSeconds: 40,
      question:
        "Look at these sentences. Which one says 'I go to school.'?",
      options: [
        { id: "a", label: "I go to school." },
        { id: "b", label: "I go to church." },
        { id: "c", label: "I go to market." },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "P1 learners read sentences with common verbs and actions by Theme 1 (Our School).",
    },
    {
      id: "q10-sentence-body",
      type: "multiple-choice",
      timeLimitSeconds: 40,
      question:
        "Which sentence says 'I have two hands.'?",
      options: [
        { id: "a", label: "I have two hands." },
        { id: "b", label: "I have two ears." },
        { id: "c", label: "I have two feet." },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "P1 learners read simple body-related sentences with link verbs 'have'. This matches Theme 4 body parts.",
    },

    // ── SECTION D: WRITING ────────────────────────────
    {
      id: "q11-copy-pattern",
      type: "open",
      question: "Copy this pattern carefully: / / / / / /",
      description: "Draw a zigzag line going left to right, copying the pattern shown.",
      timeLimitSeconds: 60,
      rubric:
        "P1 competence: Copy a simple pattern accurately. Learner should reproduce alternating up-down strokes with reasonable neatness.",
      keyPoints: [
        "Reproduces the up-down pattern",
        "Strokes are recognisable and roughly in a line",
      ],
      sampleAnswer: "//////",
    },
    {
      id: "q12-copy-word",
      type: "open",
      question: "Copy the word 'tree' carefully. Write it below.",
      description: "Copy the word letter by letter.",
      timeLimitSeconds: 60,
      rubric:
        "P1 competence: Copy simple words accurately. Learner should reproduce all four letters in order.",
      keyPoints: [
        "Writes t, r, e, e in order",
        "Letters are recognisable",
      ],
      sampleAnswer: "tree",
    },
    {
      id: "q13-copy-sentence",
      type: "open",
      question: "Copy this sentence: 'I can read.'",
      description: "Copy the sentence exactly as it is written.",
      timeLimitSeconds: 90,
      rubric:
        "P1 competence: Copy a short sentence. Learner should reproduce all three words and a period.",
      keyPoints: [
        "Copies all three words",
        "Letters are recognisable",
        "Includes the period",
      ],
      sampleAnswer: "I can read.",
    },
    {
      id: "q14-write-animal",
      type: "open",
      question: "Write the name of one animal you know. Any animal is fine.",
      description: "Think of an animal and write its name.",
      timeLimitSeconds: 60,
      rubric:
        "P1 competence: Write a familiar word from memory. Learner should write a recognisable animal name.",
      keyPoints: [
        "Writes or attempts to write an animal name",
        "Letters are recognisable",
      ],
      sampleAnswer: "cow",
    },
  ],
};