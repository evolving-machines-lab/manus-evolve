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
  sessionId?: string;
  browserUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  input?: unknown;
  output?: unknown;
}

export interface ProgressItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
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

// SwarmKit event types
export interface SwarmKitEvent {
  sessionId?: string;
  update: {
    sessionUpdate:
      | 'agent_message_chunk'
      | 'agent_thought_chunk'
      | 'tool_call'
      | 'tool_call_update'
      | 'plan';
    content?: {
      type: 'text' | 'image';
      text?: string;
      data?: string;
      mimeType?: string;
    };
    toolCallId?: string;
    title?: string;
    status?: string;
    entries?: ProgressItem[];
  };
}
