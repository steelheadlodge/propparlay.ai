import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import Logo from "./Logo";
import { APP_STORE_URL, SITE_URL } from "../lib/config";
import styles from "./Layout.module.css";

export default function Layout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <NavLink to="/grid" className={styles.logo} aria-label="prop parlay ai — home">
          <Logo />
        </NavLink>
        <nav className={styles.nav}>
          <NavLink
            to="/grid"
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ""}`
            }
          >
            Grid
          </NavLink>
          <NavLink
            to="/futures"
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ""}`
            }
          >
            Futures
          </NavLink>
          <NavLink
            to="/tonight"
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ""}`
            }
          >
            Tonight
          </NavLink>
          <a
            href={APP_STORE_URL}
            className={styles.navLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get app
          </a>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </main>

      <footer className={styles.footer}>
        <p>
          PropParlay is for <strong>informational and entertainment purposes only</strong>.
          We are not a sportsbook, do not accept wagers, and do not process bets.
          Odds and projections are sourced from public markets and are never a
          guarantee of any outcome.
        </p>
        <p>
          You must be of legal age to gamble in your jurisdiction (18+, 21+ in
          some states). If you or someone you know has a gambling problem, call{" "}
          <a href="tel:1-800-426-2537">1-800-GAMBLER</a> or visit{" "}
          <a
            href="https://www.ncpgambling.org/"
            target="_blank"
            rel="noopener noreferrer"
          >
            ncpgambling.org
          </a>
          .
        </p>
        <div className={styles.footerLinks}>
          <a href={`${SITE_URL}/privacy`} target="_blank" rel="noopener noreferrer">
            Privacy
          </a>
          <span aria-hidden>·</span>
          <a href={`${SITE_URL}/support`} target="_blank" rel="noopener noreferrer">
            Support
          </a>
          <span aria-hidden>·</span>
          <span>© 2026 PropParlay.ai</span>
        </div>
      </footer>
    </div>
  );
}
