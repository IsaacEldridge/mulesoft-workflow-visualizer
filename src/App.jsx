import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import Sidebar from './components/Sidebar/Sidebar';
import ContentInputPanel from './components/ContentInputPanel/ContentInputPanel';
import ContentOutputPanel from './components/ContentOutputPanel/ContentOutputPanel';
import styles from './App.module.css';

function AppContent() {
  const { currentView } = useWorkflow();

  return (
    <div className={styles.app}>
      <Sidebar />
      <div className={styles.mainContainer}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbItem}>Home</span>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbItem}>
            {currentView === 'authoring' ? 'Authoring' : 'Distribution'}
          </span>
        </div>
        <main className={styles.main}>
          {currentView === 'authoring' ? (
            <ContentInputPanel />
          ) : (
            <ContentOutputPanel />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <WorkflowProvider>
      <AppContent />
    </WorkflowProvider>
  );
}
