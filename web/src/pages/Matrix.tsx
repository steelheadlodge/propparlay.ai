import { useMemo } from "react";
import { Link } from "react-router-dom";
import FuturesSlip from "../components/FuturesSlip";
import Layout from "../components/Layout";
import ParlayMatrix from "../components/ParlayMatrix";
import PickOfDayBanner from "../components/PickOfDayBanner";
import SmartPicks from "../components/SmartPicks";
import { useFuturesParlay } from "../context/FuturesParlayContext";
import { useFutures } from "../hooks/useFutures";
import { buildPickOfDay } from "../lib/pickOfDay";
import styles from "./Matrix.module.css";

export default function Matrix() {
  const state = useFutures();
  const { hydrate } = useFuturesParlay();
  const markets = state.status === "ready" ? state.markets : [];
  const pickOfDay = useMemo(() => buildPickOfDay(markets), [markets]);

  return (
    <Layout
      title="The parlay heat map"
      subtitle="Each square is two teams from different sports. Brighter green means better odds of both winning. Tap any square to see what $10 pays."
    >
      {state.status === "loading" ? (
        <div className={styles.skeleton} />
      ) : state.status === "error" || !state.configured ? (
        <p className={styles.note}>
          Live futures are warming up. Check back shortly.
        </p>
      ) : markets.length < 2 ? (
        <p className={styles.note}>
          The grid needs at least two championship markets. More leagues
          populate as books open futures for the upcoming seasons.
        </p>
      ) : (
        <ParlayMatrix markets={markets} />
      )}

      {pickOfDay && (
        <div className={styles.below}>
          <PickOfDayBanner
            pick={pickOfDay}
            onLoad={() => hydrate(pickOfDay.legs)}
          />
        </div>
      )}

      {markets.length >= 2 && <SmartPicks markets={markets} />}

      <Link to="/futures" className={styles.crossLink}>
        <span className={styles.crossIcon}>🏆</span>
        <span className={styles.crossText}>
          <strong>Want the full board?</strong>
          <span>
            See every futures market with win chances, line moves & heat tiers
          </span>
        </span>
        <span className={styles.crossArrow}>→</span>
      </Link>

      <FuturesSlip />
    </Layout>
  );
}
