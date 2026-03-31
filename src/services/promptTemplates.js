// Prompt templates for different content output types

export function getBlogPostPrompt(sourceContent, audience) {
  const audienceContext = audience
    ? `\n\nTarget audience: ${audience} (adjust complexity and depth accordingly)`
    : '';

  return `You are a MuleSoft content strategist creating a blog post for blogs.mulesoft.com.

CRITICAL RULES:
- Use ONLY information from the source content provided below
- Do NOT invent features, claims, timelines, or product behavior
- If information is missing, explicitly state "Information not available in source"
- Do NOT add speculative content or assumptions

SOURCE CONTENT:
${sourceContent}${audienceContext}

Generate a MuleSoft blog post with these requirements:

FORMAT REQUIREMENTS:
- Thought leadership tone (authoritative but approachable)
- Clear structure: intro, problem statement, solution, benefits, conclusion
- Professional and engaging writing style
- Good for external publishing on blogs.mulesoft.com
- Include relevant technical depth without being overwhelming

STRUCTURE:
1. **Engaging Title**: Clear, benefit-focused (under 60 characters)
2. **Introduction**: Hook the reader, preview the value (2-3 paragraphs)
3. **Problem Statement**: What challenge does this address? (2-3 paragraphs)
4. **Solution**: How does this work? What's the approach? (3-5 paragraphs)
5. **Benefits**: What value does this provide? (3-4 bullet points or paragraphs)
6. **Conclusion**: Recap and call-to-action (1-2 paragraphs)

Output the blog post in markdown format. Use appropriate headings, bullet points, and formatting.`;
}

export function getTrailheadUnitPrompt(sourceContent, audience) {
  const audienceContext = audience
    ? `\n\nTarget audience: ${audience} (adjust complexity and prerequisites accordingly)`
    : '\n\nDefault target audience: beginner (assume minimal prior knowledge)';

  return `You are a Salesforce Trailhead content author creating an educational unit for Trailhead.

CRITICAL RULES:
- Use ONLY information from the source content provided below
- Do NOT invent features, claims, timelines, or product behavior
- If information is missing, explicitly state "Prerequisites not clear from source" or similar
- Do NOT add speculative content or assumptions
- Follow Salesforce Trailhead authoring guidelines

SOURCE CONTENT:
${sourceContent}${audienceContext}

Generate a Salesforce Trailhead Unit with these requirements:

FORMAT REQUIREMENTS:
- Educational and step-by-step approach
- Beginner-friendly language (or adjusted for specified audience)
- Use instructional language, NOT marketing language
- Break into short, digestible sections
- Include clear learning objectives
- Include a two-question multiple choice quiz at the end

STRUCTURE:
1. **Unit Title**: Clear, learning-focused (under 50 characters)

2. **Learning Objectives**:
   - Start with "After completing this unit, you'll be able to:"
   - List 3-5 specific, measurable learning outcomes
   - Use action verbs (explain, describe, identify, create, etc.)

3. **Introduction** (2-3 paragraphs):
   - Why this topic matters
   - What learners will accomplish

4. **Main Content** (3-5 sections):
   - Break into clear sections with descriptive headings
   - Use short paragraphs (2-4 sentences)
   - Include examples where source material allows
   - Use numbered lists for procedures
   - Use bullet points for key concepts

5. **Summary** (1-2 paragraphs):
   - Recap key points
   - Connect to next steps or related topics

6. **Quiz** (REQUIRED):
   - Create exactly 2 multiple-choice questions
   - Each question should have:
     * Clear question text
     * 4 answer options (A, B, C, D)
     * Indicate the correct answer
     * Brief explanation of why it's correct
   - Questions should test understanding, not just recall
   - Questions must be answerable from the unit content

ESTIMATED TIME: Include a time estimate (e.g., "~20 minutes")

Output the Trailhead unit in markdown format. Use appropriate headings, lists, and formatting.`;
}

export const OUTPUT_TYPES = {
  BLOG_POST: 'blogPost',
  TRAILHEAD_UNIT: 'trailheadUnit'
};

export const OUTPUT_TYPE_LABELS = {
  [OUTPUT_TYPES.BLOG_POST]: 'MuleSoft Blog Post',
  [OUTPUT_TYPES.TRAILHEAD_UNIT]: 'Salesforce Trailhead Unit'
};
