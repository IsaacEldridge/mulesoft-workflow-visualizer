import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';
import multer from 'multer';
import { createRequire } from 'module';
import { XMLParser } from 'fast-xml-parser';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Load MuleSoft Blog Guidelines once at startup for the blog quality check.
// Falls back to a brief inline summary if the file is missing so the endpoint
// never silently returns a guideline-less review.
let blogGuidelinesText = '';
try {
  blogGuidelinesText = fs.readFileSync(
    path.join(__dirname, 'trailhead_prompt_etc', 'MuleSoft Blog Guidelines and Style Guide – 2025.md'),
    'utf-8'
  );
  console.log(`📘 Loaded MuleSoft Blog Guidelines (${blogGuidelinesText.length} chars)`);
} catch (err) {
  console.warn('⚠️  Could not load MuleSoft Blog Guidelines file:', err.message);
}

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

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/markdown',
      'text/x-markdown',
      'text/plain',
      'application/pdf',
      'text/html',
      'application/xhtml+xml'
    ];
    const allowedExtensions = ['.md', '.markdown', '.pdf', '.txt', '.adoc', '.asciidoc', '.html', '.htm'];

    const hasAllowedType = allowedTypes.includes(file.mimetype);
    const hasAllowedExtension = allowedExtensions.some(ext =>
      file.originalname.toLowerCase().endsWith(ext)
    );

    if (hasAllowedType || hasAllowedExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only markdown, PDF, text, AsciiDoc, and HTML files are allowed'));
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.ANTHROPIC_API_KEY
  });
});

// File upload endpoint
app.post('/api/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.file;
    console.log(`\n📄 Processing uploaded file: ${file.originalname} (${file.mimetype})`);

    let content = '';
    const fileExtension = file.originalname.toLowerCase().split('.').pop();

    // Handle PDF files
    if (file.mimetype === 'application/pdf' || fileExtension === 'pdf') {
      try {
        console.log('  Extracting text from PDF...');
        console.log(`  File size: ${file.buffer.length} bytes`);

        // Parse PDF with options for better compatibility
        const pdfData = await pdfParse(file.buffer, {
          // Don't use native rendering (more compatible)
          max: 0,
          version: 'v1.10.100'
        });

        content = pdfData.text;

        // Additional metadata for debugging
        console.log(`  PDF Info: ${pdfData.numpages} pages, ${pdfData.info?.Title || 'No title'}`);
        console.log(`  ✓ Extracted ${content.length} characters from PDF`);

        if (!content || content.trim().length === 0) {
          console.warn('  ⚠️  PDF parsed but no text content found (might be image-based or encrypted)');
          return res.status(400).json({
            error: 'PDF appears to be empty or image-based',
            details: 'The PDF was parsed successfully but contains no extractable text. This can happen with scanned PDFs or image-based PDFs. Try using a text-based PDF or convert the content to markdown.'
          });
        }
      } catch (error) {
        console.error('  ❌ Error parsing PDF:', error);
        console.error('  Error stack:', error.stack);
        return res.status(400).json({
          error: 'Failed to parse PDF file',
          details: error.message || 'Unknown error occurred while parsing PDF. The file might be corrupted, encrypted, or in an unsupported format.'
        });
      }
    }
    // Handle HTML files
    else if (fileExtension === 'html' || fileExtension === 'htm') {
      const html = file.buffer.toString('utf-8');
      const $ = cheerio.load(html);
      $('script, style, noscript, nav, header, footer').remove();
      const candidates = ['main', 'article', '[role="main"]', '.content', '.main-content', '#content', '#app', '#root'];
      let extracted = '';
      for (const sel of candidates) {
        const el = $(sel);
        if (el.length > 0 && el.text().trim().length > 200) {
          extracted = el.text();
          break;
        }
      }
      content = (extracted || $('body').text()).replace(/\s+/g, ' ').trim();
      console.log(`  ✓ Extracted ${content.length} characters from HTML file`);
    }
    // Handle markdown/text files
    else {
      content = file.buffer.toString('utf-8');
      console.log(`  ✓ Read ${content.length} characters from text file`);
    }

    // Clean up the content
    content = content.trim();

    if (!content || content.length === 0) {
      return res.status(400).json({
        error: 'No content could be extracted from the file'
      });
    }

    res.json({
      success: true,
      filename: file.originalname,
      content,
      length: content.length,
      type: fileExtension === 'pdf' ? 'pdf' : ['html', 'htm'].includes(fileExtension) ? 'html' : 'markdown'
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      error: error.message || 'Failed to process file'
    });
  }
});

