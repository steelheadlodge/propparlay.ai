import { useMemo, useState } from "react";
import HotZonesGrid from "../components/HotZonesGrid";
import Layout from "../components/Layout";
import ParlaySlip from "../components/ParlaySlip";
import PropCard from "../components/PropCard";
import SportIcon from "../components/SportIcon";
import { allMockProps } from "../data/allMockProps";
import { selectedLegs, useParlay } from "../context/ParlayContext";
import { sportTheme } from "../lib/theme";
import styles from "./Dashboard.module.css";

const FILTERS = ["ALL", "NBA", "NHL", "NFL", "MLB"] as const;
type Filter = (typeof FILTERS)[number];

export default function Dashboard() {
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const { legIds } = useParlay();

  const sorted = useMemo(
    () => [...allMockProps].sort((a, b) => b.edge - a.edge),
    [],
  );
  const visible =
    filter === "ALL" ? sorted : sorted.filter((p) => p.sport === filter);
  const legs = selectedLegs(legIds, allMockProps);
  const highlighted = selectedPropId
    ? sorted.find((p) => p.id === selectedPropId)
    : null;

  const topEdge = Math.max(...sorted.map((p) => p.edge));
  const avgConfidence = Math.round(
    sorted.reduce((s, p) => s + p.confidence, 0) / sorted.length,
  );

  return (
    <Layout
      title="Tonight's slate"
      subtitle="Hot zones across NBA, NHL, NFL & MLB — click a green cell to jump to the full pick."
    >
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statIcon}>📊</span>
          <div>
            <span className={styles.statValue}>{sorted.length}</span>
            <span className={styles.statLabel}>Props tracked</span>
          </div>
        </div>
        <div className={styles.stat}>
          <span className={styles.statIcon}>🔥</span>
          <div>
            <span className={styles.statValue}>{topEdge.toFixed(1)}%</span>
            <span className={styles.statLabel}>Top edge</span>
          </div>
        </div>
        <div className={styles.stat}>
          <span className={styles.statIcon}>🎯</span>
          <div>
            <span className={styles.statValue}>{avgConfidence}%</span>
            <span className={styles.statLabel}>Avg confidence</span>
          </div>
        </div>
      </div>

      <HotZonesGrid
        selectedPropId={selectedPropId}
        onSelectProp={(id) => {
          setSelectedPropId(id);
          const el = document.getElementById(`prop-${id}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />

      <div className={styles.pickHeader}>
        <h2 className={styles.sectionTitle}>Full pick cards</h2>
        <div className={styles.filters}>
          {FILTERS.map((f) => {
            const active = filter === f;
            const theme = f === "ALL" ? null : sportTheme(f);
            return (
              <button
                key={f}
                type="button"
                className={`${styles.filterTab} ${active ? styles.filterActive : ""}`}
                style={
                  active && theme
                    ? {
                        borderColor: theme.color,
                        color: theme.color,
                        background: `${theme.glow}`,
                      }
                    : undefined
                }
                onClick={() => setFilter(f)}
              >
                {f !== "ALL" && <SportIcon sport={f} size={14} />}
                {f === "ALL" ? "All" : f}
              </button>
            );
          })}
        </div>
      </div>

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

      <div className={styles.grid}>
        {visible.map((prop) => (
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
        Preview — live odds API and account access coming next.
      </p>

      <ParlaySlip legs={legs} />
    </Layout>
  );
}
