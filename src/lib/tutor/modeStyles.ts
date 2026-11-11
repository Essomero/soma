/** Tailwind class strings for tutor mode badges.
 *  Kept under src/ so Tailwind's content scan picks them up.
 *  Never imported by server-side code. */
export const MODE_COLOR: Record<string, string> = {
  explain: "text-brand/70 bg-brand/10",
  simplify: "text-secondary/70 bg-secondary/10",
  challenge: "text-accent-orange/70 bg-accent-orange/10",
  counter: "text-tertiary/70 bg-tertiary/10",
  socratic: "text-accent-blue-neon/70 bg-accent-blue-neon/10",
};
