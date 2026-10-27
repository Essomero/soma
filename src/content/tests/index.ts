import type { TestContent } from "@/types";
import { sqlQueryOptimizationTest } from "./sql-query-optimization";
import { p1SchoolAndHomeTest } from "./p1-school-and-home";

export const allTests: TestContent[] = [
  sqlQueryOptimizationTest,
  p1SchoolAndHomeTest,
];

export {
  sqlQueryOptimizationTest,
  p1SchoolAndHomeTest,
};
