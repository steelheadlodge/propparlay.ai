import { useEffect, useState } from "react";
import type { GamesResponse } from "../types/game";

type State =
  | { status: "loading" }
  | { status: "ready"; data: GamesResponse }
  | { status: "error" };

export function useGames(): State {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/games")
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<GamesResponse>;
      })
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
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
