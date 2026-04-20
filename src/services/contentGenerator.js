import { getBlogPostPrompt, getBadgeDraftPrompt, getBadgeProposalPrompt, OUTPUT_TYPES } from './promptTemplates';

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Generate content using Claude API via backend server
 * @param {string} outputType - Type of content to generate (blogPost, badgeProposal, or badgeDraft)
 * @param {string} sourceContent - Source markdown content
 * @param {string} audience - Target audience (admin, developer, beginner, or empty)
 * @param {string} customPrompt - Additional custom instructions for generation
 * @returns {Promise<string>} Generated content in markdown format
 */
export async function generateContent(outputType, sourceContent, audience, customPrompt = '') {
  if (!sourceContent.trim()) {
    throw new Error('Source content is required');
  }

  // Get the appropriate prompt template
  let prompt;
  if (outputType === OUTPUT_TYPES.BLOG_POST) {
    prompt = getBlogPostPrompt(sourceContent, audience, customPrompt);
  } else if (outputType === OUTPUT_TYPES.BADGE_PROPOSAL) {
    prompt = getBadgeProposalPrompt(sourceContent, audience, customPrompt);
  } else if (outputType === OUTPUT_TYPES.BADGE_DRAFT) {
    prompt = getBadgeDraftPrompt(sourceContent, audience, customPrompt);
  } else {
    throw new Error(`Unknown output type: ${outputType}`);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate content');
    }

    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error('Content generation error:', error);

    // If backend is not running, show helpful error
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Backend server not running. Please run: npm run dev:all');
    }

    throw new Error(`Failed to generate content: ${error.message}`);
  }
}

