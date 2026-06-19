import { useState } from "react";
import type { PropPick } from "../types/prop";
import { useParlay } from "../context/ParlayContext";
import {
  bestBook,
  formatAmerican,
  formatCurrency,
  parlayAmerican,
  parlayPayout,
} from "../lib/odds";
import styles from "./ParlaySlip.module.css";

export default function ParlaySlip({ legs }: { legs: PropPick[] }) {
  const { removeLeg, clear } = useParlay();
  const [stake, setStake] = useState(10);
  const [open, setOpen] = useState(true);

  const hasLegs = legs.length > 0;
  const combinedOdds = parlayAmerican(legs);
  const payout = parlayPayout(legs, stake);
  const profit = payout - stake;
  const avgConfidence = hasLegs
    ? Math.round(legs.reduce((s, l) => s + l.confidence, 0) / legs.length)
    : 0;

  return (
    <aside className={`${styles.slip} ${open ? "" : styles.collapsed}`}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={styles.headerTitle}>
          Parlay slip
          {hasLegs && <span className={styles.legCount}>{legs.length}</span>}
        </span>
        <span className={styles.chevron}>{open ? "▾" : "▴"}</span>
      </button>

      {open && (
        <div className={styles.body}>
          {!hasLegs ? (
            <p className={styles.empty}>
              Add legs from the picks below or tap a green hot zone to start a
              parlay.
            </p>
          ) : (
            <>
              <ul className={styles.legs}>
                {legs.map((leg) => (
                  <li key={leg.id} className={styles.leg}>
                    <div className={styles.legInfo}>
                      <span className={styles.legPlayer}>{leg.player}</span>
                      <span className={styles.legDetail}>
                        {leg.recommendation.toUpperCase()} {leg.market} ·{" "}
                        {formatAmerican(bestBook(leg).odds)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => removeLeg(leg.id)}
                      aria-label={`Remove ${leg.player}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              <div className={styles.stakeRow}>
                <label htmlFor="stake" className={styles.stakeLabel}>
                  Stake
                </label>
                <div className={styles.stakeInputWrap}>
                  <span>$</span>
                  <input
                    id="stake"
                    type="number"
                    min={0}
                    step={1}
                    value={stake}
                    onChange={(e) =>
                      setStake(Math.max(0, Number(e.target.value) || 0))
                    }
                    className={styles.stakeInput}
                  />
                </div>
              </div>

              <div className={styles.summary}>
                <div className={styles.summaryRow}>
                  <span>Combined odds</span>
                  <strong className={styles.odds}>
                    {formatAmerican(combinedOdds)}
                  </strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>Avg confidence</span>
                  <strong>{avgConfidence}%</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>To win</span>
                  <strong className={styles.profit}>
                    {formatCurrency(profit)}
                  </strong>
                </div>
                <div className={`${styles.summaryRow} ${styles.payoutRow}`}>
                  <span>Total payout</span>
                  <strong className={styles.payout}>
                    {formatCurrency(payout)}
                  </strong>
                </div>
              </div>

              <button type="button" className={styles.clearBtn} onClick={clear}>
                Clear slip
              </button>
              <p className={styles.disclaimer}>
                Preview only — odds are mock data. Not betting advice.
              </p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
