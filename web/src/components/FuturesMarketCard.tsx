import { useState } from "react";
import { useFuturesParlay } from "../context/FuturesParlayContext";
import { needsLogoOutline } from "../lib/darkLogos";
import { HEAT_META, heatTier } from "../lib/futuresHeat";
import { formatAmerican, payoutFor } from "../lib/odds";
import { sportTheme } from "../lib/theme";
import SportIcon from "./SportIcon";
import type { FuturesMarket, FuturesOutcome } from "../types/futures";
import styles from "./FuturesMarketCard.module.css";

const COLLAPSED = 6;

function legId(market: FuturesMarket, o: FuturesOutcome) {
  return `${market.key}:${o.name}`;
}

function OutcomeRow({
  market,
  outcome,
  rank,
}: {
  market: FuturesMarket;
  outcome: FuturesOutcome;
  rank: number;
}) {
  const { has, toggle } = useFuturesParlay();
  const id = legId(market, outcome);
  const inSlip = has(id);
  const tier = heatTier(outcome.fairPct);
  const meta = HEAT_META[tier];
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <button
      type="button"
      className={`${styles.row} ${inSlip ? styles.rowActive : ""}`}
      style={{ ["--heat" as string]: meta.color }}
      onClick={() =>
        toggle({
          id,
          league: market.league,
          marketKey: market.key,
          marketTitle: market.title,
          name: outcome.name,
          abbr: outcome.abbr,
          logo: outcome.logo,
          price: outcome.price,
          fairPct: outcome.fairPct,
        })
      }
      aria-pressed={inSlip}
    >
      <span className={styles.rank}>{rank}</span>
      {outcome.logo && !logoFailed ? (
        <img
          src={outcome.logo}
          alt=""
          className={`${styles.logo} ${
            needsLogoOutline(market.league, outcome.abbr)
              ? styles.logoOutline
              : ""
          }`}
          loading="lazy"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className={styles.logoFallback}>
          {(outcome.abbr ?? outcome.name).slice(0, 3)}
        </span>
      )}
      <span className={styles.nameWrap}>
        <span className={styles.name}>{outcome.name}</span>
        <span className={styles.tier}>{meta.label}</span>
      </span>
      <span className={styles.heatBarTrack}>
        <span
          className={styles.heatBar}
          style={{ width: `${Math.min(outcome.fairPct * 2.6, 100)}%` }}
        />
      </span>
      <span
        className={styles.fair}
        title="Win chance — the real probability after we strip out the book's margin"
      >
        {outcome.fairPct}%
      </span>
      <span className={styles.priceWrap}>
        <span className={styles.price}>{formatAmerican(outcome.price)}</span>
        <span className={styles.payoutHint}>
          $10 → ${payoutFor(outcome.price)}
        </span>
      </span>
      <span className={styles.add}>{inSlip ? "✓" : "+"}</span>
    </button>
  );
}

export default function FuturesMarketCard({ market }: { market: FuturesMarket }) {
  const [expanded, setExpanded] = useState(false);
  const theme = sportTheme(market.league);
  const shown = expanded ? market.outcomes : market.outcomes.slice(0, COLLAPSED);

  return (
    <section
      className={styles.card}
      style={{ ["--sport-color" as string]: theme.color }}
    >
      <header className={styles.head}>
        <span className={styles.league}>
          <SportIcon sport={market.league} size={14} />
          {market.league}
        </span>
        <h3 className={styles.title}>{market.title}</h3>
      </header>

      <div className={styles.rows}>
        {shown.map((o, i) => (
          <OutcomeRow key={o.name} market={market} outcome={o} rank={i + 1} />
        ))}
      </div>

      {market.outcomes.length > COLLAPSED && (
        <button
          type="button"
          className={styles.more}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? "Show fewer"
            : `Show all ${market.outcomes.length} contenders`}
        </button>
      )}
    </section>
  );
}
