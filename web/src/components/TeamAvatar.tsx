import { useState } from "react";
import { espnLogoUrl, teamColor } from "../lib/theme";
import styles from "./TeamAvatar.module.css";

export default function TeamAvatar({
  team,
  sport,
  size = 44,
}: {
  team: string;
  sport: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const color = teamColor(team);
  const logo = espnLogoUrl(sport, team);

  if (logo && !failed) {
    return (
      <span
        className={styles.logoWrap}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <img
          src={logo}
          alt=""
          loading="lazy"
          className={styles.logo}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        boxShadow: `0 4px 16px ${color}55`,
        fontSize: size * 0.3,
      }}
      aria-hidden
    >
      {team}
    </span>
  );
}
