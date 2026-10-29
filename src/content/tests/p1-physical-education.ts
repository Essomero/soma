import type { TestContent } from "@/types";

export const p1PhysicalEducationTest: TestContent = {
  slug: "p1-physical-education",
  title: "P1 Physical Education Check: Moving and Playing",
  description:
    "A friendly oral and practical check for Primary 1 learners covering the Physical Education strand of the Uganda National Primary Curriculum. PE is a separate strand within the Thematic Curriculum, covering basic movement experiences, space awareness, traditional games, and simple games for lower primary. The check covers competences from all three terms.",
  category: "P1 Assessment",
  subcategory: "Physical Education // Practical",
  format: "oral",
  oralConfig: {
    voice: "am_michael",
    provider: "kokoro",
    examinerName: "Teacher Michael",
    examinerTitle: "Primary 1 Examiner",
    welcomeMessage:
      "Hello! I am Teacher Michael. Welcome to your Physical Education Check. PE is about moving, playing games, and staying healthy. I am going to ask you questions about how we walk, run, jump, balance, play games, and follow rules. Listen carefully to each question. Show me what you can do if I ask you to move. Are you ready? Let us begin!",
  },
  image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&h=675&fit=crop",
  imageAlt: "Children running and kicking a ball in a green open field",
  author: {
    name: "Teacher Michael",
    handle: "@teacher-michael",
  },
  publishedAt: "2026-10-01T00:00:00Z",
  tags: ["P1", "Primary School", "Uganda", "Oral Assessment", "Physical Education", "Games", "Movement"],
  topics: ["education"],
  estimatedMinutes: 12,
  defaultTimeLimitSeconds: 30,
  passingScore: 70,
  sources: [
    {
      type: "markdown",
      title: "Curriculum Reference: Physical Education Strand (P1)",
      content: `# P1 Physical Education (5 periods per week)

PE is a separate strand taught across three terms:

**Term 1:**
- Orientation: play areas, dressing for PE, play resources
- Traditional imitational games: running formations, walking activities, jumping on/off/over, dancing to rhythm, twisting waist/wrists, individual and pair activities, walking/running and dodging
- Body movement and space awareness: walking, running patterns, hopping, pulling/pushing partners, bending/stretching, throwing/catching large objects, kicking
- Traditional imitational movements: animal, work, natural happenings movements
- Simple games: reaction, imitation, running/chasing, cooperative; identifying winners/losers, following rules

**Term 2:**
- Imitational movements: crawling, creeping, lifting/carrying objects, walking/running, balancing with support, rolling sideways, climbing objects up to 2m, following instructions
- Movement experiences: jumping off/on/over objects, running in patterns, skipping rope, hopping freely
- Games for lower primary: hopping, jumping, stamping rhythmically, running patterns, following rules, creative play
- Imitational games: animal movements (snake, cow, cat, chameleon, giraffe, caterpillar)

**Term 3:**
- Movement and space: pushing/pulling objects, bending/stretching body parts, sliding (sideways/forward/backward), following instructions
- Games for lower primary: bouncing balls, running with varied speed/distance, balancing on body parts, throwing light and large objects, aiming at targets
- Imitational movements: pushing/pulling, throwing/catching, jumping, lifting age-appropriate objects, timing movements
- Games: performing skills, identifying winner/loser, following rules, moving enthusiastically`,
    },
    {
      type: "link",
      title: "Uganda National Primary Curriculum — P1",
      url: "https://www.ncdc.go.ug",
      description: "Official curriculum from the National Curriculum Development Centre",
    },
  ],
  questions: [
    // ── SECTION 1: MOVEMENT BASICS ────────────────────
    {
      id: "q1-walk-line",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Show me how we walk in a line when we go to the play area for PE. Walk a few steps in a straight line in front of me.",
      rubric:
        "P1 competence: Walk in a line with control. Learner should demonstrate walking one foot in front of the other in a reasonably straight path.",
      keyPoints: [
        "Walks in a reasonably straight line",
        "Shows balance and control",
        "Arms may be used for balance",
      ],
      sampleAnswer: "Walks 4-5 steps in a straight line with steady balance.",
    },
    {
      id: "q2-jump",
      type: "multiple-choice",
      timeLimitSeconds: 20,
      question:
        "When we jump, which part of our body do we use the most?",
      options: [
        { id: "a", label: "Our legs" },
        { id: "b", label: "Our arms" },
        { id: "c", label: "Our head" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Jumping uses our legs to push off the ground and land. P1 learners jump off, on, and over objects (Themes 1-3, PE Terms 1-3).",
    },
    {
      id: "q3-running",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "In a running game, where should you look while you run to stay safe?",
      options: [
        { id: "a", label: "Ahead, to see where I am going" },
        { id: "b", label: "At the sky" },
        { id: "c", label: "At my feet the whole time" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Looking ahead helps you see other children and obstacles. P1 learners run in given patterns while staying aware of others.",
    },

    // ── SECTION 2: BALANCE AND ROLLING ────────────────
    {
      id: "q4-balance",
      type: "open",
      timeLimitSeconds: 35,
      question:
        "Can you stand on one leg and count to five without putting your other foot down? Ready? Try it.",
      rubric:
        "P1 competence: Balance with support or independently. Learner should hold a single-leg stance for at least 3 seconds.",
      keyPoints: [
        "Lifts one foot off the ground",
        "Holds balance for 3-5 seconds",
        "Uses arms for balance if needed",
      ],
      sampleAnswer: "Stands on left leg, lifts right foot, holds steady to a count of five.",
    },
    {
      id: "q5-roll",
      type: "multiple-choice",
      timeLimitSeconds: 20,
      question:
        "When we roll sideways in PE, which direction do we move?",
      options: [
        { id: "a", label: "Sideways, like a log" },
        { id: "b", label: "Forward in a straight line" },
        { id: "c", label: "Backwards" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Sideways rolling means moving across the ground like a log. P1 learners roll sideways (Terms 2 and 3).",
    },

    // ── SECTION 3: THROWING, CATCHING AND KICKING ─────
    {
      id: "q6-throw-catch",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Which of these is safe to throw and catch in PE class?",
      options: [
        { id: "a", label: "A large soft ball or teddy bear" },
        { id: "b", label: "A heavy stone" },
        { id: "c", label: "A sharp stick" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Large soft objects are safe for throwing and catching. P1 learners throw and catch large floppy objects like a teddy bear (Term 1).",
    },
    {
      id: "q7-kick",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "In the kicking game, which part of your foot do you use to kick the ball softly?",
      options: [
        { id: "a", label: "The inside of my foot" },
        { id: "b", label: "My heel" },
        { id: "c", label: "My toe pointed straight" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Kicking softly with the inside of the foot gives control. P1 learners kick large soft objects (Term 1).",
    },

    // ── SECTION 4: IMITATION GAMES ────────────────────
    {
      id: "q8-imitate-animal",
      type: "open",
      timeLimitSeconds: 45,
      question:
        "Pretend to be an animal. Choose one: a snake, a cat, a cow, a chameleon, or a caterpillar. Show me how that animal moves.",
      rubric:
        "P1 competence: Imitate animal movement. Learner should produce recognisable movements that match the chosen animal's characteristic motion.",
      keyPoints: [
        "Chooses an animal",
        "Movement resembles the animal",
        "Shows creativity and engagement",
      ],
      sampleAnswer: "Crawls on the floor wiggling like a snake, or crawls slowly with humps like a caterpillar.",
    },
    {
      id: "q9-imitate-work",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "In the imitation game, we pretend to do work activities. If you are pretending to sweep, what movement do you make?",
      options: [
        { id: "a", label: "Moving my arms back and forth like holding a broom" },
        { id: "b", label: "Jumping up and down" },
        { id: "c", label: "Sitting still" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Sweeping uses a back-and-forth arm movement. P1 learners show work, animal, and natural happenings movements in imitation games.",
    },

    // ── SECTION 5: FOLLOWING RULES AND PLAYING TOGETHER ─
    {
      id: "q10-follow-rules",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "When the teacher blows a whistle during a game, what do you do?",
      options: [
        { id: "a", label: "Stop and listen carefully" },
        { id: "b", label: "Keep running fast" },
        { id: "c", label: "Hide behind a tree" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "A whistle means stop and listen. P1 learners listen to and follow the rules of the game.",
    },
    {
      id: "q11-winner",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "After a race, one child wins. What should everyone do?",
      options: [
        { id: "a", label: "Cheer for the winner and shake hands" },
        { id: "b", label: "Ignore the winner" },
        { id: "c", label: "Feel angry and leave" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Good sportsmanship means congratulating the winner. P1 learners identify the winner and the loser and move enthusiastically while respecting both (PE Term 1).",
    },
    {
      id: "q12-sharing",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "There is one ball and many children want to play. What is the right thing to do?",
      options: [
        { id: "a", label: "Take turns playing with the ball" },
        { id: "b", label: "Take the ball and run away" },
        { id: "c", label: "Push other children away" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Taking turns is sharing. P1 learners share play materials and equipment in PE (Term 1 orientation and games).",
    },
  ],
};