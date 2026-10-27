import type { TestContent } from "@/types";
import { sqlQueryOptimizationTest } from "./sql-query-optimization";
import { p1SchoolAndHomeTest } from "./p1-school-and-home";
import { p1SchoolAndHomeWrittenTest } from "./p1-school-and-home-written";

export const allTests: TestContent[] = [
  sqlQueryOptimizationTest,
  p1SchoolAndHomeTest,
  p1SchoolAndHomeWrittenTest,
];

export {
  sqlQueryOptimizationTest,
  p1SchoolAndHomeTest,
  p1SchoolAndHomeWrittenTest,
};
