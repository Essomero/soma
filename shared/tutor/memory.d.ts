import type { TutorMode } from "./modes.js";

export interface TutorTurnSource {
  id?: number;
  body?: string;
  isAi?: boolean;
  mode?: TutorMode | null;
  aiAction?: TutorMode | null;
  replies?: TutorTurnSource[];
}

export interface TutorHighlightSource {
  sectionIndex: number;
  comments?: TutorTurnSource[];
}

export interface PriorTurn {
  mode: TutorMode;
  body: string;
}

export function collectPriorTurns(
  highlights: TutorHighlightSource[] | null | undefined,
  sectionIndex: number,
  limit?: number,
): PriorTurn[];
