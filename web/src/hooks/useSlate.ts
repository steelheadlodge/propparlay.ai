import { useEffect, useState } from "react";
import type { PropPick } from "../types/prop";

export type SlateQuota = { remaining: number | null; used: number | null };

type SlateResponse = {
  configured: boolean;
  props: PropPick[];
  quota?: SlateQuota | null;
  events?: number;
};

type State =
  | { status: "loading" }
  | { status: "ready"; configured: boolean; props: PropPick[]; quota: SlateQuota | null }
  | { status: "error" };

export function useSlate(): State {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/slate")
      .then((res) => res.json() as Promise<SlateResponse>)
      .then((data) => {
        if (cancelled) return;
        setState({
          status: "ready",
          configured: Boolean(data.configured),
          props: Array.isArray(data.props) ? data.props : [],
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
