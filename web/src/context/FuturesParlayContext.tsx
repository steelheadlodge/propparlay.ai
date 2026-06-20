import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type FuturesLeg = {
  id: string;
  league: string;
  marketTitle: string;
  name: string;
  abbr: string | null;
  logo: string | null;
  price: number;
  fairPct: number;
};

type Ctx = {
  legs: FuturesLeg[];
  has: (id: string) => boolean;
  toggle: (leg: FuturesLeg) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const FuturesParlayCtx = createContext<Ctx | null>(null);

export function FuturesParlayProvider({ children }: { children: ReactNode }) {
  const [legs, setLegs] = useState<FuturesLeg[]>([]);

  const toggle = useCallback((leg: FuturesLeg) => {
    setLegs((prev) =>
      prev.some((l) => l.id === leg.id)
        ? prev.filter((l) => l.id !== leg.id)
        : [...prev, leg],
    );
  }, []);

  const remove = useCallback(
    (id: string) => setLegs((prev) => prev.filter((l) => l.id !== id)),
    [],
  );

  const clear = useCallback(() => setLegs([]), []);

  const value = useMemo<Ctx>(
    () => ({
      legs,
      has: (id) => legs.some((l) => l.id === id),
      toggle,
      remove,
      clear,
    }),
    [legs, toggle, remove, clear],
  );

  return (
    <FuturesParlayCtx.Provider value={value}>
      {children}
    </FuturesParlayCtx.Provider>
  );
}

export function useFuturesParlay(): Ctx {
  const ctx = useContext(FuturesParlayCtx);
  if (!ctx) throw new Error("useFuturesParlay must be used within provider");
  return ctx;
}
