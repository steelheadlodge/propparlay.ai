import { useMemo, useState } from "react";
import type { FuturesLeg } from "../context/FuturesParlayContext";
import { useFuturesParlay } from "../context/FuturesParlayContext";
import { needsLogoOutline } from "../lib/darkLogos";
import { HEAT_META, heatTier } from "../lib/futuresHeat";
import {
  americanToDecimal,
  decimalToAmerican,
  formatAmerican,
  formatCurrency,
  payoutFor,
} from "../lib/odds";
import type { FuturesMarket, FuturesOutcome } from "../types/futures";
import styles from "./ParlayMatrix.module.css";

// Team-count options for the grid axes. "All" shows the full contender field
// we fetch (up to 14 per league); 6 / 10 give a tighter board.
const COUNT_OPTIONS = [6, 10, 99] as const;

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

type Insight = { icon: string; text: string };

function outcomeInsights(
  market: FuturesMarket,
  o: FuturesOutcome,
  rank: number,
): Insight[] {
  const tier = HEAT_META[heatTier(o.fairPct)];
  const race = market.title.replace(/\s*Winner$/i, "");
  const list: Insight[] = [
    {
      icon: "🎯",
      text: `${ordinal(rank)} in the ${race} race — ${o.fairPct.toFixed(
        1,
      )}% title chance (${tier.label.toLowerCase()}).`,
    },
  ];

  if (o.move && o.movePts != null && o.movePts >= 0.1) {
    list.push(
      o.move === "up"
        ? {
            icon: "▲",
            text: `Steaming up — implied chance is up ${o.movePts.toFixed(
              1,
            )} pts since we started tracking. Books are taking money on them.`,
          }
        : {
            icon: "▼",
            text: `Drifting — implied chance is down ${o.movePts.toFixed(
              1,
            )} pts since tracking began. The market is cooling on them.`,
          },
    );
  } else {
    list.push({
      icon: "➖",
      text: "Line has held steady since we started tracking.",
    });
  }

  list.push({
    icon: "🏦",
    text: `Priced across ${o.books} book${o.books === 1 ? "" : "s"} — ${
      o.books >= 4 ? "strong" : "limited"
    } market consensus.`,
  });

  return list;
}

function parlayRead(tiers: ReturnType<typeof heatTier>[]): string {
  const n = tiers.length;
  const strong = tiers.filter((t) => t === "fav" || t === "contender").length;
  const weak = n - strong;
  if (weak === 0)
    return `All ${n} picks are well-backed — the safest cross-sport stack you can build here. Smaller payout, but the best shot to actually cash.`;
  if (strong === 0)
    return `Every leg is a long shot — a true lottery ticket. Small chance they all land, but the payout is massive if they do.`;
  return `${strong} solid pick${strong > 1 ? "s" : ""} anchored by ${weak} long shot${
    weak > 1 ? "s" : ""
  } — the underdogs drive the payout, but you need every leg to land.`;
}

function fmtPct(p: number): string {
  if (p <= 0) return "0%";
  if (p < 0.1) return "<0.1%";
  return `${p.toFixed(1)}%`;
}

function legOf(market: FuturesMarket, o: FuturesOutcome): FuturesLeg {
  return {
    id: `${market.key}:${o.name}`,
    league: market.league,
    marketKey: market.key,
    marketTitle: market.title,
    name: o.name,
    displayName: o.displayName,
    abbr: o.abbr,
    logo: o.logo,
    price: o.price,
    fairPct: o.fairPct,
  };
}

function Avatar({
  o,
  league,
}: {
  o: FuturesOutcome;
  league: string;
}) {
  if (!o.logo) {
    return <span className={styles.logoFallback}>{o.abbr ?? "?"}</span>;
  }
  return (
    <img
      src={o.logo}
      alt=""
      className={`${styles.logo} ${
        needsLogoOutline(league, o.abbr) ? styles.logoOutline : ""
      }`}
      loading="lazy"
    />
  );
}

