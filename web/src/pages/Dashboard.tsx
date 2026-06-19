import { useState } from "react";
import HotZonesGrid from "../components/HotZonesGrid";
import Layout from "../components/Layout";
import PropCard from "../components/PropCard";
import { allMockProps } from "../data/allMockProps";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);

  const sorted = [...allMockProps].sort((a, b) => b.edge - a.edge);
  const highlighted = selectedPropId
    ? sorted.find((p) => p.id === selectedPropId)
    : null;

  return (
    <Layout
      title="Tonight's slate"
      subtitle="Hot zones across NBA, NHL, NFL & MLB — click a green cell to jump to the full pick."
    >
      <HotZonesGrid
        selectedPropId={selectedPropId}
        onSelectProp={(id) => {
          setSelectedPropId(id);
          const el = document.getElementById(`prop-${id}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />

      {highlighted && (
        <p className={styles.highlightNote}>
          Selected from grid: <strong>{highlighted.player}</strong>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => setSelectedPropId(null)}
          >
            Clear
          </button>
        </p>
      )}

      <h2 className={styles.sectionTitle}>Full pick cards</h2>

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
          <div
            key={prop.id}
            id={`prop-${prop.id}`}
            className={
              selectedPropId === prop.id ? styles.propHighlight : undefined
            }
          >
            <PropCard prop={prop} />
          </div>
        ))}
      </div>

      <p className={styles.footerNote}>
        Preview — live odds API and parlay builder coming next.
      </p>
    </Layout>
  );
}
