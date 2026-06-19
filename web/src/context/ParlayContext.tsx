import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PropPick } from "../types/prop";

type ParlayContextValue = {
  legIds: string[];
  isInSlip: (id: string) => boolean;
  toggleLeg: (id: string) => void;
  removeLeg: (id: string) => void;
  clear: () => void;
};

const ParlayContext = createContext<ParlayContextValue | null>(null);

export function ParlayProvider({ children }: { children: ReactNode }) {
  const [legIds, setLegIds] = useState<string[]>([]);

  const toggleLeg = useCallback((id: string) => {
    setLegIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const removeLeg = useCallback((id: string) => {
    setLegIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clear = useCallback(() => setLegIds([]), []);

  const value = useMemo<ParlayContextValue>(
    () => ({
      legIds,
      isInSlip: (id: string) => legIds.includes(id),
      toggleLeg,
      removeLeg,
      clear,
    }),
    [legIds, toggleLeg, removeLeg, clear],
  );

  return (
    <ParlayContext.Provider value={value}>{children}</ParlayContext.Provider>
  );
}

export function useParlay(): ParlayContextValue {
  const ctx = useContext(ParlayContext);
  if (!ctx) throw new Error("useParlay must be used within a ParlayProvider");
  return ctx;
}

/** Resolve selected leg IDs to full props, preserving selection order. */
export function selectedLegs(
  legIds: string[],
  allProps: PropPick[],
): PropPick[] {
  return legIds
    .map((id) => allProps.find((p) => p.id === id))
    .filter((p): p is PropPick => Boolean(p));
}
