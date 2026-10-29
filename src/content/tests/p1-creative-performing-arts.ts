import type { TestContent } from "@/types";

export const p1CreativePerformingArtsTest: TestContent = {
  slug: "p1-creative-performing-arts",
  title: "P1 Creative Performing Arts Check: Music, Art and Crafts",
  description:
    "A friendly oral and practical check for Primary 1 learners covering the Creative Performing Arts strand of the Uganda National Primary Curriculum. The strand has two parts: Music (3 periods per week: singing, rhythm, percussion instruments, movement) and Art & Crafts (2 periods per week: drawing, colouring, modelling, tearing, pasting, printing, weaving). The check covers competences from all 12 themes.",
  category: "P1 Assessment",
  subcategory: "Creative Arts // Oral & Practical",
  format: "oral",
  oralConfig: {
    voice: "am_michael",
    provider: "kokoro",
    examinerName: "Teacher Michael",
    examinerTitle: "Primary 1 Examiner",
    welcomeMessage:
      "Hello! I am Teacher Michael. Welcome to your Creative Performing Arts check. We are going to sing, clap rhythms, talk about dancing, art and making things. Listen to each question and do your best. There are no wrong answers, only chances to show what you can do. Are you ready? Let us begin!",
  },
  image: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=1200&h=675&fit=crop",
  imageAlt: "Bright paints and craft supplies on a table in a classroom",
  author: {
    name: "Teacher Michael",
    handle: "@teacher-michael",
  },
  publishedAt: "2026-10-01T00:00:00Z",
  tags: ["P1", "Primary School", "Uganda", "Oral Assessment", "Creative Arts", "Music", "Art and Crafts"],
  topics: ["education"],
  estimatedMinutes: 12,
  defaultTimeLimitSeconds: 40,
  passingScore: 70,
  sources: [
    {
      type: "markdown",
      title: "Curriculum Reference: Creative Performing Arts Strand (P1)",
      content: `# P1 Creative Performing Arts (5 periods per week)
## Music — 3 periods | Art and Crafts — 2 periods

**Music competences across the year:**
- Sing songs related to each theme (school, home, community, body, weather, transport, food, environment, peace)
- Sing the first two lines of the National Anthem
- Sing and move to the rhythm of songs
- Sing lullabies and work songs
- Play simple percussion instruments: shakers, clappers, rattles
- Dance and move according to rhythm
- Listen to music and lullabies
- Recite rhymes and jingles
- Perform action songs
- Sing songs of praise (RE link)

**Art and Crafts competences across the year:**
- Draw shapes, objects, animals, plants, people, and scenes
- Colour within outlines using appropriate colours
- Shade and paint pictures
- Model objects from clay and locally available materials (pots, balls, animals, food containers)
- Make simple percussion instruments (shakers with seeds/bottles)
- Tear and paste paper to make pictures (collage)
- Cut and paste different shapes
- Weave simple items (mats, baskets)
- Print using potato cuts, banana fibre stalks, leaves
- Thread beads or objects
- Make play items from local materials (toys, balls, dolls, ropes)
- Finger print/paint
- Fold paper to create simple shapes
- Doodle, draw and label`,
    },
    {
      type: "link",
      title: "Uganda National Primary Curriculum — P1",
      url: "https://www.ncdc.go.ug",
      description: "Official curriculum from the National Curriculum Development Centre",
    },
  ],
  questions: [
    // ── SECTION 1: SINGING ────────────────────────────
    {
      id: "q1-song",
      type: "open",
      timeLimitSeconds: 60,
      question:
        "Sing one song that you learned at school. It can be a song about school, home, animals, or any theme. Take your time and sing.",
      rubric:
        "P1 competence: Sing songs correctly. Learner should produce a recognisable song with reasonable melody and words, lasting at least 2 lines.",
      keyPoints: [
        "Sings a recognisable song",
        "Produces at least 2 lines",
        "Shows reasonable tune and word recall",
      ],
      sampleAnswer: "I hear the whistle blowing, I know it is for me. My teacher calls me to come and learn, sing and play with glee!",
    },
    {
      id: "q2-national-anthem",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "When we stand and sing the National Anthem, what do we show?",
      options: [
        { id: "a", label: "We show respect for our country" },
        { id: "b", label: "We show we are tired" },
        { id: "c", label: "We show we want to leave" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Standing and singing the National Anthem shows respect for Uganda. P1 learners sing the first two lines of the National Anthem (Theme 1) and learn to stand respectfully while singing.",
    },

    // ── SECTION 2: RHYTHM AND PERCUSSION ──────────────
    {
      id: "q3-rhythm-copy",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Clap your hands with me. Copy this rhythm: clap, clap, clap-clap-clap. Ready? Now you do it alone.",
      rubric:
        "P1 competence: Keep rhythm and copy a simple beat. Learner should reproduce the clap pattern with reasonable timing.",
      keyPoints: [
        "Claps along with the examiner",
        "Attempts the pattern independently",
        "Shows sense of rhythm",
      ],
      sampleAnswer: "Clap, clap, clap-clap-clap (matching the pattern).",
    },
    {
      id: "q4-percussion",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question:
        "Which of these can we use to make a shaker like the ones we use in music class?",
      options: [
        { id: "a", label: "A small bottle with seeds inside" },
        { id: "b", label: "A closed book" },
        { id: "c", label: "A metal pot" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "A small bottle with seeds inside makes a good shaker. P1 learners make simple percussion instruments from locally available materials (Theme 2, 3, 6, 11).",
    },

    // ── SECTION 3: MOVEMENT AND DANCE ─────────────────
    {
      id: "q5-dance",
      type: "open",
      timeLimitSeconds: 45,
      question:
        "Show me how you move when you hear a song you like. Can you sway, step, or move your body to a rhythm? Show me your best dance move.",
      rubric:
        "P1 competence: Move to the rhythm of music. Learner should demonstrate body movement that responds to a beat or rhythm.",
      keyPoints: [
        "Moves body in response to rhythm",
        "Shows coordination",
        "Appears comfortable and engaged",
      ],
      sampleAnswer: "Sways from side to side and steps gently in time with an imagined beat.",
    },
    {
      id: "q6-movement-actions",
      type: "multiple-choice",
      timeLimitSeconds: 20,
      question:
        "In music class, we move while we sing. What part of our body helps us keep the beat when we stamp?",
      options: [
        { id: "a", label: "Our feet" },
        { id: "b", label: "Our elbows" },
        { id: "c", label: "Our head" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "We stamp with our feet to make a beat. P1 learners use different body parts to express rhythm.",
    },

    // ── SECTION 4: DRAWING AND COLOURING ──────────────
    {
      id: "q7-shapes",
      type: "open",
      timeLimitSeconds: 45,
      question:
        "Can you draw a circle in the air with your finger? Good! Now tell me one thing you would draw that has a circle shape, like the sun.",
      rubric:
        "P1 competence: Draw shapes and identify objects with those shapes. Learner should produce the shape in the air and name a real-world object.",
      keyPoints: [
        "Draws or traces a circle shape",
        "Names a real object that is round",
      ],
      sampleAnswer: "The sun is a circle.",
    },
    {
      id: "q8-colouring",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "If you are drawing a banana, what colour should you use?",
      options: [
        { id: "a", label: "Yellow" },
        { id: "b", label: "Blue" },
        { id: "c", label: "Black" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Bananas are yellow. P1 learners practise colouring objects using the correct colours (Theme 2, 8).",
    },
    {
      id: "q9-drawing",
      type: "open",
      timeLimitSeconds: 60,
      question:
        "Tell me what you like to draw. What is your favourite thing to draw at school?",
      rubric:
        "P1 competence: Draw familiar objects and scenes. Learner should name something they enjoy drawing and describe it briefly.",
      keyPoints: [
        "Names a subject they like to draw",
        "Provides at least one detail (colour, shape, size)",
      ],
      sampleAnswer: "I like to draw a house. I colour the roof red and the walls brown.",
    },

    // ── SECTION 5: MODELLING AND CRAFTS ───────────────
    {
      id: "q10-modelling-material",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "What material can we use to model a pot, a ball, or an animal in art class?",
      options: [
        { id: "a", label: "Clay" },
        { id: "b", label: "Paper alone" },
        { id: "c", label: "A stone" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Clay is moist and can be shaped into pots, balls, animals and other objects. P1 learners model items from locally available materials (Themes 2, 8, 10).",
    },
    {
      id: "q11-printing",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question:
        "In class, we can print pictures using a potato cut in half and dipped in paint. What else can we use to print?",
      options: [
        { id: "a", label: "A banana fibre stalk or a leaf" },
        { id: "b", label: "A pencil only" },
        { id: "c", label: "A stone" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Banana fibre stalks and leaves can be used for printing patterns. P1 learners explore printing with natural objects (Theme 8).",
    },
    {
      id: "q12-making-toys",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Tell me one thing you can make with your hands during craft time. For example, a ball from paper, a doll from banana fibre, or a necklace from beads.",
      rubric:
        "P1 competence: Make play items from locally available materials. Learner should name a craft item they have made or can make.",
      keyPoints: [
        "Names a craft item",
        "Refers to materials they can use",
      ],
      sampleAnswer: "I can make a shaker from a plastic bottle and seeds.",
    },
  ],
};