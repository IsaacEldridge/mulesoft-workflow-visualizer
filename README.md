# CX AI Content Workbench

An enterprise-grade AI-powered content generation tool that transforms MuleSoft documentation, PRDs, and other sources into polished blog posts and Trailhead units.

## 🎯 Overview

The CX AI Content Workbench helps Salesforce/MuleSoft content creators generate high-quality content from multiple sources:
- **Documentation URLs** (supports wildcards and sitemap-based discovery)
- **File uploads** (PDF and Markdown files)
- **Direct text input**
- **Custom generation instructions**

**Output Types:**
- 📝 MuleSoft Blog Posts (thought leadership, external publishing)
- 🎓 Salesforce Trailhead Units (educational, with quizzes)

---

## 🚀 Quick Start for Salesforce Team Members

### Prerequisites

- **Node.js 18+** (check with `node --version`)
- **npm 8+** (check with `npm --version`)
- **Salesforce API credentials** for the Bedrock endpoint

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/IsaacEldridge/mulesoft-workflow-visualizer.git
   cd mulesoft-workflow-visualizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file** with your credentials
   ```env
   # Salesforce Bedrock Proxy (internal)
   ANTHROPIC_BEDROCK_BASE_URL=https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl/bedrock

   # Your Salesforce API key/token
   ANTHROPIC_API_KEY=your_api_key_here
   ```

   > **Note:** Get your API credentials from your Salesforce team lead or internal docs.

5. **Start the application**
   ```bash
   npm run dev:all
   ```

   This command starts both:
   - 🖥️ **Frontend** (Vite/React): `http://localhost:3000/mulesoft-workflow-visualizer/`
   - ⚙️ **Backend** (Express/Node): `http://localhost:3001`

6. **Open your browser**

   Navigate to: `http://localhost:3000/mulesoft-workflow-visualizer/`

---

## ✨ Features

### 📥 Multiple Source Types

**1. Documentation URLs**
- Add MuleSoft documentation URLs directly
- Use **wildcards** to fetch multiple pages: `https://docs.mulesoft.com/anypoint-code-builder/af-*`
- **Sitemap-based discovery**: Automatically finds all pages under a section
- **Linked documentation**: Automatically discovers and fetches referenced pages

**2. File Uploads**
- Upload **PDF files** (text extraction included)
- Upload **Markdown files** (.md, .txt)
- Maximum file size: 10MB

**3. Manual Text Input**
- Paste source content directly
- Supports Markdown formatting
- Combine with URLs and files

**4. Custom Instructions**
- Add specific generation instructions
- Examples: "Focus on security features", "Include code examples"

### 🎨 Enterprise UI

- **Fixed Sidebar Navigation**
  - Authoring (content creation)
  - Distribution (view generated content)
  - Governance (coming soon)
  - Observability (coming soon)

- **Card-Based Forms**
  - Professional design with MuleSoft/Salesforce styling
  - Clean, intuitive layout
  - Responsive design

- **Target Audience Options**
  - Admin
  - Developer
  - Beginner
  - Default (general audience)

---

## 📖 How to Use

### Creating Content

1. **Navigate to Authoring** (click in sidebar)

2. **Add Source Content** (choose one or combine):

   **Option A: Documentation URLs**
   ```
   https://docs.mulesoft.com/anypoint-code-builder/af-*
   ```
   - Click "Add URL"
   - For multiple pages, the app discovers them automatically
   - Click "Fetch Content" to retrieve documentation

   **Option B: Upload Files**
   - Click "Choose File"
   - Select PDF or Markdown files
   - Files are processed automatically

   **Option C: Paste Text**
   - Paste content in "Additional Source Content" area
   - Supports Markdown formatting

3. **Configure** (optional):
   - Select target audience
   - Add custom instructions

4. **Generate Content**:
   - Click "MuleSoft Blog Post" or "Salesforce Trailhead Unit"
   - Wait for generation (usually 10-30 seconds)
   - App automatically switches to Distribution view

5. **View & Copy**:
   - Review generated content in Distribution view
   - Click "Copy Markdown" to copy to clipboard
   - Switch between tabs to view different outputs

---

## 🛠️ Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev:all` | Run frontend + backend together |
| `npm run dev` | Run frontend only (Vite) |
| `npm run server` | Run backend only (Express) |
| `npm run build` | Build for production |

---

## 🔧 Troubleshooting

### ❌ "Failed to generate content"

**Check:**
- ✅ Is your API key set correctly in `.env`?
- ✅ Is the backend server running? (check terminal for port 3001)
- ✅ Do you have source content added?

**Solution:** Restart the app with `npm run dev:all`

---

### ❌ "Cannot GET /api/..."

**Issue:** Backend server not running

**Solution:** Make sure you use `npm run dev:all` (not just `npm run dev`)

---

### ❌ "Failed to parse PDF file"

**Common causes:**
- PDF is image-based (scanned document without text layer)
- PDF is encrypted/password protected
- PDF file is corrupted

**Solution:** Convert to Markdown or use a text-based PDF

---

### ❌ "No URLs found matching pattern"

**Issue:** Wildcard pattern might not match any pages

**Solution:**
- Check the pattern: `https://docs.mulesoft.com/path/prefix-*`
- Try adding a folder URL instead: `https://docs.mulesoft.com/path/`
- Check backend logs for discovered URLs

---

### ❌ Backend won't start (port 3001 in use)

**Solution:**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use a different port
PORT=3002 npm run server
```

---

### ❌ Frontend won't start (port 3000 in use)

**Solution:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

---

## 📂 Project Structure

```
mulesoft-workflow-visualizer/
├── src/
│   ├── components/
│   │   ├── Sidebar/              # Navigation sidebar
│   │   ├── ContentInputPanel/    # Source input & generation
│   │   ├── ContentOutputPanel/   # Generated content display
│   │   └── ...
│   ├── context/
│   │   └── WorkflowContext.jsx   # State management
│   ├── services/
│   │   ├── contentGenerator.js   # API integration
│   │   └── promptTemplates.js    # Generation prompts
│   └── App.jsx                   # Main application
├── server.js                     # Express backend
├── package.json                  # Dependencies & scripts
└── .env                          # Environment variables (not in repo)
```

---

## 🔐 Security Notes

- **Never commit `.env` files** - they contain credentials
- **API keys are server-side only** - frontend doesn't see them
- **File uploads are processed in memory** - not stored on disk
- **10MB file size limit** - prevents memory issues

---

## 🎓 Content Generation Rules

The AI follows strict rules:

✅ **DO:**
- Use ONLY information from source content
- State clearly when information is missing
- Tailor output to format requirements
- Apply audience-appropriate complexity

❌ **DON'T:**
- Invent features, claims, or timelines
- Guess product behavior
- Add speculative content
- Assume information not in source

---

## 🌐 Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

---

## 🤝 Support

For issues or questions:
- Contact the CX Engineering team
- Create an issue in the GitHub repository
- Check the troubleshooting section above

---

## 📜 License

Copyright © 2026 Salesforce/MuleSoft. All rights reserved.

---

## 🚀 Built With

- **Frontend:** React 18 + Vite
- **Backend:** Express + Node.js
- **AI:** Claude (via AWS Bedrock)
- **Styling:** CSS Modules
- **Parsing:** Cheerio, pdf-parse, fast-xml-parser

---

**Made with Claude Code** 🤖
