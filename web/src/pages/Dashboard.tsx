import { useMemo, useState } from "react";
import GamesBoard from "../components/GamesBoard";
import HotZonesGrid from "../components/HotZonesGrid";
import Layout from "../components/Layout";
import ParlaySlip from "../components/ParlaySlip";
import PropCard from "../components/PropCard";
import SportIcon from "../components/SportIcon";
import { allMockProps } from "../data/allMockProps";
import { selectedLegs, useParlay } from "../context/ParlayContext";
import { useSlate } from "../hooks/useSlate";
import { sportTheme } from "../lib/theme";
import styles from "./Dashboard.module.css";

const FILTERS = ["ALL", "NBA", "NHL", "NFL", "MLB"] as const;
type Filter = (typeof FILTERS)[number];

export default function Dashboard() {
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const { legIds } = useParlay();
  const slate = useSlate();

  // Use live prop cards when the slate is configured and returns picks;
  // otherwise fall back to the curated model preview set.
  const isLive =
    slate.status === "ready" && slate.configured && slate.props.length > 0;
  const source = isLive ? slate.props : allMockProps;
  const quota = slate.status === "ready" ? slate.quota : null;

  const sorted = useMemo(
    () => [...source].sort((a, b) => b.edge - a.edge),
    [source],
  );
  const visible =
    filter === "ALL" ? sorted : sorted.filter((p) => p.sport === filter);
  const legs = selectedLegs(legIds, source);
  const highlighted = selectedPropId
    ? sorted.find((p) => p.id === selectedPropId)
    : null;

  const topEdge = sorted.length ? Math.max(...sorted.map((p) => p.edge)) : 0;
  const avgConfidence = sorted.length
    ? Math.round(sorted.reduce((s, p) => s + p.confidence, 0) / sorted.length)
    : 0;

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

      <GamesBoard />

      <HotZonesGrid
        selectedPropId={selectedPropId}
        onSelectProp={(id) => {
          setSelectedPropId(id);
          const el = document.getElementById(`prop-${id}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
      />

      <div className={styles.pickHeader}>
        <div className={styles.pickTitleRow}>
          <h2 className={styles.sectionTitle}>Full pick cards</h2>
          {slate.status === "ready" && (
            <span
              className={`${styles.oddsBadge} ${isLive ? styles.oddsLive : styles.oddsModel}`}
              title={
                isLive
                  ? "Live player props from The Odds API — edge vs market consensus"
                  : "Model preview — live props appear when games with posted props are on the board"
              }
            >
              <span className={styles.oddsDot} />
              {isLive ? "Live odds" : "Model preview"}
            </span>
          )}
          {quota?.remaining != null && (
            <span className={styles.quota} title="The Odds API monthly credits remaining">
              {quota.remaining.toLocaleString()} credits left
            </span>
          )}
        </div>
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
        {isLive
          ? "Live player props from The Odds API. Edge = best available price vs de-vigged market consensus."
          : "Model preview — add an Odds API key (or wait for a game with posted props) to see live cards."}
      </p>

      <ParlaySlip legs={legs} />
    </Layout>
  );
}
