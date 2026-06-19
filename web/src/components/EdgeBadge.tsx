import styles from "./EdgeBadge.module.css";

export default function EdgeBadge({ edge }: { edge: number }) {
  const tier =
    edge >= 5 ? "high" : edge >= 3 ? "mid" : "low";

  return (
    <span className={`${styles.badge} ${styles[tier]}`}>
      +{edge.toFixed(1)}% edge
    </span>
  );
}
