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
    customPrompt,
    setCustomPrompt,
    docUrls,
    setDocUrls,
    fetchedDocsContent,
    setFetchedDocsContent,
    uploadedFiles,
    setUploadedFiles,
    selectedDocTemplates,
    setSelectedDocTemplates,
    figmaUrls,
    setFigmaUrls,
    fetchedFigmaContent,
    setFetchedFigmaContent,
    generatedOutputs,
    setGeneratedOutputs,
    isGenerating,
    setIsGenerating,
    setCurrentView
  } = useWorkflow();

  const [error, setError] = useState(null);
  const [generatingType, setGeneratingType] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingDocs, setIsFetchingDocs] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [fetchStats, setFetchStats] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [fileUploadError, setFileUploadError] = useState(null);
  const [figmaUrlInput, setFigmaUrlInput] = useState('');
  const [isFetchingFigma, setIsFetchingFigma] = useState(false);
  const [figmaFetchError, setFigmaFetchError] = useState(null);

  const handleAddUrl = async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;

    // Check if URL contains wildcard
    const hasWildcard = trimmedUrl.includes('*');

    // Check if this is a wildcard pattern or a request to discover nested pages
    if (hasWildcard || trimmedUrl.endsWith('/')) {
      // Expand wildcard pattern or discover nested pages
      setIsFetchingDocs(true);
      setFetchError(hasWildcard ? '🔍 Expanding wildcard pattern...' : '🔍 Discovering nested pages...');

      try {
        const response = await fetch('http://localhost:3001/api/expand-wildcard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pattern: trimmedUrl })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to discover pages');
        }

        const data = await response.json();

        if (data.urls.length === 0) {
          setFetchError(`No URLs found for: ${trimmedUrl}`);
          setIsFetchingDocs(false);
          return;
        }

        // Add all discovered URLs (excluding duplicates)
        const newUrls = data.urls.filter(url => !docUrls.includes(url));
        setDocUrls([...docUrls, ...newUrls]);
        setUrlInput('');
        const method = data.method === 'sitemap' ? 'from sitemap' : 'from page';
        setFetchError(`✓ Found ${data.urls.length} URLs ${method} (${newUrls.length} new)`);
      } catch (err) {
        setFetchError(err.message);
      } finally {
        setIsFetchingDocs(false);
      }
      return;
    }

    // Single URL - basic validation
    try {
      new URL(trimmedUrl);
    } catch (e) {
      setFetchError('Please enter a valid URL (e.g., https://docs.mulesoft.com/path/ to get all nested pages)');
      return;
    }

    // Check if URL is already added
    if (docUrls.includes(trimmedUrl)) {
      setFetchError('This URL has already been added');
      return;
    }

    setDocUrls([...docUrls, trimmedUrl]);
    setUrlInput('');
    setFetchError(null);
  };

  const handleRemoveUrl = (urlToRemove) => {
    setDocUrls(docUrls.filter(url => url !== urlToRemove));
    // Clear fetched content and stats when URLs change
    setFetchedDocsContent('');
    setFetchStats(null);
    setFetchError(null);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedExtensions = ['.md', '.markdown', '.pdf', '.txt', '.adoc', '.asciidoc'];
    const fileExtension = '.' + file.name.toLowerCase().split('.').pop();

    if (!allowedExtensions.includes(fileExtension)) {
      setFileUploadError('Only markdown (.md), PDF (.pdf), text (.txt), and AsciiDoc (.adoc) files are allowed');
      event.target.value = '';
      return;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setFileUploadError('File size must be less than 10MB');
      event.target.value = '';
      return;
    }

    setIsUploadingFile(true);
    setFileUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:3001/api/upload-file', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.details
          ? `${error.error}: ${error.details}`
          : (error.error || 'Failed to upload file');
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Add to uploaded files list
      setUploadedFiles(prev => [...prev, {
        filename: data.filename,
        content: data.content,
        length: data.length,
        type: data.type
      }]);

      setFileUploadError(`✓ Successfully uploaded ${data.filename} (${data.length} characters)`);
    } catch (err) {
      setFileUploadError(err.message);
    } finally {
      setIsUploadingFile(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleRemoveFile = (filename) => {
    setUploadedFiles(prev => prev.filter(file => file.filename !== filename));
    setFileUploadError(null);
  };

  const handleAddFigmaUrl = () => {
    const trimmedUrl = figmaUrlInput.trim();
    if (!trimmedUrl) return;

    // Basic Figma URL validation
    if (!trimmedUrl.includes('figma.com/')) {
      setFigmaFetchError('Please enter a valid Figma URL (e.g., https://figma.com/design/...)');
      return;
    }

    // Check if URL is already added
    if (figmaUrls.includes(trimmedUrl)) {
      setFigmaFetchError('This Figma URL has already been added');
      return;
    }

    setFigmaUrls([...figmaUrls, trimmedUrl]);
    setFigmaUrlInput('');
    setFigmaFetchError(null);
  };

  const handleRemoveFigmaUrl = (urlToRemove) => {
    setFigmaUrls(figmaUrls.filter(url => url !== urlToRemove));
    // Clear fetched content when URLs change
    setFetchedFigmaContent('');
    setFigmaFetchError(null);
  };

  const handleFetchFigma = async () => {
    if (figmaUrls.length === 0) {
      setFigmaFetchError('Please add at least one Figma URL');
      return;
    }

    setIsFetchingFigma(true);
    setFigmaFetchError(null);

    try {
      const response = await fetch('http://localhost:3001/api/fetch-figma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: figmaUrls })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch Figma content');
      }

      const data = await response.json();

      // Combine all successfully fetched Figma content
      let combinedContent = '';

      if (data.designs && data.designs.length > 0) {
        combinedContent = data.designs
          .map(design => `\n\n--- Figma Design: ${design.url} ---\n\n${design.content}`)
          .join('\n\n');
      }

      if (combinedContent.trim().length === 0) {
        throw new Error('No content could be extracted from the provided Figma URLs');
      }

      setFetchedFigmaContent(combinedContent);
      setFigmaFetchError(`✓ Fetched ${data.designs.length} Figma design${data.designs.length > 1 ? 's' : ''} (${combinedContent.length} characters)`);
    } catch (err) {
      setFigmaFetchError(err.message);
      setFetchedFigmaContent('');
    } finally {
      setIsFetchingFigma(false);
    }
  };

  const handleFetchDocs = async () => {
    if (docUrls.length === 0) {
      setFetchError('Please add at least one documentation URL');
      return;
    }

    setIsFetchingDocs(true);
    setFetchError(null);
    setFetchStats(null);

    try {
      const response = await fetch('http://localhost:3001/api/fetch-docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: docUrls })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch documentation');
      }

      const data = await response.json();

      // Separate original and linked documents
      const originalDocs = data.documents.filter(doc => doc.sourceType === 'original' && doc.success);
      const linkedDocs = data.documents.filter(doc => doc.sourceType === 'linked' && doc.success);

      // Combine all successfully fetched documents
      let combinedContent = '';

      if (originalDocs.length > 0) {
        combinedContent += originalDocs
          .map(doc => `\n\n--- Source: ${doc.url} ---\n\n${doc.content}`)
          .join('\n\n');
      }

      if (linkedDocs.length > 0) {
        combinedContent += '\n\n\n=== LINKED DOCUMENTATION ===\n\n';
        combinedContent += linkedDocs
          .map(doc => `\n\n--- Linked Doc: ${doc.url} ---\n\n${doc.content}`)
          .join('\n\n');
      }

      if (combinedContent.trim().length === 0) {
        throw new Error('No content could be extracted from the provided URLs');
      }

      setFetchedDocsContent(combinedContent);
      setFetchStats(data.stats);

      // Show success message
      const totalDocs = originalDocs.length + linkedDocs.length;
      if (linkedDocs.length > 0) {
        setFetchError(`✓ Fetched ${totalDocs} documents (${originalDocs.length} original + ${linkedDocs.length} linked, ${combinedContent.length} characters)`);
      } else {
        setFetchError(`✓ Fetched ${totalDocs} documents (${combinedContent.length} characters)`);
      }
    } catch (err) {
      setFetchError(err.message);
      setFetchedDocsContent('');
      setFetchStats(null);
    } finally {
      setIsFetchingDocs(false);
    }
  };

  const handleTemplateToggle = (template) => {
    setSelectedDocTemplates(prev => {
      if (prev.includes(template)) {
        // Don't allow deselecting if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== template);
      } else {
        return [...prev, template];
      }
    });
  };

  const handleGenerate = async (outputType) => {
    // Check if we have any source content
    if (!sourceContent.trim() && !fetchedDocsContent.trim() && !fetchedFigmaContent.trim() && uploadedFiles.length === 0) {
      setError('Please provide source content: paste text, upload files, fetch documentation URLs, or add Figma designs');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGeneratingType(outputType);

    try {
      // Combine all sources of content
      let combinedContent = '';

      // Add uploaded files first
      if (uploadedFiles.length > 0) {
        combinedContent += '=== UPLOADED FILES ===\n\n';
        uploadedFiles.forEach(file => {
          combinedContent += `--- File: ${file.filename} (${file.type}) ---\n\n${file.content}\n\n`;
        });
      }

      // Add fetched Figma content
      if (fetchedFigmaContent.trim()) {
        if (combinedContent) {
          combinedContent += '\n\n';
        }
        combinedContent += '=== FIGMA DESIGNS ===\n\n' + fetchedFigmaContent;
      }

      // Add fetched documentation
      if (fetchedDocsContent.trim()) {
        if (combinedContent) {
          combinedContent += '\n\n';
        }
        combinedContent += '=== DOCUMENTATION FROM URLS ===\n\n' + fetchedDocsContent;
      }

      // Add manual source content
      if (sourceContent.trim()) {
        if (combinedContent) {
          combinedContent += '\n\n=== ADDITIONAL SOURCE CONTENT ===\n\n';
        }
        combinedContent += sourceContent;
      }

      // If generating Blog, generate BOTH blog proposal and blog draft
      if (outputType === 'blog') {
        // Generate blog proposal first
        const proposalContent = await generateContent(OUTPUT_TYPES.BLOG_PROPOSAL, combinedContent, audience, customPrompt);

        // Generate blog draft
        const draftContent = await generateContent(OUTPUT_TYPES.BLOG_DRAFT, combinedContent, audience, customPrompt);

        setGeneratedOutputs(prev => ({
          ...prev,
          blogProposal: proposalContent,
          blogDraft: draftContent
        }));
      }
      // If generating Trailhead Badge, generate BOTH badge proposal and badge draft
      else if (outputType === 'badge') {
        // Generate badge proposal first
        const proposalContent = await generateContent(OUTPUT_TYPES.BADGE_PROPOSAL, combinedContent, audience, customPrompt);

        // Generate badge draft
        const draftContent = await generateContent(OUTPUT_TYPES.BADGE_DRAFT, combinedContent, audience, customPrompt);

        setGeneratedOutputs(prev => ({
          ...prev,
          badgeProposal: proposalContent,
          badgeDraft: draftContent
        }));
      }
      // If generating Doc Draft, generate documentation with selected templates
      else if (outputType === 'doc') {
        // Generate documentation draft with selected templates
        const docContent = await generateContent(OUTPUT_TYPES.DOC_DRAFT, combinedContent, audience, customPrompt, selectedDocTemplates);

        setGeneratedOutputs(prev => ({
          ...prev,
          docDraft: docContent
        }));
      }

      // Automatically switch to Retrieve Content view to show output
      setCurrentView('distribution');
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
        <h2>Add Sources</h2>
        <p>Create AI-generated MuleSoft blog posts and Trailhead badges from your source content</p>
      </div>

      {/* Source Input Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Source Input</h3>
          <p className={styles.cardDescription}>
            Add documentation URLs, upload files, or paste source content
          </p>
        </div>

        <div className={styles.formSection}>
        <label htmlFor="docUrls" className={styles.label}>
          MuleSoft Documentation URLs <span className={styles.optional}>(optional)</span>
          <span className={styles.hint}>(add a folder URL to get all nested pages, or use * for wildcards)</span>
        </label>
        <div className={styles.urlInputGroup}>
          <input
            type="text"
            id="docUrls"
            className={styles.urlInput}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddUrl();
              }
            }}
            placeholder="https://docs.mulesoft.com/anypoint-code-builder/ (gets all nested pages)"
            disabled={isGenerating || isFetchingDocs}
          />
          <button
            className={styles.addUrlButton}
            onClick={handleAddUrl}
            disabled={isGenerating || isFetchingDocs || !urlInput.trim()}
          >
            Add URL
          </button>
        </div>

        {docUrls.length > 0 && (
          <div className={styles.urlList}>
            <div className={styles.urlListHeader}>
              <span>Added URLs ({docUrls.length}):</span>
              <button
                className={styles.fetchDocsButton}
                onClick={handleFetchDocs}
                disabled={isGenerating || isFetchingDocs}
              >
                {isFetchingDocs ? (
                  <>
                    <span className={styles.spinner}></span>
                    Fetching...
                  </>
                ) : (
                  <>
                    {fetchedDocsContent ? '✓ Refresh Content' : 'Fetch Content'}
                  </>
                )}
              </button>
            </div>
            <ul className={styles.urlItems}>
              {docUrls.map((url, index) => (
                <li key={index} className={styles.urlItem}>
                  <span className={styles.urlText} title={url}>
                    {url}
                  </span>
                  <button
                    className={styles.removeUrlButton}
                    onClick={() => handleRemoveUrl(url)}
                    disabled={isGenerating || isFetchingDocs}
                    aria-label="Remove URL"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {fetchError && (
          <div className={fetchError.startsWith('✓') || fetchError.startsWith('🔍') ? styles.successMessage : styles.error}>
            {fetchError}
          </div>
        )}

        {fetchStats && fetchStats.totalCount > 0 && (
          <div className={styles.statsPanel}>
            <div className={styles.statsHeader}>📊 Fetch Summary</div>
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Original Pages:</span>
                <span className={styles.statValue}>{fetchStats.originalCount}</span>
              </div>
              {fetchStats.linkedCount > 0 && (
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Linked Docs:</span>
                  <span className={styles.statValue}>{fetchStats.linkedCount}</span>
                </div>
              )}
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Total Fetched:</span>
                <span className={styles.statValue}>{fetchStats.totalCount}</span>
              </div>
            </div>
            {fetchStats.linkedCount > 0 && (
              <div className={styles.statsNote}>
                💡 Automatically discovered and fetched {fetchStats.linkedCount} linked documentation page{fetchStats.linkedCount > 1 ? 's' : ''} from your source{fetchStats.totalRequested > 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.formSection}>
        <label htmlFor="figmaUrls" className={styles.label}>
          Figma Design URLs <span className={styles.optional}>(optional)</span>
          <span className={styles.hint}>(add Figma design, prototype, or FigJam URLs)</span>
        </label>
        <div className={styles.urlInputGroup}>
          <input
            type="text"
            id="figmaUrls"
            className={styles.urlInput}
            value={figmaUrlInput}
            onChange={(e) => setFigmaUrlInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddFigmaUrl();
              }
            }}
            placeholder="https://figma.com/design/..."
            disabled={isGenerating || isFetchingFigma}
          />
          <button
            className={styles.addUrlButton}
            onClick={handleAddFigmaUrl}
            disabled={isGenerating || isFetchingFigma || !figmaUrlInput.trim()}
          >
            Add URL
          </button>
        </div>

        {figmaUrls.length > 0 && (
          <div className={styles.urlList}>
            <div className={styles.urlListHeader}>
              <span>Added Figma URLs ({figmaUrls.length}):</span>
              <button
                className={styles.fetchDocsButton}
                onClick={handleFetchFigma}
                disabled={isGenerating || isFetchingFigma}
                style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'}}
              >
                {isFetchingFigma ? (
                  <>
                    <span className={styles.spinner}></span>
                    Fetching...
                  </>
                ) : (
                  <>
                    {fetchedFigmaContent ? '✓ Refresh Figma' : 'Fetch Figma Content'}
                  </>
                )}
              </button>
            </div>
            <ul className={styles.urlItems}>
              {figmaUrls.map((url, index) => (
                <li key={index} className={styles.urlItem}>
                  <span className={styles.urlText} title={url}>
                    {url}
                  </span>
                  <button
                    className={styles.removeUrlButton}
                    onClick={() => handleRemoveFigmaUrl(url)}
                    disabled={isGenerating || isFetchingFigma}
                    aria-label="Remove URL"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {figmaFetchError && (
          <div className={figmaFetchError.startsWith('✓') ? styles.successMessage : styles.error}>
            {figmaFetchError}
          </div>
        )}
      </div>

      <div className={styles.formSection}>
        <label htmlFor="fileUpload" className={styles.label}>
          Upload Files <span className={styles.optional}>(optional)</span>
          <span className={styles.hint}>(markdown, PDF, text, or AsciiDoc files)</span>
        </label>
        <div className={styles.fileUploadGroup}>
          <input
            type="file"
            id="fileUpload"
            className={styles.fileInput}
            accept=".md,.markdown,.pdf,.txt,.adoc,.asciidoc"
            onChange={handleFileUpload}
            disabled={isGenerating || isUploadingFile}
          />
          <label htmlFor="fileUpload" className={styles.fileInputLabel}>
            {isUploadingFile ? (
              <>
                <span className={styles.spinner}></span>
                Uploading...
              </>
            ) : (
              <>
                📎 Choose File
              </>
            )}
          </label>
        </div>

        {uploadedFiles.length > 0 && (
          <div className={styles.uploadedFilesList}>
            <div className={styles.uploadedFilesHeader}>
              Uploaded Files ({uploadedFiles.length}):
            </div>
            <ul className={styles.fileItems}>
              {uploadedFiles.map((file, index) => (
                <li key={index} className={styles.fileItem}>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileIcon}>
                      {file.type === 'pdf' ? '📄' : '📝'}
                    </span>
                    <div className={styles.fileDetails}>
                      <span className={styles.fileName}>{file.filename}</span>
                      <span className={styles.fileSize}>
                        {file.length.toLocaleString()} characters
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.removeFileButton}
                    onClick={() => handleRemoveFile(file.filename)}
                    disabled={isGenerating || isUploadingFile}
                    aria-label="Remove file"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {fileUploadError && (
          <div className={fileUploadError.startsWith('✓') || fileUploadError.startsWith('🔍') ? styles.successMessage : styles.error}>
            {fileUploadError}
          </div>
        )}
      </div>

      <div className={styles.formSection}>
        <label htmlFor="sourceContent" className={styles.label}>
          Additional Source Content <span className={styles.optional}>(optional)</span>
          <span className={styles.hint}>(paste markdown or plain text to combine with uploaded files, Figma designs, and fetched docs)</span>
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
      </div>

      {/* Configuration Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Configuration</h3>
          <p className={styles.cardDescription}>
            Customize the target audience and generation instructions
          </p>
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

      <div className={styles.formSection}>
        <label htmlFor="customPrompt" className={styles.label}>
          Additional Instructions <span className={styles.optional}>(optional)</span>
          <span className={styles.hint}>(e.g., "Focus on security features", "Include code examples", "Emphasize benefits for enterprise users")</span>
        </label>
        <textarea
          id="customPrompt"
          className={styles.textarea}
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Add any specific instructions for content generation...&#x0a;&#x0a;Examples:&#x0a;- Emphasize performance improvements&#x0a;- Include migration steps from previous versions&#x0a;- Focus on developer experience&#x0a;- Highlight enterprise features"
          rows={4}
          disabled={isGenerating}
        />
        <div className={styles.charCount}>
          {customPrompt.length} characters
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}
      </div>

      {/* Action Footer */}
      <div className={styles.buttonSection}>
        <h3>Generate Output</h3>
        <div className={styles.buttonGroup}>
          <button
            className={styles.generateButton}
            onClick={() => handleGenerate('blog')}
            disabled={isGenerating || (!sourceContent.trim() && !fetchedDocsContent.trim() && uploadedFiles.length === 0)}
          >
            {isGenerating && generatingType === 'blog' ? (
              <>
                <span className={styles.spinner}></span>
                Generating Blog...
              </>
            ) : (
              <>
                {(generatedOutputs.blogProposal || generatedOutputs.blogDraft) && (
                  <span className={styles.checkmark}>✓</span>
                )}
                MuleSoft Blog Post
              </>
            )}
          </button>

          <button
            className={styles.generateButton}
            onClick={() => handleGenerate('badge')}
            disabled={isGenerating || (!sourceContent.trim() && !fetchedDocsContent.trim() && uploadedFiles.length === 0)}
          >
            {isGenerating && generatingType === 'badge' ? (
              <>
                <span className={styles.spinner}></span>
                Generating Badge...
              </>
            ) : (
              <>
                {(generatedOutputs.badgeProposal || generatedOutputs.badgeDraft) && (
                  <span className={styles.checkmark}>✓</span>
                )}
                Trailhead Badge
              </>
            )}
          </button>
        </div>

        <div className={styles.docDraftSection}>
          <h4 className={styles.sectionSubtitle}>Doc Draft</h4>
          <div className={styles.templateSelector}>
            <label className={styles.label}>Select Template Types:</label>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedDocTemplates.includes('simple_task')}
                  onChange={() => handleTemplateToggle('simple_task')}
                  disabled={isGenerating}
                />
                <span>Simple Task</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedDocTemplates.includes('simple_concept')}
                  onChange={() => handleTemplateToggle('simple_concept')}
                  disabled={isGenerating}
                />
                <span>Simple Concept</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedDocTemplates.includes('simple_reference')}
                  onChange={() => handleTemplateToggle('simple_reference')}
                  disabled={isGenerating}
                />
                <span>Simple Reference</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedDocTemplates.includes('multi_topic')}
                  onChange={() => handleTemplateToggle('multi_topic')}
                  disabled={isGenerating}
                />
                <span>Multi-Topic</span>
              </label>
            </div>
          </div>
          <button
            className={styles.generateButton}
            onClick={() => handleGenerate('doc')}
            disabled={isGenerating || (!sourceContent.trim() && !fetchedDocsContent.trim() && uploadedFiles.length === 0) || selectedDocTemplates.length === 0}
          >
            {isGenerating && generatingType === 'doc' ? (
              <>
                <span className={styles.spinner}></span>
                Generating Documentation...
              </>
            ) : (
              <>
                {generatedOutputs.docDraft && (
                  <span className={styles.checkmark}>✓</span>
                )}
                Doc Draft
              </>
            )}
          </button>
        </div>

        <p className={styles.hint}>
          Blog and Badge buttons generate both a proposal and draft. Doc Draft generates production-ready documentation from your sources.
        </p>
      </div>

      {(generatedOutputs.blogProposal || generatedOutputs.blogDraft || generatedOutputs.badgeProposal || generatedOutputs.badgeDraft || generatedOutputs.docDraft) && (
        <div className={styles.successMessage}>
          Generated content is available in Retrieve Content.
        </div>
      )}
    </div>
  );
}
