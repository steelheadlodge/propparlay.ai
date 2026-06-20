import { isSoccer, sportTheme } from "../lib/theme";

export default function SportIcon({
  sport,
  size = 16,
}: {
  sport: string;
  size?: number;
}) {
  const { color } = sportTheme(sport);
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    "aria-hidden": true as const,
  };

  if (isSoccer(sport)) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
        <path
          d="M12 7.5l2.6 1.9-1 3.1h-3.2l-1-3.1L12 7.5z"
          stroke={color}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M12 3v2.2M5.2 8.5l2 1.4M18.8 8.5l-2 1.4M7.2 18l1.3-2M16.8 18l-1.3-2"
          stroke={color}
          strokeWidth="1.2"
        />
      </svg>
    );
  }

  switch (sport) {
    case "NBA":
    case "NCAAB":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
          <path
            d="M3 12h18M12 3v18M5.5 5.5c3 2.5 3 10.5 0 13M18.5 5.5c-3 2.5-3 10.5 0 13"
            stroke={color}
            strokeWidth="1.4"
          />
        </svg>
      );
    case "NHL":
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12" rx="9" ry="5" stroke={color} strokeWidth="1.8" />
          <path d="M3 12v3c0 1.5 4 3 9 3s9-1.5 9-3v-3" stroke={color} strokeWidth="1.8" />
        </svg>
      );
    case "NFL":
    case "NCAAF":
      return (
        <svg {...common}>
          <ellipse
            cx="12"
            cy="12"
            rx="9"
            ry="5.5"
            stroke={color}
            strokeWidth="1.8"
            transform="rotate(-30 12 12)"
          />
          <path d="M9 12h6M11 10.5v3M13 10.5v3" stroke={color} strokeWidth="1.4" />
        </svg>
      );
    case "MLB":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
          <path
            d="M7 5c2 2 2 12 0 14M17 5c-2 2-2 12 0 14"
            stroke={color}
            strokeWidth="1.2"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
        </svg>
      );
  }
}
