import Layout from "../components/Layout";
import PropCard from "../components/PropCard";
import { mockProps } from "../data/mockProps";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const sorted = [...mockProps].sort((a, b) => b.edge - a.edge);

  return (
    <Layout
      title="Today's prop edges"
      subtitle="AI projections vs market lines — mock data for preview. Real odds API coming next."
    >
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{sorted.length}</span>
          <span className={styles.statLabel}>Props tracked</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {Math.max(...sorted.map((p) => p.edge)).toFixed(1)}%
          </span>
          <span className={styles.statLabel}>Top edge</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {Math.round(
              sorted.reduce((s, p) => s + p.confidence, 0) / sorted.length,
            )}%
          </span>
          <span className={styles.statLabel}>Avg confidence</span>
        </div>
      </div>

      <div className={styles.grid}>
        {sorted.map((prop) => (
          <PropCard key={prop.id} prop={prop} />
        ))}
      </div>

      <p className={styles.footerNote}>
        Preview build — parlay builder, live odds, and account access ship in
        the next iteration.
      </p>
    </Layout>
  );
}
