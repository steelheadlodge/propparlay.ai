import { useMemo, useState } from "react";
import { useFuturesParlay } from "../context/FuturesParlayContext";
import {
  americanToDecimal,
  decimalToAmerican,
  formatAmerican,
} from "../lib/odds";
import AnimatedNumber from "./AnimatedNumber";
import { needsLogoOutline } from "../lib/darkLogos";
import { buildParlayImage } from "../lib/parlayImage";
import { shareUrl } from "../lib/shareParlay";
import styles from "./FuturesSlip.module.css";

export default function FuturesSlip() {
  const { legs, remove, clear } = useFuturesParlay();
  const [stake, setStake] = useState(10);
  const [open, setOpen] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const decimal = useMemo(
    () => legs.reduce((acc, l) => acc * americanToDecimal(l.price), 1),
    [legs],
  );
  const american = legs.length ? decimalToAmerican(decimal) : 0;
  const payout = legs.length ? stake * decimal : 0;
  const profit = payout - stake;

  const conflict = useMemo(() => {
    const seen = new Set<string>();
    for (const l of legs) {
      const key = `${l.league}:${l.marketTitle}`;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }, [legs]);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const shareText = useMemo(() => {
    const names = legs.map((l) => l.displayName ?? l.name).join(" + ");
    return `Built a cross-sport futures parlay: ${names} at ${formatAmerican(american)} on PropParlay`;
  }, [legs, american]);

  const onShare = async () => {
    const url = shareUrl(legs);
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    try {
      const blob = await buildParlayImage(legs, american, payout, stake);
      const file = new File([blob], "propparlay.png", { type: "image/png" });
      if (nav.canShare?.({ files: [file], url }) && nav.share) {
        await nav.share({
          files: [file],
          title: "PropParlay.ai",
          text: shareText,
          url,
        });
      } else if (nav.share) {
        await nav.share({ title: "PropParlay.ai", text: shareText, url });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${url}`);
        flashToast("Link copied!");
      }
    } catch {
      /* user cancelled */
    }
  };

  const onSaveCard = async () => {
    try {
      const blob = await buildParlayImage(legs, american, payout, stake);
      const file = new File([blob], "propparlay.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: "PropParlay.ai", text: shareText });
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "propparlay-parlay.png";
        link.click();
        URL.revokeObjectURL(link.href);
        flashToast("Card saved!");
      }
    } catch {
      flashToast("Couldn't make card");
    }
  };

  return (
    <aside className={`${styles.slip} ${open ? "" : styles.collapsed}`}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.title}>
          Futures parlay
          {legs.length > 0 && (
            <span key={legs.length} className={styles.count}>
              {legs.length}
            </span>
          )}
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
                      <img
                        src={l.logo}
                        alt=""
                        className={`${styles.legLogo} ${
                          needsLogoOutline(l.league, l.abbr)
                            ? styles.legLogoOutline
                            : ""
                        }`}
                      />
                    ) : (
                      <span className={styles.legLogoFallback}>
                        {(l.abbr ?? l.name).slice(0, 3)}
                      </span>
                    )}
                    <span className={styles.legText}>
                      <span className={styles.legName}>
                        {l.displayName ?? l.name}
                      </span>
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
                  <strong>
                    {formatAmerican(american)}
                    <span className={styles.mult}>{decimal.toFixed(1)}×</span>
                  </strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>Profit</span>
                  <strong className={styles.profit}>
                    <AnimatedNumber value={profit} currency />
                  </strong>
                </div>
                <div className={`${styles.summaryRow} ${styles.payoutRow}`}>
                  <span>Total payout</span>
                  <strong>
                    <AnimatedNumber value={payout} currency />
                  </strong>
                </div>
              </div>

              <button type="button" className={styles.sharePrimary} onClick={onShare}>
                Share parlay
              </button>
              <div className={styles.shareRow}>
                <button type="button" className={styles.saveCard} onClick={onSaveCard}>
                  Save image card
                </button>
              </div>

              {toast && <p className={styles.toast}>{toast}</p>}

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
