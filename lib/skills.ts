import type { Skill } from './types';

export const AVAILABLE_SKILLS: Skill[] = [
  // Documents
  {
    id: 'pdf',
    name: 'pdf',
    displayName: 'PDF',
    description: 'Read, extract, and analyze PDF documents',
    category: 'documents',
  },
  {
    id: 'docx',
    name: 'docx',
    displayName: 'Word',
    description: 'Create and edit Word documents',
    category: 'documents',
  },
  {
    id: 'pptx',
    name: 'pptx',
    displayName: 'PowerPoint',
    description: 'Create and edit presentations',
    category: 'documents',
  },
  {
    id: 'xlsx',
    name: 'xlsx',
    displayName: 'Excel',
    description: 'Create and edit spreadsheets',
    category: 'documents',
  },

  // Research
  {
    id: 'content-research-writer',
    name: 'content-research-writer',
    displayName: 'Content Research',
    description: 'Research and write content',
    category: 'research',
  },
  {
    id: 'lead-research-assistant',
    name: 'lead-research-assistant',
    displayName: 'Lead Research',
    description: 'Research and qualify leads',
    category: 'research',
  },
  {
    id: 'competitive-ads-extractor',
    name: 'competitive-ads-extractor',
    displayName: 'Competitive Ads',
    description: 'Extract and analyze competitor ads',
    category: 'research',
  },
  {
    id: 'developer-growth-analysis',
    name: 'developer-growth-analysis',
    displayName: 'Dev Growth Analysis',
    description: 'Analyze developer ecosystem growth',
    category: 'research',
  },

  // Design
  {
    id: 'canvas-design',
    name: 'canvas-design',
    displayName: 'Canvas Design',
    description: 'Create canvas-based designs',
    category: 'design',
  },
  {
    id: 'image-enhancer',
    name: 'image-enhancer',
    displayName: 'Image Enhancer',
    description: 'Enhance and process images',
    category: 'design',
  },
  {
    id: 'frontend-design',
    name: 'frontend-design',
    displayName: 'Frontend Design',
    description: 'Design frontend interfaces',
    category: 'design',
  },
  {
    id: 'shadcn-webapp-design',
    name: 'shadcn-webapp-design',
    displayName: 'Shadcn Design',
    description: 'Build UIs with shadcn/ui components',
    category: 'design',
  },
  {
    id: 'web-design-guidelines',
    name: 'web-design-guidelines',
    displayName: 'Web Guidelines',
    description: 'Web design best practices',
    category: 'design',
  },
  {
    id: 'brand-guidelines',
    name: 'brand-guidelines',
    displayName: 'Brand Guidelines',
    description: 'Create and follow brand guidelines',
    category: 'design',
  },
  {
    id: 'theme-factory',
    name: 'theme-factory',
    displayName: 'Theme Factory',
    description: 'Generate custom themes',
    category: 'design',
  },
  {
    id: 'web-artifacts-builder',
    name: 'web-artifacts-builder',
    displayName: 'Web Artifacts',
    description: 'Build web artifacts and components',
    category: 'design',
  },
  {
    id: 'artifacts-builder',
    name: 'artifacts-builder',
    displayName: 'Artifacts Builder',
    description: 'Create visual artifacts',
    category: 'design',
  },

  // Development
  {
    id: 'mcp-builder',
    name: 'mcp-builder',
    displayName: 'MCP Builder',
    description: 'Build MCP servers',
    category: 'development',
  },
  {
    id: 'changelog-generator',
    name: 'changelog-generator',
    displayName: 'Changelog',
    description: 'Generate changelogs from commits',
    category: 'development',
  },
  {
    id: 'swarmkit-dev',
    name: 'swarmkit-dev',
    displayName: 'SwarmKit Dev',
    description: 'SwarmKit SDK development',
    category: 'development',
  },
  {
    id: 'swarmkit-orchestrator',
    name: 'swarmkit-orchestrator',
    displayName: 'SwarmKit Orchestrator',
    description: 'Orchestrate multi-agent workflows',
    category: 'development',
  },
  {
    id: 'vercel-react-best-practices',
    name: 'vercel-react-best-practices',
    displayName: 'React Best Practices',
    description: 'Vercel React optimization patterns',
    category: 'development',
  },
  {
    id: 'skill-creator',
    name: 'skill-creator',
    displayName: 'Skill Creator',
    description: 'Create new skills',
    category: 'development',
  },
  {
    id: 'skill-share',
    name: 'skill-share',
    displayName: 'Skill Share',
    description: 'Share and distribute skills',
    category: 'development',
  },
  {
    id: 'template-skill',
    name: 'template-skill',
    displayName: 'Template Skill',
    description: 'Skill template for development',
    category: 'development',
  },

  // Business
  {
    id: 'file-organizer',
    name: 'file-organizer',
    displayName: 'File Organizer',
    description: 'Organize files and directories',
    category: 'business',
  },
  {
    id: 'invoice-organizer',
    name: 'invoice-organizer',
    displayName: 'Invoice Organizer',
    description: 'Organize and process invoices',
    category: 'business',
  },
  {
    id: 'internal-comms',
    name: 'internal-comms',
    displayName: 'Internal Comms',
    description: 'Internal communications management',
    category: 'business',
  },
  {
    id: 'meeting-insights-analyzer',
    name: 'meeting-insights-analyzer',
    displayName: 'Meeting Insights',
    description: 'Analyze meeting transcripts',
    category: 'business',
  },
  {
    id: 'tailored-resume-generator',
    name: 'tailored-resume-generator',
    displayName: 'Resume Generator',
    description: 'Generate tailored resumes',
    category: 'business',
  },
  {
    id: 'domain-name-brainstormer',
    name: 'domain-name-brainstormer',
    displayName: 'Domain Brainstormer',
    description: 'Brainstorm domain names',
    category: 'business',
  },

  // Media
  {
    id: 'video-downloader',
    name: 'video-downloader',
    displayName: 'Video Downloader',
    description: 'Download videos from platforms',
    category: 'media',
  },
  {
    id: 'slack-gif-creator',
    name: 'slack-gif-creator',
    displayName: 'Slack GIF Creator',
    description: 'Create GIFs for Slack',
    category: 'media',
  },
  {
    id: 'slides-as-code',
    name: 'slides-as-code',
    displayName: 'Slides as Code',
    description: 'Create presentations from code',
    category: 'media',
  },
  {
    id: 'raffle-winner-picker',
    name: 'raffle-winner-picker',
    displayName: 'Raffle Picker',
    description: 'Pick random raffle winners',
    category: 'media',
  },
];

// Ordered by most commonly used for general knowledge work
export const SKILL_CATEGORIES = [
  { id: 'documents', name: 'Documents' },
  { id: 'research', name: 'Research' },
  { id: 'business', name: 'Business' },
  { id: 'media', name: 'Media' },
  { id: 'design', name: 'Design' },
  { id: 'development', name: 'Development' },
] as const;
