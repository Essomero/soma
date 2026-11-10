import type { DocContent } from "@/types";
import { labSetup } from "./lab-setup";
import { contentTypes } from "./content-types";
import { somaRoadmapPlan } from "./soma-roadmap-plan";

export const allDocs: DocContent[] = [
  contentTypes,
  labSetup,
  somaRoadmapPlan,
];
