import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Anthropic client with Bedrock support
const anthropicConfig = {
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN,
};

// If using Bedrock, configure the base URL
if (process.env.ANTHROPIC_BEDROCK_BASE_URL) {
  anthropicConfig.baseURL = process.env.ANTHROPIC_BEDROCK_BASE_URL;
  console.log('Using Bedrock endpoint:', process.env.ANTHROPIC_BEDROCK_BASE_URL);
}

const anthropic = new Anthropic(anthropicConfig);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.ANTHROPIC_API_KEY
  });
});

// Content generation endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Try real API generation first if key is configured
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here') {
      try {
        console.log('Attempting real AI generation via Salesforce proxy...');

        // Salesforce proxy uses OpenAI-compatible API format
        const baseUrl = 'https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl';

        // Use OpenAI chat completions format
        const response = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
            'x-api-key': process.env.ANTHROPIC_API_KEY
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: 4096
          })
        });

        const responseText = await response.text();
        console.log('Raw API Response:', responseText);

        if (!response.ok) {
          throw new Error(`API Error ${response.status}: ${responseText}`);
        }

        const data = JSON.parse(responseText);
        console.log('Parsed API Response:', JSON.stringify(data, null, 2));

        // Extract content from OpenAI-compatible format
        let content;
        if (data.choices && data.choices[0] && data.choices[0].message) {
          // OpenAI format: choices[0].message.content
          content = data.choices[0].message.content;
        } else if (data.content && Array.isArray(data.content) && data.content[0]) {
          // Anthropic format: content[0].text
          content = data.content[0].text;
        } else if (data.text) {
          content = data.text;
        } else if (data.completion) {
          content = data.completion;
        } else if (typeof data === 'string') {
          content = data;
        } else {
          throw new Error('Unexpected response format from API');
        }

        console.log('✓ Content generated successfully with Claude API');

        return res.json({ content, mode: 'ai' });
      } catch (error) {
        console.error('API generation failed, falling back to mock mode:', error.message);
        console.error('Full error:', error);
        // Fall through to mock generation
      }
    }

    // Mock/demo generation
    console.log('Using mock generation mode');
    const content = generateMockContent(prompt);

    res.json({ content, mode: 'mock' });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate content'
    });
  }
});

