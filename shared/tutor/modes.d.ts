export type TutorMode = "explain" | "simplify" | "challenge" | "counter" | "socratic";

export interface TutorModeInfo {
  id: TutorMode;
  label: string;
  description: string;
}

export const TUTOR_MODES: TutorModeInfo[];

export const MODE_COLOR: Record<string, string>;

export function isTutorMode(value: unknown): value is TutorMode;
