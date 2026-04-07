import { useWorkflow } from '../../context/WorkflowContext';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { currentView, setCurrentView } = useWorkflow();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="#00A1E0"/>
            <path d="M8 12h16M8 16h16M8 20h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className={styles.title}>
          <h1>CX AI Content</h1>
          <span>Workbench</span>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navSection}>
          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Authoring</span>
            <button
              className={`${styles.navItem} ${currentView === 'authoring' ? styles.active : ''}`}
              onClick={() => setCurrentView('authoring')}
            >
              <span className={styles.navIcon}>✏️</span>
              <span className={styles.navLabel}>Add Sources</span>
            </button>

            <button
              className={`${styles.navItem} ${currentView === 'distribution' ? styles.active : ''}`}
              onClick={() => setCurrentView('distribution')}
            >
              <span className={styles.navIcon}>📤</span>
              <span className={styles.navLabel}>Retrieve Content</span>
            </button>
          </div>
        </div>

        <div className={styles.navSection}>
          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Governance</span>
            <button className={`${styles.navItem} ${styles.disabled}`} disabled>
              <span className={styles.navIcon}>✓</span>
              <span className={styles.navLabel}>Validation</span>
              <span className={styles.badge}>Coming Soon</span>
            </button>
            <button className={`${styles.navItem} ${styles.disabled}`} disabled>
              <span className={styles.navIcon}>🚀</span>
              <span className={styles.navLabel}>Publishing</span>
              <span className={styles.badge}>Coming Soon</span>
            </button>
          </div>
        </div>

        <div className={styles.navSection}>
          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Observability</span>
            <button className={`${styles.navItem} ${styles.disabled}`} disabled>
              <span className={styles.navIcon}>📊</span>
              <span className={styles.navLabel}>Events</span>
              <span className={styles.badge}>Coming Soon</span>
            </button>
            <button className={`${styles.navItem} ${styles.disabled}`} disabled>
              <span className={styles.navIcon}>🔧</span>
              <span className={styles.navLabel}>Maintenance</span>
              <span className={styles.badge}>Coming Soon</span>
            </button>
          </div>
        </div>
      </nav>

      <div className={styles.footer}>
        <div className={styles.status}>
          <span className={styles.statusDot}></span>
          <span className={styles.statusText}>System Active</span>
        </div>
      </div>
    </aside>
  );
}
