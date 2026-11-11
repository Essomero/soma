import type { TutorMode } from "../../../shared/tutor/modes.js";

const MODE_COLOR_MAP: Record<TutorMode, string> = {
  explain: "text-brand/70 bg-brand/10",
  simplify: "text-secondary/70 bg-secondary/10",
  challenge: "text-accent-orange/70 bg-accent-orange/10",
  counter: "text-tertiary/70 bg-tertiary/10",
  socratic: "text-accent-blue-neon/70 bg-accent-blue-neon/10",
};

/** Returns the Tailwind class string for a mode, or the fallback. */
export function modeColor(mode: string | undefined | null): string {
  return MODE_COLOR_MAP[mode as TutorMode] || "text-brand/70 bg-brand/10";
}