// Mock content generator
function generateMockContent(prompt) {
  const isBlogPost = prompt.includes('MuleSoft blog post') || prompt.includes('blogs.mulesoft.com');
  const isTrailhead = prompt.includes('Trailhead') || prompt.includes('educational');

  // Extract source content from prompt
  const sourceMatch = prompt.match(/SOURCE CONTENT:\n([\s\S]*?)(?:\n\nTarget audience:|$)/);
  const sourceContent = sourceMatch ? sourceMatch[1].trim() : 'source content';
  const sourcePreview = sourceContent.substring(0, 150);

  // Extract audience if present
  const audienceMatch = prompt.match(/Target audience: (\w+)/);
  const audience = audienceMatch ? audienceMatch[1] : null;

  // Parse source content to extract key information
  const lines = sourceContent.split('\n').filter(line => line.trim());
  const title = lines.find(line => line.startsWith('#')) || 'Technology Overview';
  const cleanTitle = title.replace(/^#+\s*/, '').trim();

  // Extract headings and content
  const headings = lines.filter(line => line.match(/^#+\s+/)).map(h => h.replace(/^#+\s*/, '').trim());
  const bullets = lines.filter(line => line.match(/^[-*]\s+/)).map(b => b.replace(/^[-*]\s*/, '').trim());

  // Extract key topics
  const topics = [...headings.slice(1), ...bullets.slice(0, 3)].filter(Boolean);

  if (isBlogPost) {
    const topicList = topics.length > 0 ? topics.slice(0, 3) : ['key concepts', 'implementation approaches', 'best practices'];

    return `# ${cleanTitle}: A Deep Dive

## Introduction

${cleanTitle} represents an important advancement in the MuleSoft ecosystem. This post explores the key concepts, implementation strategies, and real-world benefits that teams can leverage to improve their integration solutions.

${audience ? `> **Note:** This content is tailored for ${audience} audiences.\n\n` : ''}

## Understanding ${cleanTitle}

${sourceContent.split('\n').slice(0, 3).join(' ').substring(0, 200) || 'This technology provides powerful capabilities for modern integration needs.'}

The core concepts include:
${topicList.map(topic => `- **${topic}**: Essential for effective implementation`).join('\n')}

## Key Benefits

Organizations implementing these approaches typically see:

- **Improved Development Speed**: Streamlined workflows reduce time-to-market
- **Enhanced Reliability**: Better error handling and monitoring capabilities
- **Greater Flexibility**: Modular design supports evolving business needs
- **Reduced Complexity**: Clear patterns and abstractions simplify maintenance

## Implementation Approach

### Getting Started

${topics.length > 0 ? `When working with ${cleanTitle}, start by understanding ${topics[0]?.toLowerCase() || 'the fundamentals'}.` : 'Begin with the core concepts and build from there.'} This foundation ensures you're building on solid principles.

### Best Practices

${bullets.length > 0 ? bullets.slice(0, 3).map((b, i) => `${i + 1}. ${b}`).join('\n') : '1. Start with clear requirements\n2. Design for reusability\n3. Test thoroughly'}

### Common Patterns

Successful implementations follow proven patterns that reduce risk and accelerate delivery. ${topics.length > 1 ? `Focus on ${topics[1]?.toLowerCase() || 'key design principles'}` : 'Apply established best practices'} to ensure your solution is maintainable and scalable.

## Real-World Impact

Teams that adopt these approaches report:
- 40-60% reduction in development time
- Improved system reliability and uptime
- Better developer productivity and satisfaction
- Enhanced business agility

## Conclusion

${cleanTitle} offers powerful capabilities for modern integration challenges. By understanding the core concepts and following proven implementation patterns, teams can build solutions that deliver real business value.

Ready to get started? Begin by exploring ${topics[0]?.toLowerCase() || 'the fundamentals'} and applying these principles to your next project.

---

*🤖 Generated in MOCK MODE - This is realistic demo content based on your source material. Configure a valid Anthropic API key to enable real AI generation.*`;
  }

  if (isTrailhead) {
    const topicList = topics.length > 0 ? topics.slice(0, 4) : ['core concepts', 'key features', 'implementation steps', 'best practices'];

    return `# ${cleanTitle}

~${Math.max(15, Math.min(30, topics.length * 5))} minutes

## Learning Objectives

After completing this unit, you'll be able to:
${topicList.map(topic => `- Explain ${topic.toLowerCase()}`).join('\n')}
- Apply these concepts to real-world scenarios

${audience ? `> **Audience Level:** This unit is designed for ${audience} learners.\n\n` : ''}

## Introduction

Welcome! In this unit, you'll learn about ${cleanTitle}. ${sourceContent.split('\n').slice(0, 2).join(' ').substring(0, 150) || 'This is an important topic for MuleSoft developers.'}

By the end of this unit, you'll understand how to work with these concepts effectively and apply them to your own projects.

## What Is ${cleanTitle}?

${sourceContent.split('\n').find(line => !line.startsWith('#') && line.length > 20)?.substring(0, 200) || `${cleanTitle} is a key concept in the MuleSoft ecosystem.`}

**Key Concepts:**
${topicList.slice(0, 3).map(topic => `- **${topic}**: An essential component`).join('\n')}

## Core Features

${topics.length > 0 ? `Let's explore the main features of ${cleanTitle}:` : 'Here are the main features to understand:'}

${topics.length > 0 ? topics.slice(0, 3).map((topic, i) => `
### ${i + 1}. ${topic}

${bullets[i] || `Understanding ${topic.toLowerCase()} helps you build more effective solutions. This feature provides important capabilities for your implementations.`}
`).join('\n') : `
### Feature 1: Core Functionality
The primary capability that enables you to accomplish your integration goals.

### Feature 2: Enhanced Capabilities
Additional features that provide flexibility and power.

### Feature 3: Best Practices
Guidelines for effective implementation and maintenance.
`}

## Implementation Steps

When working with ${cleanTitle}, follow these steps:

${bullets.length > 0 ? bullets.slice(0, 4).map((b, i) => `${i + 1}. ${b}`).join('\n') : `1. Review the requirements
2. Plan your implementation approach
3. Build and test incrementally
4. Deploy and monitor`}

## Best Practices

To get the most out of ${cleanTitle}:

- **Start Simple**: Begin with basic implementations before adding complexity
- **Test Thoroughly**: Validate each component as you build
- **Document Clearly**: Make your code easy to understand and maintain
- **Follow Patterns**: Use proven approaches that the community recommends

## Real-World Example

Consider a scenario where you need to ${topics[0]?.toLowerCase() || 'implement this functionality'}.

With ${cleanTitle}:
- You can ${bullets[0]?.toLowerCase() || 'accomplish your goals efficiently'}
- ${topics[1] ? `The ${topics[1].toLowerCase()} capabilities provide flexibility` : 'You have the tools you need'}
- Your solution will be maintainable and scalable

## Summary

${cleanTitle} provides important capabilities for MuleSoft developers. ${topics.length > 0 ? `Understanding ${topics[0]?.toLowerCase()}, ${topics[1]?.toLowerCase() || 'key concepts'}, and related features` : 'Understanding these concepts'} enables you to build effective solutions.

Remember to ${bullets[0]?.toLowerCase() || 'follow best practices'} and apply the principles covered in this unit to your projects.

## Check Your Knowledge

**Question 1**: What is a key benefit of ${cleanTitle}?

A) It makes integrations more complex
B) It ${bullets[0]?.toLowerCase().replace(/^it\s+/i, '') || 'improves development efficiency'} ✓
C) It requires more resources
D) It only works in specific scenarios

**Correct Answer: B**
${bullets[0] || `${cleanTitle} helps improve efficiency and effectiveness in your implementations.`}

**Question 2**: When implementing ${cleanTitle}, what should you do first?

A) Deploy to production immediately
B) Skip testing to save time
C) ${bullets[0]?.substring(0, 50) || 'Start with planning and requirements'} ✓
D) Ignore documentation

**Correct Answer: C**
Following proper implementation steps ensures your solution is reliable and maintainable. ${bullets[0]?.substring(0, 100) || 'Starting with good planning sets you up for success.'}

---

*🤖 Generated in MOCK MODE - This is realistic demo content based on your source material. Configure a valid Anthropic API key to enable real AI generation.*`;
  }

  return 'Mock content generated';
}

app.listen(PORT, () => {
  console.log(`\n🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoint: http://localhost:${PORT}/api/generate`);

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
  console.log(`🔑 API key configured: ${apiKey ? 'Yes ✓' : 'No ✗'}`);

  if (process.env.ANTHROPIC_BEDROCK_BASE_URL) {
    console.log(`🌐 Using Bedrock endpoint: ${process.env.ANTHROPIC_BEDROCK_BASE_URL}`);
    console.log(`   (Salesforce internal proxy)\n`);
  } else {
    console.log(`🌐 Using standard Anthropic API\n`);
  }

  if (!apiKey) {
    console.log('⚠️  Warning: No API key found in .env file');
    console.log('   Add your API key to enable content generation\n');
  }
});
