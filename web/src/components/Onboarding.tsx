import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Onboarding.module.css";

const STORAGE_KEY = "propparlay_onboarded_v2";

const SLIDES = [
  {
    icon: "🧮",
    title: "Cross-sport futures parlays",
    body: "Back two title favorites at once — Super Bowl + World Series — and see the real combined odds in one ticket.",
  },
  {
    icon: "🟩",
    title: "The heat-map grid",
    body: "Pick a team down the side and one across the top. Greener cells are more likely to hit — that's your edge.",
  },
  {
    icon: "📤",
    title: "Share & tail picks",
    body: "Send a parlay link or image card. Friends open it in the app with your slip already loaded.",
  },
];

export function useOnboarding() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      /* private browsing */
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return { show, dismiss };
}

export default function Onboarding({
  open,
  onDone,
}: {
  open: boolean;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  if (!open) return null;

  const slide = SLIDES[step];
  const last = step === SLIDES.length - 1;

  const finish = () => {
    onDone();
    navigate("/grid");
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.card}>
        <div className={styles.dots}>
          {SLIDES.map((_, i) => (
            <span key={i} className={i === step ? styles.dotActive : styles.dot} />
          ))}
        </div>
        <span className={styles.icon}>{slide.icon}</span>
        <h2>{slide.title}</h2>
        <p>{slide.body}</p>
        <div className={styles.actions}>
          {step > 0 && (
            <button type="button" className={styles.ghost} onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          <button
            type="button"
            className={styles.primary}
            onClick={() => (last ? finish() : setStep((s) => s + 1))}
          >
            {last ? "Open the grid" : "Next"}
          </button>
        </div>
        <button type="button" className={styles.skip} onClick={finish}>
          Skip
        </button>
      </div>
    </div>
  );
}
