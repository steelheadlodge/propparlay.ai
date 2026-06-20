import { useGames } from "../hooks/useGames";
import { sportTheme } from "../lib/theme";
import type { GameSide, LiveGame } from "../types/game";
import SportIcon from "./SportIcon";
import styles from "./GamesBoard.module.css";

function Side({ side, dim }: { side: GameSide; dim: boolean }) {
  return (
    <div className={`${styles.side} ${dim ? styles.dim : ""}`}>
      {side.logo ? (
        <img src={side.logo} alt="" className={styles.logo} loading="lazy" />
      ) : (
        <span className={styles.logoFallback}>{side.abbr}</span>
      )}
      <span className={styles.abbr}>{side.abbr}</span>
      {side.score != null && <span className={styles.score}>{side.score}</span>}
    </div>
  );
}

function GameTile({ game }: { game: LiveGame }) {
  const theme = sportTheme(game.league);
  const homeWon = game.status === "final" && game.home.winner;
  const awayWon = game.status === "final" && game.away.winner;

  return (
    <div
      className={styles.tile}
      style={{ ["--sport-color" as string]: theme.color }}
    >
      <div className={styles.tileHead}>
        <span className={styles.league}>
          <SportIcon sport={game.league} size={12} />
          {game.league}
        </span>
        {game.status === "live" ? (
          <span className={styles.live}>
            <span className={styles.liveDot} />
            {game.clock ?? "LIVE"}
          </span>
        ) : game.status === "final" ? (
          <span className={styles.final}>{game.clock ?? "Final"}</span>
        ) : (
          <span className={styles.time}>{game.time}</span>
        )}
      </div>
      <Side side={game.away} dim={game.status === "final" && !awayWon} />
      <Side side={game.home} dim={game.status === "final" && !homeWon} />
    </div>
  );
}

export default function GamesBoard() {
  const state = useGames();

  if (state.status === "error") return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {state.status === "ready" && state.data.isTomorrow
            ? "Tomorrow's games"
            : "Tonight's games"}
          <span className={styles.liveTag}>LIVE · ESPN</span>
        </h2>
        {state.status === "ready" && (
          <span className={styles.dateLabel}>{state.data.dateLabel}</span>
        )}
      </div>

      {state.status === "loading" ? (
        <div className={styles.row}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.tile} ${styles.skeleton}`} />
          ))}
        </div>
      ) : state.data.games.length === 0 ? (
        <p className={styles.empty}>No games on the board right now.</p>
      ) : (
        <div className={styles.row}>
          {state.data.games.map((g) => (
            <GameTile key={g.id} game={g} />
          ))}
        </div>
      )}
    </section>
  );
}