// Helper function to fetch and parse sitemap
async function fetchSitemapUrls(domain) {
  const sitemapUrls = [
    `${domain}/sitemap.xml`,
    `${domain}/sitemap_index.xml`,
    `${domain}/sitemap-index.xml`
  ];

  const parser = new XMLParser();

  for (const sitemapUrl of sitemapUrls) {
    try {
      console.log(`  Trying sitemap: ${sitemapUrl}`);
      const response = await fetch(sitemapUrl);

      if (response.ok) {
        const xml = await response.text();
        const result = parser.parse(xml);

        let urls = [];

        // Handle sitemap index (contains multiple sitemaps)
        if (result.sitemapindex && result.sitemapindex.sitemap) {
          const sitemaps = Array.isArray(result.sitemapindex.sitemap)
            ? result.sitemapindex.sitemap
            : [result.sitemapindex.sitemap];

          console.log(`  Found sitemap index with ${sitemaps.length} sitemaps`);

          // Fetch all sub-sitemaps
          for (const sitemap of sitemaps) {
            const subSitemapUrl = sitemap.loc;
            try {
              const subResponse = await fetch(subSitemapUrl);
              if (subResponse.ok) {
                const subXml = await subResponse.text();
                const subResult = parser.parse(subXml);

                if (subResult.urlset && subResult.urlset.url) {
                  const subUrls = Array.isArray(subResult.urlset.url)
                    ? subResult.urlset.url
                    : [subResult.urlset.url];

                  urls = urls.concat(subUrls.map(u => u.loc));
                }
              }
            } catch (e) {
              console.log(`  Could not fetch sub-sitemap: ${subSitemapUrl}`);
            }
          }
        }
        // Handle regular sitemap (contains URLs)
        else if (result.urlset && result.urlset.url) {
          const urlEntries = Array.isArray(result.urlset.url)
            ? result.urlset.url
            : [result.urlset.url];

          urls = urlEntries.map(u => u.loc);
        }

        if (urls.length > 0) {
          console.log(`  ✓ Found ${urls.length} URLs in sitemap`);
          return urls;
        }
      }
    } catch (e) {
      // Try next sitemap URL
      continue;
    }
  }

  return null; // No sitemap found
}

// Helper function to expand wildcard URL patterns
function expandWildcardPattern(pattern, links) {
  // Normalize pattern - remove trailing slash if present
  const normalizedPattern = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;

  // Convert wildcard pattern to regex
  const regexPattern = normalizedPattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars except *
    .replace(/\*/g, '.*'); // Replace * with .*

  const regex = new RegExp(`^${regexPattern}$`);

  console.log(`  Regex pattern: ^${regexPattern}$`);

  return links.filter(link => {
    // Normalize link - remove trailing slash if present
    const normalizedLink = link.endsWith('/') ? link.slice(0, -1) : link;
    return regex.test(normalizedLink);
  });
}

// Helper function to extract and normalize MuleSoft documentation links
function extractDocLinks($, baseUrl) {
  const links = new Set();

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href');
    if (!href) return;

    try {
      // Resolve relative URLs
      const absoluteUrl = new URL(href, baseUrl).href;

      // Only include docs.mulesoft.com links
      if (absoluteUrl.includes('docs.mulesoft.com')) {
        // Remove fragments and query params for cleaner URLs
        const url = new URL(absoluteUrl);
        const cleanUrl = `${url.origin}${url.pathname}`;
        links.add(cleanUrl);
      }
    } catch (e) {
      // Invalid URL, skip it
    }
  });

  return Array.from(links);
}

