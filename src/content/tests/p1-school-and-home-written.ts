import type { TestContent } from "@/types";

export const p1SchoolAndHomeWrittenTest: TestContent = {
  slug: "p1-school-and-home-written",
  title: "P1 Written Paper: Our School & Our Home",
  description:
    "A short written paper for Primary 1 learners. Read the little story about Achieng, then answer the questions. The paper covers people, things, and activities at school and at home.",
  category: "P1 Assessment",
  subcategory: "Literacy // Written",
  format: "written",
  image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=675&fit=crop",
  imageAlt: "Stack of books on a wooden desk beside a window with natural light",
  author: {
    name: "Teacher Michael",
    handle: "@teacher-michael",
  },
  date: "October 2026",
  tags: ["P1", "Primary School", "English", "Reading", "Writing", "Written Assessment"],
  topics: ["education"],
  estimatedMinutes: 30,
  defaultTimeLimitSeconds: 60,
  passingScore: 70,
  sources: [
    {
      type: "markdown",
      title: "Reading Passage: My School and My Home",
      description: "A little story about Achieng, her school, and her home.",
      content: `I am Achieng. I am six years old.

I go to school in the morning. My teacher is Madam Grace.

At school I read and I write. I play with my friends.

After school I go home. I help my mother.

We sweep the home. I love my school and my home.`,
    },
    {
      type: "markdown",
      title: "Key Words",
      description: "Words used in the story and what they mean.",
      content: `**school:** a place where children go to learn
**teacher:** a person who teaches you at school
**home:** a place where you live with your family
**read:** to look at words and say them
**write:** to make letters and words
**mother:** the woman in your family who takes care of you`,
    },
  ],

  questions: [
    // ── SECTION B: MULTIPLE CHOICE (circle the letter) ─────────
    {
      id: "q1",
      type: "multiple-choice",
      question: "How old is Achieng?",
      timeLimitSeconds: 30,
      options: [
        { id: "a", label: "Five" },
        { id: "b", label: "Six" },
        { id: "c", label: "Seven" },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation: "The story says 'I am six years old.'",
    },
    {
      id: "q2",
      type: "multiple-choice",
      question: "Who is Achieng's teacher?",
      timeLimitSeconds: 30,
      options: [
        { id: "a", label: "Madam Grace" },
        { id: "b", label: "Teacher John" },
        { id: "c", label: "Nurse Susan" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation: "The story says 'My teacher is Madam Grace.'",
    },
    {
      id: "q3",
      type: "multiple-choice",
      question: "What does Achieng do at school?",
      timeLimitSeconds: 30,
      options: [
        { id: "a", label: "She reads and writes." },
        { id: "b", label: "She cooks food." },
        { id: "c", label: "She sweeps the home." },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation: "The story says 'At school I read and I write.'",
    },
    {
      id: "q4",
      type: "multiple-choice",
      question: "Who does Achieng help at home?",
      timeLimitSeconds: 30,
      options: [
        { id: "a", label: "Her father" },
        { id: "b", label: "Her baby" },
        { id: "c", label: "Her mother" },
      ],
      allowMultiple: false,
      correctOptionIds: ["c"],
      explanation: "The story says 'I help my mother.'",
    },
    {
      id: "q5",
      type: "multiple-choice",
      question: "Achieng goes to ______ in the morning.",
      timeLimitSeconds: 30,
      options: [
        { id: "a", label: "school" },
        { id: "b", label: "market" },
        { id: "c", label: "garden" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation: "The story says 'I go to school in the morning.'",
    },

    // ── SECTION C: WRITTEN ANSWERS (write or copy) ─────────────
    {
      id: "q6",
      type: "open",
      question: "What is your name? Write your full name.",
      description: "Write your first name and your surname.",
      timeLimitSeconds: 60,
      rubric:
        "Learner writes their own name. Accept any spelling of the child's own name; letters should be recognisable.",
      keyPoints: [
        "Writes their own name",
        "Letters are recognisable",
      ],
      sampleAnswer: "Achieng.",
    },
    {
      id: "q7",
      type: "open",
      question: "Copy this sentence: I love my school.",
      description: "Copy the sentence exactly.",
      timeLimitSeconds: 60,
      rubric:
        "Learner copies the sentence. Letter size and neatness do not matter yet; every word should be present.",
      keyPoints: [
        "Copies the whole sentence",
        "Letters are recognisable",
      ],
      sampleAnswer: "I love my school.",
    },
    {
      id: "q8",
      type: "open",
      question: "Write one thing you can see in your classroom.",
      description: "Write one word. For example: desk, book, chalkboard, chair.",
      timeLimitSeconds: 60,
      rubric:
        "Learner writes one classroom object word. Accept any classroom object named in the P1 theme (desk, book, chalkboard, chair, table, bag).",
      keyPoints: [
        "Writes one classroom object",
        "Word is recognisable",
      ],
      sampleAnswer: "Desk.",
    },
    {
      id: "q9",
      type: "open",
      question: "Write one thing you do at school.",
      description: "Write one word. For example: read, write, play, sing.",
      timeLimitSeconds: 60,
      rubric:
        "Learner writes one school activity word. Accept activities from the P1 theme (read, write, play, sing, pray, sweep, learn).",
      keyPoints: [
        "Writes one school activity",
        "Word is recognisable",
      ],
      sampleAnswer: "Play.",
    },
  ],
};