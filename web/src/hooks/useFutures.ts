import { useEffect, useState } from "react";
import type { FuturesMarket, FuturesQuota, FuturesResponse } from "../types/futures";

type State =
  | { status: "loading" }
  | {
      status: "ready";
      configured: boolean;
      markets: FuturesMarket[];
      quota: FuturesQuota | null;
    }
  | { status: "error" };

export function useFutures(): State {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/futures")
      .then((res) => res.json() as Promise<FuturesResponse>)
      .then((data) => {
        if (cancelled) return;
        setState({
          status: "ready",
          configured: Boolean(data.configured),
          markets: Array.isArray(data.markets) ? data.markets : [],
          quota: data.quota ?? null,
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
