import { useState } from "react";
import { Link } from "react-router-dom";
import { apiUrl } from "../lib/config";
import { unlockEmail } from "../lib/access";
import styles from "./UnlockModal.module.css";

export default function UnlockModal({
  open,
  onClose,
  onUnlocked,
  feature = "premium tools",
}: {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
  feature?: string;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/waitlist"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "unlock" }),
      });
      if (!res.ok && res.status !== 409) {
        throw new Error("Could not save email");
      }
      unlockEmail(email);
      onUnlocked();
      onClose();
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.card}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
          ×
        </button>
        <span className={styles.spark}>🔓</span>
        <h2>Unlock {feature}</h2>
        <p>
          Enter your email for free access to Long shot & Value AI strategies, 4-leg
          parlays, and the full 12×12 grid. No spam — just product updates.
        </p>
        <form onSubmit={submit} className={styles.form}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            required
            autoComplete="email"
          />
          <button type="submit" disabled={busy}>
            {busy ? "Unlocking…" : "Unlock free"}
          </button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
        <p className={styles.fine}>
          Already on the app?{" "}
          <Link to="/grid" onClick={onClose}>
            Continue with free tools
          </Link>
        </p>
      </div>
    </div>
  );
}
