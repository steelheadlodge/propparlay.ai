import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
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
        <NavLink to="/" className={styles.logo}>
          PropParlay<span>.ai</span>
        </NavLink>
        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ""}`
            }
          >
            Futures
          </NavLink>
          <NavLink
            to="/grid"
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ""}`
            }
          >
            Grid
          </NavLink>
          <NavLink
            to="/tonight"
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ""}`
            }
          >
            Tonight
          </NavLink>
          <span className={styles.previewBadge}>Preview</span>
          <a href="/" className={styles.navLink}>Landing</a>
        </nav>
      </header>

      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
