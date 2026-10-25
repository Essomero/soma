import type { DocContent } from "@/types";
import { labSetup } from "./lab-setup";
import { contentTypes } from "./content-types";
import { analyticsOptions } from "./analytics-options";

export const allDocs: DocContent[] = [
  contentTypes,
  labSetup,
  analyticsOptions,
];
