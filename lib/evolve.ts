// Evolve SDK service wrapper
// Handles all Evolve SDK interactions for task execution

import { Evolve } from '@evolvingmachines/sdk';
import type { OutputEvent } from '@evolvingmachines/sdk';
import type {
  Task,
  Message,
  ProgressItem,
  ToolCall,
  ToolKind,
  EvolveEvent,
  ToolCallLocation,
} from './types';

// ============================================================================
// Types
// ============================================================================

export interface EvolveConfig {
  agent: 'claude' | 'codex' | 'gemini' | 'qwen';
  model: string;
  skills: string[];
  integrations: string[];
  userId: string;
  systemPrompt?: string;
  sessionId?: string;  // For reconnecting to existing session
  // Agent-specific options
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh';  // Codex only
  betas?: string[];  // Claude only
}

export interface RunOptions {
  prompt: string;
  timeoutMs?: number;
  background?: boolean;
}

export interface FileMap {
  [path: string]: string | Uint8Array | ArrayBuffer | Buffer;
}

export interface OutputResult {
  files: FileMap;
  data: unknown | null;
  error?: string;
  rawData?: string;
}

// Callback types for streaming events
export interface EvolveCallbacks {
  onMessageChunk?: (content: string, isThought?: boolean) => void;
  onImageChunk?: (data: string, mimeType: string) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onToolCallUpdate?: (toolCallId: string, updates: Partial<ToolCall>) => void;
  onPlan?: (entries: ProgressItem[]) => void;
  onBrowserUrl?: (liveUrl?: string, screenshotUrl?: string) => void;
  onEvent?: (event: EvolveEvent) => void;
}

// ============================================================================
// Browser URL Extraction
// ============================================================================

interface BrowserUseResponse {
  live_url?: string;
  screenshot_url?: string;
  steps?: Array<{ screenshot_url?: string }>;
}

export function extractBrowserUseUrls(text: string): { liveUrl?: string; screenshotUrl?: string } {
  let liveUrl: string | undefined;
  let screenshotUrl: string | undefined;

  // 1. Regex extraction (fast, handles malformed JSON)
  const liveMatch = text.match(/"live_url"\s*:\s*"([^"]+)"/);
  if (liveMatch) liveUrl = liveMatch[1];

  // 2. JSON.parse for proper extraction (steps array may have multiple screenshots)
  try {
    const parsed = JSON.parse(text) as BrowserUseResponse;
    if (!liveUrl) liveUrl = parsed.live_url;

    // Get screenshot: prefer top-level screenshot_url, else get LAST step's screenshot
    // (steps array contains per-step screenshots, last one is most recent)
    if (parsed.screenshot_url) {
      screenshotUrl = parsed.screenshot_url;
    } else if (parsed.steps && parsed.steps.length > 0) {
      const lastStep = parsed.steps[parsed.steps.length - 1];
      screenshotUrl = lastStep?.screenshot_url;
    }
  } catch {
    // JSON parse failed, fallback to regex for screenshot
    const screenshotMatch = text.match(/"screenshot_url"\s*:\s*"([^"]+)"/);
    if (screenshotMatch) screenshotUrl = screenshotMatch[1];
  }

  return { liveUrl, screenshotUrl };
}

// ============================================================================
// Session Store (In-memory for now, could be Redis in production)
// ============================================================================

const sessionStore = new Map<string, Evolve>();

export function getEvolveInstance(taskId: string): Evolve | undefined {
  return sessionStore.get(taskId);
}

export function setEvolveInstance(taskId: string, instance: Evolve): void {
  sessionStore.set(taskId, instance);
}

export function removeEvolveInstance(taskId: string): void {
  sessionStore.delete(taskId);
}

// ============================================================================
// Create Evolve Instance
// ============================================================================

export function createEvolveInstance(config: EvolveConfig): Evolve {
  const evolve = new Evolve();

  // Configure agent
  const agentConfig: Record<string, unknown> = {
    type: config.agent,
    model: config.model,
    apiKey: process.env.EVOLVE_API_KEY,
  };

  // Add agent-specific options
  if (config.agent === 'codex' && config.reasoningEffort) {
    agentConfig.reasoningEffort = config.reasoningEffort;
  }
  if (config.agent === 'claude' && config.betas) {
    agentConfig.betas = config.betas;
  }

  evolve.withAgent(agentConfig as Parameters<typeof evolve.withAgent>[0]);

  // Add skills (browser-use included by default with EVOLVE_API_KEY)
  if (config.skills.length > 0) {
    evolve.withSkills(config.skills);
  }

  // Add Composio integrations
  if (config.integrations.length > 0) {
    evolve.withComposio(config.userId, {
      toolkits: config.integrations,
    });
  }

  // Add system prompt
  if (config.systemPrompt) {
    evolve.withSystemPrompt(config.systemPrompt);
  }

  // Reconnect to existing session
  if (config.sessionId) {
    evolve.withSession(config.sessionId);
  }

  // Add session tag for observability
  evolve.withSessionTagPrefix('manus-evolve');

  return evolve;
}

