import { useState } from "react";
import { mockHotZoneRows } from "../data/mockHotZones";
import { SPORTS, ZONE_META, type SportKey } from "../types/hotZone";
import styles from "./HotZonesGrid.module.css";

const SPORT_KEYS: SportKey[] = ["nba", "nhl", "nfl", "mlb"];

function cellKey(rowIndex: number, sport: SportKey) {
  return `${rowIndex}-${sport}`;
}

export default function HotZonesGrid({
  onSelectProp,
  selectedPropId,
}: {
  onSelectProp?: (propId: string) => void;
  selectedPropId?: string | null;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.title}>Hot zones</h2>
        <p className={styles.subtitle}>
          Sport × market grid — green is our pick, light green is a lean, red is
          a no-way fade.
        </p>
      </div>

      <div className={styles.legend}>
        {(Object.keys(ZONE_META) as Array<keyof typeof ZONE_META>).map(
          (zone) => (
            <div key={zone} className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles[zone]}`} />
              <span className={styles.legendLabel}>{ZONE_META[zone].label}</span>
            </div>
          ),
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.cornerHead}>Market</th>
              {SPORTS.map((sport) => (
                <th key={sport}>{sport}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockHotZoneRows.map((row, rowIndex) => (
              <tr key={row.market}>
                <th className={styles.rowHead}>{row.market}</th>
                {SPORT_KEYS.map((sport) => {
                  const cell = row[sport];
                  const key = cellKey(rowIndex, sport);
                  const isHovered = hovered === key;
                  const isSelected =
                    cell?.propId && cell.propId === selectedPropId;

                  return (
                    <td key={sport} className={styles.cellTd}>
                      {cell ? (
                        <button
                          type="button"
                          className={`${styles.cell} ${styles[cell.zone]} ${
                            isSelected ? styles.selected : ""
                          }`}
                          onMouseEnter={() => setHovered(key)}
                          onMouseLeave={() => setHovered(null)}
                          onFocus={() => setHovered(key)}
                          onBlur={() => setHovered(null)}
                          onClick={() =>
                            cell.propId && onSelectProp?.(cell.propId)
                          }
                          disabled={!cell.propId}
                          aria-label={`${row.market} ${sport.toUpperCase()}: ${ZONE_META[cell.zone].label}`}
                        >
                          <span className={styles.cellLine}>{cell.shortLabel}</span>
                          <span className={styles.cellPlayer}>{cell.player}</span>
                        </button>
                      ) : (
                        <div className={`${styles.cell} ${styles.empty}`}>—</div>
                      )}
                      {cell && isHovered && (
                        <div className={styles.tooltip} role="tooltip">
                          <strong>{ZONE_META[cell.zone].label}</strong>
                          <span>{cell.player} · {cell.market}</span>
                          {cell.edge != null && (
                            <span>
                              {cell.edge > 0 ? "+" : ""}
                              {cell.edge.toFixed(1)}% edge
                            </span>
                          )}
                          <span className={styles.tooltipHint}>
                            {ZONE_META[cell.zone].description}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