// Helper function to fetch a single document
async function fetchSingleDoc(url) {
  try {
    console.log(`  Fetching: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`  Failed to fetch ${url}: ${response.status}`);
      return {
        url,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract links before removing navigation
    const linkedDocs = extractDocLinks($, url);

    // Remove script tags, style tags, and navigation elements
    $('script, style, nav, header, footer, .navigation, .sidebar').remove();

    // Try to find the main content area
    let content = '';

    // Try various common content selectors
    const contentSelectors = [
      'article',
      '.content',
      '.main-content',
      'main',
      '.documentation-content',
      '.doc-content',
      '#content',
      '.markdown-body'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    // Fallback to body if no specific content area found
    if (!content || content.trim().length === 0) {
      content = $('body').text();
    }

    // Clean up the text
    content = content
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n\n')  // Clean up multiple newlines
      .trim();

    if (content.length > 0) {
      console.log(`  ✓ Fetched ${content.length} characters from ${url}`);
      return {
        url,
        success: true,
        content,
        length: content.length,
        linkedDocs
      };
    } else {
      console.error(`  No content extracted from ${url}`);
      return {
        url,
        success: false,
        error: 'No content could be extracted from the page'
      };
    }
  } catch (error) {
    console.error(`  Error fetching ${url}:`, error.message);
    return {
      url,
      success: false,
      error: error.message
    };
  }
}

// Expand wildcard URL patterns or discover nested pages
app.post('/api/expand-wildcard', async (req, res) => {
  try {
    const { pattern } = req.body;

    if (!pattern || typeof pattern !== 'string') {
      return res.status(400).json({ error: 'Pattern is required' });
    }

    const hasWildcard = pattern.includes('*');

    console.log(`\n🔍 ${hasWildcard ? 'Expanding wildcard pattern' : 'Discovering nested pages'}: ${pattern}`);

    // Extract domain and base path
    const urlObj = new URL(pattern);
    const domain = `${urlObj.protocol}//${urlObj.hostname}`;

    console.log(`  Domain: ${domain}`);

    // Try to fetch sitemap first
    const sitemapUrls = await fetchSitemapUrls(domain);

    let matchingUrls = [];

    if (sitemapUrls && sitemapUrls.length > 0) {
      console.log(`  Using sitemap with ${sitemapUrls.length} total URLs`);

      if (hasWildcard) {
        // Filter by wildcard pattern
        matchingUrls = expandWildcardPattern(pattern, sitemapUrls);
      } else {
        // No wildcard - find all URLs that start with this path (nested pages)
        const basePath = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;
        matchingUrls = sitemapUrls.filter(url => {
          const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
          return normalizedUrl.startsWith(basePath) && normalizedUrl !== basePath;
        });
        console.log(`  Looking for pages under: ${basePath}`);
      }
    } else {
      // Fallback to HTML parsing if no sitemap
      console.log(`  No sitemap found, trying HTML parsing...`);

      const wildcardIndex = pattern.indexOf('*');
      const lastSlashBeforeWildcard = hasWildcard
        ? pattern.lastIndexOf('/', wildcardIndex)
        : pattern.length;
      const baseUrl = pattern.substring(0, lastSlashBeforeWildcard + 1);

      console.log(`  Base URL: ${baseUrl}`);

      const response = await fetch(baseUrl);

      if (!response.ok) {
        console.error(`  Failed to fetch base URL: ${response.status}`);
        return res.status(400).json({
          error: `Failed to fetch base URL: ${response.status} ${response.statusText}`
        });
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract all links from the page
      const allLinks = new Set();
      $('a[href]').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;

        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          const baseUrlObj = new URL(baseUrl);
          const linkUrlObj = new URL(absoluteUrl);

          if (linkUrlObj.hostname === baseUrlObj.hostname) {
            const cleanUrl = `${linkUrlObj.origin}${linkUrlObj.pathname}`;
            const normalizedUrl = cleanUrl.endsWith('/') && cleanUrl.length > baseUrlObj.origin.length + 1
              ? cleanUrl.slice(0, -1)
              : cleanUrl;
            allLinks.add(normalizedUrl);
          }
        } catch (e) {
          // Invalid URL, skip
        }
      });

      console.log(`  Found ${allLinks.size} total links on the page`);

      const linkArray = Array.from(allLinks);

      if (hasWildcard) {
        matchingUrls = expandWildcardPattern(pattern, linkArray);
      } else {
        const basePath = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;
        matchingUrls = linkArray.filter(url => {
          const normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
          return normalizedUrl.startsWith(basePath) && normalizedUrl !== basePath;
        });
      }
    }

    console.log(`  ✓ Found ${matchingUrls.length} matching URLs`);

    if (matchingUrls.length === 0) {
      console.warn(`  ⚠️  No URLs found`);
    } else {
      console.log(`  Matching URLs (first 10):`);
      matchingUrls.slice(0, 10).forEach(url => console.log(`    ✓ ${url}`));
      if (matchingUrls.length > 10) {
        console.log(`    ... and ${matchingUrls.length - 10} more`);
      }
    }

    res.json({
      urls: matchingUrls,
      total: matchingUrls.length,
      method: sitemapUrls ? 'sitemap' : 'html-parsing'
    });
  } catch (error) {
    console.error('URL expansion error:', error);
    res.status(500).json({
      error: error.message || 'Failed to expand pattern'
    });
  }
});