// ============================================================================
// Event Handler
// ============================================================================

export function setupEventHandlers(evolve: Evolve, callbacks: EvolveCallbacks): void {
  evolve.on('content', (event: OutputEvent) => {
    const { update } = event;

    // Forward raw event
    if (callbacks.onEvent) {
      callbacks.onEvent(event as unknown as EvolveEvent);
    }

    switch (update.sessionUpdate) {
      case 'agent_message_chunk':
      case 'user_message_chunk': {
        const content = update.content;
        if (content.type === 'text' && content.text && callbacks.onMessageChunk) {
          callbacks.onMessageChunk(content.text, false);
        } else if (content.type === 'image' && callbacks.onImageChunk) {
          callbacks.onImageChunk(content.data, content.mimeType);
        }
        break;
      }

      case 'agent_thought_chunk': {
        const content = update.content;
        if (content.type === 'text' && content.text && callbacks.onMessageChunk) {
          callbacks.onMessageChunk(content.text, true);
        }
        break;
      }

      case 'tool_call': {
        if (callbacks.onToolCall) {
          // Extract file path and command from rawInput
          let filePath: string | undefined;
          let command: string | undefined;
          let outputContent: string | undefined;
          const rawInput = update.rawInput as Record<string, unknown> | undefined;

          if (rawInput) {
            // File operations: path, file_path, filename, content
            filePath = (rawInput.path || rawInput.file_path || rawInput.filename || rawInput.file) as string | undefined;
            // Terminal operations: command, cmd
            command = (rawInput.command || rawInput.cmd) as string | undefined;
            // File content from rawInput (for edit/write)
            if (rawInput.content && typeof rawInput.content === 'string') {
              outputContent = rawInput.content;
            }
          }

          // Also extract content from tool_call content array (for edit tools with diff)
          if (update.content && Array.isArray(update.content)) {
            for (const c of update.content) {
              // Handle diff content: { type: "diff", path, oldText, newText }
              if (c.type === 'diff' && c.newText) {
                outputContent = c.newText;
                if (c.path) filePath = c.path;
              }
            }
          }

          callbacks.onToolCall({
            id: update.toolCallId,
            toolCallId: update.toolCallId,
            name: update.title || 'Unknown',
            title: update.title,
            kind: update.kind as ToolKind,
            status: update.status as 'pending' | 'in_progress',
            input: update.rawInput,
            filePath,
            command,
            outputContent,
            locations: update.locations as ToolCallLocation[],
          });
        }
        break;
      }

      case 'tool_call_update': {
        // Extract text content from tool output
        let outputContent: string | undefined;
        if (update.content && Array.isArray(update.content)) {
          const textParts: string[] = [];
          for (const c of update.content) {
            // Handle wrapped content: { type: "content", content: { type: "text", text: "..." } }
            if (c.type === 'content' && c.content?.type === 'text' && c.content.text) {
              textParts.push(c.content.text);
            }
            // Handle diff content: { type: "diff", path, oldText, newText }
            else if (c.type === 'diff' && c.newText) {
              textParts.push(c.newText);
            }
            // Handle plain text content (some agents may send this)
            else if (typeof c === 'string') {
              textParts.push(c);
            }
            // Handle { text: "..." } directly
            else if ('text' in c && typeof (c as { text?: string }).text === 'string') {
              textParts.push((c as { text: string }).text);
            }
          }
          if (textParts.length > 0) {
            outputContent = textParts.join('\n');
          }
        }
        // Also check if content is a plain string
        else if (typeof update.content === 'string') {
          outputContent = update.content;
        }

        if (callbacks.onToolCallUpdate) {
          callbacks.onToolCallUpdate(update.toolCallId, {
            status: update.status as 'completed' | 'failed' | undefined,
            title: update.title,
            locations: update.locations as ToolCallLocation[],
            outputContent,
          });
        }

        // Extract browser URLs from tool content
        if (callbacks.onBrowserUrl && outputContent) {
          const urls = extractBrowserUseUrls(outputContent);
          if (urls.liveUrl || urls.screenshotUrl) {
            callbacks.onBrowserUrl(urls.liveUrl, urls.screenshotUrl);
          }
        }
        break;
      }

      case 'plan': {
        if (callbacks.onPlan) {
          const entries: ProgressItem[] = update.entries.map((entry: { content: string; status: string; priority: string }, index: number) => ({
            id: `plan_${index}`,
            content: entry.content,
            status: entry.status as 'pending' | 'in_progress' | 'completed',
            priority: entry.priority as 'high' | 'medium' | 'low',
          }));
          callbacks.onPlan(entries);
        }
        break;
      }
    }
  });
}

