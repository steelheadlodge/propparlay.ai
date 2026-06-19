import { CONFIDENCE_COLOR, confidenceTier } from "../lib/theme";
import styles from "./ConfidenceRing.module.css";

export default function ConfidenceRing({
  value,
  size = 52,
}: {
  value: number;
  size?: number;
}) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;
  const color = CONFIDENCE_COLOR[confidenceTier(value)];

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={styles.svg}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={styles.progress}
        />
      </svg>
      <span className={styles.label} style={{ color }}>
        {Math.round(value)}
      </span>
    </div>
  );
}