// Fetch documentation content from URLs
app.post('/api/fetch-docs', async (req, res) => {
  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array is required' });
    }

    console.log(`\n🔍 Fetching documentation from ${urls.length} URL(s)...`);

    const fetchedDocs = [];
    const processedUrls = new Set();
    const discoveredLinks = new Set();

    // Phase 1: Fetch original URLs
    for (const url of urls) {
      if (processedUrls.has(url)) continue;

      const doc = await fetchSingleDoc(url);
      doc.sourceType = 'original';
      fetchedDocs.push(doc);
      processedUrls.add(url);

      // Collect linked docs
      if (doc.success && doc.linkedDocs && doc.linkedDocs.length > 0) {
        console.log(`  📎 Found ${doc.linkedDocs.length} linked documentation pages`);
        doc.linkedDocs.forEach(link => {
          if (!processedUrls.has(link) && link !== url) {
            discoveredLinks.add(link);
          }
        });
      }
    }

    // Phase 2: Fetch discovered linked documentation
    if (discoveredLinks.size > 0) {
      console.log(`\n📚 Fetching ${discoveredLinks.size} linked documentation pages...`);

      for (const linkedUrl of discoveredLinks) {
        if (processedUrls.has(linkedUrl)) continue;

        const doc = await fetchSingleDoc(linkedUrl);
        doc.sourceType = 'linked';
        fetchedDocs.push(doc);
        processedUrls.add(linkedUrl);

        // Limit to prevent infinite fetching
        if (processedUrls.size >= 50) {
          console.log(`  ⚠️  Reached limit of 50 documents, stopping discovery`);
          break;
        }
      }
    }

    const originalCount = fetchedDocs.filter(doc => doc.sourceType === 'original' && doc.success).length;
    const linkedCount = fetchedDocs.filter(doc => doc.sourceType === 'linked' && doc.success).length;
    const totalSuccess = originalCount + linkedCount;

    console.log(`\n✅ Fetching complete:`);
    console.log(`   • Original URLs: ${originalCount}/${urls.length} successful`);
    console.log(`   • Linked docs: ${linkedCount}/${discoveredLinks.size} successful`);
    console.log(`   • Total: ${totalSuccess} documents fetched\n`);

    res.json({
      documents: fetchedDocs,
      stats: {
        originalCount,
        linkedCount,
        totalCount: totalSuccess,
        totalRequested: urls.length,
        totalDiscovered: discoveredLinks.size
      }
    });
  } catch (error) {
    console.error('Documentation fetch error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch documentation'
    });
  }
});

// Website fetch endpoint — uses Puppeteer to handle JS-rendered pages
app.post('/api/fetch-website', async (req, res) => {
  const { urls, cookie } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'URLs array is required' });
  }

  console.log(`\n🌐 Fetching ${urls.length} website URL(s) with Puppeteer...`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
    });

    const pages = [];

    for (const url of urls) {
      const page = await browser.newPage();
      try {
        console.log(`  Opening browser for: ${url}`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await new Promise(r => setTimeout(r, 1500));

        // Detect a login page by the presence of a password field
        let isLoginPage = false;
        try {
          isLoginPage = await page.evaluate(() => !!document.querySelector('input[type="password"]'));
        } catch (e) {}

        if (isLoginPage) {
          console.log(`  🔐 Login page detected — please authenticate in the Chrome window.`);

          const deadline = Date.now() + 120000;
          let authenticated = false;

          while (Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 1500));
            try {
              const stillOnLoginPage = await page.evaluate(
                () => !!document.querySelector('input[type="password"]')
              );
              if (!stillOnLoginPage) {
                console.log(`  ✓ Login form gone — waiting for app to finish loading...`);
                // Wait for the app to fully render after auth
                await new Promise(r => setTimeout(r, 3000));
                try {
                  await page.waitForNetworkIdle({ idleTime: 1000, timeout: 20000 });
                } catch (e) {}
                authenticated = true;
                break;
              }
            } catch (e) {
              // Page is mid-navigation — keep waiting
            }
          }

          if (!authenticated) {
            throw new Error('Authentication timed out after 2 minutes');
          }
        } else {
          // No login page — just wait for the page to settle
          try {
            await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 });
          } catch (e) {}
        }

        const content = await page.evaluate(() => {
          // Remove noise elements
          ['script', 'style', 'noscript', 'nav', 'header', 'footer',
           '[aria-hidden="true"]', '.sr-only'].forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.remove());
          });

          // Prefer semantic content containers
          const candidates = [
            'main', 'article', '[role="main"]', '.content', '.main-content',
            '#content', '.app', '#app', '#root', '.container'
          ];
          for (const sel of candidates) {
            const el = document.querySelector(sel);
            if (el && el.innerText.trim().length > 200) {
              return el.innerText.trim();
            }
          }
          return document.body.innerText.trim();
        });

        if (content && content.length > 0) {
          console.log(`  ✓ Extracted ${content.length} characters from ${url}`);
          pages.push({ url, success: true, content });
        } else {
          console.error(`  No content extracted from ${url}`);
          pages.push({ url, success: false, error: 'No content could be extracted from the page' });
        }
      } catch (err) {
        console.error(`  Error fetching ${url}:`, err.message);
        pages.push({ url, success: false, error: err.message });
      } finally {
        await page.close();
      }
    }

    const successful = pages.filter(p => p.success);
    console.log(`\n✅ Website fetch complete: ${successful.length}/${urls.length} successful`);

    res.json({ pages, successCount: successful.length });
  } catch (err) {
    console.error('Puppeteer error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch website content' });
  } finally {
    if (browser) await browser.close();
  }
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
            max_tokens: 16000
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

