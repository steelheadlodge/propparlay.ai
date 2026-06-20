import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Animates a number from its previous value to the new target with an
// easeOutCubic curve. Respects reduced-motion and starts from wherever the
// display currently is so rapid changes stay smooth.
export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    displayRef.current = value;
  });

  useEffect(() => {
    const from = displayRef.current;
    const to = target;
    if (from === to || prefersReducedMotion()) {
      setValue(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
