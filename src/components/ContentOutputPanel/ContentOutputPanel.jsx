import { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { OUTPUT_TYPES, OUTPUT_TYPE_LABELS } from '../../services/promptTemplates';
import styles from './ContentOutputPanel.module.css';

export default function ContentOutputPanel() {
  const { generatedOutputs } = useWorkflow();
  const [activeTab, setActiveTab] = useState(OUTPUT_TYPES.BLOG_POST);
  const [copySuccess, setCopySuccess] = useState(null);

  const hasOutputs = generatedOutputs.blogPost || generatedOutputs.trailheadUnit;

  const handleCopy = async (outputType) => {
    const content = generatedOutputs[outputType];
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(outputType);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!hasOutputs) {
    return (
      <div className={styles.contentOutputPanel}>
        <div className={styles.header}>
          <h2>Distribution</h2>
          <p>View and manage your generated content</p>
        </div>
        <div className={styles.emptyState}>
          <h2>No Content Generated Yet</h2>
          <p>Generate content from the Authoring view to see your outputs here.</p>
          <div className={styles.instructionList}>
            <ol>
              <li>Navigate to <strong>Authoring</strong></li>
              <li>Add source content (URLs, files, or text)</li>
              <li>Configure audience and instructions (optional)</li>
              <li>Click a generation button</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contentOutputPanel}>
      <div className={styles.header}>
        <h2>Distribution</h2>
        <p>View, copy, and manage your generated content</p>
      </div>

      <div className={styles.tabs}>
        {generatedOutputs.blogPost && (
          <button
            className={`${styles.tab} ${activeTab === OUTPUT_TYPES.BLOG_POST ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(OUTPUT_TYPES.BLOG_POST)}
          >
            {OUTPUT_TYPE_LABELS[OUTPUT_TYPES.BLOG_POST]}
            <span className={styles.badge}>✓</span>
          </button>
        )}
        {generatedOutputs.trailheadUnit && (
          <button
            className={`${styles.tab} ${activeTab === OUTPUT_TYPES.TRAILHEAD_UNIT ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(OUTPUT_TYPES.TRAILHEAD_UNIT)}
          >
            {OUTPUT_TYPE_LABELS[OUTPUT_TYPES.TRAILHEAD_UNIT]}
            <span className={styles.badge}>✓</span>
          </button>
        )}
      </div>

      <div className={styles.content}>
        {generatedOutputs[activeTab] ? (
          <>
            <div className={styles.toolbar}>
              <div className={styles.outputLabel}>
                {OUTPUT_TYPE_LABELS[activeTab]}
              </div>
              <button
                className={styles.copyButton}
                onClick={() => handleCopy(activeTab)}
              >
                {copySuccess === activeTab ? '✓ Copied!' : '📋 Copy Markdown'}
              </button>
            </div>
            <div className={styles.markdownOutput}>
              <pre className={styles.pre}>
                <code>{generatedOutputs[activeTab]}</code>
              </pre>
            </div>
          </>
        ) : (
          <div className={styles.tabEmptyState}>
            <p>This output type has not been generated yet.</p>
            <p>Return to the Authoring stage and click the generation button.</p>
          </div>
        )}
      </div>
    </div>
  );
}