// Quality check endpoint for Trailhead badge and MuleSoft blog content
app.post('/api/quality-check', async (req, res) => {
  try {
    const { content, contentType } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const isBlogContent = contentType === 'blogProposal' || contentType === 'blogDraft';

    let systemPrompt;
    let userPrompt;
    let contentLabel;

    if (isBlogContent) {
      contentLabel = contentType === 'blogProposal' ? 'Blog Proposal' : 'Blog Draft';

      const guidelinesSection = blogGuidelinesText
        ? `\n\n===== OFFICIAL MULESOFT BLOG GUIDELINES =====\n\n${blogGuidelinesText}\n\n===== END GUIDELINES =====\n`
        : '';

      systemPrompt = `You are a MuleSoft blog content reviewer. You apply the official MuleSoft Blog Guidelines and Style Guide (2025) to review submitted blog content and provide structured, actionable feedback.

When reviewing:
- Parse the source material thoroughly, checking every section against the guidelines below
- Verify voice, tone, formatting, headline length, accessibility, and citation rules
- Identify use of competitor names that are explicitly disallowed in external links
- Flag passive voice, first-person POV, and headlines over 60 characters
- Apply the rubric below to score the content out of 30 (10 areas × 3 points)
- Do not modify the rubric, score, nor percentage — accuracy is critical
- If a rubric area cannot be evaluated from the content, score it 1 and explain why

The MuleSoft Blog Quality Rubric has 10 areas (each scored 1–3 points, 30 points total):

| Rule | Excellent (3) | Good (2) | Not Approved (1) |
|------|---------------|----------|-----------------|
| Headline | ≤60 chars, primary keyword near start, sets clear expectations | 1 minor issue (length, keyword placement, clarity) | Misses 2+ requirements or is clickbait |
| Voice & tone | Consistently human, clear, inspiring; second-person POV; active voice | Mostly aligned with 1–2 lapses | Passive voice, first-person, or off-brand tone throughout |
| Originality | Clearly original, narrative thread, not opinion-only | Mostly original with minor self-serving sections | Reads as syndicated, AI-only, or self-promotional |
| Themes & objectives | Aligned with priority themes (Agentforce, APIs, AI, Automation, Integration, etc.) and drives awareness/education/engagement | Tangentially aligned | Off-theme or no clear objective |
| Citations & sourcing | All claims backlinked to credible non-competitor sources; keyword-anchored hyperlinks | Some claims unsourced or links over-long | Statements of truth without sources, or competitor links |
| Formatting | Title case for title, sentence case for headers; H2/H3 hierarchy; scannable | Minor case or hierarchy issues | Major formatting violations |
| Accessibility & readability | ≤25 words/sentence, 3–4 sentences/paragraph, 8–9th grade level, descriptive link CTAs | Mostly meets but a few long sentences/paragraphs | Dense paragraphs, "click here" links, or jargon-heavy |
| Image & media compliance | Captions present, alt text described, no animated GIFs, no text in feature image | Minor media gaps | Missing captions/alt text or disallowed media |
| Word count & structure | 1000–1200 words preferred (up to 3000 max), clear intro/body/conclusion | Slightly over/under or weak structure | Far outside range or missing sections |
| Brand alignment | No competitor mentions in external links; approved Salesforce/MuleSoft terminology | Minor terminology drift | Competitor links or off-brand terminology |

Disallowed competitor list (external links MUST NOT come from or mention): Amazon, Axway, Boomi, CA Tech, Google (Apigee), IBM, Informatica, Jitterbit, Kong, Microsoft, Oracle, Red Hat (incl. 3scale), SAP, SnapLogic, Software AG, Talend, TIBCO, Workato, UiPath, AutomationAnywhere.

Publishability Score Scale (out of 30):
- 26–30: ⭐ Excellent — Ready for editorial review
- 21–25: ✅ Good — Solid but needs refinements
- 11–20: ⚠️ Needs Improvement — Requires moderate to deep updates
- ≤10: ❌ Not Approved — Requires significant revision

Feedback response format:
1. Critical analysis highlighting strengths, weaknesses, and areas for improvement
2. A markdown table with: Rubric Area | Score | Issues Found
3. Blog Quality Rating
4. Publishability Score (total out of 30)
5. Publishability Percentage: (Total Score / 30) × 100
6. Up to 10 actionable improvements, each referencing a specific landmark (paragraph text, heading, sentence, or link)${guidelinesSection}`;

      userPrompt = `Please review the following MuleSoft ${contentLabel} and apply the rubric:

---
${content}
---

Provide your quality review in the format specified.`;
    } else {
      contentLabel = contentType === 'badgeProposal' ? 'Badge Proposal' : 'Badge Draft';
      systemPrompt = `You're a content companion tasked with supporting Trailhead learning designers, writers, and editors during the content creation process. You use the most recent official Salesforce release notes, online Salesforce Help documentation, and Trailhead to review and provide feedback on created content.

When providing feedback:
- Parse the source material thoroughly, checking every line and section against guidelines and standards
- Capture formatting such as headings, bulleted or numbered lists, and inline images with alt text
- Apply the Trailhead Content Quality Rubric to score the content and calculate a Total Score (out of 42)
- Verify all features, product names, and functionality against official Salesforce sources
- Identify deprecated features, outdated product names, or terminology that no longer aligns with current Salesforce nomenclature
- Do not modify the rubric, score, nor percentage — accuracy is critical for analytics
- If any rubric area is missing from the content, score it as "Not Approved / Needs Significant Improvement" (1 point)

The Trailhead Content Quality Rubric has 14 areas (each scored 1–3 points, 42 points total):

| Rule | Excellent (3) | Good (2) | Not Approved (1) |
|------|---------------|----------|-----------------|
| Template | Uses current template with correct formatting and metadata | N/A | Does not use current template |
| Learner objective | Selected and fully aligns with content | Selected and mostly aligns | Not selected or does not align |
| Role | 90%+ of steps focus on a single role | Several steps have different roles but audience still has focus | Multiple roles make audience unclear |
| Level | 90%+ are at same learning level | Steps vary but progress logically | Steps vary illogically |
| Links | All non-badge steps have URLs | N/A | Non-badge steps missing URLs |
| Content length | 1–7 milestones, 2–7 steps per milestone | N/A | Does not meet content length standards |
| Names and descriptions | Meets Trailhead standards for name and description structures | N/A | Does not meet name/description standards |
| Appropriate trail content | All content types are approved | N/A | Non-approved content types used |
| Grammar | Grammatically correct | Grammar can be improved but >90% correct | Grammar needs significant improvement |
| Brand Alignment | Aligned with approved terms and existing Salesforce content | Minor discrepancies | Significant discrepancies |

Publishability Score Scale:
- 25–30: ⭐ Excellent — May be published after final stakeholder review
- 21–24: ✅ Good — Solid but needs refinements
- 11–20: ⚠️ Needs Improvement — Requires moderate to deep updates
- 10: ❌ Not Approved — Requires significant revision

Feedback response format:
1. Critical analysis highlighting strengths, weaknesses, and areas for improvement
2. A markdown table with: Rubric Area | Score | Issues Found
3. Badge Quality Rating and Action Required
4. Publishability Percentage: (Total Score / 42) × 100
5. Publishability Score (total out of 42)
6. Up to 10 actionable improvements, consistently framed, referencing specific landmarks (unit number, heading, paragraph text, bullet number)`;

      userPrompt = `Please review the following Trailhead ${contentLabel} and apply the quality rubric:

---
${content}
---

Provide your quality review in the format specified.`;
    }

    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here') {
      try {
        const baseUrl = 'https://eng-ai-model-gateway.sfproxy.devx-preprod.aws-esvc1-useast2.aws.sfdc.cl';

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
              { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
            ],
            max_tokens: 8000
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        let reviewContent;
        if (data.choices && data.choices[0] && data.choices[0].message) {
          reviewContent = data.choices[0].message.content;
        } else if (data.content && Array.isArray(data.content) && data.content[0]) {
          reviewContent = data.content[0].text;
        } else {
          throw new Error('Unexpected response format from API');
        }

        return res.json({ review: reviewContent, mode: 'ai' });
      } catch (error) {
        console.error('Quality check API call failed, falling back to mock:', error.message);
      }
    }

    // Mock quality check response
    const mockRubricRows = isBlogContent
      ? `| Headline | 2 | Requires manual review |
| Voice & tone | 2 | Requires manual review |
| Originality | 2 | Requires manual review |
| Themes & objectives | 2 | Requires manual review |
| Citations & sourcing | 2 | Requires manual review |
| Formatting | 2 | Requires manual review |
| Accessibility & readability | 2 | Requires manual review |
| Image & media compliance | 2 | Requires manual review |
| Word count & structure | 2 | Requires manual review |
| Brand alignment | 2 | Requires manual review |`
      : `| Template | 2 | Unable to verify template compliance in mock mode |
| Learner objective | 2 | Requires manual review |
| Role | 2 | Requires manual review |
| Level | 2 | Requires manual review |
| Links | 2 | Requires manual review |
| Content length | 2 | Requires manual review |
| Names and descriptions | 2 | Requires manual review |
| Appropriate trail content | 2 | Requires manual review |
| Grammar | 2 | Requires manual review |
| Brand Alignment | 2 | Requires manual review |`;

    const mockTotal = isBlogContent ? '20 / 30' : '20 / 42';
    const mockPercent = isBlogContent ? '66.7%' : '47.6%';

    const mockReview = `## Quality Review: ${contentLabel}

### Critical Analysis

**Strengths:** The content addresses a clear topic and follows the general structure expected for ${isBlogContent ? 'a MuleSoft blog article' : 'Trailhead badge content'}.

**Weaknesses:** This is a mock quality review generated because no API key is configured. Connect a valid API key to receive a real rubric-based analysis.

**Areas for Improvement:** Configure your \`ANTHROPIC_API_KEY\` in the \`.env\` file to enable live quality checks.

---

### Rubric Scores

| Rubric Area | Score | Issues Found |
|---|---|---|
${mockRubricRows}

---

### ${isBlogContent ? 'Blog' : 'Badge'} Quality Rating

✅ **Good** — Mock score only. Connect an API key for real analysis.

### Publishability Score: ${mockTotal} (mock)

### Publishability Percentage: ${mockPercent} (mock)

---

### Recommendations

1. Configure a valid \`ANTHROPIC_API_KEY\` in your \`.env\` file to enable live AI-powered quality checks.
2. Once the API is connected, re-run this quality check to receive rubric-based scores and actionable feedback.`;

    res.json({ review: mockReview, mode: 'mock' });
  } catch (error) {
    console.error('Quality check error:', error);
    res.status(500).json({ error: error.message || 'Failed to run quality check' });
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

// Fetch Figma design content endpoint
app.post('/api/fetch-figma', async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of Figma URLs' });
  }

  const figmaToken = process.env.FIGMA_ACCESS_TOKEN;
  if (!figmaToken) {
    return res.status(500).json({
      error: 'Figma access token not configured',
      details: 'Please add FIGMA_ACCESS_TOKEN to your .env file'
    });
  }

  console.log(`\n📐 Fetching Figma content from ${urls.length} URL(s)...`);

  try {
    const designs = [];

    for (const url of urls) {
      console.log(`  Fetching: ${url}`);

      try {
        // Parse Figma URL to extract fileKey and nodeId
        const figmaUrlPattern = /figma\.com\/(design|file|board|proto)\/([^/]+)/;
        const match = url.match(figmaUrlPattern);

        if (!match) {
          console.log(`  ⚠️  Invalid Figma URL format: ${url}`);
          designs.push({
            url,
            success: false,
            error: 'Invalid Figma URL format'
          });
          continue;
        }

        const fileKey = match[2];
        let nodeId = null;

        // Extract node-id if present
        const nodeIdMatch = url.match(/node-id=([^&]+)/);
        if (nodeIdMatch) {
          // Convert node-id format from "123-456" to "123:456"
          nodeId = nodeIdMatch[1].replace(/-/g, ':');
        }

        // Fetch file data from Figma API
        const fileResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
          headers: {
            'X-Figma-Token': figmaToken
          }
        });

        if (!fileResponse.ok) {
          throw new Error(`Figma API error: ${fileResponse.status} ${fileResponse.statusText}`);
        }

        const fileData = await fileResponse.json();

        // Build design content
        let designContent = `# ${fileData.name}\n\n`;
        designContent += `**File Key:** ${fileKey}\n`;
        designContent += `**URL:** ${url}\n`;
        designContent += `**Last Modified:** ${fileData.lastModified}\n\n`;

        // If specific node requested, find and describe it
        if (nodeId) {
          designContent += `## Selected Component\n\n`;
          designContent += `**Node ID:** ${nodeId}\n\n`;

          // Find the node in the document
          const node = findNodeById(fileData.document, nodeId);
          if (node) {
            designContent += `**Name:** ${node.name}\n`;
            designContent += `**Type:** ${node.type}\n\n`;

            if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
              designContent += `### Component Details\n\n`;
              if (node.description) {
                designContent += `**Description:** ${node.description}\n\n`;
              }
            }

            // Add layout information
            if (node.absoluteBoundingBox) {
              const box = node.absoluteBoundingBox;
              designContent += `**Dimensions:** ${Math.round(box.width)} × ${Math.round(box.height)}px\n\n`;
            }

            // Add style information
            if (node.fills && node.fills.length > 0) {
              designContent += `### Fills\n\n`;
              node.fills.forEach((fill, i) => {
                if (fill.type === 'SOLID') {
                  const color = fill.color;
                  designContent += `- Color ${i + 1}: rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})\n`;
                }
              });
              designContent += `\n`;
            }

            // Add text styles if it's a text node
            if (node.type === 'TEXT' && node.style) {
              designContent += `### Typography\n\n`;
              designContent += `- **Font:** ${node.style.fontFamily} ${node.style.fontWeight}\n`;
              designContent += `- **Size:** ${node.style.fontSize}px\n`;
              designContent += `- **Line Height:** ${node.style.lineHeightPx}px\n\n`;
            }
          } else {
            designContent += `_Node not found in file_\n\n`;
          }
        } else {
          // No specific node, describe the file
          designContent += `## File Overview\n\n`;
          designContent += `This Figma file contains the following top-level frames:\n\n`;

          if (fileData.document.children) {
            fileData.document.children.forEach(page => {
              if (page.children) {
                designContent += `### ${page.name}\n\n`;
                page.children.forEach(frame => {
                  designContent += `- **${frame.name}** (${frame.type})\n`;
                });
                designContent += `\n`;
              }
            });
          }
        }

        // Add components list if available
        if (fileData.components && Object.keys(fileData.components).length > 0) {
          designContent += `## Components\n\n`;
          designContent += `This file contains ${Object.keys(fileData.components).length} component(s):\n\n`;

          Object.entries(fileData.components).slice(0, 10).forEach(([key, component]) => {
            designContent += `- **${component.name}** (${component.key})\n`;
            if (component.description) {
              designContent += `  - ${component.description}\n`;
            }
          });

          if (Object.keys(fileData.components).length > 10) {
            designContent += `\n_...and ${Object.keys(fileData.components).length - 10} more components_\n`;
          }
          designContent += `\n`;
        }

        // Add styles information
        if (fileData.styles && Object.keys(fileData.styles).length > 0) {
          designContent += `## Design Styles\n\n`;
          designContent += `This file contains ${Object.keys(fileData.styles).length} style(s) including colors, text styles, and effects.\n\n`;
        }

        designs.push({
          url,
          success: true,
          fileKey,
          nodeId,
          content: designContent
        });

        console.log(`  ✓ Successfully fetched ${nodeId ? 'node' : 'file'} data`);
      } catch (err) {
        console.error(`  ✗ Error fetching ${url}:`, err.message);
        designs.push({
          url,
          success: false,
          error: err.message
        });
      }
    }

    const successfulDesigns = designs.filter(d => d.success);
    console.log(`\n✓ Fetched ${successfulDesigns.length} of ${urls.length} Figma designs\n`);

    res.json({
      designs: successfulDesigns,
      total: urls.length,
      successful: successfulDesigns.length,
      failed: urls.length - successfulDesigns.length
    });

  } catch (error) {
    console.error('Error fetching Figma content:', error);
    res.status(500).json({
      error: 'Failed to fetch Figma content',
      details: error.message
    });
  }
});

// Helper function to find a node by ID in the Figma document tree
function findNodeById(node, targetId) {
  if (node.id === targetId) {
    return node;
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, targetId);
      if (found) return found;
    }
  }

  return null;
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
