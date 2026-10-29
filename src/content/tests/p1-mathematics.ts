import type { TestContent } from "@/types";

export const p1MathematicsTest: TestContent = {
  slug: "p1-mathematics",
  title: "P1 Numeracy Check: Counting, Adding and Shapes",
  description:
    "A friendly oral numeracy check for Primary 1 learners covering the Mathematics strand of the Uganda National Primary Curriculum. Questions range across sorting, counting, adding, taking away, shapes, measuring time, and simple money, drawn from all 12 themes.",
  category: "P1 Assessment",
  subcategory: "Numeracy // Oral",
  format: "oral",
  oralConfig: {
    voice: "am_michael",
    provider: "kokoro",
    examinerName: "Teacher Michael",
    examinerTitle: "Primary 1 Examiner",
    welcomeMessage:
      "Hello! I am Teacher Michael. Welcome to your Numeracy Check. I am going to ask you some questions about counting, adding, shapes and time. Listen carefully to each question and tell me your answer. You can use your fingers to count. Take your time. There are no wrong answers, only chances to show what you know. Are you ready? Let us begin!",
  },
  image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&h=675&fit=crop",
  imageAlt: "Colourful numbers and arithmetic signs on a dark background",
  author: {
    name: "Teacher Michael",
    handle: "@teacher-michael",
  },
  date: "October 2026",
  publishedAt: "2026-10-01T00:00:00Z",
  tags: ["P1", "Primary School", "Uganda", "Oral Assessment", "Mathematics", "Numeracy", "Counting"],
  topics: ["education"],
  estimatedMinutes: 15,
  defaultTimeLimitSeconds: 30,
  passingScore: 70,
  sources: [
    {
      type: "markdown",
      title: "Curriculum Reference: Mathematics Strand (P1, Themes 1-12)",
      content: `# P1 Mathematics (5 periods per week)

**Progression through the year (by theme):**

| Theme | Key Mathematics Competences |
|-------|----------------------------|
| 1: Our School | Sorting, comparing, matching, counting 1-5 |
| 2: Our Home | Forming sets, comparing (bigger/smaller), counting 1-10, adding up to 5, measuring height, number symbols 1-5 |
| 3: Our Community | Sorting, sequencing, counting 1-20, symbols 0-9, adding sum <20, comparing capacity, days of the week, '+' and '=' symbols |
| 4: The Human Body & Health | Counting 1-40, symbols 0-20, length (non-standard), adding sum <10, months of the year |
| 5: Weather | Counting 1-50, symbols 1-30, number names 1-5, add <20, place value (tens/ones), multiplication by 2 as repeated addition |
| 6: Accidents & Safety | Counting 1-60, symbols 0-40, number names 1-10, subtract to 10, multiply table of 2, comparing capacity |
| 7: Living Together | Counting 1-70, symbols 0-50, number names 1-25, add <50, subtract <20, halves making a whole, multiply by 10 |
| 8: Food & Nutrition | Counting 1-80, symbols to 80, names to 30, add <70, subtract <30, quarters, capacity estimates |
| 9: Transport | Counting 1-90, symbols to 80, names to 40, subtract <40, multiply by 3, money (coins to 500) |
| 10: Things We Make | Symbols 0-90, names 0-60, add <80, subtract <80, multiply 2 & 3, missing numbers |
| 11: Environment | Count to 99, symbols/names to 99, add/sub to 99, multiply 2, 3, 10, pictographs |
| 12: Peace & Security | Add/sub to 99, missing numbers, compare weight and length, multiply table of 10 |

**Assessment guidelines:**
- Sort objects by shape, size and colour
- Count in correct order up to 99
- Recognise and write number symbols up to 99
- Write and match number names up to 99
- Add vertically and horizontally up to 99 (no carrying)
- Subtract up to 99 (no borrowing)
- Multiply by 2, 3, and 10 as repeated addition
- Identify place value (tens and ones)
- Draw and name shapes: circle, square, triangle, rectangle
- Identify halves and quarters
- Measure length using non-standard units
- Compare capacity of containers
- Tell time: morning, afternoon, evening, night; days of the week; months of the year
- Recognise money up to 500 shillings,
- Interpret pictographs`,
    },
    {
      type: "link",
      title: "Uganda National Primary Curriculum — P1",
      url: "https://www.ncdc.go.ug",
      description: "Official curriculum from the National Curriculum Development Centre",
    },
  ],
  questions: [
    // ── SECTION 1: SORTING AND COMPARING ──────────────
    {
      id: "q1-sort",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question:
        "Here are things in a kitchen: a cup, a plate, a spoon, and a hoe. Which one does not belong with the things for eating?",
      options: [
        { id: "a", label: "The hoe" },
        { id: "b", label: "The plate" },
        { id: "c", label: "The cup" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "A hoe is a farming tool, not a kitchen eating item. P1 learners sort objects by shape, size and use.",
    },
    {
      id: "q2-bigger",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Who is taller: your mother or your baby sister?",
      options: [
        { id: "a", label: "My mother" },
        { id: "b", label: "My baby sister" },
        { id: "c", label: "They are the same" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Mothers are generally taller than babies. P1 learners compare objects by size using words like bigger, smaller, taller, shorter.",
    },

    // ── SECTION 2: COUNTING AND NUMBER NAMES ──────────
    {
      id: "q3-count-fingers",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Count your fingers on both hands. How many fingers do you have altogether?",
      options: [
        { id: "a", label: "Five" },
        { id: "b", label: "Ten" },
        { id: "c", label: "Nine" },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        "Most children have ten fingers on both hands. P1 learners count objects from 1 to 10 confidently by Theme 2.",
    },
    {
      id: "q4-count-on",
      type: "open",
      timeLimitSeconds: 45,
      question:
        "Count for me from 1 to 10. Take your time and count clearly.",
      rubric:
        "P1 competence: Count in correct order to 10. Learner should produce the numbers 1 through 10 in order without skipping.",
      keyPoints: [
        "Counts from 1 to 10",
        "Produces numbers in correct order",
        "Does not skip any number",
      ],
      sampleAnswer: "1, 2, 3, 4, 5, 6, 7, 8, 9, 10.",
    },
    {
      id: "q5-what-number",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "What number comes right after 3 when you count? 1, 2, 3, then what?",
      options: [
        { id: "a", label: "Two" },
        { id: "b", label: "Four" },
        { id: "c", label: "Five" },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        "After 3 comes 4. P1 learners fill in missing numbers in a counting sequence.",
    },

    // ── SECTION 3: ADDING ─────────────────────────────
    {
      id: "q6-add-one-more",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question:
        "Listen carefully. You have 4 stones and I give you 1 more stone. How many stones do you have now?",
      options: [
        { id: "a", label: "Four" },
        { id: "b", label: "Five" },
        { id: "c", label: "Three" },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        "4 plus 1 more makes 5. P1 learners add '1 more' to numbers up to 5 using concrete objects.",
    },
    {
      id: "q7-add-basic",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question:
        "2 plus 3 equals how many? Count on your fingers if you need to. 2 and 3 makes what?",
      options: [
        { id: "a", label: "Four" },
        { id: "b", label: "Five" },
        { id: "c", label: "Six" },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        "2 + 3 = 5. P1 learners add numbers with a sum less than 20 (by Theme 3) and up to 99 by the end of the year.",
    },

    // ── SECTION 4: TAKING AWAY ─────────────────────────
    {
      id: "q8-subtract",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question:
        "You have 5 sweets. You eat 2 of them. How many sweets are left?",
      options: [
        { id: "a", label: "Three" },
        { id: "b", label: "Two" },
        { id: "c", label: "Five" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "5 minus 2 equals 3. P1 learners subtract up to 10 using concrete materials by Theme 6.",
    },

    // ── SECTION 5: SHAPES AND HALVES ───────────────────
    {
      id: "q9-shape",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Which shape has no corners, like the sun or a ball?",
      options: [
        { id: "a", label: "A circle" },
        { id: "b", label: "A square" },
        { id: "c", label: "A triangle" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "A circle has no corners. P1 learners draw and name shapes: circle, square, triangle, and rectangle.",
    },
    {
      id: "q10-halves",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "If you cut a matooke into two equal parts, what do you call one of the parts?",
      options: [
        { id: "a", label: "A half" },
        { id: "b", label: "A quarter" },
        { id: "c", label: "A whole" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Two equal parts make halves. P1 learners identify halves and quarters by Theme 7 and 8.",
    },

    // ── SECTION 6: TIME AND DAYS ──────────────────────
    {
      id: "q11-time-of-day",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "When you wake up and the sun is rising, is it morning, afternoon, or evening?",
      options: [
        { id: "a", label: "Morning" },
        { id: "b", label: "Afternoon" },
        { id: "c", label: "Evening" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Sunrise is in the morning. P1 learners tell different times of day using natural indicators (sun, shadows).",
    },
    {
      id: "q12-day-of-week",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "What is the first day of the school week?",
      options: [
        { id: "a", label: "Monday" },
        { id: "b", label: "Sunday" },
        { id: "c", label: "Saturday" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "The school week starts on Monday. P1 learners tell the days of the week by Theme 3.",
    },

    // ── SECTION 7: MONEY ──────────────────────────────
    {
      id: "q13-money",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "If you buy a sweet that costs 100 shillings, which coin do you give?",
      options: [
        { id: "a", label: "A 100-shilling coin" },
        { id: "b", label: "A 500-shilling coin" },
        { id: "c", label: "A 50-shilling coin" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "You give a 100-shilling coin. P1 learners recognise money up to 500 shillings and practise buying and selling (Theme 9 and 10).",
    },

    // ── SECTION 8: HIGHER COUNTING ────────────────────
    {
      id: "q14-count-higher",
      type: "open",
      timeLimitSeconds: 60,
      question:
        "You did very well. Now count for me from 11 to 20. Take your time.",
      rubric:
        "P1 competence: Count in correct order from 11 to 20. Learner should produce the numbers 11 through 20 in correct order.",
      keyPoints: [
        "Counts from 11 to 20",
        "Produces numbers in correct order",
        "Does not skip any number",
      ],
      sampleAnswer: "11, 12, 13, 14, 15, 16, 17, 18, 19, 20.",
    },
  ],
};