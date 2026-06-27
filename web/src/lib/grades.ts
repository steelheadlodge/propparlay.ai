import type { HeatTier } from "./futuresHeat";
import { heatTier } from "./futuresHeat";

export type LetterGrade = "A" | "B" | "C" | "D";

const TIER_GRADE: Record<HeatTier, LetterGrade> = {
  fav: "A",
  contender: "B",
  live: "C",
  long: "D",
};

export function gradeFromFairPct(fairPct: number): LetterGrade {
  return TIER_GRADE[heatTier(fairPct)];
}

export function gradeFromConfidence(confidence: number): LetterGrade {
  if (confidence >= 78) return "A";
  if (confidence >= 65) return "B";
  if (confidence >= 52) return "C";
  return "D";
}

export function gradeLabel(grade: LetterGrade): string {
  switch (grade) {
    case "A":
      return "Strong pick";
    case "B":
      return "Solid pick";
    case "C":
      return "Lean";
    case "D":
      return "Long shot";
  }
}
