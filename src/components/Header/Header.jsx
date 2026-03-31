import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <h1 className={styles.title}>MuleSoft Content Workflow</h1>
        <p className={styles.subtitle}>
          Transform source content into tailored outputs with AI - One source, multiple formats
        </p>
      </div>
    </header>
  );
}
