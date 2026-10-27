import type { TestContent } from "@/types";
import { sqlQueryOptimizationTest } from "./sql-query-optimization";
import { p1SchoolAndHomeTest } from "./p1-school-and-home";
import { p1SchoolAndHomeWrittenTest } from "./p1-school-and-home-written";
import { p1NewsTest } from "./p1-news";
import { p1MathematicsTest } from "./p1-mathematics";
import { p1LiteracyOneTest } from "./p1-literacy-i";
import { p1LiteracyTwoTest } from "./p1-literacy-ii";
import { p1EnglishTest } from "./p1-english";
import { p1CreativePerformingArtsTest } from "./p1-creative-performing-arts";
import { p1PhysicalEducationTest } from "./p1-physical-education";
import { p1ReligiousEducationTest } from "./p1-religious-education";
import { p1FreeActivityTest } from "./p1-free-activity";

export const allTests: TestContent[] = [
  sqlQueryOptimizationTest,
  p1SchoolAndHomeTest,
  p1SchoolAndHomeWrittenTest,
  p1NewsTest,
  p1MathematicsTest,
  p1LiteracyOneTest,
  p1LiteracyTwoTest,
  p1EnglishTest,
  p1CreativePerformingArtsTest,
  p1PhysicalEducationTest,
  p1ReligiousEducationTest,
  p1FreeActivityTest,
];

export {
  sqlQueryOptimizationTest,
  p1SchoolAndHomeTest,
  p1SchoolAndHomeWrittenTest,
  p1NewsTest,
  p1MathematicsTest,
  p1LiteracyOneTest,
  p1LiteracyTwoTest,
  p1EnglishTest,
  p1CreativePerformingArtsTest,
  p1PhysicalEducationTest,
  p1ReligiousEducationTest,
  p1FreeActivityTest,
};
