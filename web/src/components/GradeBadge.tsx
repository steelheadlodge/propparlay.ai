import type { LetterGrade } from "../lib/grades";
import { gradeLabel } from "../lib/grades";
import styles from "./GradeBadge.module.css";

const GRADE_CLASS: Record<LetterGrade, string> = {
  A: styles.gradeA,
  B: styles.gradeB,
  C: styles.gradeC,
  D: styles.gradeD,
};

export default function GradeBadge({
  grade,
  compact,
}: {
  grade: LetterGrade;
  compact?: boolean;
}) {
  return (
    <span
      className={`${styles.badge} ${GRADE_CLASS[grade]} ${compact ? styles.compact : ""}`}
      title={gradeLabel(grade)}
    >
      {grade}
    </span>
  );
}