// ============================================================================
// Run Task
// ============================================================================

export async function runTask(
  taskId: string,
  config: EvolveConfig,
  contextFiles: FileMap,
  options: RunOptions,
  callbacks: EvolveCallbacks
): Promise<{ sessionId: string | null; exitCode: number; stdout: string; stderr: string }> {
  // Get or create Evolve instance
  let evolve = getEvolveInstance(taskId);

  if (!evolve) {
    evolve = createEvolveInstance(config);
    setEvolveInstance(taskId, evolve);

    // Upload context files on first run
    if (Object.keys(contextFiles).length > 0) {
      evolve.withContext(contextFiles);
    }
  }

  // Setup event handlers
  setupEventHandlers(evolve, callbacks);

  // Run the task
  const result = await evolve.run({
    prompt: options.prompt,
    timeoutMs: options.timeoutMs,
    background: options.background,
  });

  return {
    sessionId: evolve.getSession(),
    exitCode: result.exitCode,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

// ============================================================================
// Session Control
// ============================================================================

export async function pauseTask(taskId: string): Promise<void> {
  const evolve = getEvolveInstance(taskId);
  if (evolve) {
    await evolve.pause();
  }
}

export async function resumeTask(taskId: string): Promise<void> {
  const evolve = getEvolveInstance(taskId);
  if (evolve) {
    await evolve.resume();
  }
}

export async function killTask(taskId: string): Promise<void> {
  const evolve = getEvolveInstance(taskId);
  if (evolve) {
    await evolve.kill();
    removeEvolveInstance(taskId);
  }
}

export function getTaskSession(taskId: string): string | null {
  const evolve = getEvolveInstance(taskId);
  return evolve?.getSession() ?? null;
}

// ============================================================================
// File Operations
// ============================================================================

export async function uploadTaskContext(taskId: string, files: FileMap): Promise<void> {
  const evolve = getEvolveInstance(taskId);
  if (evolve) {
    await evolve.uploadContext(files);
  }
}

export async function getTaskOutput(taskId: string, recursive = true): Promise<OutputResult> {
  const evolve = getEvolveInstance(taskId);
  if (!evolve) {
    return { files: {}, data: null, error: 'No active session' };
  }
  return await evolve.getOutputFiles(recursive);
}

// ============================================================================
// Composio Integration
// ============================================================================

// Composio helper functions
async function composioAuth(userId: string, toolkit: string): Promise<{ url: string }> {
  return await Evolve.composio.auth(userId, toolkit);
}

async function composioStatus(userId: string): Promise<Record<string, boolean>>;
async function composioStatus(userId: string, toolkit: string): Promise<boolean>;
async function composioStatus(userId: string, toolkit?: string): Promise<Record<string, boolean> | boolean> {
  if (toolkit) {
    return await Evolve.composio.status(userId, toolkit);
  }
  return await Evolve.composio.status(userId);
}

async function composioConnections(userId: string): Promise<Array<{ toolkit: string; connected: boolean; accountId?: string }>> {
  return await Evolve.composio.connections(userId);
}

export const composio = {
  auth: composioAuth,
  status: composioStatus,
  connections: composioConnections,
};

// ============================================================================
// Utility: Prepare Context Files
// ============================================================================

export function prepareContextFiles(
  files: Array<{ name: string; path: string; content?: string | ArrayBuffer }>
): FileMap {
  const context: FileMap = {};

  for (const file of files) {
    if (file.content) {
      if (typeof file.content === 'string') {
        context[file.path] = file.content;
      } else {
        context[file.path] = new Uint8Array(file.content);
      }
    }
  }

  return context;
}

// ============================================================================
// Default System Prompt
// ============================================================================

export const DEFAULT_SYSTEM_PROMPT = `You are Manus Evolve, a powerful AI agent running in a secure sandbox environment.

You can:
- Execute code and shell commands
- Browse the web and interact with pages
- Read, create, and modify files
- Use connected integrations (GitHub, Gmail, Slack, etc.)
- Analyze documents (PDF, Word, Excel, PowerPoint)
- Solve complex multi-step tasks

Always be helpful, accurate, and thorough in your work.`;
