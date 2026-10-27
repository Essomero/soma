import type { TestContent } from "@/types";

export const p1EnglishTest: TestContent = {
  slug: "p1-english",
  title: "P1 English: Greetings, Naming and Conversation",
  description:
    "A friendly oral exercise for Primary 1 learners covering the English strand of the Uganda National Primary Curriculum. This strand focuses on English as a subject (not medium of instruction), building vocabulary, simple sentence structures, greetings, describing people and things, asking and answering questions, and carrying out simple commands. Material is drawn from all 12 themes.",
  category: "P1 Assessment",
  subcategory: "English // Oral",
  format: "oral",
  oralConfig: {
    voice: "am_michael",
    provider: "kokoro",
    examinerName: "Teacher Michael",
    examinerTitle: "Primary 1 Examiner",
    welcomeMessage:
      "Hello! I am Teacher Michael. Welcome to your English exercise. We are going to practise greeting people, naming things, asking questions, and talking about our day. Listen carefully to each question and then tell me your answer. You can take your time. Are you ready? Let us begin!",
  },
  image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=1200&h=675&fit=crop",
  imageAlt: "Children in a classroom raising their hands to answer a question",
  author: {
    name: "Teacher Michael",
    handle: "@teacher-michael",
  },
  date: "October 2026",
  tags: ["P1", "Primary School", "Uganda", "Oral Assessment", "English", "Vocabulary", "Communication"],
  topics: ["education"],
  estimatedMinutes: 15,
  defaultTimeLimitSeconds: 30,
  passingScore: 70,
  sources: [
    {
      type: "markdown",
      title: "Curriculum Reference: English Strand (P1)",
      content: `# P1 English (5 periods per week)

English is taught as a subject in non-English-medium schools. Key vocabulary and structures across the 12 themes:

**Theme 1 (Our School):**
Vocabulary: Good morning, Sir, Madam, teacher, nurse, Mr., Miss
Structures: "What's your name?" "My name is ..." "I am a boy/girl"

**Theme 2 (Our Home):**
Vocabulary: mother, father, sister, brother, baby, girl, boy, cook, milk, wash
Structures: "This is my ..." "Show me a ..." "What is this/that?"

**Theme 3 (Our Community):**
Vocabulary: doctor, nurse, teacher, shopkeeper, fisherman, farmer
Structures: "Who is he/she?" "He/She is a ..." "Point to ..." "I am pointing to ..."

**Theme 4 (The Human Body & Health):**
Vocabulary: head, hand, shoulders, knees, eyes, ears, mouth, teeth, soap, water, towel
Structures: "Show me your ..." "How many ... have you?" "Are you well?" "I am well"

**Theme 5 (Weather):**
Vocabulary: sun, rain, wind, cloud, hot, cold, rainy, sunny, umbrella, jacket
Structures: "Is it raining?" "Yes, it is" "What is the weather like?" "It is ..."

**Theme 6 (Accidents & Safety):**
Vocabulary: sharp, cut, burn, knife, fire, fall, hurt, careful, danger
Structures: "Don't play with ..." "Be careful with ..." "Are you hurt?"

**Theme 7 (Living Together):**
Vocabulary: grandmother, grandfather, uncle, aunt, share, help, care, play, work
Structures: "This is our ..." "What are you doing?" "I am ...ing"

**Theme 8 (Food & Nutrition):**
Vocabulary: fish, bananas, potatoes, millet, beans, eggs, market, garden
Structures: "Do you like ...?" "Yes, I do" "We get ... from ..."

**Theme 9 (Transport):**
Vocabulary: car, bus, lorry, bicycle, boat, train, road, water, air
Structures: "What is this?" "This is a ..." "Where is the ...?" "It is ..."

**Theme 10 (Things We Make):**
Vocabulary: mat, pot, basket, ball, rope, in, on, under, make, use
Structures: "What do you use to make ...?" "I use ... to make ..." "What colour is ...?"

**Theme 11 (Our Environment):**
Vocabulary: tree, river, hill, animal, bird, plant, flower, grass
Structures: "Show me a ..." "How many ... are there?" "There are ..."

**Theme 12 (Peace & Security):**
Vocabulary: friend, share, help, fight, peace, police, obey, rules
Structures: "Who is your friend?" "He/She is my friend." "I like" "I don't like"`,
    },
    {
      type: "link",
      title: "Uganda National Primary Curriculum — P1",
      url: "https://www.ncdc.go.ug",
      description: "Official curriculum from the National Curriculum Development Centre",
    },
  ],
  questions: [
    // ── SECTION 1: GREETINGS AND INTRODUCTIONS ────────
    {
      id: "q1-greeting",
      type: "open",
      timeLimitSeconds: 25,
      question:
        "In the afternoon, how do you greet your teacher?",
      rubric:
        "P1 English competence: Use appropriate greetings. Learner should produce 'Good afternoon' or another polite afternoon greeting.",
      keyPoints: [
        "Uses 'Good afternoon'",
        "Addresses the teacher appropriately",
      ],
      sampleAnswer: "Good afternoon, Teacher.",
    },
    {
      id: "q2-introduce-friend",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Introduce your friend to me. Say: 'This is my friend ...' and then say if they are a boy or a girl.",
      rubric:
        "P1 English competence: Use 'This is my ...' and 'He/She is a ...' to introduce others. Learner should produce both structures.",
      keyPoints: [
        "Uses 'This is my ...'",
        "States the friend's name",
        "Uses 'he is a boy' or 'she is a girl'",
      ],
      sampleAnswer: "This is my friend Musa. He is a boy.",
    },

    // ── SECTION 2: NAMING PEOPLE AND THINGS ───────────
    {
      id: "q3-naming-people",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Who looks after sick people at the hospital?",
      options: [
        { id: "a", label: "A nurse" },
        { id: "b", label: "A carpenter" },
        { id: "c", label: "A shopkeeper" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "A nurse looks after sick people. P1 learners name people in the community by their titles and roles (Theme 3).",
    },
    {
      id: "q4-naming-things",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Name the part of your body that you use to see. What is it?",
      options: [
        { id: "a", label: "Eyes" },
        { id: "b", label: "Ears" },
        { id: "c", label: "Hands" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "You use your eyes to see. P1 learners name at least 5 body parts and their uses (Theme 4).",
    },
    {
      id: "q5-naming-weather",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "What is the weather like when the sun is shining and there are no clouds?",
      options: [
        { id: "a", label: "It is sunny." },
        { id: "b", label: "It is rainy." },
        { id: "c", label: "It is windy." },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Sunny weather has a bright sun and few clouds. P1 learners name and describe four types of weather (Theme 5).",
    },

    // ── SECTION 3: QUESTIONS AND ANSWERS ──────────────
    {
      id: "q6-answer-question",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "If I ask you 'What is your name?', what do you say?",
      options: [
        { id: "a", label: "My name is ..." },
        { id: "b", label: "Good morning." },
        { id: "c", label: "I am five years old." },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "'What is your name?' is answered with 'My name is ...' P1 learners respond to questions with appropriate personal answers (Theme 1).",
    },
    {
      id: "q7-food-likes",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Do you like bananas? If you like them, what do you say?",
      options: [
        { id: "a", label: "Yes, I do." },
        { id: "b", label: "I am a boy." },
        { id: "c", label: "I am five." },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "'Do you like...?' is answered with 'Yes, I do' or 'No, I don't.' P1 learners answer simple questions about food they enjoy (Theme 8).",
    },
    {
      id: "q8-ask-question",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Now you ask ME a question! Use 'What is this?' and point to something in the room.",
      rubric:
        "P1 competence: Ask a question using learnt structures. Learner should produce a grammatically correct question using 'What is this/that?'",
      keyPoints: [
        "Uses 'What is this?' or 'What is that?'",
        "Points to an object",
        "Question is grammatically complete",
      ],
      sampleAnswer: "What is this? (pointing to a book)",
    },

    // ── SECTION 4: COMMANDS AND ACTIONS ───────────────
    {
      id: "q9-command-body",
      type: "multiple-choice",
      timeLimitSeconds: 20,
      question:
        "If the teacher says 'Show me your ears', what do you do?",
      options: [
        { id: "a", label: "Point to my ears" },
        { id: "b", label: "Point to my mouth" },
        { id: "c", label: "Clap my hands" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "'Show me your ears' means point to or touch your ears. P1 learners respond to classroom commands with correct actions (Theme 4).",
    },
    {
      id: "q10-command-activity",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "What does the teacher mean when she says 'Sweep the floor'?",
      options: [
        { id: "a", label: "I sweep the floor with a broom" },
        { id: "b", label: "I sweep the bed" },
        { id: "c", label: "I jump up and down" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "'Sweep the floor' means clean the floor with a broom. P1 learners name home and school activities (Themes 1 and 2).",
    },

    // ── SECTION 5: EVERYDAY CONVERSATION ──────────────
    {
      id: "q11-daily-activity",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "Tell me one thing you do every day at school. Use the words 'I ... every day.' For example: 'I read every day.'",
      rubric:
        "P1 English competence: Use 'I ... every day' structure to describe a routine. Learner should produce a grammatically correct sentence.",
      keyPoints: [
        "Uses 'I ... every day'",
        "Names a school-appropriate activity",
        "Sentence is complete",
      ],
      sampleAnswer: "I play every day.",
    },
    {
      id: "q12-prepositions",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Where is the ball? 'The ball is under the bed.' Where is the ball?",
      options: [
        { id: "a", label: "Under the bed" },
        { id: "b", label: "On the bed" },
        { id: "c", label: "In the bed" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Under means below or beneath. P1 learners use simple prepositions of place: in, on, under (Theme 10).",
    },
    {
      id: "q13-who-is-your-friend",
      type: "open",
      timeLimitSeconds: 30,
      question:
        "Who is your friend? Tell me, using '... is my friend.'",
      rubric:
        "P1 English competence: Use possessive 'my' with family/friend nouns. Learner should produce a sentence naming a friend.",
      keyPoints: [
        "Names a person",
        "Uses '... is my friend'",
      ],
      sampleAnswer: "Sarah is my friend.",
    },
  ],
};