import { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useWorkflow } from '../../context/WorkflowContext';
import { OUTPUT_TYPES, OUTPUT_TYPE_LABELS } from '../../services/promptTemplates';
import { buildBadgeTemplateMarkdown } from '../../services/badgeTemplateExporter';
import { buildTrackChangesMarkdown } from '../../services/trackChangesExporter';
import { applySuggestions, buildApplyReport } from '../../services/qualityCheckSuggestions';
import styles from './ContentEditor.module.css';

const QUALITY_CHECK_TYPES = new Set([
  OUTPUT_TYPES.BADGE_PROPOSAL,
  OUTPUT_TYPES.BADGE_DRAFT,
  OUTPUT_TYPES.BLOG_PROPOSAL,
  OUTPUT_TYPES.BLOG_DRAFT,
]);

const TEMPLATE_EXPORT_TYPES = new Set([
  OUTPUT_TYPES.BADGE_PROPOSAL,
  OUTPUT_TYPES.BADGE_DRAFT,
]);

function downloadFile(text, filename, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ContentEditor() {
  const {
    editorContext,
    closeEditor,
    generatedOutputs,
    setGeneratedOutputs,
  } = useWorkflow();

  const outputType = editorContext?.outputType;
  const sourceContent = outputType ? generatedOutputs[outputType] || '' : '';

  const originalRef = useRef(sourceContent);
  const [content, setContent] = useState(sourceContent);
  const [savedAt, setSavedAt] = useState(null);

  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [reviewMarkdown, setReviewMarkdown] = useState(null);
  const [reviewError, setReviewError] = useState(null);

  const [isExtractingSuggestions, setIsExtractingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [applyReport, setApplyReport] = useState(null);
  const [copyState, setCopyState] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('suggestions'); // 'suggestions' | 'review' | 'report'

  // Reset internal state when the editor target changes.
  useEffect(() => {
    originalRef.current = sourceContent;
    setContent(sourceContent);
    setReviewMarkdown(null);
    setReviewError(null);
    setSuggestions([]);
    setSelectedIds(new Set());
    setApplyReport(null);
    setSavedAt(null);
    setIsModalOpen(false);
  }, [outputType]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty = content !== (generatedOutputs[outputType] || '');

  const supportsQualityCheck = outputType && QUALITY_CHECK_TYPES.has(outputType);
  const supportsTemplateExport = outputType && TEMPLATE_EXPORT_TYPES.has(outputType);

  const handleSaveBack = () => {
    if (!outputType) return;
    setGeneratedOutputs(prev => ({ ...prev, [outputType]: content }));
    setSavedAt(new Date());
  };

  const handleClose = () => {
    if (isDirty) {
      const ok = window.confirm('You have unsaved changes. Discard and return?');
      if (!ok) return;
    }
    closeEditor();
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyState('copied');
      setTimeout(() => setCopyState(null), 1500);
    } catch (err) {
      setCopyState('error');
      setTimeout(() => setCopyState(null), 1500);
    }
  };

  const handleExportMarkdown = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(content, `${outputType}-${stamp}.md`);
  };

  const handleExportTemplate = () => {
    if (!supportsTemplateExport) return;
    const md = buildBadgeTemplateMarkdown(content);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(md, `badge-template-${stamp}.md`);
  };

  const handleExportTrackChanges = () => {
    const md = buildTrackChangesMarkdown(originalRef.current, content, {
      title: `Track Changes — ${OUTPUT_TYPE_LABELS[outputType] || outputType}`,
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(md, `${outputType}-track-changes-${stamp}.md`);
  };

  const handleQualityCheck = async () => {
    if (!supportsQualityCheck) return;
    setIsRunningCheck(true);
    setReviewError(null);
    setReviewMarkdown(null);
    setSuggestions([]);
    setSelectedIds(new Set());
    setApplyReport(null);
    setIsModalOpen(true);
    setModalTab('suggestions');

    try {
      const res = await fetch('http://localhost:3001/api/quality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, contentType: outputType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Quality check failed (${res.status})`);
      }
      const data = await res.json();
      setReviewMarkdown(data.review);

      // Pull structured suggestions immediately so the user can act.
      setIsExtractingSuggestions(true);
      const sres = await fetch('http://localhost:3001/api/extract-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review: data.review, contentType: outputType, content }),
      });
      if (!sres.ok) {
        const err = await sres.json().catch(() => ({}));
        throw new Error(err.error || `Extract suggestions failed (${sres.status})`);
      }
      const sdata = await sres.json();
      const list = sdata.suggestions || [];
      setSuggestions(list);
      // Pre-select every actionable (non-note, has-locator) suggestion
      const ids = list
        .filter(s => s.kind !== 'note' && s.locator)
        .map(s => s.id);
      setSelectedIds(new Set(ids));
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setIsRunningCheck(false);
      setIsExtractingSuggestions(false);
    }
  };

  const toggleSuggestion = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplySelected = () => {
    const chosen = suggestions.filter(s => selectedIds.has(s.id));
    if (!chosen.length) return;
    const { updatedContent, applied, skipped } = applySuggestions(content, chosen);
    setContent(updatedContent);
    setApplyReport(buildApplyReport(applied, skipped));
    const appliedIds = new Set(applied.map(a => a.id));
    setSuggestions(prev => prev.filter(s => !appliedIds.has(s.id)));
    setSelectedIds(prev => {
      const next = new Set(prev);
      appliedIds.forEach(id => next.delete(id));
      return next;
    });
    setModalTab('report');
  };

  const actionableSelected = useMemo(() => {
    return suggestions.filter(s => selectedIds.has(s.id));
  }, [suggestions, selectedIds]);

  if (!outputType) {
    return (
      <div className={styles.editor}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2>Editor</h2>
            <p>No content selected. Return to Retrieve Content and click "Move to Editing" on a tab.</p>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.backButton} onClick={closeEditor}>← Back to Retrieve Content</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Editor — {OUTPUT_TYPE_LABELS[outputType] || outputType}</h2>
          <p>Edit content, run quality checks, and selectively apply suggestions.</p>
        </div>
        <div className={styles.headerRight}>
          {isDirty ? (
            <span className={styles.dirtyBadge}>● Unsaved changes</span>
          ) : savedAt ? (
            <span className={styles.savedBadge}>✓ Saved</span>
          ) : null}
          <button className={styles.backButton} onClick={handleSaveBack} disabled={!isDirty}>
            💾 Save to Retrieve Content
          </button>
          <button className={styles.backButton} onClick={handleClose}>← Back</button>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.editorPane}>
          <div className={styles.toolbar}>
            <span>{content.length.toLocaleString()} characters</span>
            <span>{content.split(/\s+/).filter(Boolean).length.toLocaleString()} words</span>
          </div>
          <textarea
            className={styles.textarea}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck="true"
          />
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3>Actions</h3>
            <div className={styles.actionList}>
              {supportsQualityCheck && (
                <button
                  className={`${styles.actionButton} ${styles.primaryAction}`}
                  onClick={handleQualityCheck}
                  disabled={isRunningCheck}
                >
                  {isRunningCheck ? <><span className={styles.spinner}></span> Checking…</> : '✅ Quality Check'}
                </button>
              )}
              <button className={styles.actionButton} onClick={handleExportTrackChanges}>
                📝 Export to Track Changes
              </button>
              <button className={styles.actionButton} onClick={handleExportMarkdown}>
                💾 Export to Markdown
              </button>
              <button
                className={`${styles.actionButton} ${copyState === 'copied' ? styles.copySuccess : ''}`}
                onClick={handleCopyMarkdown}
              >
                {copyState === 'copied' ? '✓ Copied!' : '📋 Copy to Markdown'}
              </button>
              {supportsTemplateExport && (
                <button className={styles.actionButton} onClick={handleExportTemplate}>
                  🎓 Export to Badge Template
                </button>
              )}
            </div>
          </div>

          {(reviewMarkdown || suggestions.length > 0 || applyReport || reviewError) && (
            <div className={styles.sidebarSection}>
              <h3>Quality Results</h3>
              <button
                className={`${styles.actionButton} ${styles.primaryAction}`}
                onClick={() => setIsModalOpen(true)}
              >
                🔍 Open Review &amp; Suggestions
              </button>
              {suggestions.length > 0 && (
                <div className={styles.miniHint}>
                  {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'} pending
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Quality Check</h2>
              <button className={styles.modalClose} onClick={() => setIsModalOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>

            <div className={styles.modalTabs}>
              <button
                className={`${styles.modalTab} ${modalTab === 'suggestions' ? styles.activeTab : ''}`}
                onClick={() => setModalTab('suggestions')}
              >
                Suggestions
                {suggestions.length > 0 && <span className={styles.suggestionsCount}>{suggestions.length}</span>}
              </button>
              <button
                className={`${styles.modalTab} ${modalTab === 'review' ? styles.activeTab : ''}`}
                onClick={() => setModalTab('review')}
                disabled={!reviewMarkdown}
              >
                Full Review
              </button>
              <button
                className={`${styles.modalTab} ${modalTab === 'report' ? styles.activeTab : ''}`}
                onClick={() => setModalTab('report')}
                disabled={!applyReport}
              >
                Apply Report
              </button>
            </div>

            <div className={styles.modalBody}>
              {reviewError && <div className={styles.errorBox}>{reviewError}</div>}

              {modalTab === 'suggestions' && (
                <>
                  {isRunningCheck && (
                    <div className={styles.loadingBox}>
                      <span className={styles.spinner}></span> Running quality check…
                    </div>
                  )}
                  {!isRunningCheck && isExtractingSuggestions && !suggestions.length && (
                    <div className={styles.loadingBox}>
                      <span className={styles.spinner}></span> Extracting suggestions…
                    </div>
                  )}
                  {!isRunningCheck && !isExtractingSuggestions && !suggestions.length && !reviewError && (
                    <div className={styles.emptyHint}>No actionable suggestions. Try running Quality Check again or review the full report.</div>
                  )}
                  <div className={styles.suggestionsList}>
                    {suggestions.map((s) => {
                      const applicable = s.kind !== 'note' && !!s.locator;
                      const checked = selectedIds.has(s.id);
                      return (
                        <div
                          key={s.id}
                          className={`${styles.suggestionItem} ${checked ? styles.selected : ''} ${applicable ? styles.applicable : styles.notApplicable}`}
                          onClick={() => applicable && toggleSuggestion(s.id)}
                        >
                          <div className={styles.suggestionTop}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!applicable}
                              onChange={() => toggleSuggestion(s.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className={styles.suggestionTitle}>{s.title}</span>
                            <span className={`${styles.kindBadge} ${styles[s.kind] || ''}`}>{s.kind}</span>
                          </div>
                          {s.rationale && <div className={styles.suggestionRationale}>{s.rationale}</div>}
                          {s.locator && (
                            <details className={styles.suggestionDetails}>
                              <summary>Show change</summary>
                              <div className={styles.diffBlock}>
                                <div className={styles.diffLabel}>Locator</div>
                                <pre className={styles.diffPre}>{s.locator}</pre>
                                {s.replacement && (
                                  <>
                                    <div className={styles.diffLabel}>Replacement</div>
                                    <pre className={styles.diffPre}>{s.replacement}</pre>
                                  </>
                                )}
                              </div>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {modalTab === 'review' && reviewMarkdown && (
                <div className={styles.markdownBody}>
                  <ReactMarkdown>{reviewMarkdown}</ReactMarkdown>
                </div>
              )}

              {modalTab === 'report' && applyReport && (
                <div className={styles.markdownBody}>
                  <ReactMarkdown>{applyReport}</ReactMarkdown>
                </div>
              )}
            </div>

            {modalTab === 'suggestions' && suggestions.length > 0 && (
              <div className={styles.modalFooter}>
                <button
                  className={`${styles.actionButton} ${styles.primaryAction}`}
                  onClick={handleApplySelected}
                  disabled={!actionableSelected.length}
                >
                  Apply Selected ({actionableSelected.length})
                </button>
                <button className={styles.actionButton} onClick={() => setIsModalOpen(false)}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
