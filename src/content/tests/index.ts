import type { TestContent } from "@/types";
import { sqlQueryOptimizationTest } from "./sql-query-optimization";

export const allTests: TestContent[] = [
  sqlQueryOptimizationTest,
];

export {
  sqlQueryOptimizationTest,
};
