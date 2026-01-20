import type { Integration } from './types';

// IDs match Composio toolkit names for direct integration
// Ordered by most commonly used for general knowledge work
export const AVAILABLE_INTEGRATIONS: Omit<Integration, 'connected' | 'accountId'>[] = [
  // Everyday essentials
  {
    id: 'gmail',
    name: 'gmail',
    displayName: 'Gmail',
    description: 'Read and send emails',
  },
  {
    id: 'googlecalendar',
    name: 'googlecalendar',
    displayName: 'Google Calendar',
    description: 'Calendar and events',
  },
  {
    id: 'googledrive',
    name: 'googledrive',
    displayName: 'Google Drive',
    description: 'File storage and sharing',
  },
  {
    id: 'googlesheets',
    name: 'googlesheets',
    displayName: 'Google Sheets',
    description: 'Spreadsheets and data',
  },
  {
    id: 'slack',
    name: 'slack',
    displayName: 'Slack',
    description: 'Team messaging and notifications',
  },
  {
    id: 'notion',
    name: 'notion',
    displayName: 'Notion',
    description: 'Notes, docs, and wikis',
  },
  // Communication & collaboration
  {
    id: 'microsoft_teams',
    name: 'microsoft_teams',
    displayName: 'Microsoft Teams',
    description: 'Team chat, meetings, and collaboration',
  },
  {
    id: 'dropbox',
    name: 'dropbox',
    displayName: 'Dropbox',
    description: 'File storage and sync',
  },
  // Productivity & project management
  {
    id: 'trello',
    name: 'trello',
    displayName: 'Trello',
    description: 'Kanban boards and tasks',
  },
  {
    id: 'asana',
    name: 'asana',
    displayName: 'Asana',
    description: 'Project management',
  },
  {
    id: 'airtable',
    name: 'airtable',
    displayName: 'Airtable',
    description: 'Databases and spreadsheets',
  },
  // Research & social
  {
    id: 'exa',
    name: 'exa',
    displayName: 'Exa',
    description: 'Web search and research',
  },
  {
    id: 'twitter',
    name: 'twitter',
    displayName: 'X (Twitter)',
    description: 'Social media posts and engagement',
  },
  // Design
  {
    id: 'figma',
    name: 'figma',
    displayName: 'Figma',
    description: 'Design files and collaboration',
  },
  // CRM & sales
  {
    id: 'hubspot',
    name: 'hubspot',
    displayName: 'HubSpot',
    description: 'CRM and marketing',
  },
  {
    id: 'salesforce',
    name: 'salesforce',
    displayName: 'Salesforce',
    description: 'CRM and sales',
  },
  // Technical / Developer tools
  {
    id: 'github',
    name: 'github',
    displayName: 'GitHub',
    description: 'Code repositories, issues, pull requests',
  },
  {
    id: 'linear',
    name: 'linear',
    displayName: 'Linear',
    description: 'Issue tracking and project management',
  },
  {
    id: 'jira',
    name: 'jira',
    displayName: 'Jira',
    description: 'Project and issue tracking',
  },
  {
    id: 'confluence',
    name: 'confluence',
    displayName: 'Confluence',
    description: 'Team documentation',
  },
  {
    id: 'stripe',
    name: 'stripe',
    displayName: 'Stripe',
    description: 'Payments and billing',
  },
];

export const INTEGRATION_CATEGORIES: { id: string; name: string; integrations: string[] }[] = [
  { id: 'productivity', name: 'Productivity', integrations: ['notion', 'asana', 'trello', 'linear', 'jira'] },
  { id: 'communication', name: 'Communication', integrations: ['gmail', 'slack', 'microsoft_teams'] },
  { id: 'development', name: 'Development', integrations: ['github', 'confluence'] },
  { id: 'storage', name: 'Storage', integrations: ['googledrive', 'dropbox', 'airtable', 'googlesheets'] },
  { id: 'calendar', name: 'Calendar', integrations: ['googlecalendar'] },
  { id: 'crm', name: 'CRM & Sales', integrations: ['hubspot', 'salesforce'] },
  { id: 'design', name: 'Design', integrations: ['figma'] },
  { id: 'payments', name: 'Payments', integrations: ['stripe'] },
  { id: 'research', name: 'Research', integrations: ['exa'] },
  { id: 'social', name: 'Social', integrations: ['twitter'] },
];
