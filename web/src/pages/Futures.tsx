import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import FuturesMarketCard from "../components/FuturesMarketCard";
import FuturesSlip from "../components/FuturesSlip";
import Layout from "../components/Layout";
import SmartPicks from "../components/SmartPicks";
import SportIcon from "../components/SportIcon";
import type { FuturesLeg } from "../context/FuturesParlayContext";
import { useFuturesParlay } from "../context/FuturesParlayContext";
import { useFutures } from "../hooks/useFutures";
import {
  americanToDecimal,
  decimalToAmerican,
  formatAmerican,
} from "../lib/odds";
import { decodeParlay } from "../lib/shareParlay";
import { sportTheme } from "../lib/theme";
import type { FuturesMarket } from "../types/futures";
import styles from "./Futures.module.css";

function buildExampleLegs(markets: FuturesMarket[]): FuturesLeg[] {
  const picks: FuturesLeg[] = [];
  const usedLeagues = new Set<string>();
  for (const m of markets) {
    if (usedLeagues.has(m.league)) continue;
    const o = m.outcomes[0];
    if (!o) continue;
    picks.push({
      id: `${m.key}:${o.name}`,
      league: m.league,
      marketKey: m.key,
      marketTitle: m.title,
      name: o.name,
      displayName: o.displayName,
      abbr: o.abbr,
      logo: o.logo,
      price: o.price,
      fairPct: o.fairPct,
    });
    usedLeagues.add(m.league);
    if (picks.length >= 2) break;
  }
  return picks;
}

export default function Futures() {
  const state = useFutures();
  const { hydrate } = useFuturesParlay();
  const hydrated = useRef(false);
  const [sharedNames, setSharedNames] = useState<string[] | null>(null);
  const [league, setLeague] = useState<string>("ALL");

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

  // A concrete two-team, cross-sport example used to teach the core idea:
  // bet multiple title favorites at once for one combined payout.
  const example = useMemo(() => {
    const legs = buildExampleLegs(markets);
    if (legs.length < 2) return null;
    const decimal = legs.reduce((d, l) => d * americanToDecimal(l.price), 1);
    return {
      legs,
      american: decimalToAmerican(decimal),
      names: legs.map((l) => l.displayName ?? l.name),
    };
  }, [markets]);

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

      {example && (
        <button
          type="button"
          className={styles.headline}
          onClick={() => hydrate(example.legs)}
        >
          <span className={styles.headlineHook}>
            <span className={styles.headlineFlame}>🔥</span>
            <span className={styles.headlineText}>
              The whole idea: back two teams at once. Parlay the{" "}
              <strong>{example.names[0]}</strong> &amp;{" "}
              <strong>{example.names[1]}</strong> into one ticket that pays{" "}
              <span className={styles.headlineOdds}>
                {formatAmerican(example.american)}
              </span>
              .
            </span>
          </span>
          <span className={styles.headlineCta}>Load this parlay →</span>
        </button>
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
          <SmartPicks markets={markets} />

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
