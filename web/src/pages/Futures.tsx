import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import FuturesMarketCard from "../components/FuturesMarketCard";
import FuturesSlip from "../components/FuturesSlip";
import Layout from "../components/Layout";
import PickOfDayBanner from "../components/PickOfDayBanner";
import SmartPicks from "../components/SmartPicks";
import SportIcon from "../components/SportIcon";
import { useFuturesParlay } from "../context/FuturesParlayContext";
import { useFutures } from "../hooks/useFutures";
import { buildPickOfDay } from "../lib/pickOfDay";
import { decodeParlay } from "../lib/shareParlay";
import { sportTheme } from "../lib/theme";
import styles from "./Futures.module.css";

export default function Futures() {
  const state = useFutures();
  const { hydrate } = useFuturesParlay();
  const [sharedNames, setSharedNames] = useState<string[] | null>(null);
  const [league, setLeague] = useState<string>("ALL");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("p");
    if (!p) return;
    const legs = decodeParlay(p);
    if (legs) setSharedNames(legs.map((l) => l.name));
  }, []);

  const markets = state.status === "ready" ? state.markets : [];

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("shot") !== "ai") return;
    if (state.status !== "ready" || markets.length === 0) return;
    requestAnimationFrame(() => {
      document.getElementById("ai-builder")?.scrollIntoView({ block: "start" });
    });
  }, [state.status, markets.length]);

  const pickOfDay = useMemo(() => buildPickOfDay(markets), [markets]);

  const leagues = useMemo(
    () => [...new Set(markets.map((m) => m.league))],
    [markets],
  );

  const visibleMarkets = useMemo(
    () => (league === "ALL" ? markets : markets.filter((m) => m.league === league)),
    [markets, league],
  );

  return (
    <Layout
      title="The futures of parlays"
      subtitle="Stack cross-sport title bets — World Series, Super Bowl, Stanley Cup and more — at each team's real win chance. The first parlay lab built around futures."
    >
      {sharedNames && (
        <div className={styles.tail}>
          <span className={styles.tailIcon}>🔗</span>
          <span className={styles.tailText}>
            <strong>Shared parlay loaded</strong>
            <span>
              {sharedNames.join(" + ")} is in your slip — tap <strong>Share parlay</strong>{" "}
              to send it to a friend.
            </span>
          </span>
        </div>
      )}

      {pickOfDay && (
        <PickOfDayBanner pick={pickOfDay} onLoad={() => hydrate(pickOfDay.legs)} />
      )}

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
        <>
          <div id="ai-builder">
            <SmartPicks markets={markets} />
          </div>

          {leagues.length > 1 && (
            <div className={styles.filters}>
              <button
                type="button"
                className={`${styles.filterTab} ${league === "ALL" ? styles.filterActive : ""}`}
                onClick={() => setLeague("ALL")}
              >
                All
              </button>
              {leagues.map((lg) => {
                const active = league === lg;
                const theme = sportTheme(lg);
                return (
                  <button
                    key={lg}
                    type="button"
                    className={`${styles.filterTab} ${active ? styles.filterActive : ""}`}
                    style={
                      active
                        ? {
                            borderColor: theme.color,
                            color: theme.color,
                            background: theme.glow,
                          }
                        : undefined
                    }
                    onClick={() => setLeague(lg)}
                  >
                    <SportIcon sport={lg} size={14} />
                    {lg}
                  </button>
                );
              })}
            </div>
          )}

          <div className={styles.grid}>
            {visibleMarkets.map((m) => (
              <FuturesMarketCard key={m.key} market={m} />
            ))}
          </div>
        </>
      )}

      <Link to="/grid" className={styles.crossLink}>
        <span className={styles.crossIcon}>🧮</span>
        <span className={styles.crossText}>
          <strong>Try the cross-sport parlay grid</strong>
          <span>
            Cross two leagues on a heat-mapped board — pick a row & column to see
            combined odds, payout & the reasons behind each combo
          </span>
        </span>
        <span className={styles.crossArrow}>→</span>
      </Link>

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
