import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FuturesMarketCard from "../components/FuturesMarketCard";
import FuturesSlip from "../components/FuturesSlip";
import Layout from "../components/Layout";
import { useFuturesParlay } from "../context/FuturesParlayContext";
import { useFutures } from "../hooks/useFutures";
import { decodeParlay } from "../lib/shareParlay";
import styles from "./Futures.module.css";

export default function Futures() {
  const state = useFutures();
  const { hydrate } = useFuturesParlay();
  const hydrated = useRef(false);
  const [sharedNames, setSharedNames] = useState<string[] | null>(null);

  // Load a shared parlay from ?p= once on mount.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const params = new URLSearchParams(window.location.search);
    const p = params.get("p");
    if (!p) return;
    const legs = decodeParlay(p);
    if (legs) {
      hydrate(legs);
      setSharedNames(legs.map((l) => l.name));
    }
  }, [hydrate]);

  const markets = state.status === "ready" ? state.markets : [];
  const quota = state.status === "ready" ? state.quota : null;

  const topPick = useMemo(() => {
    let best: { name: string; pct: number; league: string } | null = null;
    for (const m of markets) {
      const o = m.outcomes[0];
      if (o && (!best || o.fairPct > best.pct)) {
        best = { name: o.name, pct: o.fairPct, league: m.league };
      }
    }
    return best;
  }, [markets]);

  const leagues = useMemo(
    () => [...new Set(markets.map((m) => m.league))],
    [markets],
  );

  return (
    <Layout
      title="The future of parlays"
      subtitle="Stack cross-sport title bets — World Series, Super Bowl, Stanley Cup and more — at each team's real win chance. The first parlay lab built around futures."
    >
      {sharedNames && (
        <a className={styles.tail} href="/#waitlistForm">
          <span className={styles.tailIcon}>🎟️</span>
          <span className={styles.tailText}>
            <strong>You're viewing a shared parlay</strong>
            <span>
              {sharedNames.join(" + ")} — it's loaded in your slip. Join the
              waitlist to tail picks like this.
            </span>
          </span>
          <span className={styles.tailCta}>Join waitlist →</span>
        </a>
      )}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statIcon}>🏆</span>
          <div>
            <span className={styles.statValue}>{markets.length}</span>
            <span className={styles.statLabel}>Markets live</span>
          </div>
        </div>
        <div className={styles.stat}>
          <span className={styles.statIcon}>🥇</span>
          <div>
            <span className={styles.statValue}>
              {topPick ? `${topPick.pct}%` : "—"}
            </span>
            <span className={styles.statLabel}>
              {topPick ? `Top favorite · ${topPick.name}` : "Top favorite"}
            </span>
          </div>
        </div>
        <div className={styles.stat}>
          <span className={styles.statIcon}>🌐</span>
          <div>
            <span className={styles.statValue}>{leagues.length}</span>
            <span className={styles.statLabel}>Leagues</span>
          </div>
        </div>
        {quota?.remaining != null && (
          <div className={styles.stat}>
            <span className={styles.statIcon}>⚡</span>
            <div>
              <span className={styles.statValue}>
                {quota.remaining.toLocaleString()}
              </span>
              <span className={styles.statLabel}>Odds credits left</span>
            </div>
          </div>
        )}
      </div>

      {state.status === "loading" ? (
        <div className={styles.grid}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={`${styles.skeleton}`} />
          ))}
        </div>
      ) : state.status === "error" || !state.configured ? (
        <p className={styles.note}>
          Live futures are warming up. Check back shortly.
        </p>
      ) : markets.length === 0 ? (
        <p className={styles.note}>
          No futures markets are posted right now. Championship odds populate as
          books open them for the upcoming seasons.
        </p>
      ) : (
        <div className={styles.grid}>
          {markets.map((m) => (
            <FuturesMarketCard key={m.key} market={m} />
          ))}
        </div>
      )}

      <Link to="/tonight" className={styles.crossLink}>
        <span className={styles.crossIcon}>🎯</span>
        <span className={styles.crossText}>
          <strong>Tonight's slate is live too</strong>
          <span>
            Nightly AI player props, hot zones & line shopping across NBA, NHL,
            NFL & MLB
          </span>
        </span>
        <span className={styles.crossArrow}>→</span>
      </Link>

      <p className={styles.footerNote}>
        Win chance shown is each team's real shot at the title — we strip out the
        sportsbook's built-in margin so the number isn't padded. Build a parlay,
        then place it at your own book.
      </p>

      <FuturesSlip />
    </Layout>
  );
}
