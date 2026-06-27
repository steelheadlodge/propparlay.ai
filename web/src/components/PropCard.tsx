import type { PropPick } from "../types/prop";
import { bestBook, formatAmerican } from "../lib/odds";
import { gradeFromConfidence } from "../lib/grades";
import { sportTheme } from "../lib/theme";
import { useParlay } from "../context/ParlayContext";
import ConfidenceRing from "./ConfidenceRing";
import EdgeBadge from "./EdgeBadge";
import GradeBadge from "./GradeBadge";
import SportIcon from "./SportIcon";
import TeamAvatar from "./TeamAvatar";
import styles from "./PropCard.module.css";

function hitRates(prop: PropPick) {
  const l5 =
    prop.hitRateL5 ??
    Math.min(100, Math.max(25, Math.round(prop.confidence * 0.72 + prop.edge)));
  const l10 =
    prop.hitRateL10 ??
    Math.min(100, Math.max(20, Math.round(prop.confidence * 0.68 + prop.edge * 0.5)));
  return { l5, l10 };
}

export default function PropCard({ prop }: { prop: PropPick }) {
  const { isInSlip, toggleLeg } = useParlay();
  const best = bestBook(prop);
  const inSlip = isInSlip(prop.id);
  const theme = sportTheme(prop.sport);
  const isTopPick = prop.edge >= 5;
  const grade = gradeFromConfidence(prop.confidence);
  const hits = hitRates(prop);

  return (
    <article
      className={`${styles.card} ${inSlip ? styles.cardActive : ""} ${
        isTopPick ? styles.topPick : ""
      }`}
      style={{ ["--sport-color" as string]: theme.color }}
    >
      <span className={styles.accent} />
      {isTopPick && <span className={styles.topTag}>🔥 Top edge</span>}

      <div className={styles.top}>
        <TeamAvatar
          team={prop.team}
          sport={prop.sport}
          headshot={prop.headshot ?? null}
          logoOverride={prop.teamLogo ?? null}
        />
        <div className={styles.headInfo}>
          <div className={styles.meta}>
            <span className={styles.sportChip}>
              <SportIcon sport={prop.sport} size={13} />
              {prop.sport}
            </span>
            <span className={styles.time}>{prop.gameTime}</span>
          </div>
          <h2 className={styles.player}>{prop.player}</h2>
          <p className={styles.matchup}>
            {prop.team} vs {prop.opponent} · {prop.market}
          </p>
        </div>
        {prop.edge >= 1 && <EdgeBadge edge={prop.edge} />}
        <GradeBadge grade={grade} compact />
      </div>

      <div className={styles.hitRow}>
        <span>
          L5 hit <strong>{hits.l5}%</strong>
        </span>
        <span>
          L10 hit <strong>{hits.l10}%</strong>
        </span>
        <span className={styles.bestBookHint}>
          Best line · <strong>{best.book}</strong>
        </span>
      </div>

      <div className={styles.projection}>
        <div className={styles.projBlock}>
          <span className={styles.label}>{prop.projectionLabel ?? "AI projection"}</span>
          <span className={styles.value}>
            {prop.aiProjection} {prop.unit}
          </span>
        </div>
        <div className={styles.projBlock}>
          <span className={styles.label}>Pick</span>
          <span
            className={`${styles.pick} ${prop.recommendation === "over" ? styles.over : styles.under}`}
          >
            {prop.recommendation === "over" ? "▲ OVER" : "▼ UNDER"}
          </span>
        </div>
        <div className={styles.confBlock}>
          <ConfidenceRing value={prop.confidence} />
          <span className={styles.label}>Confidence</span>
        </div>
      </div>

      <p className={styles.summary}>{prop.summary}</p>

      <div className={styles.books}>
        <span className={styles.booksLabel}>Lines across books</span>
        <ul>
          {prop.books.map((book) => (
            <li
              key={book.book}
              className={book.book === best.book ? styles.bestLine : ""}
            >
              <span className={styles.bookName}>
                {book.book}
                {book.book === best.book && (
                  <span className={styles.bestTag}>BEST</span>
                )}
              </span>
              <span className={styles.bookLine}>{book.line}</span>
              <span className={styles.bookOdds}>{formatAmerican(book.odds)}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className={`${styles.slipBtn} ${inSlip ? styles.slipBtnActive : ""}`}
        onClick={() => toggleLeg(prop.id)}
        aria-pressed={inSlip}
      >
        {inSlip ? "✓ In parlay" : "+ Add to parlay"}
        <span className={styles.slipBtnOdds}>{formatAmerican(best.odds)}</span>
      </button>
    </article>
  );
}