export default function ParlayMatrix({ markets }: { markets: FuturesMarket[] }) {
  const { toggle, has } = useFuturesParlay();

  // Default axes: row = first market, column = first market in another league.
  const defaultY = markets[0]?.key ?? "";
  const defaultX =
    markets.find((m) => m.league !== markets[0]?.league)?.key ??
    markets[1]?.key ??
    "";

  const [yKey, setYKey] = useState(defaultY);
  const [xKey, setXKey] = useState(defaultX);
  const [sel, setSel] = useState<{ x: string | null; y: string | null }>({
    x: null,
    y: null,
  });
  // Extra "pinned" legs (3rd / 4th team) that fold into every cell so the grid
  // can represent a 3- or 4-leg parlay while staying a 2-axis chart.
  const [pins, setPins] = useState<FuturesLeg[]>([]);
  // How many teams to show per axis (defaults to the full field).
  const [shown, setShown] = useState<number>(99);
  // Per-axis search filters.
  const [qy, setQy] = useState("");
  const [qx, setQx] = useState("");

  const yMarket = markets.find((m) => m.key === yKey) ?? markets[0];
  const xMarket =
    markets.find((m) => m.key === xKey && m.key !== yKey) ??
    markets.find((m) => m.key !== yMarket?.key);

  // Changing an axis to a market that's pinned would double-count it; drop any
  // pin on that market and reset the current selection.
  const changeY = (k: string) => {
    setYKey(k);
    setPins((p) => p.filter((l) => l.marketKey !== k));
    setSel({ x: null, y: null });
  };
  const changeX = (k: string) => {
    setXKey(k);
    setPins((p) => p.filter((l) => l.marketKey !== k));
    setSel({ x: null, y: null });
  };

  // A search term filters the entire field for that axis; otherwise we show the
  // top `shown` teams.
  const filterOuts = (m: FuturesMarket | undefined, q: string) => {
    if (!m) return [];
    const term = q.trim().toLowerCase();
    if (!term) return m.outcomes.slice(0, shown);
    return m.outcomes.filter((o) =>
      (o.displayName ?? o.name).toLowerCase().includes(term),
    );
  };
  const yOuts = useMemo(
    () => filterOuts(yMarket, qy),
    [yMarket, shown, qy],
  );
  const xOuts = useMemo(
    () => filterOuts(xMarket, qx),
    [xMarket, shown, qx],
  );

  // Normalize combined win probability across the grid for the heat map, and
  // find the single "safest" (most likely) combo to flag as the hot spot.
  const { minP, maxP, hotKey } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    let hot = "";
    for (const y of yOuts) {
      for (const x of xOuts) {
        const p = (y.fairPct / 100) * (x.fairPct / 100);
        if (p < lo) lo = p;
        if (p > hi) {
          hi = p;
          hot = `${y.name}|${x.name}`;
        }
      }
    }
    return { minP: lo, maxP: hi, hotKey: hot };
  }, [yOuts, xOuts]);

  if (!xMarket || !yMarket || xMarket.key === yMarket.key) {
    return (
      <p className={styles.note}>
        The grid needs two different championship markets. Check back when a
        second league posts futures.
      </p>
    );
  }

  const selectedY = sel.y ? yOuts.find((o) => o.name === sel.y) : null;
  const selectedX = sel.x ? xOuts.find((o) => o.name === sel.x) : null;
  const bothSelected = !!selectedY && !!selectedX;

  // Pinned legs multiply into every cell's odds and payout.
  const pinsDecimal = pins.reduce(
    (d, l) => d * americanToDecimal(l.price),
    1,
  );
  const pinsProb = pins.reduce((p, l) => p * (l.fairPct / 100), 1);

  const comboDecimal =
    bothSelected && selectedY && selectedX
      ? americanToDecimal(selectedY.price) *
        americanToDecimal(selectedX.price) *
        pinsDecimal
      : 0;
  const comboAmerican = comboDecimal ? decimalToAmerican(comboDecimal) : 0;
  const comboPct =
    selectedY && selectedX
      ? (selectedY.fairPct / 100) * (selectedX.fairPct / 100) * pinsProb * 100
      : 0;

  const legCount = 2 + pins.length;

  const addCombo = () => {
    if (!selectedY || !selectedX || !xMarket || !yMarket) return;
    for (const pin of pins) if (!has(pin.id)) toggle(pin);
    const yLeg = legOf(yMarket, selectedY);
    const xLeg = legOf(xMarket, selectedX);
    if (!has(yLeg.id)) toggle(yLeg);
    if (!has(xLeg.id)) toggle(xLeg);
  };

  // Resolve a pinned leg back to its market + outcome for the insight card.
  const resolvePin = (l: FuturesLeg) => {
    const m = markets.find((mm) => mm.key === l.marketKey);
    const o = m?.outcomes.find((oo) => oo.name === l.name);
    return m && o ? { market: m, o } : null;
  };

  const pinnableMarkets = markets.filter(
    (m) =>
      m.key !== yMarket.key &&
      m.key !== xMarket.key &&
      !pins.some((p) => p.marketKey === m.key),
  );

  const heatFor = (y: FuturesOutcome, x: FuturesOutcome) => {
    const p = (y.fairPct / 100) * (x.fairPct / 100);
    const t = maxP > minP ? (p - minP) / (maxP - minP) : 0;
    return 0.05 + t * 0.5;
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.axisPickers}>
        <label className={styles.picker}>
          <span>Down ↓</span>
          <select value={yMarket.key} onChange={(e) => changeY(e.target.value)}>
            {markets.map((m) => (
              <option key={m.key} value={m.key}>
                {m.league} · {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.picker}>
          <span>Across →</span>
          <select value={xMarket.key} onChange={(e) => changeX(e.target.value)}>
            {markets
              .filter((m) => m.key !== yMarket.key)
              .map((m) => (
                <option key={m.key} value={m.key}>
                  {m.league} · {m.title}
                </option>
              ))}
          </select>
        </label>
        <div className={styles.picker}>
          <span>Teams</span>
          <div className={styles.countToggle}>
            {COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.countBtn} ${shown === n ? styles.countActive : ""}`}
                onClick={() => setShown(n)}
              >
                {n === 99 ? "All" : n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.searchRow}>
        <input
          type="search"
          className={styles.search}
          placeholder={`🔎 Search ${yMarket.league} (down)…`}
          value={qy}
          onChange={(e) => setQy(e.target.value)}
        />
        <input
          type="search"
          className={styles.search}
          placeholder={`🔎 Search ${xMarket.league} (across)…`}
          value={qx}
          onChange={(e) => setQx(e.target.value)}
        />
      </div>

      <div className={styles.pinRow}>
        <span className={styles.pinLabel}>Extra legs</span>
        {pins.map((l) => (
          <span key={l.id} className={styles.pinChip}>
            <span className={styles.pinLeague}>{l.league}</span>
            {l.displayName ?? l.name}
            <button
              type="button"
              aria-label={`Remove ${l.name}`}
              onClick={() =>
                setPins((p) => p.filter((x) => x.id !== l.id))
              }
            >
              ×
            </button>
          </span>
        ))}
        {pins.length < 2 && pinnableMarkets.length > 0 ? (
          <PinPicker
            markets={pinnableMarkets}
            onAdd={(leg) => setPins((p) => [...p, leg])}
          />
        ) : pins.length === 0 ? (
          <span className={styles.pinHint}>
            add a 3rd / 4th team to fold into every box
          </span>
        ) : null}
      </div>

      <p className={styles.legend}>
        Greener cells are <strong>more likely to hit</strong>. Pick a row and a
        column (or tap any cell) to lock a combo — 🔥 marks the safest pairing.
        {pins.length > 0 && (
          <strong className={styles.legendPins}>
            {" "}
            Every box now includes your {pins.length} pinned leg
            {pins.length > 1 ? "s" : ""}.
          </strong>
        )}
      </p>

      {yOuts.length === 0 || xOuts.length === 0 ? (
        <p className={styles.note}>No teams match your search.</p>
      ) : (
      <div className={styles.scroll}>
        <div
          className={styles.grid}
          style={{ ["--cols" as string]: xOuts.length }}
        >
          {/* Corner */}
          <div className={styles.corner}>
            <span className={styles.cornerY}>↓ {yMarket.league}</span>
            <span className={styles.cornerX}>→ {xMarket.league}</span>
          </div>

          {/* Column headers */}
          {xOuts.map((x) => {
            const active = sel.x === x.name;
            return (
              <button
                key={x.name}
                type="button"
                className={`${styles.colHead} ${active ? styles.headActive : ""}`}
                onClick={() =>
                  setSel((s) => ({ ...s, x: s.x === x.name ? null : x.name }))
                }
              >
                <Avatar o={x} league={xMarket.league} />
                <span className={styles.headName}>
                  {x.displayName ?? x.name}
                </span>
              </button>
            );
          })}

          {/* Rows */}
          {yOuts.map((y) => (
            <Row key={y.name}>
              <button
                type="button"
                className={`${styles.rowHead} ${sel.y === y.name ? styles.headActive : ""}`}
                onClick={() =>
                  setSel((s) => ({ ...s, y: s.y === y.name ? null : y.name }))
                }
              >
                <Avatar o={y} league={yMarket.league} />
                <span className={styles.headName}>
                  {y.displayName ?? y.name}
                </span>
              </button>

              {xOuts.map((x) => {
                const dec =
                  americanToDecimal(y.price) *
                  americanToDecimal(x.price) *
                  pinsDecimal;
                const am = decimalToAmerican(dec);
                const isSel = sel.y === y.name && sel.x === x.name;
                const isHot = `${y.name}|${x.name}` === hotKey;
                const crossHi = sel.y === y.name || sel.x === x.name;
                return (
                  <button
                    key={x.name}
                    type="button"
                    className={`${styles.cell} ${isSel ? styles.cellSel : ""} ${
                      crossHi ? styles.cellCross : ""
                    }`}
                    style={{
                      ["--heat" as string]: `rgba(52, 211, 153, ${heatFor(y, x)})`,
                    }}
                    onClick={() => setSel({ y: y.name, x: x.name })}
                  >
                    <span className={styles.cellOdds}>{formatAmerican(am)}</span>
                    <span className={styles.cellPay}>
                      ${payoutFor(am)}
                    </span>
                    {isHot && <span className={styles.hot}>🔥</span>}
                  </button>
                );
              })}
            </Row>
          ))}
        </div>
      </div>
      )}

      {bothSelected && selectedY && selectedX && (
        <div className={styles.detail}>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={() => setSel({ x: null, y: null })}
          >
            ×
          </button>

          {(() => {
            const legs = [
              ...pins
                .map(resolvePin)
                .filter((v): v is { market: FuturesMarket; o: FuturesOutcome } =>
                  Boolean(v),
                ),
              { market: yMarket, o: selectedY },
              { market: xMarket, o: selectedX },
            ];
            const tiers = legs.map(({ o }) => heatTier(o.fairPct));
            return (
              <>
                <div className={styles.detailHead}>
                  {legs.map(({ market, o }, i) => (
                    <span key={market.key} className={styles.detailLeg}>
                      {i > 0 && <span className={styles.plus}>+</span>}
                      <Avatar o={o} league={market.league} />
                      <span>{o.displayName ?? o.name}</span>
                    </span>
                  ))}
                </div>

                <div className={styles.detailStats}>
                  <div>
                    <span className={styles.dLabel}>
                      {legCount}-leg odds
                    </span>
                    <strong>{formatAmerican(comboAmerican)}</strong>
                  </div>
                  <div>
                    <span className={styles.dLabel}>$10 returns</span>
                    <strong>{formatCurrency(payoutFor(comboAmerican))}</strong>
                  </div>
                  <div>
                    <span className={styles.dLabel}>All win chance</span>
                    <strong>{fmtPct(comboPct)}</strong>
                  </div>
                </div>

                <p className={styles.read}>
                  <span className={styles.readIcon}>💡</span>
                  {parlayRead(tiers)}
                </p>

                <div className={styles.legCards}>
                  {legs.map(({ market, o }) => {
                    const rank =
                      market.outcomes.findIndex((x) => x.name === o.name) + 1;
                    const tier = HEAT_META[heatTier(o.fairPct)];
                    return (
                      <div key={market.key} className={styles.legCard}>
                        <div className={styles.legCardHead}>
                          <Avatar o={o} league={market.league} />
                          <span className={styles.legCardName}>
                            {o.displayName ?? o.name}
                          </span>
                          <span
                            className={styles.tierPill}
                            style={{
                              color: tier.color,
                              borderColor: tier.color,
                            }}
                          >
                            {tier.label}
                          </span>
                        </div>
                        <ul className={styles.insightList}>
                          {outcomeInsights(market, o, rank).map((ins, i) => (
                            <li key={i}>
                              <span className={styles.insightIcon}>
                                {ins.icon}
                              </span>
                              {ins.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          <p className={styles.disclaimer}>
            Insights are drawn from live market odds & price movement — not a
            prediction. Always do your own research.
          </p>

          <button type="button" className={styles.addBtn} onClick={addCombo}>
            Add {legCount}-leg parlay
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className={styles.rowGroup}>{children}</div>;
}

function PinPicker({
  markets,
  onAdd,
}: {
  markets: FuturesMarket[];
  onAdd: (leg: FuturesLeg) => void;
}) {
  const [marketKey, setMarketKey] = useState("");
  const market = markets.find((m) => m.key === marketKey);

  return (
    <span className={styles.pinPicker}>
      <select
        value={marketKey}
        onChange={(e) => setMarketKey(e.target.value)}
        aria-label="Choose a league for an extra leg"
      >
        <option value="">+ Add leg…</option>
        {markets.map((m) => (
          <option key={m.key} value={m.key}>
            {m.league} · {m.title}
          </option>
        ))}
      </select>
      {market && (
        <select
          value=""
          aria-label="Choose a team for the extra leg"
          onChange={(e) => {
            const o = market.outcomes.find((oo) => oo.name === e.target.value);
            if (o) {
              onAdd(legOf(market, o));
              setMarketKey("");
            }
          }}
        >
          <option value="">Pick a team…</option>
          {market.outcomes.map((o) => (
            <option key={o.name} value={o.name}>
              {o.displayName ?? o.name}
            </option>
          ))}
        </select>
      )}
    </span>
  );
}
