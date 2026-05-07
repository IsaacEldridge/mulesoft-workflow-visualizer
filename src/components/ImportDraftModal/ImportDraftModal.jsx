import { useRef, useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { OUTPUT_TYPES, OUTPUT_TYPE_LABELS } from '../../services/promptTemplates';
import styles from './ImportDraftModal.module.css';

const TYPE_OPTIONS = [
  { value: OUTPUT_TYPES.BLOG_DRAFT, label: OUTPUT_TYPE_LABELS[OUTPUT_TYPES.BLOG_DRAFT], icon: '📝' },
  { value: OUTPUT_TYPES.BLOG_PROPOSAL, label: OUTPUT_TYPE_LABELS[OUTPUT_TYPES.BLOG_PROPOSAL], icon: '📋' },
  { value: OUTPUT_TYPES.BADGE_DRAFT, label: OUTPUT_TYPE_LABELS[OUTPUT_TYPES.BADGE_DRAFT], icon: '🎓' },
  { value: OUTPUT_TYPES.BADGE_PROPOSAL, label: OUTPUT_TYPE_LABELS[OUTPUT_TYPES.BADGE_PROPOSAL], icon: '📋' },
  { value: OUTPUT_TYPES.DOC_DRAFT, label: OUTPUT_TYPE_LABELS[OUTPUT_TYPES.DOC_DRAFT], icon: '📄' },
  { value: OUTPUT_TYPES.JTBD_DRAFT, label: OUTPUT_TYPE_LABELS[OUTPUT_TYPES.JTBD_DRAFT], icon: '🎯' },
];

const ALLOWED_EXTENSIONS = ['.md', '.markdown', '.txt'];

export default function ImportDraftModal({ open, onClose }) {
  const { setGeneratedOutputs, openEditor } = useWorkflow();
  const [contentType, setContentType] = useState(OUTPUT_TYPES.BLOG_DRAFT);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!open) return null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!ok) {
      setError(`Unsupported file type. Use ${ALLOWED_EXTENSIONS.join(', ')}.`);
      return;
    }
    try {
      const buf = await file.text();
      setText(buf);
      setFileName(file.name);
      setError(null);
    } catch (err) {
      setError(`Failed to read file: ${err.message}`);
    }
  };

  const handleConfirm = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Paste content or upload a file before importing.');
      return;
    }
    setGeneratedOutputs(prev => ({ ...prev, [contentType]: text }));
    onClose();
    openEditor(contentType);
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Import Draft for Quality Check</h2>
          <button className={styles.close} onClick={handleClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.body}>
          <div className={styles.section}>
            <span className={styles.label}>Content Type</span>
            <div className={styles.typeGrid}>
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.typeOption} ${contentType === opt.value ? styles.selected : ''}`}
                  onClick={() => setContentType(opt.value)}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.label}>Upload File (.md, .markdown, .txt)</span>
            <div className={styles.fileRow}>
              <button
                type="button"
                className={styles.fileButton}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file…
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                onChange={handleFile}
                style={{ display: 'none' }}
              />
              {fileName && <span className={styles.fileName}>{fileName}</span>}
            </div>
          </div>

          <div className={styles.section}>
            <span className={styles.label}>Or Paste Content</span>
            <textarea
              className={styles.textarea}
              value={text}
              onChange={(e) => { setText(e.target.value); setFileName(''); }}
              placeholder="Paste your existing draft here…"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.footer}>
          <button onClick={handleClose}>Cancel</button>
          <button
            className={styles.primary}
            onClick={handleConfirm}
            disabled={!text.trim()}
          >
            Import &amp; Open Editor
          </button>
        </div>
      </div>
    </div>
  );
}
