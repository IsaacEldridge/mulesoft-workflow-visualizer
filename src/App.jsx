import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import Sidebar from './components/Sidebar/Sidebar';
import ContentInputPanel from './components/ContentInputPanel/ContentInputPanel';
import ContentOutputPanel from './components/ContentOutputPanel/ContentOutputPanel';
import ContentEditor from './components/ContentEditor/ContentEditor';
import ImportDraftModal from './components/ImportDraftModal/ImportDraftModal';
import styles from './App.module.css';

const VIEW_LABELS = {
  authoring: 'Authoring',
  distribution: 'Retrieve Content',
  editor: 'Edit Content',
};

function AppContent() {
  const { currentView, isImportOpen, closeImport } = useWorkflow();

  return (
    <div className={styles.app}>
      <Sidebar />
      <div className={styles.mainContainer}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbItem}>Home</span>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbItem}>
            {VIEW_LABELS[currentView] || 'Authoring'}
          </span>
        </div>
        <main className={styles.main}>
          {currentView === 'authoring' && <ContentInputPanel />}
          {currentView === 'distribution' && <ContentOutputPanel />}
          {currentView === 'editor' && <ContentEditor />}
        </main>
      </div>
      <ImportDraftModal open={isImportOpen} onClose={closeImport} />
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
