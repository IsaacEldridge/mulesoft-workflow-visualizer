import { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { generateContent } from '../../services/contentGenerator';
import { OUTPUT_TYPES, OUTPUT_TYPE_LABELS } from '../../services/promptTemplates';
import styles from './ContentInputPanel.module.css';

export default function ContentInputPanel() {
  const {
    sourceContent,
    setSourceContent,
    audience,
    setAudience,
    generatedOutputs,
    setGeneratedOutputs,
    isGenerating,
    setIsGenerating,
    selectStage
  } = useWorkflow();

  const [error, setError] = useState(null);
  const [generatingType, setGeneratingType] = useState(null);

  const handleGenerate = async (outputType) => {
    if (!sourceContent.trim()) {
      setError('Please paste source content before generating');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGeneratingType(outputType);

    try {
      const content = await generateContent(outputType, sourceContent, audience);

      setGeneratedOutputs(prev => ({
        ...prev,
        [outputType]: content
      }));

      // Automatically switch to distribution stage to show output
      selectStage('distribution');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  };

  return (
    <div className={styles.contentInputPanel}>
      <div className={styles.header}>
        <h2>Content Authoring</h2>
        <p>Paste your source content and generate outputs</p>
      </div>

      <div className={styles.formSection}>
        <label htmlFor="sourceContent" className={styles.label}>
          Source Content <span className={styles.required}>*</span>
          <span className={styles.hint}>(paste markdown or plain text)</span>
        </label>
        <textarea
          id="sourceContent"
          className={styles.textarea}
          value={sourceContent}
          onChange={(e) => setSourceContent(e.target.value)}
          placeholder="Paste your source content here (PRDs, technical documentation, drafts, etc.)&#x0a;&#x0a;Example:&#x0a;# API-Led Connectivity Guide&#x0a;&#x0a;## Overview&#x0a;API-led connectivity is an approach..."
          rows={12}
          disabled={isGenerating}
        />
        <div className={styles.charCount}>
          {sourceContent.length} characters
        </div>
      </div>

      <div className={styles.formSection}>
        <label htmlFor="audience" className={styles.label}>
          Target Audience <span className={styles.optional}>(optional)</span>
        </label>
        <select
          id="audience"
          className={styles.select}
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          disabled={isGenerating}
        >
          <option value="">Default (general audience)</option>
          <option value="admin">Admin</option>
          <option value="developer">Developer</option>
          <option value="beginner">Beginner</option>
        </select>
      </div>

      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className={styles.buttonSection}>
        <h3>Generate Output</h3>
        <div className={styles.buttonGroup}>
          <button
            className={styles.generateButton}
            onClick={() => handleGenerate(OUTPUT_TYPES.BLOG_POST)}
            disabled={isGenerating || !sourceContent.trim()}
          >
            {isGenerating && generatingType === OUTPUT_TYPES.BLOG_POST ? (
              <>
                <span className={styles.spinner}></span>
                Generating...
              </>
            ) : (
              <>
                {generatedOutputs.blogPost && (
                  <span className={styles.checkmark}>✓</span>
                )}
                {OUTPUT_TYPE_LABELS[OUTPUT_TYPES.BLOG_POST]}
              </>
            )}
          </button>

          <button
            className={styles.generateButton}
            onClick={() => handleGenerate(OUTPUT_TYPES.TRAILHEAD_UNIT)}
            disabled={isGenerating || !sourceContent.trim()}
          >
            {isGenerating && generatingType === OUTPUT_TYPES.TRAILHEAD_UNIT ? (
              <>
                <span className={styles.spinner}></span>
                Generating...
              </>
            ) : (
              <>
                {generatedOutputs.trailheadUnit && (
                  <span className={styles.checkmark}>✓</span>
                )}
                {OUTPUT_TYPE_LABELS[OUTPUT_TYPES.TRAILHEAD_UNIT]}
              </>
            )}
          </button>
        </div>
        <p className={styles.hint}>
          Click a button to generate content. You can generate both types from the same source.
        </p>
      </div>

      {(generatedOutputs.blogPost || generatedOutputs.trailheadUnit) && (
        <div className={styles.successMessage}>
          Generated content is available in the Distribution stage.
        </div>
      )}
    </div>
  );
}
