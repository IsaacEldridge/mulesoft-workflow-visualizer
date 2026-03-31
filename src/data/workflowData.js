// Core workflow data: 6 stages with technical implementation details
export const WORKFLOW_STAGES = [
  {
    id: 'content-authoring',
    order: 1,
    title: 'CONTENT AUTHORING',
    shortTitle: 'Authoring',
    participants: ['Content Creators', 'Product Managers', 'Subject Matter Experts'],
    tools: ['Markdown', 'Text Editor', 'PRDs', 'Documentation'],
    owner: 'Content Team',
    location: 'Content Input',
    description: 'Paste source content (PRDs, technical documentation, drafts) in markdown or plain text format. Select optional target audience (admin, developer, beginner). Generate multiple output types from a single source of truth.',
    active: true,
    technicalDetails: [
      'Adding AsciiDoc metadata attributes',
      'Setting :page-component-version:',
      'Defining :page-product-tag:',
      'Adding :page-aliases: for redirects',
      'Embedding structured metadata',
      'Creating cross-references with xref:',
      'Committing to feature branch'
    ],
    sampleData: {
      type: 'asciidoc',
      content: `= API-Led Connectivity Guide
:page-component-version: 4.5
:page-product-tag: anypoint-platform
:page-deployment: cloudhub
:page-aliases: old-api-guide.adoc
:page-category: tutorials
:keywords: api, rest, connectivity

== Overview
This guide explains API-led connectivity...

== Authentication
Details on OAuth 2.0 implementation...`,
      description: 'AsciiDoc file with metadata attributes'
    },
    position: { x: 15, y: 25 },
    icon: 'EditIcon',
    color: '#4A90E2'
  },
  {
    id: 'validation-qa',
    order: 2,
    title: 'VALIDATION & QA',
    shortTitle: 'Validation',
    participants: ['Writers', 'Automated Validators', 'Peer Reviewers'],
    tools: ['GitHub Actions', 'Custom Validators', 'Asciidoctor', 'Vale Linter'],
    owner: 'Writers (with automation)',
    location: 'CI/CD Pipeline',
    description: 'Writers run validation checks locally and in PR pipeline. Automated validators check AsciiDoc syntax, required metadata presence, link validity, image references, and writing style. Failed checks block merge.',
    active: false,
    technicalDetails: [
      'Asciidoctor syntax validation',
      'Metadata completeness check',
      'Required attributes verification',
      'Internal link validation (xref:)',
      'External URL availability check',
      'Image file existence check',
      'Vale style linting (tone, voice)',
      'Product tag validation',
      'Version compatibility check'
    ],
    sampleData: {
      type: 'json',
      content: JSON.stringify({
        validation_run: 'pr-1247-check',
        timestamp: '2026-03-23T14:30:22Z',
        checks: {
          asciidoc_syntax: { status: 'passed', issues: 0 },
          required_metadata: { status: 'passed', missing: [] },
          internal_links: { status: 'passed', broken: 0, checked: 47 },
          external_links: { status: 'passed', broken: 0, checked: 12 },
          images: { status: 'passed', missing: 0, found: 8 },
          vale_linting: { status: 'warning', warnings: 2, suggestions: ['Use active voice in line 45'] },
          product_tags: { status: 'passed', tags: ['anypoint-platform'] },
          version_check: { status: 'passed', version: '4.5' }
        },
        overall_status: 'passed_with_warnings',
        duration_ms: 3847
      }, null, 2),
      description: 'Validation pipeline results with detailed checks'
    },
    position: { x: 37, y: 25 },
    icon: 'CheckIcon',
    color: '#7CB342'
  },
  {
    id: 'content-event-service',
    order: 3,
    title: 'CONTENT EVENT SERVICE',
    shortTitle: 'Events',
    participants: ['Event Generator', 'Platform Engineers', 'Message Queue'],
    tools: ['Event Bus', 'JSON Schema', 'Kafka', 'Redis Cache'],
    owner: 'Platform Team',
    location: 'Event Service Platform',
    description: 'When PR merges, webhook triggers event generation. System parses AsciiDoc metadata, generates structured JSON event with all attributes, computes change diff, identifies affected pages, stores in event database, and publishes to message queue for downstream consumers.',
    active: false,
    technicalDetails: [
      'Git webhook receives merge event',
      'Parse AsciiDoc files for metadata',
      'Extract all :page-* attributes',
      'Compute file diff (added/modified/deleted)',
      'Generate unique event ID',
      'Create JSON event payload',
      'Validate against JSON schema',
      'Store in events database (PostgreSQL)',
      'Publish to Kafka topic: content.updated',
      'Cache in Redis for quick retrieval',
      'Send notifications to subscribers',
      'Log event for audit trail'
    ],
    sampleData: {
      type: 'json',
      content: JSON.stringify({
        event_id: 'evt_2026_03_23_a7f2c1d',
        event_type: 'content.updated',
        timestamp: '2026-03-23T14:35:42Z',
        source: {
          repository: 'mulesoft/docs-general',
          branch: 'main',
          commit_sha: 'a7f2c1d89e',
          pr_number: 1247,
          author: 'jane.smith@mulesoft.com'
        },
        payload: {
          file_path: 'modules/ROOT/pages/api-led-connectivity.adoc',
          change_type: 'modified',
          metadata: {
            component_version: '4.5',
            product_tag: 'anypoint-platform',
            deployment: 'cloudhub',
            category: 'tutorials',
            keywords: ['api', 'rest', 'connectivity']
          },
          affected_sections: ['authentication', 'deployment'],
          diff_stats: { additions: 47, deletions: 12, changes: 35 }
        },
        targets: ['distribution', 'docs-publishing', 'search-indexer'],
        kafka_topic: 'content.updated',
        kafka_partition: 3,
        kafka_offset: 891247
      }, null, 2),
      description: 'Complete event payload with Kafka metadata'
    },
    position: { x: 59, y: 25 },
    icon: 'CloudIcon',
    color: '#FF9800'
  },
  {
    id: 'distribution',
    order: 4,
    title: 'DISTRIBUTION',
    shortTitle: 'Distribution',
    participants: ['Content Generators', 'AI Systems', 'Claude'],
    tools: ['Claude API', 'Prompt Templates', 'Markdown Formatter'],
    owner: 'Content Operations',
    location: 'Output Panel',
    description: 'AI-powered content generation transforms source material into specific output formats. Generate MuleSoft blog posts with thought leadership tone, or Salesforce Trailhead units with step-by-step educational content. Each output uses tailored prompt templates while strictly adhering to source content only.',
    active: true,
    technicalDetails: [
      'Consume from Kafka topic',
      'RSS: Generate <item> with GUID',
      'RSS: Set pubDate and description',
      'RSS: Publish to feed URL',
      'Slack: Format message with metadata',
      'Slack: POST to webhook URL',
      'Slack: Include doc preview link',
      'AI: Generate blog post draft (blogs.mulesoft.com)',
      'AI: Create marketing announcement copy',
      'AI: Generate Trailhead module outline',
      'AI: Create video script suggestions',
      'AI: Follow brand guidelines and tone',
      'Marketing: Update Marketo campaign',
      'Marketing: Tag contacts with interest',
      'MCP: Parse AsciiDoc to plain text',
      'MCP: Generate embeddings (OpenAI)',
      'MCP: Store in vector database',
      'MCP: Update search index',
      'MCP: Make available via MCP protocol'
    ],
    sampleData: {
      type: 'json',
      content: JSON.stringify({
        distribution_id: 'dist_a7f2c1d_1247',
        event_id: 'evt_2026_03_23_a7f2c1d',
        channels: {
          rss: {
            status: 'published',
            feed_url: 'https://docs.mulesoft.com/feed.xml',
            item_guid: 'api-led-connectivity-v4.5-2026-03-23',
            published_at: '2026-03-23T14:36:15Z'
          },
          slack: {
            status: 'sent',
            webhook_url: 'https://hooks.slack.com/services/T00/B00/xxx',
            channel: '#docs-updates',
            message_ts: '1711205775.123456',
            recipients: 247
          },
          marketing: {
            status: 'updated',
            marketo_campaign_id: 'CAMP-2024-Q1-API',
            contacts_tagged: 1853,
            email_scheduled: '2026-03-24T09:00:00Z'
          },
          mcp_server: {
            status: 'indexed',
            vector_db: 'pinecone',
            embedding_model: 'text-embedding-3-large',
            chunks_indexed: 23,
            index_name: 'mulesoft-docs-v4.5',
            mcp_endpoint: 'mcp://docs.mulesoft.com/search'
          }
        },
        gtm_collateral: {
          blog_post: {
            status: 'draft_generated',
            target_url: 'https://blogs.mulesoft.com/bloghome/',
            title: 'Mastering API-Led Connectivity in MuleSoft 4.5',
            word_count: 847,
            excerpt: 'Learn how to implement robust API-led connectivity patterns with our latest guide covering authentication, error handling, and best practices...',
            generated_by: 'GPT-4',
            generated_at: '2026-03-23T14:36:18Z'
          },
          marketing_announcement: {
            status: 'draft_generated',
            subject: 'New: API-Led Connectivity Guide for MuleSoft 4.5',
            body_preview: 'Exciting news! We\'ve just released comprehensive documentation on API-led connectivity patterns...',
            word_count: 234,
            generated_by: 'Claude',
            generated_at: '2026-03-23T14:36:19Z'
          },
          trailhead_outline: {
            status: 'draft_generated',
            guidelines_url: 'https://confluence.internal.salesforce.com/spaces/MTDT/pages/685745688/MuleSoft+Trailhead+Content+Authoring',
            module_title: 'API-Led Connectivity Fundamentals',
            estimated_duration: '45 min',
            units: 4,
            topics: ['Introduction to API-Led', 'System APIs', 'Process APIs', 'Experience APIs'],
            generated_by: 'GPT-4',
            generated_at: '2026-03-23T14:36:20Z'
          },
          video_script: {
            status: 'draft_generated',
            guidelines_url: 'https://confluence.internal.salesforce.com/spaces/MTDT/pages/1265931750/Creating+MuleSoft+CX+Video+Documentation',
            title: 'API-Led Connectivity in 5 Minutes',
            estimated_duration: '5:30',
            scenes: 6,
            script_preview: 'Hi, I\'m here to show you how API-led connectivity transforms your integration architecture...',
            generated_by: 'Claude',
            generated_at: '2026-03-23T14:36:21Z'
          }
        },
        total_recipients: 2100,
        processing_time_ms: 1847
      }, null, 2),
      description: 'Multi-channel distribution with AI-generated GTM collateral'
    },
    position: { x: 72, y: 48 },
    icon: 'DistributeIcon',
    color: '#E91E63'
  },
  {
    id: 'docs-publishing',
    order: 5,
    title: 'DOCS PUBLISHING',
    shortTitle: 'Publishing',
    participants: ['Build System', 'Asciidoctor', 'CDN', 'Search Indexer'],
    tools: ['Antora', 'Asciidoctor', 'AWS S3', 'CloudFront CDN', 'Algolia'],
    owner: 'CX/Documentation Team',
    location: 'docs.mulesoft.com',
    description: 'Build system receives event, triggers Antora build. Asciidoctor converts AsciiDoc to HTML with site navigation. Assets uploaded to S3, CloudFront cache invalidated. Algolia indexes content for search. Sitemap updated. Build metrics logged.',
    active: false,
    technicalDetails: [
      'Webhook triggers build pipeline',
      'Clone git repository (latest main)',
      'Antora reads playbook.yml',
      'Asciidoctor processes .adoc files',
      'Generate HTML with templates',
      'Apply CSS/JS assets',
      'Create site navigation structure',
      'Build sitemap.xml',
      'Upload to S3 bucket (versioned)',
      'Invalidate CloudFront cache',
      'Index content in Algolia',
      'Generate robots.txt',
      'Update build status in DB',
      'Send build metrics to DataDog'
    ],
    sampleData: {
      type: 'json',
      content: JSON.stringify({
        build_id: 'build_2026_03_23_1436',
        trigger_event: 'evt_2026_03_23_a7f2c1d',
        repository: 'mulesoft/docs-general',
        commit_sha: 'a7f2c1d89e',
        build_status: 'success',
        antora_version: '3.1.4',
        asciidoctor_version: '2.0.20',
        pages_built: 1247,
        pages_updated: 23,
        pages_new: 2,
        assets_processed: 489,
        build_time_sec: 187,
        s3_upload: {
          bucket: 'docs-mulesoft-com-prod',
          files_uploaded: 1736,
          size_mb: 342.7,
          upload_time_sec: 45
        },
        cdn_invalidation: {
          distribution_id: 'E2QWRTYUIOP',
          paths_invalidated: 25,
          status: 'completed'
        },
        algolia_index: {
          index_name: 'mulesoft_docs_prod',
          records_indexed: 1247,
          records_updated: 23
        },
        deployed_url: 'https://docs.mulesoft.com/general/api-led-connectivity',
        deployed_at: '2026-03-23T14:39:14Z'
      }, null, 2),
      description: 'Complete build and deployment metadata'
    },
    position: { x: 50, y: 48 },
    icon: 'PublishIcon',
    color: '#9C27B0'
  },
  {
    id: 'content-maintenance',
    order: 6,
    title: 'CONTENT MAINTENANCE',
    shortTitle: 'Maintenance',
    participants: ['CX Ops', 'Writers', 'Analytics', 'Support Engineers'],
    tools: ['Google Analytics', 'Jira', 'Salesforce Cases', 'DataDog'],
    owner: 'CX Ops + Writers',
    location: 'Maintenance Dashboard',
    description: 'Analytics track page views, time-on-page, bounce rate, search queries. Support tickets tagged with doc URLs. Jira tickets auto-created for low-scoring pages. Weekly reports sent to writers. Feedback signals fed back to event service to trigger content updates.',
    active: false,
    technicalDetails: [
      'Google Analytics 4 tracking',
      'Collect pageviews, sessions, events',
      'Track search terms (no results)',
      'Monitor bounce rate >60%',
      'Calculate avg time on page',
      'Track scroll depth percentage',
      'Parse support case mentions',
      'Tag cases with doc URLs',
      'Correlate cases to pages',
      'Auto-create Jira tickets (score <3.0)',
      'Weekly analytics report (email)',
      'Identify stale content (>180 days)',
      'Generate improvement signals',
      'Publish signals to Kafka',
      'Trigger content update events'
    ],
    sampleData: {
      type: 'json',
      content: JSON.stringify({
        analysis_id: 'maint_2026_03_23_weekly',
        period: '2026-03-16 to 2026-03-23',
        page_url: 'https://docs.mulesoft.com/general/api-led-connectivity',
        metrics: {
          pageviews: 5847,
          unique_visitors: 4329,
          avg_time_on_page_sec: 204,
          bounce_rate_pct: 32.4,
          scroll_depth_avg_pct: 67.8,
          search_no_results: 12,
          search_terms: ['oauth token', 'api deployment', 'error handling']
        },
        support_signals: {
          cases_mentioning_page: 7,
          case_ids: ['CS-891247', 'CS-891308', 'CS-891429'],
          common_issues: ['authentication unclear', 'missing deployment steps']
        },
        content_score: 3.8,
        recommendations: [
          'Expand authentication section',
          'Add troubleshooting for common errors',
          'Update deployment examples'
        ],
        jira_ticket: null,
        improvement_signal: {
          event_type: 'content.improvement_needed',
          priority: 'medium',
          assigned_to: 'jane.smith@mulesoft.com',
          kafka_topic: 'content.signals',
          published_at: '2026-03-23T14:45:00Z'
        }
      }, null, 2),
      description: 'Analytics and improvement signals'
    },
    position: { x: 28, y: 48 },
    icon: 'MaintenanceIcon',
    color: '#00BCD4'
  }
];

