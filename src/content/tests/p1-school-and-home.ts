import type { TestContent } from "@/types";

export const p1SchoolAndHomeTest: TestContent = {
  slug: "p1-school-and-home",
  title: "P1 Oral Exercise: Our School & Our Home",
  description:
    "A friendly oral exercise for Primary 1 learners covering people, things, and activities at school and at home. Built from the Uganda National Primary Curriculum (Themes 1 and 2).",
  category: "P1 Assessment",
  subcategory: "Literacy & Numeracy // Oral",
  format: "oral",
  oralConfig: {
    voice: "am_michael",
    provider: "kokoro",
    examinerName: "Teacher Michael",
    examinerTitle: "Primary 1 Examiner",
    welcomeMessage:
      "Hello! I am Teacher Michael. Welcome to your P1 exercise. I am going to ask you some questions about school and home. Listen carefully to each question, and then tell me your answer. You can take your time. There are no wrong answers, only chances to show what you know. Are you ready? Let us begin!",
  },
  image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&h=675&fit=crop",
  imageAlt: "A bright primary school classroom with wooden desks and a chalkboard",
  author: {
    name: "Teacher Michael",
    handle: "@teacher-michael",
  },
  date: "October 2026",
  publishedAt: "2026-10-01T00:00:00Z",
  tags: ["P1", "Primary School", "Uganda", "Oral Assessment", "Literacy", "Numeracy", "Life Skills"],
  topics: ["education"],
  estimatedMinutes: 15,
  defaultTimeLimitSeconds: 45,
  passingScore: 70,
  sources: [
    {
      type: "markdown",
      title: "P1 Curriculum Reference: Themes 1 & 2",
      content: `# P1 Thematic Curriculum: Our School & Our Home

## Theme 1: Our School
**Sub-themes:**
1.1 People in Our School — Titles and names (Sir, Madam, Teacher, Nurse, Mr., Miss)
1.2 Things in Our School — Buildings, classroom objects, play objects, sign posts
1.3 Activities in Our School — Sweeping, gardening, reading, writing, playing, praying, cleaning, teaching, learning

**Key Mathematics Competences:** Sorting, comparing, matching, counting 1-5, adding 1 more
**Key Literacy Competences:** Naming, identifying, describing pictures, listening to stories, reciting rhymes, role-playing greetings
**Key English Competences:** Greetings, naming people by title, "What's your name?", "My name is ...", "I am a boy/girl"

## Theme 2: Our Home
**Sub-themes:**
2.1 People in Our Home — Father, mother, children (nuclear family)
2.2 Roles/Responsibilities — Cooking, cleaning, milking, washing, pounding, grinding, digging, peeling, sweeping
2.3 Things Found in Our Home and Their Uses — Objects, rooms, animals, birds, plants

**Key Mathematics Competences:** Forming sets, comparing (bigger/smaller), counting 1-10, adding up to 5, measuring height, number symbols 1-5
**Key Literacy Competences:** Listening to stories, naming, grouping, reciting rhymes, matching, sequencing, scribbling, tracing, drawing
**Key English Competences:** "This is my ...", "Show me a ...", "What is this/that?"`,
    },
    {
      type: "link",
      title: "Uganda National Primary Curriculum — P1",
      url: "https://www.ncdc.go.ug",
      description: "Official curriculum from the National Curriculum Development Centre",
    },
  ],
  questions: [
    // ── SECTION 1: PEOPLE AT SCHOOL ────────────────────
    {
      id: "q1-greeting",
      type: "open",
      timeLimitSeconds: 30,
      question:
        "Good morning! How do you greet your teacher when you arrive at school in the morning?",
      rubric:
        "P1 competence: Uses appropriate language in welcoming and greeting. Learner should produce a recognisable morning greeting addressed to a teacher or adult.",
      keyPoints: [
        "Uses the phrase 'Good morning'",
        "Addresses the teacher (teacher, Madam, Sir)",
        "Greets with appropriate tone and respect",
      ],
      sampleAnswer: "Good morning, Teacher.",
    },
    {
      id: "q2-name-introduction",
      type: "open",
      timeLimitSeconds: 30,
      question:
        "Can you tell me your name? Say: 'My name is ...'",
      rubric:
        "P1 English competence: 'My name is ...'. Learner should produce a complete sentence introducing themselves.",
      keyPoints: [
        "Uses 'My name is' structure",
        "States their name clearly",
      ],
      sampleAnswer: "My name is Nakato.",
    },
    {
      id: "q3-boy-or-girl",
      type: "multiple-choice",
      timeLimitSeconds: 20,
      question:
        "Are you a boy or a girl? Say: 'I am a boy' or 'I am a girl'.",
      options: [
        { id: "a", label: "I am a boy." },
        { id: "b", label: "I am a girl." },
      ],
      allowMultiple: false,
      correctOptionIds: [], // Either is correct; scored by gender match
      explanation:
        "Both answers are correct. The competence is using the structure 'I am a ...' to identify themselves.",
    },
    {
      id: "q4-people-at-school",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question: "Who teaches you lessons at school? Is it a teacher, a nurse, or a shopkeeper?",
      options: [
        { id: "a", label: "A teacher" },
        { id: "b", label: "A nurse" },
        { id: "c", label: "A shopkeeper" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "A teacher teaches you lessons at school. 'Teacher' is the correct title. P1 learners should name people at school by their titles.",
    },

    // ── SECTION 2: THINGS AT SCHOOL ────────────────────
    {
      id: "q5-classroom-objects",
      type: "open",
      timeLimitSeconds: 45,
      question:
        "Can you name three things you can see in a classroom? For each one, say: 'This is a ...'",
      rubric:
        "P1 competence: Name items in the classroom. Learner should produce at least 3 items using 'This is a ...' structure.",
      keyPoints: [
        "Names at least 3 classroom objects",
        "Uses 'This is a ...' structure",
        "Pronounces words clearly",
      ],
      sampleAnswer: "This is a chalkboard. This is a desk. This is a book.",
    },
    {
      id: "q6-counting",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question:
        "How many fingers are on one hand? Count your fingers and tell me how many there are.",
      options: [
        { id: "a", label: "Two" },
        { id: "b", label: "Three" },
        { id: "c", label: "Five" },
      ],
      allowMultiple: false,
      correctOptionIds: ["c"],
      explanation:
        "Most children have five fingers on one hand. P1 learners should count objects from 1 to 5 confidently.",
    },
    {
      id: "q7-school-activities",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "What do you do at school? Tell me two things you do at school. For example, 'I read' or 'I play'.",
      rubric:
        "P1 competence: Talk about activities at school. Learner should name at least 2 activities using 'I ...' structure.",
      keyPoints: [
        "Names at least 2 school activities",
        "Uses 'I' structure (e.g. 'I play', 'I read')",
        "Activities are school-appropriate",
      ],
      sampleAnswer: "I read. I play with my friends.",
    },

    // ── SECTION 3: PEOPLE AT HOME ────────────────────
    {
      id: "q8-family-members",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Tell me about your family. Who lives in your home? Say: 'This is my mother', 'This is my father'.",
      rubric:
        "P1 competence: Name close family members. Learner should produce at least 2 using 'This is my ...' structure.",
      keyPoints: [
        "Names at least 2 family members",
        "Uses 'This is my ...' structure",
        "Uses correct titles (mother, father, sister, brother)",
      ],
      sampleAnswer: "This is my mother. This is my father. This is my baby sister.",
    },
    {
      id: "q9-family-roles",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question:
        "Who cooks food in your home? Is it mother, father, or baby?",
      options: [
        { id: "a", label: "Mother" },
        { id: "b", label: "Father" },
        { id: "c", label: "Baby" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "In many homes, mother cooks food. P1 learners should identify roles of different family members. All respectful answers naming a family member who cooks are acceptable in practice.",
    },
    {
      id: "q10-things-in-home",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Name two things you can find in a kitchen. Say: 'This is a ...'",
      rubric:
        "P1 competence: Name things found in the home. Learner should name at least 2 items using correct structure.",
      keyPoints: [
        "Names appropriate kitchen items",
        "Uses 'This is a ...' structure",
        "Pronounces words clearly",
      ],
      sampleAnswer: "This is a spoon. This is a cup.",
    },

    // ── SECTION 4: ANIMALS AND PLANTS ──────────────────
    {
      id: "q11-animals",
      type: "open",
      timeLimitSeconds: 30,
      question:
        "Tell me one animal that lives in your home. What sound does it make?",
      rubric:
        "P1 competence: Name animals found in the home and imitate their sounds. Learner should produce at least one animal name and an attempt at its sound.",
      keyPoints: [
        "Names a domestic animal",
        "Imitates the animal sound",
        "Animal is appropriate (home/farm animal)",
      ],
      sampleAnswer: "A cow. Moo!",
    },
    {
      id: "q12-plant",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Which of these is a plant you can find at home? Is it a banana plant, a stone, or a spoon?",
      options: [
        { id: "a", label: "A banana plant" },
        { id: "b", label: "A stone" },
        { id: "c", label: "A spoon" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "A banana plant is a plant you can find at home. Stones and spoons are not plants. P1 learners should identify common plants in their environment.",
    },

    // ── SECTION 5: SIMPLE ADDITION ─────────────────────
    {
      id: "q13-addition",
      type: "multiple-choice",
      timeLimitSeconds: 35,
      question:
        "If you have 2 mangoes and I give you 1 more mango, how many mangoes do you have altogether?",
      options: [
        { id: "a", label: "Two" },
        { id: "b", label: "Three" },
        { id: "c", label: "Four" },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        "2 mangoes plus 1 more mango makes 3 mangoes. P1 learners should add '1 more' to numbers up to 5 using concrete objects.",
    },
    {
      id: "q14-size-comparison",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Which is bigger: a cup or a cooking pot? The cup or the cooking pot?",
      options: [
        { id: "a", label: "The cup" },
        { id: "b", label: "The cooking pot" },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        "A cooking pot is bigger than a cup. P1 learners should compare objects by size using words like bigger and smaller.",
    },

    // ── SECTION 6: RHYMES AND STORIES ──────────────────
    {
      id: "q15-rhyme",
      type: "open",
      timeLimitSeconds: 45,
      question:
        "Can you recite a short rhyme or sing a song that you learned at school? Any song is fine. Take your time.",
      rubric:
        "P1 competence: Recite rhymes and sing songs. Learner should produce at least 2-4 lines of a recognisable rhyme or song with reasonable recall.",
      keyPoints: [
        "Recites or sings a rhyme/song",
        "Shows reasonable memory and recall",
        "Attempts correct words and rhythm",
      ],
      sampleAnswer: "Twinkle, twinkle, little star, how I wonder what you are!",
    },
    {
      id: "q16-story",
      type: "open",
      timeLimitSeconds: 60,
      question:
        "Tell me a short story about something you did at home yesterday. What did you do? Who was with you?",
      rubric:
        "P1 competence: Tell a simple story about home. Learner should produce a coherent 2-3 sentence narrative about a home activity.",
      keyPoints: [
        "Describes an activity at home",
        "Mentions at least one person or detail",
        "Story is reasonably coherent",
      ],
      sampleAnswer: "Yesterday I helped my mother sweep the compound. My sister played with me. We were happy.",
    },
  ],
};
