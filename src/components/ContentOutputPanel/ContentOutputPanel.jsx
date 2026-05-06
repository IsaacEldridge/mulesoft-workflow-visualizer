import { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { OUTPUT_TYPES, OUTPUT_TYPE_LABELS } from '../../services/promptTemplates';
import { generateContent } from '../../services/contentGenerator';
import { buildBadgeTemplateMarkdown } from '../../services/badgeTemplateExporter';
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
  const [isGeneratingFromDoc, setIsGeneratingFromDoc] = useState(false);
  const [docGenerationError, setDocGenerationError] = useState(null);
  const [isRunningQualityCheck, setIsRunningQualityCheck] = useState(false);
  const [qualityCheckResult, setQualityCheckResult] = useState(null);
  const [qualityCheckError, setQualityCheckError] = useState(null);

  const isTrailheadTab = activeTab === OUTPUT_TYPES.BADGE_PROPOSAL || activeTab === OUTPUT_TYPES.BADGE_DRAFT;

  const hasOutputs = generatedOutputs.blogProposal || generatedOutputs.blogDraft || generatedOutputs.badgeProposal || generatedOutputs.badgeDraft || generatedOutputs.docDraft || generatedOutputs.jtbdDraft;

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

  const handleGenerateFromDoc = async (type) => {
    const docContent = generatedOutputs.docDraft;
    if (!docContent) return;

    setIsGeneratingFromDoc(true);
    setDocGenerationError(null);

    try {
      if (type === 'blog') {
        // Generate blog proposal from doc draft
        const blogProposal = await generateContent(
          OUTPUT_TYPES.BLOG_PROPOSAL,
          docContent,
          '', // audience
          'Generate a blog proposal based on this technical documentation. Extract key features, benefits, and use cases to create compelling blog content.'
        );

        setGeneratedOutputs(prev => ({
          ...prev,
          blogProposal: blogProposal
        }));

        // Switch to the blog proposal tab
        setActiveTab(OUTPUT_TYPES.BLOG_PROPOSAL);
      } else if (type === 'badge') {
        // Generate badge proposal from doc draft
        const badgeProposal = await generateContent(
          OUTPUT_TYPES.BADGE_PROPOSAL,
          docContent,
          '', // audience
          'Generate a Trailhead badge proposal based on this technical documentation. Identify learning objectives, units, and skills that can be taught.'
        );

        setGeneratedOutputs(prev => ({
          ...prev,
          badgeProposal: badgeProposal
        }));

        // Switch to the badge proposal tab
        setActiveTab(OUTPUT_TYPES.BADGE_PROPOSAL);
      }
    } catch (err) {
      setDocGenerationError(err.message);
    } finally {
      setIsGeneratingFromDoc(false);
    }
  };

  const handleExport = () => {
    const content = generatedOutputs[activeTab];
    if (!content) return;

    // Create a blob with the markdown content
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });

    // Generate filename based on content type and timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    let contentTypeName = 'content';
    if (activeTab === OUTPUT_TYPES.BLOG_PROPOSAL) {
      contentTypeName = 'blog-proposal';
    } else if (activeTab === OUTPUT_TYPES.BLOG_DRAFT) {
      contentTypeName = 'blog-draft';
    } else if (activeTab === OUTPUT_TYPES.BADGE_PROPOSAL) {
      contentTypeName = 'badge-proposal';
    } else if (activeTab === OUTPUT_TYPES.BADGE_DRAFT) {
      contentTypeName = 'badge-draft';
    } else if (activeTab === OUTPUT_TYPES.DOC_DRAFT) {
      contentTypeName = 'doc-draft';
    } else if (activeTab === OUTPUT_TYPES.JTBD_DRAFT) {
      contentTypeName = 'jobs-to-be-done';
    }
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

  const handleExportBadgeTemplate = () => {
    const content = generatedOutputs[activeTab];
    if (!content) return;

    const badgeType = activeTab === OUTPUT_TYPES.BADGE_DRAFT ? 'regular' : 'regular';
    const templateMarkdown = buildBadgeTemplateMarkdown(content, { badgeType });

    const blob = new Blob([templateMarkdown], { type: 'text/markdown;charset=utf-8' });
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `badge-template-${timestamp}.md`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleQualityCheck = async () => {
    const content = generatedOutputs[activeTab];
    if (!content) return;

    setIsRunningQualityCheck(true);
    setQualityCheckResult(null);
    setQualityCheckError(null);

    try {
      const response = await fetch('http://localhost:3001/api/quality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, contentType: activeTab })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run quality check');
      }

      const data = await response.json();
      setQualityCheckResult(data.review);
    } catch (err) {
      setQualityCheckError(err.message);
    } finally {
      setIsRunningQualityCheck(false);
    }
  };

  // Reset edit mode and quality check when switching tabs
  useEffect(() => {
    setIsEditing(false);
    setEditedContent('');
    setQualityCheckResult(null);
    setQualityCheckError(null);
  }, [activeTab]);

  if (!hasOutputs) {
    return (
      <div className={styles.contentOutputPanel}>
        <div className={styles.header}>
          <h2>Retrieve Content</h2>
          <p>View and manage your generated content</p>
        </div>
        <div className={styles.emptyState}>
          <h2>No Content Generated Yet</h2>
          <p>Generate content from the Add Sources view to see your outputs here.</p>
          <div className={styles.instructionList}>
            <ol>
              <li>Navigate to <strong>Add Sources</strong></li>
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
        <h2>Retrieve Content</h2>
        <p>View, copy, and manage your generated content</p>
      </div>

      <div className={styles.tabs}>
        {generatedOutputs.blogProposal && (
          <button
            className={`${styles.tab} ${activeTab === OUTPUT_TYPES.BLOG_PROPOSAL ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(OUTPUT_TYPES.BLOG_PROPOSAL)}
          >
            {OUTPUT_TYPE_LABELS[OUTPUT_TYPES.BLOG_PROPOSAL]}
            <span className={styles.badge}>✓</span>
          </button>
        )}
        {generatedOutputs.blogDraft && (
          <button
            className={`${styles.tab} ${activeTab === OUTPUT_TYPES.BLOG_DRAFT ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(OUTPUT_TYPES.BLOG_DRAFT)}
          >
            {OUTPUT_TYPE_LABELS[OUTPUT_TYPES.BLOG_DRAFT]}
            <span className={styles.badge}>✓</span>
          </button>
        )}
        {generatedOutputs.badgeProposal && (
          <button
            className={`${styles.tab} ${activeTab === OUTPUT_TYPES.BADGE_PROPOSAL ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(OUTPUT_TYPES.BADGE_PROPOSAL)}
          >
            {OUTPUT_TYPE_LABELS[OUTPUT_TYPES.BADGE_PROPOSAL]}
            <span className={styles.badge}>✓</span>
          </button>
        )}
        {generatedOutputs.badgeDraft && (
          <button
            className={`${styles.tab} ${activeTab === OUTPUT_TYPES.BADGE_DRAFT ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(OUTPUT_TYPES.BADGE_DRAFT)}
          >
            {OUTPUT_TYPE_LABELS[OUTPUT_TYPES.BADGE_DRAFT]}
            <span className={styles.badge}>✓</span>
          </button>
        )}
        {generatedOutputs.docDraft && (
          <button
            className={`${styles.tab} ${activeTab === OUTPUT_TYPES.DOC_DRAFT ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(OUTPUT_TYPES.DOC_DRAFT)}
          >
            {OUTPUT_TYPE_LABELS[OUTPUT_TYPES.DOC_DRAFT]}
            <span className={styles.badge}>✓</span>
          </button>
        )}
        {generatedOutputs.jtbdDraft && (
          <button
            className={`${styles.tab} ${activeTab === OUTPUT_TYPES.JTBD_DRAFT ? styles.activeTab : ''}`}
            onClick={() => setActiveTab(OUTPUT_TYPES.JTBD_DRAFT)}
          >
            {OUTPUT_TYPE_LABELS[OUTPUT_TYPES.JTBD_DRAFT]}
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
                    {isTrailheadTab && (
                      <button
                        className={styles.qualityCheckButton}
                        onClick={handleQualityCheck}
                        disabled={isRunningQualityCheck}
                      >
                        {isRunningQualityCheck ? (
                          <>
                            <span className={styles.spinner}></span>
                            Checking...
                          </>
                        ) : (
                          <>
                            ✅ Quality Check
                          </>
                        )}
                      </button>
                    )}
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
                    {isTrailheadTab && (
                      <button
                        className={styles.exportButton}
                        onClick={handleExportBadgeTemplate}
                        title="Export structured to match the official Trailhead Badge Template"
                      >
                        🎓 Export to Badge Template
                      </button>
                    )}
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

            {!isEditing && isTrailheadTab && (qualityCheckResult || qualityCheckError) && (
              <div className={styles.qualityCheckSection}>
                <div className={styles.qualityCheckHeader}>
                  <h3>Quality Check Results</h3>
                  <button
                    className={styles.qualityCheckDismiss}
                    onClick={() => { setQualityCheckResult(null); setQualityCheckError(null); }}
                  >
                    ✕ Dismiss
                  </button>
                </div>
                {qualityCheckError ? (
                  <div className={styles.refinementError}>{qualityCheckError}</div>
                ) : (
                  <pre className={styles.qualityCheckResult}>{qualityCheckResult}</pre>
                )}
              </div>
            )}

            {!isEditing && activeTab === OUTPUT_TYPES.DOC_DRAFT && (
              <div className={styles.docActionsSection}>
                <div className={styles.docActionsHeader}>
                  <h3>Generate From Documentation</h3>
                  <p>Create blog or Trailhead proposals from this documentation</p>
                </div>
                <div className={styles.docActionsButtons}>
                  <button
                    className={styles.docActionButton}
                    onClick={() => handleGenerateFromDoc('blog')}
                    disabled={isGeneratingFromDoc}
                  >
                    {isGeneratingFromDoc ? (
                      <>
                        <span className={styles.spinner}></span>
                        Generating...
                      </>
                    ) : (
                      <>
                        📝 Generate Blog Proposal
                      </>
                    )}
                  </button>
                  <button
                    className={styles.docActionButton}
                    onClick={() => handleGenerateFromDoc('badge')}
                    disabled={isGeneratingFromDoc}
                  >
                    {isGeneratingFromDoc ? (
                      <>
                        <span className={styles.spinner}></span>
                        Generating...
                      </>
                    ) : (
                      <>
                        🎓 Generate Trailhead Proposal
                      </>
                    )}
                  </button>
                </div>
                {docGenerationError && (
                  <div className={styles.refinementError}>
                    {docGenerationError}
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
            <p>Return to Add Sources and click the generation button.</p>
          </div>
        )}
      </div>
    </div>
  );
}
