import { formatAmerican } from "../lib/odds";
import type { PickOfDay } from "../lib/pickOfDay";
import styles from "./PickOfDayBanner.module.css";

export default function PickOfDayBanner({
  pick,
  onLoad,
}: {
  pick: PickOfDay;
  onLoad: () => void;
}) {
  return (
    <button type="button" className={styles.banner} onClick={onLoad}>
      <span className={styles.tag}>Pick of the day</span>
      <span className={styles.text}>
        <strong>{pick.names[0]}</strong> × <strong>{pick.names[1]}</strong>
        <span className={styles.odds}>{formatAmerican(pick.american)}</span>
      </span>
      <span className={styles.cta}>Load →</span>
    </button>
  );
}
