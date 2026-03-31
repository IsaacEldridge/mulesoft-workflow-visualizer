# MuleSoft Content Workflow

An interactive web application that transforms various sources of content (PRDs, CX technical documentation drafts, etc.) into specific content types while creating a single source of truth.

## Overview

This tool enables content creators to:
- Paste source content in markdown or plain text format
- Select an optional target audience (admin, developer, beginner)
- Generate multiple output types from the same source material
- View and copy generated content in markdown format

**Key principle:** All outputs are generated using ONLY the information from the source content. The system never invents features, claims, timelines, or product behavior.

## Features

- **Content Authoring**: Paste source content with optional audience targeting
- **AI-Powered Generation**: Create tailored content using Claude API
- **Multiple Output Types**:
  - MuleSoft Blog Post (thought leadership tone, external publishing)
  - Salesforce Trailhead Unit (educational, step-by-step with quiz)
- **Single Source of Truth**: Generate multiple outputs from one source
- **Interactive Workflow**: Visual workflow showing content transformation

## Installation

```bash
# Navigate to project directory
cd mulesoft-workflow-visualizer

# Install dependencies
npm install

# Set up environment variables (optional, for AI generation)
cp .env.example .env
# Edit .env and add your Anthropic API key
```

## Configuration

### API Key Setup (Optional)

To enable AI-powered content generation:

1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. Create a `.env` file in the project root
3. Add your API key:
   ```
   VITE_ANTHROPIC_API_KEY=your_api_key_here
   ```

**Note:** Without an API key, the tool will generate demo content showing where your real outputs would appear.

**Security:** In production, API calls should go through a backend server to protect your API key.

## Usage

### Development Mode

```bash
# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Production Build

```bash
# Create optimized production build
npm run build

# Preview production build
npm run preview
```

## How to Use

1. **Open the Application**: Start the dev server and open in browser
2. **Click Authoring Stage**: Click the "Authoring" stage node on the left
3. **Paste Source Content**: Enter your source material (markdown or plain text)
4. **Select Audience** (optional): Choose admin, developer, beginner, or leave default
5. **Generate Content**: Click one or both output type buttons:
   - "MuleSoft Blog Post"
   - "Salesforce Trailhead Unit"
6. **View Output**: The Distribution stage automatically opens showing generated content
7. **Copy Content**: Use the "Copy Markdown" button to copy to clipboard
8. **Generate More**: Return to Authoring to generate the other output type

## Output Types

### MuleSoft Blog Post

**Purpose:** External thought leadership content for blogs.mulesoft.com

**Format:**
- Engaging title (under 60 characters)
- Clear structure: intro, problem, solution, benefits, conclusion
- Thought leadership tone (authoritative but approachable)
- Professional and engaging writing style

**Use Cases:**
- Product announcements
- Feature deep-dives
- Best practices and patterns
- Technical thought leadership

### Salesforce Trailhead Unit

**Purpose:** Educational content for Salesforce Trailhead platform

**Format:**
- Learning objectives (3-5 specific outcomes)
- Step-by-step instructional content
- Short, digestible sections
- Beginner-friendly language
- Two-question multiple choice quiz

**Use Cases:**
- Product tutorials
- Feature education
- Getting started guides
- Best practices training

## Content Rules

The system follows strict rules for all generated content:

✅ **Do:**
- Use only information from the source content
- State clearly when information is missing
- Tailor output to selected format requirements
- Apply audience-appropriate complexity

❌ **Don't:**
- Invent features, claims, or timelines
- Guess product behavior
- Add speculative content
- Assume information not in source

## Project Structure

```
src/
├── components/
│   ├── ContentInputPanel/    # Source content input and generation controls
│   ├── ContentOutputPanel/   # Generated content display
│   ├── WorkflowCanvas/       # Visual workflow stage nodes
│   ├── StageDetailPanel/     # Stage detail container
│   └── Header/               # Application header
├── context/
│   └── WorkflowContext.jsx   # State management for content workflow
├── services/
│   ├── contentGenerator.js   # Claude API integration
│   └── promptTemplates.js    # Output type prompt templates
├── data/
│   └── workflowData.js       # Workflow stage definitions
└── main.jsx                  # Application entry point
```

## Browser Compatibility

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

## Troubleshooting

### No content is generated

- Check that you've pasted source content in the textarea
- Verify your API key is set correctly in `.env`
- Check browser console for error messages
- Without an API key, you'll see demo content

### Generated content is incomplete

- Ensure source content has sufficient detail
- Try breaking very long content into sections
- Check that source content is in a readable format

### API errors

- Verify API key is valid and has credits
- Check network connectivity
- Ensure API key has proper permissions

## Development

### Adding New Output Types

1. Add new prompt template in `src/services/promptTemplates.js`
2. Add new output type constant to `OUTPUT_TYPES`
3. Update `OUTPUT_TYPE_LABELS` with display name
4. Add new button in `ContentInputPanel.jsx`
5. Update state management in `WorkflowContext.jsx`

### Customizing Prompts

Edit the prompt templates in `src/services/promptTemplates.js`:
- Modify format requirements
- Add new sections or structure
- Adjust tone and style guidelines
- Update rules and constraints

## License

Copyright © 2026 MuleSoft. All rights reserved.

## Support

For issues or questions, contact the CX Engineering team.

---

## Quick Start

```bash
# Install
npm install

# Add API key (optional)
cp .env.example .env
# Edit .env with your key

# Run
npm run dev

# Use
1. Click "Authoring" stage
2. Paste source content
3. Click generation button
4. View output in "Distribution" stage
```

---

**Made with Claude Code** 🚀
