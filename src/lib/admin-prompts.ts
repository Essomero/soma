// Re-exports from the schema registry.
// This file is kept as a public API boundary — components import from
// here rather than directly from content-schema.ts to avoid tight coupling.
//
// If you add a new content type, define it in content-schema.ts first.
// This file updates automatically.

export {
  buildSystemPrompt,
  buildClassificationGuide,
  buildFieldDescriptions,
  buildExamplePrompt,
  CONTENT_SCHEMA,
  getSchema,
  getFields,
} from "./content-schema";

export type { ContentType, TypeSchema, FieldSchema } from "./content-schema";
export { CONTENT_TYPE_LABELS, CONTENT_TYPES, CATEGORIES, TOPIC_OPTIONS, ROUTE_BASE } from "./content-schema";