// Connection arrows between stages
export const CONNECTIONS = [
  {
    id: 'c1',
    from: 'content-authoring',
    to: 'validation-qa',
    type: 'primary',
    label: 'Submit PR',
    animated: true
  },
  {
    id: 'c2',
    from: 'validation-qa',
    to: 'content-event-service',
    type: 'primary',
    label: 'PR Merged → Webhook',
    animated: true
  },
  {
    id: 'c3',
    from: 'content-event-service',
    to: 'docs-publishing',
    type: 'primary',
    label: 'Publish to Kafka',
    animated: true
  },
  {
    id: 'c4',
    from: 'content-event-service',
    to: 'distribution',
    type: 'primary',
    label: 'Event to Consumers',
    animated: true
  },
  {
    id: 'c5',
    from: 'distribution',
    to: 'content-maintenance',
    type: 'primary',
    label: 'Track Metrics',
    animated: true
  },
  {
    id: 'c6',
    from: 'docs-publishing',
    to: 'content-maintenance',
    type: 'primary',
    label: 'Monitor Analytics',
    animated: true
  },
  {
    id: 'feedback-loop-authoring',
    from: 'content-maintenance',
    to: 'content-authoring',
    type: 'feedback',
    label: 'Improvement Signals',
    animated: true
  },
  {
    id: 'feedback-loop-events',
    from: 'content-maintenance',
    to: 'content-event-service',
    type: 'feedback',
    label: 'Update Events',
    animated: true
  },
  {
    id: 'rss-output',
    from: 'distribution',
    to: 'rss-feed',
    type: 'side-output',
    label: 'RSS Feed',
    animated: true
  },
  {
    id: 'mcp-output',
    from: 'distribution',
    to: 'mcp-server',
    type: 'side-output',
    label: 'MCP AI Server',
    animated: true
  }
];

// Side outputs (RSS and MCP)
export const SIDE_OUTPUTS = [
  {
    id: 'rss-feed',
    title: 'RSS Feed',
    description: 'feed.xml with updates',
    icon: 'RSSIcon',
    position: { x: 87, y: 38 },
    color: '#FF6B35'
  },
  {
    id: 'mcp-server',
    title: 'MCP AI Server',
    description: 'Vector DB + embeddings',
    icon: 'MCPIcon',
    position: { x: 87, y: 58 },
    color: '#00D9FF'
  }
];
