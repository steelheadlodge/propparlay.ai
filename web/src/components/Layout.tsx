import type { ReactNode } from "react";
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
        <a href="/" className={styles.logo}>
          PropParlay<span>.ai</span>
        </a>
        <nav className={styles.nav}>
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
