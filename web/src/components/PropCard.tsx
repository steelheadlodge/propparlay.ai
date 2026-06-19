import type { PropPick } from "../types/prop";
import { bestBook, formatAmerican } from "../lib/odds";
import { useParlay } from "../context/ParlayContext";
import EdgeBadge from "./EdgeBadge";
import styles from "./PropCard.module.css";

export default function PropCard({ prop }: { prop: PropPick }) {
  const { isInSlip, toggleLeg } = useParlay();
  const best = bestBook(prop);
  const inSlip = isInSlip(prop.id);

  return (
    <article className={`${styles.card} ${inSlip ? styles.cardActive : ""}`}>
      <div className={styles.top}>
        <div>
          <div className={styles.meta}>
            <span className={styles.sport}>{prop.sport}</span>
            <span className={styles.time}>{prop.gameTime}</span>
          </div>
          <h2 className={styles.player}>{prop.player}</h2>
          <p className={styles.matchup}>
            {prop.team} vs {prop.opponent} · {prop.market}
          </p>
        </div>
        <EdgeBadge edge={prop.edge} />
      </div>

      <div className={styles.projection}>
        <div className={styles.projBlock}>
          <span className={styles.label}>AI projection</span>
          <span className={styles.value}>
            {prop.aiProjection} {prop.unit}
          </span>
        </div>
        <div className={styles.projBlock}>
          <span className={styles.label}>Pick</span>
          <span
            className={`${styles.pick} ${prop.recommendation === "over" ? styles.over : styles.under}`}
          >
            {prop.recommendation.toUpperCase()}
          </span>
        </div>
        <div className={styles.projBlock}>
          <span className={styles.label}>Confidence</span>
          <span className={styles.value}>{prop.confidence}%</span>
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
              <span className={styles.bookName}>{book.book}</span>
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
