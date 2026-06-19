import { teamColor } from "../lib/theme";
import styles from "./TeamAvatar.module.css";

export default function TeamAvatar({
  team,
  size = 44,
}: {
  team: string;
  size?: number;
}) {
  const color = teamColor(team);
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
