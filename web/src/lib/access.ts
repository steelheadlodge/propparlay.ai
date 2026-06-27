const UNLOCK_KEY = "propparlay_unlocked";
const REF_KEY = "propparlay_ref";

export function isUnlocked(): boolean {
  try {
    return Boolean(localStorage.getItem(UNLOCK_KEY));
  } catch {
    return false;
  }
}

export function unlockEmail(email: string): void {
  try {
    localStorage.setItem(UNLOCK_KEY, email.trim().toLowerCase());
  } catch {
    /* private browsing / quota — unlock for this session only */
  }
}

export function getOrCreateRef(): string {
  try {
    const existing = localStorage.getItem(REF_KEY);
    if (existing) return existing;
    const ref = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(REF_KEY, ref);
    return ref;
  } catch {
    return "guest";
  }
}
