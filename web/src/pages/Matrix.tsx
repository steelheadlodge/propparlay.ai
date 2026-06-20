import { Link } from "react-router-dom";
import FuturesSlip from "../components/FuturesSlip";
import Layout from "../components/Layout";
import ParlayMatrix from "../components/ParlayMatrix";
import { useFutures } from "../hooks/useFutures";
import styles from "./Matrix.module.css";

export default function Matrix() {
  const state = useFutures();
  const markets = state.status === "ready" ? state.markets : [];

  return (
    <Layout
      title="Cross-sport parlay grid"
      subtitle="Pick a team down the side and one across the top — the cell where they meet shows the combined odds and payout if you parlay them. Add extra legs to fold a 3rd or 4th team into every box. Greener means more likely to hit."
    >
      {state.status === "loading" ? (
        <div className={styles.skeleton} />
      ) : state.status === "error" || !state.configured ? (
        <p className={styles.note}>Live futures are warming up. Check back shortly.</p>
      ) : markets.length < 2 ? (
        <p className={styles.note}>
          The grid needs at least two championship markets. More leagues populate
          as books open futures for the upcoming seasons.
        </p>
      ) : (
        <ParlayMatrix markets={markets} />
      )}

      <Link to="/" className={styles.crossLink}>
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
