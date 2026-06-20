import { useEffect, useState } from "react";

type OddsStatus =
  | { status: "loading" }
  | { status: "ready"; configured: boolean; eventCount: number }
  | { status: "error" };

type OddsResponse = { configured: boolean; events?: unknown[] };

export function useOdds(): OddsStatus {
  const [state, setState] = useState<OddsStatus>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/odds")
      .then((res) => res.json() as Promise<OddsResponse>)
      .then((data) => {
        if (cancelled) return;
        setState({
          status: "ready",
          configured: Boolean(data.configured),
          eventCount: data.events?.length ?? 0,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
