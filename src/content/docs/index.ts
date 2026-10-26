import type { DocContent } from "@/types";
import { labSetup } from "./lab-setup";
import { contentTypes } from "./content-types";

export const allDocs: DocContent[] = [
  contentTypes,
  labSetup,
];
