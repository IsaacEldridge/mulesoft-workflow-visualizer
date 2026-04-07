import { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { OUTPUT_TYPES, OUTPUT_TYPE_LABELS } from '../../services/promptTemplates';
import styles from './ContentOutputPanel.module.css';

export default function ContentOutputPanel() {
  const { generatedOutputs, setGeneratedOutputs } = useWorkflow();
  const [activeTab, setActiveTab] = useState(OUTPUT_TYPES.BLOG_POST);
  const [copySuccess, setCopySuccess] = useState(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refinementError, setRefinementError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

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

  const handleRefine = async () => {
    const currentContent = generatedOutputs[activeTab];
    if (!currentContent || !refinementPrompt.trim()) {
      setRefinementError('Please enter refinement instructions');
      return;
    }

    setIsRefining(true);
    setRefinementError(null);

    try {
      const refinementInstructions = `You are refining existing content based on user feedback.

CURRENT CONTENT:
${currentContent}

USER REFINEMENT REQUEST:
${refinementPrompt.trim()}

Please revise the content according to the user's request while maintaining the same format and style. Only make changes that address the specific refinement request.`;

      const response = await fetch('http://localhost:3001/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: refinementInstructions })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refine content');
      }

      const data = await response.json();

      // Update the generated outputs with the refined content
      setGeneratedOutputs(prev => ({
        ...prev,
        [activeTab]: data.content
      }));

      // Clear the refinement prompt
      setRefinementPrompt('');
    } catch (err) {
      setRefinementError(err.message);
    } finally {
      setIsRefining(false);
    }
  };

  const handleEdit = () => {
    setEditedContent(generatedOutputs[activeTab]);
    setIsEditing(true);
  };

  const handleSave = () => {
    setGeneratedOutputs(prev => ({
      ...prev,
      [activeTab]: editedContent
    }));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent('');
    setIsEditing(false);
  };

  const handleExport = () => {
    const content = generatedOutputs[activeTab];
    if (!content) return;

    // Create a blob with the markdown content
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });

    // Generate filename based on content type and timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const contentTypeName = activeTab === OUTPUT_TYPES.BLOG_POST ? 'blog-post' : 'trailhead-unit';
    const filename = `${contentTypeName}-${timestamp}.md`;

    // Create download link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Reset edit mode when switching tabs
  useEffect(() => {
    setIsEditing(false);
    setEditedContent('');
  }, [activeTab]);

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
              <div className={styles.toolbarActions}>
                {isEditing ? (
                  <>
                    <button
                      className={styles.saveButton}
                      onClick={handleSave}
                    >
                      ✓ Save Changes
                    </button>
                    <button
                      className={styles.cancelButton}
                      onClick={handleCancel}
                    >
                      ✕ Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className={styles.editButton}
                      onClick={handleEdit}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className={styles.copyButton}
                      onClick={() => handleCopy(activeTab)}
                    >
                      {copySuccess === activeTab ? '✓ Copied!' : '📋 Copy Markdown'}
                    </button>
                    <button
                      className={styles.exportButton}
                      onClick={handleExport}
                    >
                      💾 Export to Markdown
                    </button>
                  </>
                )}
              </div>
            </div>

            {!isEditing && (
              <div className={styles.refinementSection}>
                <div className={styles.refinementHeader}>
                  <h3>Refine Content</h3>
                  <p>Provide additional instructions to improve the generated content</p>
                </div>
                <div className={styles.refinementInputGroup}>
                  <textarea
                    className={styles.refinementInput}
                    value={refinementPrompt}
                    onChange={(e) => setRefinementPrompt(e.target.value)}
                    placeholder="E.g., 'Make it more concise', 'Add more technical details', 'Simplify the language', 'Focus more on benefits'..."
                    rows={3}
                    disabled={isRefining}
                  />
                  <button
                    className={styles.refineButton}
                    onClick={handleRefine}
                    disabled={isRefining || !refinementPrompt.trim()}
                  >
                    {isRefining ? (
                      <>
                        <span className={styles.spinner}></span>
                        Refining...
                      </>
                    ) : (
                      <>
                        ✨ Refine Content
                      </>
                    )}
                  </button>
                </div>
                {refinementError && (
                  <div className={styles.refinementError}>
                    {refinementError}
                  </div>
                )}
              </div>
            )}

            <div className={styles.markdownOutput}>
              {isEditing ? (
                <textarea
                  className={styles.editTextarea}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={20}
                />
              ) : (
                <pre className={styles.pre}>
                  <code>{generatedOutputs[activeTab]}</code>
                </pre>
              )}
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
