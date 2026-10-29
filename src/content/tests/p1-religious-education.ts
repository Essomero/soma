import type { TestContent } from "@/types";

export const p1ReligiousEducationTest: TestContent = {
  slug: "p1-religious-education",
  title: "P1 Religious Education: CRE and IRE",
  description:
    "A friendly oral exercise for Primary 1 learners covering the Religious Education strand of the Uganda National Primary Curriculum. RE has two tracks: Christian Religious Education (CRE) and Islamic Religious Education (IRE). Schools follow the track that matches the learners' faith. This exercise contains both parts; the teacher or examiner should administer only the part that matches the learner's religious education track.",
  category: "P1 Assessment",
  subcategory: "Values Education // Oral",
  format: "oral",
  oralConfig: {
    voice: "am_michael",
    provider: "kokoro",
    examinerName: "Teacher Michael",
    examinerTitle: "Primary 1 Examiner",
    welcomeMessage:
      "Hello! I am Teacher Michael. Welcome to your Religious Education exercise. I am going to ask you a few questions about God, family, prayer, and how we care for each other. Listen to each question and answer in your own words. Take your time. There are no wrong answers, only chances to show what you know. Are you ready? Let us begin!",
  },
  image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&h=675&fit=crop",
  imageAlt: "A sunrise over green hills and a lake, symbolising creation and the beauty of the natural world",
  author: {
    name: "Teacher Michael",
    handle: "@teacher-michael",
  },
  publishedAt: "2026-10-01T00:00:00Z",
  tags: ["P1", "Primary School", "Uganda", "Oral Assessment", "Religious Education", "CRE", "IRE", "Values"],
  topics: ["education"],
  estimatedMinutes: 10,
  defaultTimeLimitSeconds: 30,
  passingScore: 70,
  sources: [
    {
      type: "markdown",
      title: "Curriculum Reference: Religious Education Strand (P1)",
      content: `# P1 Religious Education (3 periods per week)

RE is a separate strand not included in the 12 thematic themes. Schools follow either CRE or IRE.

**Christian Religious Education (CRE):** Theme: "Discovering God's Gift to Me"
- Term 1: Who am I, names and meaning, our bodies as God's gift (Psalm 139), people at school and visitors, people at home, God's creation (Genesis 1), things we make
- Term 2: The world God made (fire, water, animals, birds, soil, plants, stars); caring for creation; Jesus' home and childhood; Jesus' family and followers; Jesus' teaching on serving others; prayer
- Term 3: God's family with Jesus our friend; resurrection; concern for sharing; interpersonal relationships in the home; trust and forgiveness; Christmas: birth of Jesus

**Islamic Religious Education (IRE):**
- Term 1: Salaam; Surat Al-Fatiha; Tawhiid (faith); Fiqh (ablution); Duas (before bed, waking, meals, parents); respect for parents, teachers, leaders; Prophet Muhammad's life
- Term 2: Surat Al-Ikhlas; attributes of Allah; pillars of Imaan; respect in different societies; Muhammad as a youth
- Term 3: Surat Annas; oneness of Allah; Shahada; Tayammum (dry ablution); cleanliness of body, clothes, places; Muhammad's trip to Syria`,
    },
    {
      type: "link",
      title: "Uganda National Primary Curriculum — P1",
      url: "https://www.ncdc.go.ug",
      description: "Official curriculum from the National Curriculum Development Centre",
    },
  ],
  questions: [
    // ══════════════════════════════════════════════════
    // PART 1: CHRISTIAN RELIGIOUS EDUCATION
    // ══════════════════════════════════════════════════
    {
      id: "cre-q1-name",
      type: "open",
      timeLimitSeconds: 30,
      question:
        "CRE Part: Tell me your name. Do you know what your name means?",
      rubric:
        "CRE competence: Tell his/her name and give its meaning (if known). Learner should produce their full name and may attempt a meaning.",
      keyPoints: [
        "States their full name clearly",
        "May attempt to explain what the name means",
      ],
      sampleAnswer: "My name is Sarah, and it means princess.",
    },
    {
      id: "cre-q2-body",
      type: "open",
      timeLimitSeconds: 35,
      question:
        "God gave you a body. Tell me one part of your body and what you use it for. For example, 'I use my eyes to see.'",
      rubric:
        "CRE competence: Tell uses of the parts of the body as a gift from God. Learner should name a body part and its function (Theme: Discovering God's Gift to Me, Week 2-4).",
      keyPoints: [
        "Names a body part",
        "Describes its use",
        "Recognises the body as a gift",
      ],
      sampleAnswer: "I use my ears to hear my mother calling.",
    },
    {
      id: "cre-q3-creation",
      type: "open",
      timeLimitSeconds: 35,
      question:
        "Name one thing God created that you can see outside. For example, the sun, trees, water, birds, or animals.",
      rubric:
        "CRE competence: Name things in God's creation and mention how they help us. Learner should produce at least one item from creation and describe its value (Genesis 1, Psalm 104).",
      keyPoints: [
        "Names a part of creation",
        "Explains how it helps people",
      ],
      sampleAnswer: "God made the sun. It gives us light and warmth.",
    },
    {
      id: "cre-q4-jesus",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "In the Bible, Jesus helped many people. Who did Jesus help?",
      options: [
        { id: "a", label: "Sick people, children, and those in need" },
        { id: "b", label: "Only the rich" },
        { id: "c", label: "Nobody" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Jesus helped all kinds of people, especially the sick, children, and those in need. CRE learners learn about Jesus' ministry and service (Term 2 and 3).",
    },
    {
      id: "cre-q5-prayer",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "When do we pray to God?",
      options: [
        { id: "a", label: "Every day, in the morning and at night" },
        { id: "b", label: "Only on Sunday" },
        { id: "c", label: "Never" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "We can pray every day. Jesus taught his followers to pray and gave them an example (The Lord's Prayer). Learners practise prayer in their daily lives (CRE Term 2, Week 7-9).",
    },
    {
      id: "cre-q6-christmas",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "What special event do we remember at Christmas?",
      options: [
        { id: "a", label: "The birth of Jesus" },
        { id: "b", label: "The harvest season" },
        { id: "c", label: "School closing" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Christmas celebrates the birth of Jesus in Bethlehem. Learners narrate the events of Jesus' birth (Luke 1 and 2) as part of Term 3.",
    },
    {
      id: "cre-q7-caring",
      type: "open",
      timeLimitSeconds: 40,
      question:
        "How can you show love and care for a baby in your family? Tell me one way you can help.",
      rubric:
        "CRE competence: Talk about ways to love and care for others. Learner should describe a caring action toward a baby or younger child.",
      keyPoints: [
        "Names a caring action",
        "Shows understanding of responsibility",
        "Reflects love and care",
      ],
      sampleAnswer: "I can sing a lullaby to help the baby sleep, or I can fetch water for the baby's bath.",
    },

    // ══════════════════════════════════════════════════
    // PART 2: ISLAMIC RELIGIOUS EDUCATION
    // ══════════════════════════════════════════════════
    {
      id: "ire-q1-salaam",
      type: "multiple-choice",
      timeLimitSeconds: 20,
      question:
        "IRE Part: How do Muslims greet one another?",
      options: [
        { id: "a", label: "Assalamu alaikum" },
        { id: "b", label: "Good morning" },
        { id: "c", label: "Hello" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "The Islamic greeting 'Assalamu alaikum' means 'Peace be upon you.' IRE learners practise saying salaam and understand its meaning (IRE Term 1).",
    },
    {
      id: "ire-q2-worship",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Where do Muslims go to worship and pray together?",
      options: [
        { id: "a", label: "At the mosque" },
        { id: "b", label: "At the market" },
        { id: "c", label: "At the school dining hall" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "The mosque is the place of worship for Muslims. IRE learners name places of worship (Term 1, Theme 2).",
    },
    {
      id: "ire-q3-ablution",
      type: "multiple-choice",
      timeLimitSeconds: 30,
      question:
        "Before prayer, Muslims wash their hands, face, arms and feet. What is this washing called?",
      options: [
        { id: "a", label: "Ablution (wudhu)" },
        { id: "b", label: "Eating" },
        { id: "c", label: "Playing" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Ablution (wudhu) is the special washing before prayer. IRE learners demonstrate and explain the importance of ablution (Term 1, Theme 3).",
    },
    {
      id: "ire-q4-dua",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Before you eat a meal, what should a Muslim child say?",
      options: [
        { id: "a", label: "A prayer (dua) thanking Allah" },
        { id: "b", label: "Goodbye" },
        { id: "c", label: "Nothing at all" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Muslim children recite Duas (prayers) before and after meals. IRE learners recite Duas for different occasions (Term 1, Theme 4).",
    },
    {
      id: "ire-q5-respect",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Who should we show respect to according to Islamic teaching?",
      options: [
        { id: "a", label: "Parents, teachers, leaders and elders" },
        { id: "b", label: "Only visitors" },
        { id: "c", label: "Nobody" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Islam teaches respect for parents, teachers, leaders, and elders. IRE learners identify these categories and show respect in daily life (Term 1, Theme 4 and Term 2, Theme 7).",
    },
    {
      id: "ire-q6-cleanliness",
      type: "multiple-choice",
      timeLimitSeconds: 25,
      question:
        "Why is it important to keep our body, clothes, and surroundings clean in Islam?",
      options: [
        { id: "a", label: "To be healthy and ready for prayer" },
        { id: "b", label: "Only to look nice" },
        { id: "c", label: "It does not matter" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "Cleanliness is important for health and for being ready for prayer. IRE learners learn about the importance of cleanliness of the body, clothes, and places of prayer (Term 3, Theme 12).",
    },
    {
      id: "ire-q7-quran",
      type: "multiple-choice",
      timeLimitSeconds: 20,
      question:
        "Which holy book do Muslims read and recite?",
      options: [
        { id: "a", label: "The Quran" },
        { id: "b", label: "A story book" },
        { id: "c", label: "A newspaper" },
      ],
      allowMultiple: false,
      correctOptionIds: ["a"],
      explanation:
        "The Quran is the holy book of Islam. IRE learners recite Surat Al-Fatiha, Al-Ikhlas, and Annas throughout the year (Terms 1-3).",
    },
  ],
};