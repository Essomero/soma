import type { TestContent } from "@/types";

export const p1SchoolAndHomeTest: TestContent = {
  slug: "p1-school-and-home",
  title: "Paper 1: School and Home",
  description:
    "A written examination on the relationship between formal schooling and home-based learning. Answer all questions on the printed paper within the time allowed.",
  category: "Education",
  subcategory: "Foundations of Learning",
  format: "written",
  image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=675&fit=crop",
  imageAlt: "Stack of books on a wooden desk beside a window with natural light",
  author: {
    name: "Benjamin Mayanja",
    handle: "@Essomero",
  },
  date: "October 2026",
  tags: ["Education", "School", "Home Learning", "Pedagogy", "Reading Comprehension"],
  topics: ["philosophy"],
  storySlug: "prophet-3-on-children",
  estimatedMinutes: 45,
  defaultTimeLimitSeconds: 60,
  passingScore: 70,
  sources: [
    {
      type: "story",
      storySlug: "prophet-3-on-children",
      title: "On Children",
      description: "Kahlil Gibran's prose poem on the relationship between parent and child, and what it means to raise a learner.",
    },
    {
      type: "markdown",
      title: "Reading Passage: The School at Home",
      description: "A passage on the evolving boundary between formal schooling and home-based learning.",
      content: `### The School at Home

The boundary between school and home has never been a wall. It is a garden gate.

For most of history, the home was the first classroom. Children learned language at the kitchen table, numbers from the market, and craft from parents who worked beside them. School, when it arrived, was a supplement not a replacement. It taught what the home could not: history from a stranger, chemistry in a shared lab, the discipline of a fixed schedule among peers.

In the past century, that relationship inverted. School became primary. Home became the place where homework happened and report cards were signed. Parents were cast as assistants to the school's curriculum, not partners in a shared project. The garden gate became a delivery window.

A growing body of evidence suggests this inversion was a mistake. Children whose home environment actively reinforces what school teaches retain information longer, develop stronger metacognitive habits, and report higher academic confidence. The mechanism is not tutoring or enrichment. It is the signal that learning does not switch off at the school gate. When a child sees a parent read for pleasure, discuss ideas, or admit ignorance and look up an answer, the child internalizes that school is not the source of knowledge but one room in a larger house.

The effective home does not mirror the school. It complements it. School provides sequence and standards; home provides depth and permission to wander. A child who studies the water cycle at school and then helps fix a leaky faucet at home does not learn the water cycle twice. They learn that the water cycle has a shape beyond the textbook diagram.

This is hard for parents who were raised on the inverted model. They feel underqualified to teach and overeager to outsource. But the home's job is not to teach. It is to make learning visible as a normal, unfinished, adult activity. That requires no lesson plan. It requires only that the adult does not hide their own confusion.

The garden gate swings both ways. What a child learns at home determines whether what they learn at school takes root.`,
    },
    {
      type: "markdown",
      title: "Key Vocabulary",
      description: "Terms used in the examination passage.",
      content: `**metacognitive:** awareness and understanding of one's own thought processes.
**pedagogy:** the method and practice of teaching.
**inversion:** a reversal of normal order or position.
**supplement:** something added to complete or enhance.
**internalize:** to make an attitude or behaviour part of one's nature.`,
    },
  ],

  questions: [
    {
      id: "q1",
      type: "multiple-choice",
      question:
        "According to the passage, what was the historical relationship between school and home?",
      timeLimitSeconds: 30,
      options: [
        {
          id: "a",
          label: "School and home were entirely separate, with no overlap in a child's education.",
        },
        {
          id: "b",
          label: "Home was the primary classroom and school was a supplement that taught what home could not.",
        },
        {
          id: "c",
          label: "School replaced home education entirely once formal schooling arrived.",
        },
        {
          id: "d",
          label: "Home and school taught the exact same subjects in the same way.",
        },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        "The passage states that 'home was the first classroom' and school 'was a supplement not a replacement' teaching what home could not.",
    },
    {
      id: "q2",
      type: "multiple-choice",
      question:
        'The passage describes the current relationship between school and home as "inverted." What does this mean?',
      timeLimitSeconds: 30,
      options: [
        {
          id: "a",
          label: "Children now learn more at home than at school.",
        },
        {
          id: "b",
          label: "Parents are now the main teachers and schools play a supporting role.",
        },
        {
          id: "c",
          label: "School became the primary educator and home was reduced to a supporting role.",
        },
        {
          id: "d",
          label: "Schools now teach subjects that used to be taught only at home.",
        },
      ],
      allowMultiple: false,
      correctOptionIds: ["c"],
      explanation:
        "The passage says school became primary and home became 'the place where homework happened and report cards were signed' and parents were 'assistants to the school's curriculum.'",
    },
    {
      id: "q3",
      type: "open",
      question:
        'Explain the metaphor "The garden gate swings both ways" as used in the final paragraph of the passage. What does it reveal about the relationship between school and home?',
      description: "Write a short paragraph explaining the metaphor and its significance.",
      timeLimitSeconds: 90,
      placeholder:
        "Analyse the metaphor: what does the garden gate represent? What does swinging both ways imply about the flow of learning?",
      rubric:
        "The candidate must explain: (1) The garden gate represents the boundary between school and home. (2) 'Swings both ways' means influence and reinforcement flow in both directions, not just from school to home. (3) Learning at home determines whether school learning 'takes root,' so the gate is a two-way connection, not a one-way delivery system.",
      keyPoints: [
        "Gate as boundary between school and home",
        "Two-way influence: both directions matter",
        "Home learning enables school learning to take root",
      ],
      sampleAnswer:
        'The garden gate is the boundary between school and home. Saying it "swings both ways" means the relationship is reciprocal. School sends assignments and standards home, but what happens at home whether a child sees adults reading, discussing, and asking questions determines whether formal schooling sinks in. The gate is not a one-way delivery hatch from school to home. It is a shared passage where both sides shape the child\'s learning.',
    },
    {
      id: "q4",
      type: "multiple-choice",
      question:
        "According to the passage, what is the most important thing a parent can do to support their child's education at home?",
      timeLimitSeconds: 30,
      options: [
        {
          id: "a",
          label: "Hire a tutor to reinforce school lessons.",
        },
        {
          id: "b",
          label: "Make learning visible as a normal, unfinished, adult activity.",
        },
        {
          id: "c",
          label: "Create a strict homework schedule that mirrors the school day.",
        },
        {
          id: "d",
          label: "Purchase educational materials that match the school curriculum.",
        },
      ],
      allowMultiple: false,
      correctOptionIds: ["b"],
      explanation:
        'The passage states: "the home\'s job is not to teach. It is to make learning visible as a normal, unfinished, adult activity."',
    },
    {
      id: "q5",
      type: "open",
      question:
        "The passage says: 'School provides sequence and standards; home provides depth and permission to wander.' Do you agree with this division of roles? Write a short argument supporting your position, referring to specific claims from the passage.",
      description: "Construct a short argumentative response (2-3 paragraphs).",
      timeLimitSeconds: 120,
      placeholder:
        "State your position clearly. Reference the passage: the water cycle example, the garden gate metaphor, the evidence about metacognitive habits. Explain why you agree or disagree with the division.",
      rubric:
        "The candidate must: (1) State a clear position (agree or disagree). (2) Reference at least two specific claims from the passage (water cycle example, garden gate metaphor, metacognition evidence, adult confusion as a teaching tool). (3) Explain their reasoning beyond simple agreement. A stronger answer acknowledges a counterargument or nuance.",
      keyPoints: [
        "Clear position stated",
        "At least two passage references",
        "Reasoned argument beyond agreement",
        "Nuance or counterargument acknowledged",
      ],
      sampleAnswer:
        "I agree with the division. The passage's water cycle example is convincing: a child who studies evaporation at school and then helps fix a faucet at home does not just reinforce the fact. They understand that the water cycle operates in real plumbing, not only in diagrams. School cannot provide that depth because it cannot replicate every home's specific context.\n\nAt the same time, the division does not mean parents should simply let children wander without direction. Permission to wander only works when there is a sequence to return to. The passage acknowledges this by saying school provides 'sequence and standards.' A child who wanders too far without returning to a structured curriculum may develop curiosity without competence.\n\nThe strongest implication of the passage is that the division is not a fixed line but a negotiated boundary. The garden gate swings both ways. Some children need more structure at home, and some need more freedom at school. The principle is right, but the proportions depend on the child.",
    },
    {
      id: "q6",
      type: "open",
      question:
        'In "On Children," Kahlil Gibran writes: "Your children are not your children. They are the sons and daughters of Life\'s longing for itself." How does this idea connect to the passage\'s argument about the role of the home in education?',
      description: "Connect Gibran's poem to the passage in a short essay (2-3 paragraphs).",
      timeLimitSeconds: 120,
      placeholder:
        "Consider: Gibran says parents do not own their children. The passage says the home's job is not to teach. How do these two ideas reinforce each other? What does 'Life's longing' have to do with learning?",
      rubric:
        "The candidate must: (1) Explain Gibran's claim: parents are custodians, not owners; children belong to their own future. (2) Connect this to the passage's argument that parents should not try to 'teach' the school curriculum but should make learning visible. (3) Show how both texts argue that the adult's role is to create conditions for growth, not to control the outcome.",
      keyPoints: [
        "Gibran's claim: children are not possessions",
        "Parallel to passage: home's job is not to teach",
        "Both argue for creating conditions, not controlling outcomes",
        "'Life's longing' as intrinsic motivation to learn",
      ],
      sampleAnswer:
        "Gibran's line is about authorship. The parent does not own the child any more than an author owns how a reader interprets the text. This connects directly to the passage's central claim: the home's job is not to teach. A parent who tries to control what a child learns at home is repeating the same mistake Gibran warns against treating the child as a project rather than a person.\n\nThe passage argues that the most powerful thing a home can do is make learning visible as an adult activity. Reading for pleasure, admitting ignorance, discussing ideas: these are not acts of teaching but acts of living. Gibran would recognize this. The arrow does not ask the bow for directions. It trusts the archer's aim and flies toward a target the bow will never see.\n\n'Life's longing for itself' could be read as the intrinsic motivation to learn. The child does not need to be pushed toward knowledge any more than a seed needs to be pulled toward the sun. The home's job is to remove obstacles and model what a learning life looks like. That is not a curriculum. It is a way of being in the world.",
    },
    {
      id: "q7",
      type: "multiple-choice",
      question:
        "Based on the passage, why does a child whose home environment reinforces school learning develop stronger metacognitive habits?",
      timeLimitSeconds: 45,
      options: [
        {
          id: "a",
          label: "Because the parent explicitly teaches study techniques from the school curriculum.",
        },
        {
          id: "b",
          label: "Because the child receives tutoring that accelerates their school progress.",
        },
        {
          id: "c",
          label: "Because the child internalizes that learning does not switch off at the school gate.",
        },
        {
          id: "d",
          label: "Because the school provides more homework when it sees parental involvement.",
        },
      ],
      allowMultiple: false,
      correctOptionIds: ["c"],
      explanation:
        "The passage states the mechanism is 'the signal that learning does not switch off at the school gate.' This develops metacognition because the child sees learning as a continuous life activity, not a school-period task.",
    },
    {
      id: "q8",
      type: "open",
      question:
        "The passage mentions parents who 'feel underqualified to teach and overeager to outsource.' Write a response to such a parent, using the passage's argument to explain why they do not need to be a teacher.",
      description: "Write a compassionate but evidence-based response (1-2 paragraphs).",
      timeLimitSeconds: 90,
      placeholder:
        "Address the parent's anxiety directly. Reference the passage's claim that the home's job is not to teach. Explain what the home's actual job is (making learning visible). Use the garden gate metaphor or the water cycle example.",
      rubric:
        "The candidate must: (1) Acknowledge the parent's feeling of being underqualified. (2) Reframe the role using the passage: no teaching required, only visible adult learning. (3) Use at least one specific metaphor or example from the passage. (4) End with a concrete, simple action the parent could take.",
      keyPoints: [
        "Address parent anxiety directly",
        "Reframe: home's job is not to teach",
        "Use passage metaphor or example",
        "Concrete actionable advice",
      ],
      sampleAnswer:
        "You do not need to be a teacher. The passage argues that the home's most important job is not instruction but demonstration. When you read a book for pleasure, look up something you do not know, or talk through a problem aloud, you are not teaching your child curriculum. You are showing them that learning is what adults do all the time.\n\nThe water cycle example in the passage illustrates this. You do not need to explain evaporation. You just need to fix the leaky faucet while your child watches and ask: 'I wonder where all that water goes?' That wondering is what sticks. That is the garden gate swinging both ways.\n\nStart small. Read something you enjoy where your child can see you. When you hit a word you do not know, look it up out loud. That is not teaching. It is living like a learner. And it works better than any lesson plan.",
    },
  ],
};
