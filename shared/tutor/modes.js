// Tutor modes are presentation metadata plus a validation list.
// Prompt text lives in prompts.js and is only imported by the server.

export const TUTOR_MODES = [
  {
    id: "explain",
    label: "Explain",
    description: "Build intuition, then the mechanics",
  },
  {
    id: "simplify",
    label: "Simplify",
    description: "Same facts, plainer words",
  },
  {
    id: "challenge",
    label: "Challenge",
    description: "Test your mental model",
  },
  {
    id: "counter",
    label: "Counter-example",
    description: "Argue the other side",
  },
  {
    id: "socratic",
    label: "Socratic",
    description: "Questions, not answers",
  },
];

export function isTutorMode(value) {
  return TUTOR_MODES.some((mode) => mode.id === value);
}
