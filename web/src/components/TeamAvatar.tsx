import { useState } from "react";
import { needsLogoOutline } from "../lib/darkLogos";
import { espnLogoUrl, teamColor } from "../lib/theme";
import styles from "./TeamAvatar.module.css";

export default function TeamAvatar({
  team,
  sport,
  size = 44,
  headshot = null,
  logoOverride = null,
}: {
  team: string;
  sport: string;
  size?: number;
  headshot?: string | null;
  logoOverride?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const [headshotFailed, setHeadshotFailed] = useState(false);
  const color = teamColor(team);
  const logo = logoOverride ?? espnLogoUrl(sport, team);

  // Prefer a player headshot when available; fall back to logo, then monogram.
  if (headshot && !headshotFailed) {
    return (
      <span
        className={styles.headshotWrap}
        style={{ width: size, height: size, borderColor: `${color}88` }}
        aria-hidden
      >
        <img
          src={headshot}
          alt=""
          loading="lazy"
          className={styles.headshot}
          onError={() => setHeadshotFailed(true)}
        />
      </span>
    );
  }

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
          className={`${styles.logo} ${
            needsLogoOutline(sport, team) ? styles.logoOutline : ""
          }`}
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
