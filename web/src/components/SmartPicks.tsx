import { useState } from "react";
import type { FuturesLeg } from "../context/FuturesParlayContext";
import { useFuturesParlay } from "../context/FuturesParlayContext";
import {
  americanToDecimal,
  decimalToAmerican,
  formatAmerican,
  formatCurrency,
  payoutFor,
} from "../lib/odds";
import type { FuturesMarket, FuturesOutcome } from "../types/futures";
import TeamAvatar from "./TeamAvatar";
import styles from "./SmartPicks.module.css";

type Profile = "safe" | "balanced" | "longshot" | "value";

const PROFILES: { id: Profile; icon: string; label: string; blurb: string }[] = [
  { id: "safe", icon: "🛡️", label: "Safe", blurb: "Best chance to hit" },
  { id: "balanced", icon: "⚖️", label: "Balanced", blurb: "Odds vs. payout" },
  { id: "longshot", icon: "🚀", label: "Long shot", blurb: "Big payout swing" },
  { id: "value", icon: "💎", label: "Value", blurb: "Best price vs. market" },
];

function impliedPct(american: number): number {
  return american > 0
    ? (100 / (american + 100)) * 100
    : (-american / (-american + 100)) * 100;
}

// Higher score = better fit for the chosen strategy.
function scoreOutcome(o: FuturesOutcome, profile: Profile): number {
  switch (profile) {
    case "safe":
      return o.fairPct;
    case "balanced":
      // Favor solid contenders (~12% title chance).
      return -Math.abs(o.fairPct - 12);
    case "longshot":
      // Big payout, but only among live longshots (avoid dead-field noise).
      return o.fairPct >= 2 && o.fairPct <= 12
        ? americanToDecimal(o.price)
        : -Infinity;
    case "value":
      // Best book price beats the de-vigged consensus, restricted to realistic
      // contenders so "value" never means a deep-longshot lottery ticket.
      return o.fairPct >= 5 ? o.fairPct - impliedPct(o.price) : -Infinity;
  }
}

function rationale(
  o: { fairPct: number; price: number },
  league: string,
  profile: Profile,
): string {
  switch (profile) {
    case "safe":
      return `Top ${league} pick — ${o.fairPct.toFixed(1)}% title chance.`;
    case "balanced":
      return `Solid ${league} contender — ${o.fairPct.toFixed(
        1,
      )}% chance with a real payout bump.`;
    case "longshot":
      return `${league} long shot at ${formatAmerican(
        o.price,
      )} — small chance, big payout.`;
    case "value": {
      const edge = o.fairPct - impliedPct(o.price);
      if (edge >= 0.3)
        return `Best ${league} value — its price implies ${edge.toFixed(
          1,
        )} pts less than its real ${o.fairPct.toFixed(1)}% title chance.`;
      return `Best-priced ${league} contender — ${o.fairPct.toFixed(
        1,
      )}% title chance at the tightest price-to-odds gap.`;
    }
  }
}

function legOf(m: FuturesMarket, o: FuturesOutcome): FuturesLeg {
  return {
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
  };
}

// Pick the best outcome for a market, with a little randomness (shuffle) so
// repeated builds vary among the top candidates.
function pickOutcome(
  m: FuturesMarket,
  profile: Profile,
  shuffle: number,
): FuturesOutcome | null {
  const ranked = [...m.outcomes]
    .filter((o) => scoreOutcome(o, profile) > -Infinity)
    .sort((a, b) => scoreOutcome(b, profile) - scoreOutcome(a, profile));
  if (ranked.length === 0) return null;
  const topK = ranked.slice(0, Math.min(3, ranked.length));
  return topK[shuffle % topK.length];
}

function buildParlay(
  markets: FuturesMarket[],
  profile: Profile,
  legs: number,
  shuffle: number,
): FuturesLeg[] {
  // One market per league for cross-sport diversity; choose the leagues whose
  // best pick scores highest for this strategy.
  const seenLeague = new Set<string>();
  const oneEach: FuturesMarket[] = [];
  for (const m of markets) {
    if (seenLeague.has(m.league)) continue;
    seenLeague.add(m.league);
    oneEach.push(m);
  }
  const scored = oneEach
    .map((m) => {
      const o = pickOutcome(m, profile, shuffle);
      return o ? { m, o, score: scoreOutcome(o, profile) } : null;
    })
    .filter((v): v is { m: FuturesMarket; o: FuturesOutcome; score: number } =>
      Boolean(v),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, legs);

  return scored.map(({ m, o }) => legOf(m, o));
}

