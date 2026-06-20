import { useMemo, useState } from "react";
import { useFuturesParlay } from "../context/FuturesParlayContext";
import {
  americanToDecimal,
  decimalToAmerican,
  formatAmerican,
  formatCurrency,
} from "../lib/odds";
import styles from "./FuturesSlip.module.css";

export default function FuturesSlip() {
  const { legs, remove, clear } = useFuturesParlay();
  const [stake, setStake] = useState(10);
  const [open, setOpen] = useState(true);

  const decimal = useMemo(
    () => legs.reduce((acc, l) => acc * americanToDecimal(l.price), 1),
    [legs],
  );
  const american = legs.length ? decimalToAmerican(decimal) : 0;
  const payout = legs.length ? stake * decimal : 0;
  const profit = payout - stake;

  // Two legs from the same market can't both win — flag it gently.
  const conflict = useMemo(() => {
    const seen = new Set<string>();
    for (const l of legs) {
      const key = `${l.league}:${l.marketTitle}`;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }, [legs]);

  return (
    <aside className={`${styles.slip} ${open ? "" : styles.collapsed}`}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.title}>
          Futures parlay
          {legs.length > 0 && <span className={styles.count}>{legs.length}</span>}
        </span>
        <span className={styles.toggle}>{open ? "▾" : "▴"}</span>
      </button>

      {open && (
        <div className={styles.body}>
          {legs.length === 0 ? (
            <p className={styles.empty}>
              Tap contenders above — World Series, Super Bowl and more — to build
              a cross-sport title parlay.
            </p>
          ) : (
            <>
              <ul className={styles.legs}>
                {legs.map((l) => (
                  <li key={l.id} className={styles.leg}>
                    {l.logo ? (
                      <img src={l.logo} alt="" className={styles.legLogo} />
                    ) : (
                      <span className={styles.legLogoFallback}>
                        {(l.abbr ?? l.name).slice(0, 3)}
                      </span>
                    )}
                    <span className={styles.legText}>
                      <span className={styles.legName}>{l.name}</span>
                      <span className={styles.legMarket}>
                        {l.league} · {l.marketTitle}
                      </span>
                    </span>
                    <span className={styles.legOdds}>
                      {formatAmerican(l.price)}
                    </span>
                    <button
                      type="button"
                      className={styles.legRemove}
                      onClick={() => remove(l.id)}
                      aria-label={`Remove ${l.name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              {conflict && (
                <p className={styles.conflict}>
                  Heads up — two picks in the same market can't both win.
                </p>
              )}

              <div className={styles.stakeRow}>
                <label className={styles.stakeLabel}>Stake</label>
                <div className={styles.stakeInput}>
                  <span>$</span>
                  <input
                    type="number"
                    min={1}
                    value={stake}
                    onChange={(e) =>
                      setStake(Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </div>
              </div>

              <div className={styles.summary}>
                <div className={styles.summaryRow}>
                  <span>Combined odds</span>
                  <strong>{formatAmerican(american)}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>Profit</span>
                  <strong className={styles.profit}>
                    {formatCurrency(profit)}
                  </strong>
                </div>
                <div className={`${styles.summaryRow} ${styles.payoutRow}`}>
                  <span>Total payout</span>
                  <strong>{formatCurrency(payout)}</strong>
                </div>
              </div>

              <button type="button" className={styles.clear} onClick={clear}>
                Clear slip
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
