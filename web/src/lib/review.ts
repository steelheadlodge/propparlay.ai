import { Capacitor } from "@capacitor/core";
import { InAppReview } from "@capacitor-community/in-app-review";

// Apple shows the system dialog at most a few times a year and may ignore the
// call. We only ask after a positive moment (a share, or the 3rd app open),
// never while the user is mid-task, and never twice inside two weeks.
const KEY = "pp-review-v1";
const MIN_GAP_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_PROMPTS = 3;
const ONBOARDED_KEY = "propparlay_onboarded_v2";

type State = { sessions: number; prompts: number; lastPrompt: number };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { sessions: 0, prompts: 0, lastPrompt: 0 };
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      sessions: Number(parsed.sessions) || 0,
      prompts: Number(parsed.prompts) || 0,
      lastPrompt: Number(parsed.lastPrompt) || 0,
    };
  } catch {
    return { sessions: 0, prompts: 0, lastPrompt: 0 };
  }
}

function save(state: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private browsing */
  }
}

function isIosApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function noteSession(): void {
  if (!isIosApp()) return;
  const state = load();
  state.sessions += 1;
  save(state);
  if (state.sessions < 3) return;
  window.setTimeout(() => void maybeAskForReview("session"), 8000);
}

export async function maybeAskForReview(
  reason: "session" | "share",
): Promise<void> {
  if (!isIosApp()) return;
  try {
    if (!localStorage.getItem(ONBOARDED_KEY)) return;
  } catch {
    return;
  }
  const state = load();
  if (reason === "session" && state.sessions < 3) return;
  if (state.prompts >= MAX_PROMPTS) return;
  if (state.lastPrompt && Date.now() - state.lastPrompt < MIN_GAP_MS) return;
  state.prompts += 1;
  state.lastPrompt = Date.now();
  save(state);
  try {
    await InAppReview.requestReview();
  } catch {
    /* dialog unavailable — the stored gap keeps us from retrying immediately */
  }
}