export default function SmartPicks({ markets }: { markets: FuturesMarket[] }) {
  const { hydrate } = useFuturesParlay();
  const [profile, setProfile] = useState<Profile>("balanced");
  const [legCount, setLegCount] = useState(3);
  const [shuffle, setShuffle] = useState(0);
  const [picks, setPicks] = useState<FuturesLeg[] | null>(null);

  const maxLegs = Math.min(4, new Set(markets.map((m) => m.league)).size);
  const legs = Math.min(legCount, Math.max(2, maxLegs));

  const build = (nextShuffle: number) => {
    setShuffle(nextShuffle);
    setPicks(buildParlay(markets, profile, legs, nextShuffle));
  };

  const decimal = picks
    ? picks.reduce((d, l) => d * americanToDecimal(l.price), 1)
    : 1;
  const american = picks ? decimalToAmerican(decimal) : 0;
  const winPct = picks
    ? picks.reduce((p, l) => p * (l.fairPct / 100), 1) * 100
    : 0;

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <span className={styles.spark}>✨</span>
        <div>
          <h2 className={styles.title}>AI parlay builder</h2>
          <p className={styles.sub}>
            Pick a strategy and we'll assemble a cross-sport parlay from live
            market odds. Guidance from the numbers — not a guaranteed winner.
          </p>
        </div>
      </div>

      <div className={styles.profiles}>
        {PROFILES.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.profile} ${profile === p.id ? styles.profileActive : ""}`}
            onClick={() => setProfile(p.id)}
          >
            <span className={styles.profileIcon}>{p.icon}</span>
            <span className={styles.profileLabel}>{p.label}</span>
            <span className={styles.profileBlurb}>{p.blurb}</span>
          </button>
        ))}
      </div>

      <div className={styles.controls}>
        <div className={styles.legStepper}>
          <span>Legs</span>
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              disabled={n > maxLegs}
              className={`${styles.legBtn} ${legs === n ? styles.legActive : ""}`}
              onClick={() => setLegCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.buildBtn}
          onClick={() => build(0)}
        >
          {picks ? "Rebuild" : "Build my parlay"}
        </button>
      </div>

      {picks && picks.length > 0 && (
        <div className={styles.result}>
          <ul className={styles.legs}>
            {picks.map((l) => (
              <li key={l.id} className={styles.leg}>
                <TeamAvatar
                  team={l.abbr ?? l.name}
                  sport={l.league}
                  size={34}
                  logoOverride={l.logo}
                />
                <div className={styles.legText}>
                  <span className={styles.legName}>
                    {l.displayName ?? l.name}
                    <span className={styles.legOdds}>
                      {formatAmerican(l.price)}
                    </span>
                  </span>
                  <span className={styles.legWhy}>
                    {rationale(l, l.league, profile)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className={styles.summary}>
            <div>
              <span className={styles.sLabel}>Combined odds</span>
              <strong>{formatAmerican(american)}</strong>
            </div>
            <div>
              <span className={styles.sLabel}>$10 returns</span>
              <strong>{formatCurrency(payoutFor(american))}</strong>
            </div>
            <div>
              <span className={styles.sLabel}>All win chance</span>
              <strong>
                {winPct < 0.1 ? "<0.1%" : `${winPct.toFixed(1)}%`}
              </strong>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.loadBtn}
              onClick={() => hydrate(picks)}
            >
              Load into slip
            </button>
            <button
              type="button"
              className={styles.shuffleBtn}
              onClick={() => build(shuffle + 1)}
            >
              🔀 Shuffle
            </button>
          </div>

          <p className={styles.disclaimer}>
            Built from de-vigged market odds, best-price edge & payout — place
            it at your own book and bet responsibly.
          </p>
        </div>
      )}
    </section>
  );
}
