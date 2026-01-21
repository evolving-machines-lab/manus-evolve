// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  files: ProjectFile[];
  integrations: string[];
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  content?: string | ArrayBuffer;
}

// Task types
export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  prompt: string;
  messages: Message[];
  progress: ProgressItem[];
  artifacts: Artifact[];
  integrations?: string[];
  skills?: string[];
  agent?: 'claude' | 'codex' | 'gemini' | 'qwen';
  model?: string;
  sessionId?: string;
  browserLiveUrl?: string;      // VNC live view URL
  browserScreenshotUrl?: string; // Latest screenshot URL
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  contentType: 'text' | 'image';
  content: string;  // Text content or base64 image data
  mimeType?: string; // For images: 'image/png', 'image/jpeg'
  timestamp: string;
  toolCalls?: ToolCall[];
}

export type ToolKind = 'read' | 'edit' | 'delete' | 'move' | 'search' | 'execute' | 'think' | 'fetch' | 'switch_mode' | 'other';

export interface ToolCallLocation {
  path: string;
  line?: number;
}

export interface ToolCall {
  id: string;
  toolCallId: string;  // Evolve's toolCallId for updates
  name: string;
  title?: string;      // Human-readable title
  kind: ToolKind;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  input?: unknown;
  output?: unknown;
  locations?: ToolCallLocation[];
}

export interface ProgressItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
}

export interface Artifact {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  content?: string | ArrayBuffer;
}

// Integration types
export interface Integration {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  connected: boolean;
  accountId?: string;
}

// Skill types
export interface Skill {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'documents' | 'research' | 'design' | 'business' | 'development' | 'media';
}

// Store types
export interface AppState {
  // Projects
  projects: Project[];
  currentProject: Project | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  // Tasks
  tasks: Task[];
  currentTask: Task | null;
  setTasks: (tasks: Task[]) => void;
  setCurrentTask: (task: Task | null) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;

  // Integrations
  integrations: Integration[];
  setIntegrations: (integrations: Integration[]) => void;

  // UI state
  rightPanelView: 'files' | 'artifacts' | 'browser';
  setRightPanelView: (view: 'files' | 'artifacts' | 'browser') => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  expandedProjects: Set<string>;
  toggleProjectExpanded: (projectId: string) => void;
  setProjectExpanded: (projectId: string, expanded: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

// Evolve SDK event types
export interface EvolveEvent {
  sessionId?: string;
  update: EvolveSessionUpdate;
}

export type EvolveSessionUpdate =
  | EvolveMessageChunk
  | EvolveToolCall
  | EvolveToolCallUpdate
  | EvolvePlan;

export interface EvolveMessageChunk {
  sessionUpdate: 'agent_message_chunk' | 'agent_thought_chunk' | 'user_message_chunk';
  content: {
    type: 'text' | 'image';
    text?: string;
    data?: string;      // Base64 for images
    mimeType?: string;
  };
}

export interface EvolveToolCall {
  sessionUpdate: 'tool_call';
  toolCallId: string;
  title: string;
  kind: ToolKind;
  status: 'pending' | 'in_progress';
  rawInput?: unknown;
  content?: EvolveToolCallContent[];
  locations?: ToolCallLocation[];
}

export interface EvolveToolCallUpdate {
  sessionUpdate: 'tool_call_update';
  toolCallId: string;
  status?: 'completed' | 'failed';
  title?: string;
  content?: EvolveToolCallContent[];
  locations?: ToolCallLocation[];
}

export interface EvolvePlan {
  sessionUpdate: 'plan';
  entries: Array<{
    content: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'high' | 'medium' | 'low';
  }>;
}

export type EvolveToolCallContent =
  | { type: 'content'; content: { type: 'text' | 'image'; text?: string; data?: string; mimeType?: string } }
  | { type: 'diff'; path: string; oldText: string | null; newText: string };

// Legacy alias for backwards compatibility
export type SwarmKitEvent = EvolveEvent;
