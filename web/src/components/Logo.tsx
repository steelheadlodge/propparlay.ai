import styles from "./Logo.module.css";

// Brand monogram: two-tone "PP" echoing "Prop Parlay". Vector so it stays crisp
// at every size (header, favicon, the App Store icon source).
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      role="img"
    >
      <rect width="64" height="64" rx="15" fill="#0b0b0f" />
      <g
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight={800}
        textAnchor="middle"
      >
        <text x="23" y="45" fontSize="40" fill="#8b5cf6">
          P
        </text>
        <text x="41" y="45" fontSize="40" fill="#f8fafc">
          P
        </text>
      </g>
    </svg>
  );
}

export default function Logo() {
  return (
    <span className={styles.lockup}>
      <span className={styles.mark}>
        <LogoMark size={30} />
      </span>
      <span className={styles.word}>
        <span className={styles.prop}>prop</span>{" "}
        <span className={styles.parlay}>parlay</span>{" "}
        <span className={styles.ai}>ai</span>
      </span>
    </span>
  );
}
