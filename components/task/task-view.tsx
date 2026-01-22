'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  IconChevronDown,
  StatusDot,
  IconMonitor,
  IconMic,
  IconTerminal,
  IconExpand,
  IconAttach,
  IconPlug,
  IconSkill,
  IconX,
  IconFolder,
  IconLogo,
  IconSearch,
  IconGlobe,
  IconFile,
  IconEdit,
} from '@/components/ui/icons';
import { ActivityLog } from './activity-log';

// Check if tool is browser-use by name (MCP tools have kind: "other" but name like "browser-use: browser_task")
function isBrowserUseTool(name?: string): boolean {
  if (!name) return false;
  const lowerName = name.toLowerCase();
  return lowerName.includes('browser-use') ||
         lowerName.includes('browser_task') ||
         lowerName.includes('monitor_task');
}

// Map tool kind from ACP to icon component
// SDK sends: read, edit, delete, move, search, execute, think, fetch, switch_mode, other
// NOTE: browser-use MCP tools come with kind: "other", so we also check the name
function getToolIcon(kind?: string, name?: string, size = 14, className = "text-text-tertiary") {
  // Check browser-use by name first (MCP tools have kind: "other")
  if (isBrowserUseTool(name)) {
    return <IconGlobe size={size} className={className} />;
  }

  switch (kind) {
    case 'browser':
    case 'fetch':
      return <IconGlobe size={size} className={className} />;
    case 'search':
      return <IconSearch size={size} className={className} />;
    case 'read':
    case 'edit':
    case 'write':
    case 'delete':
    case 'move':
      return <IconEdit size={size} className={className} />;
    case 'execute':
    case 'bash':
    case 'terminal':
    case 'code':
    default:
      return <IconTerminal size={size} className={className} />;
  }
}

// Map tool kind to display name
// NOTE: browser-use MCP tools come with kind: "other", so we also check the name
function getToolDisplayName(kind?: string, name?: string): string {
  // Check browser-use by name first (MCP tools have kind: "other")
  if (isBrowserUseTool(name)) {
    return 'Browser';
  }

  switch (kind) {
    case 'browser':
    case 'fetch':
      return 'Browser';
    case 'search':
      return 'Search';
    case 'read':
    case 'edit':
    case 'write':
    case 'delete':
    case 'move':
      return 'Editor';
    case 'execute':
    case 'bash':
    case 'terminal':
    case 'code':
    default:
      return 'Terminal';
  }
}

// Tool call card component for inline display
interface ToolCallCardProps {
  toolCall: ToolCall;
  onClick?: () => void;
  isActive?: boolean;
}

function ToolCallCard({ toolCall, onClick, isActive }: ToolCallCardProps) {
  const isCompleted = toolCall.status === 'completed';
  const isFailed = toolCall.status === 'failed';
  const isRunning = toolCall.status === 'in_progress' || toolCall.status === 'pending';

  // Determine display text - prefer title, then command/filePath
  const displayText = toolCall.title ||
    (toolCall.command ? `$ ${toolCall.command.slice(0, 60)}${toolCall.command.length > 60 ? '...' : ''}` : null) ||
    (toolCall.filePath ? toolCall.filePath.split('/').pop() : null) ||
    toolCall.name;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer group",
        isActive
          ? "bg-[#3a3a3a] border-accent"
          : "bg-[#2a2a2a] border-[#3a3a3a] hover:border-[#4a4a4a] hover:bg-[#333]"
      )}
    >
      {/* Status indicator / icon */}
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
        isCompleted ? "bg-green-500/20" :
        isFailed ? "bg-red-500/20" :
        "bg-[#3a3a3a]"
      )}>
        {isRunning ? (
          <div className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        ) : isCompleted ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green-500">
            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : isFailed ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-red-500">
            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          getToolIcon(toolCall.kind, toolCall.name, 14, "text-text-secondary")
        )}
      </div>

      {/* Tool info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-text-secondary">
            {getToolDisplayName(toolCall.kind, toolCall.name)}
          </span>
          {toolCall.filePath && (
            <span className="text-[12px] text-text-quaternary truncate">
              {toolCall.filePath.split('/').pop()}
            </span>
          )}
        </div>
        <div className="text-[13px] text-text-primary truncate">
          {displayText}
        </div>
      </div>

      {/* Expand hint */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <IconExpand size={14} className="text-text-tertiary" />
      </div>
    </div>
  );
}
import { SelectionModal } from '@/components/selection-modal';
import { ModelSelector, AGENT_TYPES, type ModelSelection } from '@/components/model-selector';
import { RightPanelTabs } from '@/components/workspace/right-panel-tabs';
import { useStore } from '@/lib/store';
import { cn, generateId } from '@/lib/utils';
import { useTaskStream } from '@/lib/hooks/use-task-stream';
import type { Task, Project, Message, ToolCall, ProgressItem, Artifact, MessagePart } from '@/lib/types';
import { MarkdownRenderer } from '@/components/ui/markdown-renderer';

// Reconstruct interleaved parts from content + toolCalls when parts is not available
// This ensures consistent rendering whether from streaming or DB load
function reconstructMessageParts(message: Message): MessagePart[] {
  // If parts already exists and has content, use it
  if (message.parts && message.parts.length > 0) {
    return message.parts;
  }

  const parts: MessagePart[] = [];
  const toolCalls = message.toolCalls || [];

  // If no tool calls, just return text content
  if (toolCalls.length === 0) {
    if (message.content) {
      parts.push({ type: 'text', content: message.content });
    }
    return parts;
  }

  // Split content by double newlines to find natural break points
  // Then interleave tool calls at these breaks
  const content = message.content || '';
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

  if (paragraphs.length === 0) {
    // No text content, just tool calls
    toolCalls.forEach(tc => parts.push({ type: 'tool_call', toolCall: tc }));
    return parts;
  }

  // Distribute tool calls across paragraphs
  // Heuristic: put tool calls after each paragraph proportionally
  const toolsPerParagraph = Math.ceil(toolCalls.length / paragraphs.length);
  let toolIndex = 0;

  paragraphs.forEach((paragraph, i) => {
    // Add text paragraph
    parts.push({ type: 'text', content: paragraph });

    // Add tool calls for this paragraph
    const toolsForThisParagraph = Math.min(
      toolsPerParagraph,
      toolCalls.length - toolIndex
    );

    // On last paragraph, add all remaining tools
    const toolCount = i === paragraphs.length - 1
      ? toolCalls.length - toolIndex
      : toolsForThisParagraph;

    for (let j = 0; j < toolCount; j++) {
      if (toolIndex < toolCalls.length) {
        parts.push({ type: 'tool_call', toolCall: toolCalls[toolIndex] });
        toolIndex++;
      }
    }
  });

  return parts;
}
import { AVAILABLE_INTEGRATIONS } from '@/lib/integrations';
import { AVAILABLE_SKILLS } from '@/lib/skills';

interface TaskViewProps {
  task: Task | null;
  project: Project | null;
  onOpenPanel?: (tab?: 'files' | 'artifacts' | 'browser') => void;
  rightPanelOpen?: boolean;
  onClosePanel?: () => void;
  defaultPanelTab?: 'files' | 'artifacts' | 'browser';
  // If true, TaskView will render the RightPanelTabs internally (shares streaming data directly)
  renderRightPanel?: boolean;
}

export function TaskView({ task, project, onOpenPanel, rightPanelOpen, onClosePanel, defaultPanelTab = 'browser', renderRightPanel }: TaskViewProps) {
  const [input, setInput] = useState('');
  const [previewCollapsed, setPreviewCollapsed] = useState(true);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [modalTab, setModalTab] = useState<'integrations' | 'skills'>('integrations');
  const [modelSelection, setModelSelection] = useState<ModelSelection>({ agent: 'claude', model: 'opus' });
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [funWordIndex, setFunWordIndex] = useState(0);

  // Braille spinner characters
  const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  // Fun rotating words for loading state
  const funWords = ['thinking', 'contemplating', 'tinkering', 'pondering', 'bambaloozing', 'conjuring', 'manifesting'];

  // Initialize with task values first, then project defaults
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>(
    task?.integrations || project?.integrations || []
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    task?.skills || project?.skills || []
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoStartedRef = useRef<string | null>(null);

  const { updateTask, addTask, setCurrentTask, setToolState, clearToolState } = useStore();

  // Task streaming hook - always get current task from store to handle newly created tasks
  const taskStream = useTaskStream({
    onMessage: (message) => {
      const currentTask = useStore.getState().currentTask;
      if (currentTask) {
        const currentMessages = currentTask.messages || [];
        updateTask(currentTask.id, {
          messages: [...currentMessages, message],
        });
      }
    },
    onProgress: (progress) => {
      const currentTask = useStore.getState().currentTask;
      if (currentTask) {
        updateTask(currentTask.id, { progress });
      }
    },
    onBrowserUrl: (liveUrl, screenshotUrl) => {
      const currentTask = useStore.getState().currentTask;
      if (currentTask) {
        updateTask(currentTask.id, {
          browserLiveUrl: liveUrl || currentTask.browserLiveUrl,
          browserScreenshotUrl: screenshotUrl || currentTask.browserScreenshotUrl,
        });
      }
    },
    onArtifacts: (artifacts) => {
      const currentTask = useStore.getState().currentTask;
      if (currentTask) {
        updateTask(currentTask.id, { artifacts });
      }
    },
    onComplete: (sessionId?: string) => {
      const currentTask = useStore.getState().currentTask;
      if (currentTask) {
        // Update task with completed status and sessionId (for mid-task uploads)
        updateTask(currentTask.id, {
          status: 'completed',
          ...(sessionId && { sessionId }),
        });
      }
    },
    onError: (error) => {
      console.error('Task error:', error);
      const currentTask = useStore.getState().currentTask;
      if (currentTask) {
        updateTask(currentTask.id, { status: 'failed' });
      }
    },
  });

  // Sync tool state + browser URLs to store for RightPanelTabs to consume
  // ALWAYS sync current streaming state so RightPanelTabs matches preview exactly
  useEffect(() => {
    // Always sync all tool state - don't conditionally skip
    // This ensures store always reflects current streaming state
    setToolState({
      kind: taskStream.currentToolKind,
      content: taskStream.currentToolContent,
      filePath: taskStream.currentToolFilePath,
      command: taskStream.currentToolCommand,
      name: taskStream.currentToolName,
      browserLiveUrl: taskStream.browserLiveUrl,
      browserScreenshotUrl: taskStream.browserScreenshotUrl,
    });
  }, [
    taskStream.currentToolKind,
    taskStream.currentToolContent,
    taskStream.currentToolFilePath,
    taskStream.currentToolCommand,
    taskStream.currentToolName,
    taskStream.browserLiveUrl,
    taskStream.browserScreenshotUrl,
    setToolState,
  ]);

  // Clear tool state only when switching to a DIFFERENT task (not on unmount)
  // This preserves tool state when navigating away and back to the same task
  const prevTaskIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevTaskIdRef.current && prevTaskIdRef.current !== task?.id) {
      clearToolState();
    }
    prevTaskIdRef.current = task?.id || null;
  }, [task?.id, clearToolState]);

  // Initialize tool state from the last tool call in task messages when navigating back
  // This ensures the right panel shows the last tool state instead of being empty
  useEffect(() => {
    // Only initialize if we're not streaming and have task messages with tool calls
    if (taskStream.isRunning || taskStream.currentToolKind) return;

    // Find the last tool call from all messages
    const allToolCalls = task?.messages
      ?.flatMap(m => m.toolCalls || [])
      .filter(tc => tc.status === 'completed' || tc.status === 'in_progress') || [];

    if (allToolCalls.length > 0) {
      const lastToolCall = allToolCalls[allToolCalls.length - 1];
      setToolState({
        kind: lastToolCall.kind,
        content: lastToolCall.outputContent,
        filePath: lastToolCall.filePath,
        command: lastToolCall.command,
        name: lastToolCall.name,
      });
    }
  }, [task?.id, task?.messages, taskStream.isRunning, taskStream.currentToolKind, setToolState]);

  // Auto-start task if pending and hasn't been run yet
  // Check: no assistant messages yet (only user messages or empty)
  // This prevents re-running on remount after navigation
  useEffect(() => {
    const hasAssistantResponse = task?.messages?.some(m => m.role === 'assistant');
    if (
      task &&
      task.status === 'pending' &&
      !hasAssistantResponse &&
      hasAutoStartedRef.current !== task.id
    ) {
      hasAutoStartedRef.current = task.id;
      updateTask(task.id, {
        status: 'running',
        progress: [],  // Clear old progress
        browserLiveUrl: undefined,  // Clear expired live URL, keep screenshot
      });
      taskStream.runTask(task.id);
    }
  }, [task?.id, task?.status, task?.messages, taskStream, updateTask]);

  // Poll for task updates when task is running but we're not streaming
  // This handles the case where user navigates away and back
  useEffect(() => {
    if (!task?.id || task.status !== 'running' || taskStream.isRunning) return;

    const pollTask = async () => {
      try {
        const response = await fetch(`/api/tasks/${task.id}`);
        if (response.ok) {
          const updatedTask = await response.json();
          updateTask(task.id, updatedTask);
        }
      } catch (error) {
        console.error('Error polling task:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollTask, 2000);
    return () => clearInterval(interval);
  }, [task?.id, task?.status, taskStream.isRunning, updateTask]);

  // Update selections when project changes
  // Sync selections when task or project changes
  useEffect(() => {
    setSelectedIntegrations(task?.integrations || project?.integrations || []);
    setSelectedSkills(task?.skills || project?.skills || []);
  }, [task?.id, project?.id, task?.integrations, task?.skills, project?.integrations, project?.skills]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.messages, taskStream.messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Combined running state: streaming OR task status from DB
  const isTaskRunning = taskStream.isRunning || task?.status === 'running';

  // Braille spinner animation when running
  useEffect(() => {
    if (!isTaskRunning) return;
    const interval = setInterval(() => {
      setSpinnerIndex((prev) => (prev + 1) % spinnerChars.length);
    }, 50);
    return () => clearInterval(interval);
  }, [isTaskRunning, spinnerChars.length]);

  // Rotate fun words every 4 seconds when running
  useEffect(() => {
    if (!isTaskRunning) return;
    const interval = setInterval(() => {
      setFunWordIndex((prev) => (prev + 1) % funWords.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isTaskRunning, funWords.length]);

  const handleSubmit = async () => {
    if (!input.trim() || !task) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      contentType: 'text',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    // Optimistic update - clear progress for new run, keep screenshot until new tool call
    updateTask(task.id, {
      messages: [...task.messages, userMessage],
      status: 'running',
      progress: [],  // Clear old progress from previous runs
      browserLiveUrl: undefined,  // Clear expired live URL, keep screenshot
      title: task.title === 'New Task' ? input.trim().slice(0, 50) : task.title,
    });

    const prompt = input.trim();
    setInput('');

    // Run task with streaming
    await taskStream.runTask(task.id, prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Use streaming state when running - don't fall back to old progress from previous runs
  const displayProgress = taskStream.isRunning
    ? taskStream.progress  // Only current run's progress when running
    : (task?.progress || []);  // Previous progress when not running (completed tasks)

  // Combine task messages with streaming messages (avoid duplicates by ID)
  // Memoize to prevent unnecessary re-renders and re-computation
  const displayMessages = useMemo(() => {
    const baseMessages = task?.messages || [];
    const streamingMessages = taskStream.messages || [];
    return taskStream.isRunning
      ? [
          ...baseMessages,
          ...streamingMessages.filter(sm => !baseMessages.some(bm => bm.id === sm.id))
        ]
      : baseMessages;
  }, [task?.messages, taskStream.messages, taskStream.isRunning]);

  // Pre-compute reconstructed parts for all messages once
  // This ensures immediate interleaved rendering without per-message computation during render
  const messagesWithParts = useMemo(() => {
    return displayMessages.map(message => ({
      message,
      parts: reconstructMessageParts(message),
    }));
  }, [displayMessages]);

  const displayBrowserLiveUrl = taskStream.browserLiveUrl || task?.browserLiveUrl;
  const displayBrowserScreenshotUrl = taskStream.browserScreenshotUrl || task?.browserScreenshotUrl;

  // Browser state sync moved below after currentTool* variables are defined

  const completedSteps = displayProgress.filter((p) => p.status === 'completed').length || 0;
  const totalSteps = displayProgress.length || 0;
  const isRunning = isCreatingTask || isTaskRunning;

  // Track whether to show preview (Manus-style: only show when agent is using tools)
  // Show preview if: agent has made tool calls OR task has messages with tool calls (from previous runs)
  const hasToolCalls = taskStream.hasToolCalls ||
    (task?.messages?.some(m => m.toolCalls && m.toolCalls.length > 0) ?? false);

  // Extract last tool call from task messages as fallback for reload scenario
  // This ensures the preview shows tool state even after page reload
  // Include all tool calls (not just completed/in_progress) to catch any status
  const lastToolCallFromTask = (() => {
    if (!task?.messages) return null;
    const allToolCalls = task.messages
      .flatMap(m => m.toolCalls || []);
    return allToolCalls.length > 0 ? allToolCalls[allToolCalls.length - 1] : null;
  })();

  // Extract recent terminal commands for mini preview (last 3)
  const recentTerminalCommands = (() => {
    if (!task?.messages) return [];
    const terminalKinds = ['execute', 'bash', 'terminal', 'code'];
    const commands = task.messages
      .flatMap(m => m.toolCalls || [])
      .filter(tc => terminalKinds.includes(tc.kind || '') && tc.command)
      .map(tc => tc.command!);
    return commands.slice(-3);
  })();

  // Use streaming values with fallback to last tool call from task messages
  const currentToolName = taskStream.currentToolName ?? lastToolCallFromTask?.name;
  const currentToolKind = taskStream.currentToolKind ?? lastToolCallFromTask?.kind;
  const currentToolContent = taskStream.currentToolContent ?? lastToolCallFromTask?.outputContent;
  const currentToolCommand = taskStream.currentToolCommand ?? lastToolCallFromTask?.command;
  const currentToolFilePath = taskStream.currentToolFilePath ?? lastToolCallFromTask?.filePath;

  // Determine if browser is being used (for display purposes)
  // NOTE: browser-use MCP tools have kind: "other", so also check tool name
  const isBrowserActive = displayBrowserLiveUrl || displayBrowserScreenshotUrl ||
                          currentToolKind === 'browser' || isBrowserUseTool(currentToolName);

  // NOTE: Tool state is synced to store via the effect above (lines ~274-305)
  // RightPanelTabs reads from the same store, ensuring preview and panel always match

  // Get current progress step for collapsed bar
  // Priority: in_progress step > last completed step > last step
  const currentProgressStep = displayProgress.find(p => p.status === 'in_progress') ||
    [...displayProgress].reverse().find(p => p.status === 'completed') ||
    displayProgress[displayProgress.length - 1];

  const handleCreateTask = async () => {
    if (!input.trim() || isCreatingTask) return;

    const projectId = project?.id || 'standalone';
    const prompt = input.trim();

    setIsCreatingTask(true);
    setInput('');

    try {
      // Create task via API
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          projectName: project?.name,
          title: prompt.slice(0, 50),
          prompt,
          agent: modelSelection.agent,
          model: modelSelection.model,
          integrations: selectedIntegrations,
          skills: selectedSkills,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const createdTask = await response.json();

      // Add to store and set as current
      const newTask: Task = {
        id: createdTask.id,
        projectId,
        title: createdTask.title,
        prompt: createdTask.prompt,
        status: 'running',
        messages: createdTask.messages || [],
        progress: [],
        artifacts: [],
        integrations: selectedIntegrations,
        skills: selectedSkills,
        agent: modelSelection.agent,
        model: modelSelection.model,
        createdAt: createdTask.createdAt,
        updatedAt: createdTask.updatedAt,
      };

      addTask(newTask);
      setCurrentTask(newTask);

      // Mark as auto-started and run immediately
      hasAutoStartedRef.current = newTask.id;
      taskStream.runTask(newTask.id);
    } catch (error) {
      console.error('Error creating task:', error);
      setInput(prompt); // Restore input on error
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleEmptyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateTask();
    }
  };

  const openIntegrationsModal = () => {
    setModalTab('integrations');
    setShowSelectionModal(true);
  };

  const openSkillsModal = () => {
    setModalTab('skills');
    setShowSelectionModal(true);
  };

  const removeIntegration = (id: string) => {
    setSelectedIntegrations(prev => prev.filter(i => i !== id));
  };

  const removeSkill = (id: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== id));
  };

  const getIntegrationName = (id: string) => {
    return AVAILABLE_INTEGRATIONS.find(i => i.id === id)?.displayName || id;
  };

  const getSkillName = (id: string) => {
    return AVAILABLE_SKILLS.find(s => s.id === id)?.displayName || id;
  };

  // Render the input section with chips (shared between empty and task views)
  const renderInputSection = (onSubmit: () => void, onKeyDown: (e: React.KeyboardEvent) => void, disabled = false, showSelections = true) => (
    <>
      <div className={cn(
        'rounded-3xl border bg-[#2f2f2f] p-4 transition-all duration-150 pointer-events-auto shadow-sm',
        'border-[#444444]',
        'focus-within:border-[#555555]'
      )}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Send message to Manus"
          rows={1}
          className="w-full bg-transparent resize-none text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none min-h-[28px] max-h-[200px] overflow-y-auto mb-3"
          disabled={disabled}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenPanel?.('files')}
              className={cn(
                "w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle btn-bordered flex items-center justify-center transition-colors",
                project?.files && project.files.length > 0 ? "text-accent" : "text-text-tertiary hover:text-text-secondary"
              )}
              title="View files"
            >
              <IconAttach size={18} />
            </button>
            <button
              onClick={openIntegrationsModal}
              className={cn(
                "w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle btn-bordered flex items-center justify-center transition-colors",
                selectedIntegrations.length > 0 ? "text-accent" : "text-text-tertiary hover:text-text-secondary"
              )}
              title="Select integrations"
            >
              <IconPlug size={18} />
            </button>
            <button
              onClick={openSkillsModal}
              className={cn(
                "w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle btn-bordered flex items-center justify-center transition-colors",
                selectedSkills.length > 0 ? "text-accent" : "text-text-tertiary hover:text-text-secondary"
              )}
              title="Select skills"
            >
              <IconSkill size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors"
              title="Voice input (coming soon)"
            >
              <IconMic size={18} />
            </button>
            <button
              onClick={onSubmit}
              disabled={!input.trim() || disabled}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150',
                input.trim() && !disabled
                  ? 'bg-text-secondary text-bg-base hover:bg-text-primary'
                  : 'bg-bg-overlay text-text-quaternary cursor-not-allowed'
              )}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Integrations and Skills side by side - only shown when creating new task */}
      {showSelections && (
        <div className="mt-12 flex gap-8">
          {/* Selected Integrations section */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <IconPlug size={18} className="text-text-primary" />
              <span className="text-[15px] font-medium text-text-primary">Integrations</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {selectedIntegrations.map(id => (
                <div
                  key={id}
                  className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl bg-accent-muted text-[13px] text-text-primary"
                >
                  <span>{getIntegrationName(id)}</span>
                  <button
                    onClick={() => removeIntegration(id)}
                    className="p-1 rounded-full hover:bg-accent-muted text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={openIntegrationsModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-border-subtle text-[13px] text-text-tertiary hover:text-text-secondary hover:border-border-default transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Selected Skills section */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <IconSkill size={18} className="text-text-primary" />
              <span className="text-[15px] font-medium text-text-primary">Skills</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {selectedSkills.map(id => (
                <div
                  key={id}
                  className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl bg-accent-muted text-[13px] text-text-primary"
                >
                  <span>{getSkillName(id)}</span>
                  <button
                    onClick={() => removeSkill(id)}
                    className="p-1 rounded-full hover:bg-accent-muted text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    <IconX size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={openSkillsModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-border-subtle text-[13px] text-text-tertiary hover:text-text-secondary hover:border-border-default transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (!task) {
    return (
      <div className="flex-1 flex flex-col bg-bg-content relative">
        {/* Model selector - top left */}
        <div className="absolute top-0 left-0 right-0 h-14 flex items-center px-4 gap-3">
          {/* Project breadcrumb (only for project tasks) */}
          {project && (
            <>
              <div className="flex items-center gap-2">
                <IconFolder size={16} className="text-text-primary" />
                <span className="text-[15px] font-medium text-text-primary">
                  {project.name}
                </span>
              </div>
              <span className="text-[15px] font-medium text-text-tertiary">/</span>
            </>
          )}

          {/* Model selector */}
          <ModelSelector
            selection={modelSelection}
            onSelectionChange={setModelSelection}
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-start pt-[20vh] px-6">
          <div className="w-full max-w-2xl">
            <h1 className="text-2xl font-medium text-text-primary text-center mb-8">
              What can I help you with?
            </h1>

            {renderInputSection(handleCreateTask, handleEmptyKeyDown, isCreatingTask)}

            {/* Loading indicator while creating task */}
            {isCreatingTask && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                <span className="text-[14px] text-text-secondary">Starting task...</span>
              </div>
            )}
          </div>
        </div>

        <SelectionModal
          isOpen={showSelectionModal}
          onClose={() => setShowSelectionModal(false)}
          selectedIntegrations={selectedIntegrations}
          selectedSkills={selectedSkills}
          onIntegrationsChange={setSelectedIntegrations}
          onSkillsChange={setSelectedSkills}
          initialTab={modalTab}
        />
      </div>
    );
  }

  // Calculate bottom padding based on preview state (needs to be taller than bottom section)
  // When right panel is open or no preview, only input shows. When preview exists, add more padding
  const bottomPadding = rightPanelOpen
    ? 'pb-[240px]'
    : !hasToolCalls
      ? 'pb-[280px]'
      : previewCollapsed
        ? 'pb-[380px]'
        : 'pb-[560px]';

  // When renderRightPanel is true, return both main content and right panel as flex siblings
  const mainContent = (
    <div className={cn(
      "h-full bg-bg-content relative overflow-hidden",
      renderRightPanel && rightPanelOpen ? "w-1/2 flex-shrink-0" : "flex-1"
    )}>
      {/* Model display - top left (fixed header that covers scrolling content) */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-bg-content z-20 flex items-center px-4 gap-3">
        {/* Project breadcrumb (only for project tasks) */}
        {project && (
          <>
            <div className="flex items-center gap-2">
              <IconFolder size={16} className="text-text-primary" />
              <span className="text-[15px] font-medium text-text-primary">
                {project.name}
              </span>
            </div>
            <span className="text-[15px] font-medium text-text-tertiary">/</span>
          </>
        )}

        {/* Model display (read-only) */}
        {(() => {
          const agentType = AGENT_TYPES.find(a => a.id === task.agent) || AGENT_TYPES[0];
          const model = agentType.models.find(m => m.model === task.model) || agentType.models.find(m => m.isDefault);
          return (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-medium text-text-primary">{agentType.name}</span>
                <span className="text-[13px] font-medium text-text-secondary">{model?.displayName}</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Messages area - full height, scrolls under bottom section */}
      <div className="absolute inset-0 overflow-y-auto pt-14">
        <div className={cn("max-w-3xl mx-auto px-6 py-6", bottomPadding)}>
          {displayMessages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-text-tertiary text-[14px]">
                Start by describing what you want to accomplish
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messagesWithParts.map(({ message, parts }, index) => (
                <div
                  key={message.id}
                >
                  {message.role === 'user' ? (
                    /* User message - right aligned bubble */
                    <div className="flex justify-end">
                      <div className="max-w-[70%] bg-[#3a3a3a] rounded-2xl px-4 py-3">
                        <p className="text-[15px] text-text-primary whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Assistant message - left aligned with branding */
                    <div>
                      {/* Header with logo */}
                      <div className="flex items-center gap-3 mb-3">
                        <IconLogo size={24} className="text-text-primary" />
                        <span className="text-[17px] font-semibold text-text-primary">manus</span>
                      </div>
                      {/* Message content - group into collapsible ActivityLog with interleaved text */}
                      {(() => {
                        // Find where tool calls start and end in the parts array
                        const firstToolIndex = parts.findIndex(p => p.type === 'tool_call');
                        const lastToolIndex = parts.map(p => p.type).lastIndexOf('tool_call');

                        // Leading text: everything before first tool call (shown full size)
                        const leadingTextParts = firstToolIndex > 0
                          ? parts.slice(0, firstToolIndex).filter(p => p.type === 'text')
                          : firstToolIndex === -1
                            ? parts.filter(p => p.type === 'text') // No tool calls, all text is leading
                            : [];

                        // Middle parts: from first tool call to last tool call (goes into ActivityLog)
                        const middleParts = firstToolIndex >= 0
                          ? parts.slice(firstToolIndex, lastToolIndex + 1)
                          : [];

                        // Trailing text: everything after last tool call (shown full size - final response)
                        const trailingTextParts = lastToolIndex >= 0 && lastToolIndex < parts.length - 1
                          ? parts.slice(lastToolIndex + 1).filter(p => p.type === 'text')
                          : [];

                        // If no tool calls, just render all text normally
                        if (firstToolIndex === -1) {
                          return (
                            <div className="space-y-4">
                              {leadingTextParts.map((part, i) => (
                                <div key={`text-${i}`} className="max-w-none text-[15px] text-text-primary leading-relaxed">
                                  <MarkdownRenderer content={part.content} />
                                </div>
                              ))}
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {/* Leading text (before tool calls) - full size */}
                            {leadingTextParts.map((part, i) => (
                              <div key={`lead-${i}`} className="max-w-none text-[15px] text-text-primary leading-relaxed">
                                <MarkdownRenderer content={part.content} />
                              </div>
                            ))}

                            {/* Collapsible activity log with interleaved text and tool calls */}
                            <ActivityLog
                              parts={middleParts}
                              isRunning={isRunning && index === messagesWithParts.length - 1}
                              onToolCallClick={(tc) => {
                                setToolState({
                                  kind: tc.kind,
                                  content: tc.outputContent,
                                  filePath: tc.filePath,
                                  command: tc.command,
                                  name: tc.name,
                                });
                                onOpenPanel?.('browser');
                              }}
                              visibleCount={5}
                            />

                            {/* Trailing text (after tool calls - final response) - full size */}
                            {trailingTextParts.map((part, i) => (
                              <div key={`trail-${i}`} className="max-w-none text-[15px] text-text-primary leading-relaxed">
                                <MarkdownRenderer content={part.content} />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {/* Loading indicator - below content, only on last message while streaming */}
                      {isRunning && index === messagesWithParts.length - 1 && (
                        <div className="mt-4">
                          <span className="text-[16px] flex items-center gap-2.5">
                            <span className="text-accent text-[20px]">{spinnerChars[spinnerIndex]}</span>
                            <span className="text-text-secondary">{funWords[funWordIndex]}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Manus thinking indicator - shows when waiting for first response */}
              {isRunning && messagesWithParts[messagesWithParts.length - 1]?.message.role === 'user' && (
                <div>
                  {/* Header with logo */}
                  <div className="flex items-center gap-3 mb-3">
                    <IconLogo size={24} className="text-text-primary" />
                    <span className="text-[17px] font-semibold text-text-primary">manus</span>
                  </div>
                  {/* Loading indicator - below header while waiting for content */}
                  <div className="mt-2">
                    <span className="text-[16px] flex items-center gap-2.5">
                      <span className="text-accent text-[20px]">{spinnerChars[spinnerIndex]}</span>
                      <span className="text-text-secondary">{funWords[funWordIndex]}</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Task completed indicator */}
              {task?.status === 'completed' && !taskStream.isRunning && (
                <div className="flex items-center gap-2 mt-4">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500">
                    <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-[14px] text-green-500">Task completed</span>
                </div>
              )}

              {/* Task failed indicator */}
              {task?.status === 'failed' && !taskStream.isRunning && (
                <div>
                  {/* Show manus header if no assistant messages yet */}
                  {!displayMessages.some(m => m.role === 'assistant') && (
                    <div className="flex items-center gap-3 mb-3">
                      <IconLogo size={24} className="text-text-primary" />
                      <span className="text-[17px] font-semibold text-text-primary">manus</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-500">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span className="text-[14px] text-red-500">Task failed - please try again</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom section - Preview card + Task progress + Input (floats over messages) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-4 z-10 pointer-events-none">
        {/* pointer-events-none on container, pointer-events-auto on children */}
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Preview Cards - Manus style: only show when agent is using tools */}
          {!rightPanelOpen && hasToolCalls && (
            <>
              {previewCollapsed ? (
                <div className="relative pt-[64px]">
                  {/* Floating thumbnail - Manus style */}
                  {/* Priority: Browser (if browser-use tool OR has screenshot) > Terminal > Editor > Empty terminal */}
                  <div
                    onClick={() => onOpenPanel?.('browser')}
                    className="absolute left-[17px] bottom-[17px] w-[128px] h-[80px] rounded-xl border border-[#4a4a4a] overflow-hidden cursor-pointer z-10 pointer-events-auto shadow-lg group"
                  >
                    {isBrowserUseTool(currentToolName) || (currentToolKind === 'browser' || currentToolKind === 'fetch') ? (
                      /* Browser-use tool - always show browser view */
                      displayBrowserScreenshotUrl ? (
                        <img
                          src={displayBrowserScreenshotUrl}
                          alt="Browser preview"
                          className="w-full h-full object-cover bg-white"
                        />
                      ) : (
                        /* Browser placeholder while loading */
                        <div className="h-full bg-[#1a1a1a] flex items-center justify-center">
                          <div className="flex flex-col items-center gap-1">
                            <IconGlobe size={16} className="text-text-quaternary" />
                            <span className="text-[6px] text-text-quaternary">Browser</span>
                          </div>
                        </div>
                      )
                    ) : (currentToolKind === 'execute' || currentToolKind === 'bash' || currentToolKind === 'terminal' || currentToolKind === 'code') && (currentToolCommand || recentTerminalCommands.length > 0) ? (
                      /* Terminal mini preview - shows recent commands like real terminal */
                      <div className="h-full bg-[#1a1a1a] p-1.5 overflow-hidden">
                        <div className="font-mono text-[5px] leading-[7px]">
                          {recentTerminalCommands.slice(-2).map((cmd, i) => (
                            <div key={i} className="truncate">
                              <span className="text-emerald-400/70">ubuntu@sandbox:~</span>
                              <span className="text-[#666]"> $ {cmd.length > 20 ? cmd.slice(0, 20) + '...' : cmd}</span>
                            </div>
                          ))}
                          {currentToolCommand && !recentTerminalCommands.includes(currentToolCommand) && (
                            <div className="truncate">
                              <span className="text-emerald-400">ubuntu@sandbox:~</span>
                              <span className="text-[#888]"> $ {currentToolCommand.length > 20 ? currentToolCommand.slice(0, 20) + '...' : currentToolCommand}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (currentToolKind === 'read' || currentToolKind === 'edit' || currentToolKind === 'write') && (currentToolContent || currentToolFilePath) ? (
                      /* Editor mini preview - when last tool was editor */
                      <div className="h-full bg-[#1a1a1a] overflow-hidden">
                        <div className="bg-[#252525] px-2 py-1 border-b border-[#333]">
                          <span className="text-[6px] text-[#888] truncate block">{currentToolFilePath?.split('/').pop() || 'file'}</span>
                        </div>
                        <div className="p-2 font-mono text-[6px] leading-tight text-[#888] line-clamp-4">
                          {currentToolContent?.slice(0, 200) || '// Loading...'}
                        </div>
                      </div>
                    ) : displayBrowserScreenshotUrl ? (
                      /* Browser screenshot - if available */
                      <img
                        src={displayBrowserScreenshotUrl}
                        alt="Browser preview"
                        className="w-full h-full object-cover bg-white"
                      />
                    ) : (
                      /* Default: show empty terminal like right panel */
                      <div className="h-full bg-[#1a1a1a] p-2 overflow-hidden">
                        <div className="font-mono text-[6px] leading-tight flex items-center">
                          <span className="text-emerald-400">ubuntu@sandbox:~</span>
                          <span className="text-white ml-1">$</span>
                          <span className="w-[4px] h-[8px] bg-[#ccc] ml-1" />
                        </div>
                      </div>
                    )}
                    {/* Expand icon overlay */}
                    <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-[#3a3a3a]">
                      <IconExpand size={12} className="text-white" />
                    </div>
                  </div>

                  {/* Thin progress bar - click anywhere to expand */}
                  <div
                    onClick={() => setPreviewCollapsed(false)}
                    className="rounded-2xl border border-[#444444] bg-[#2f2f2f] px-4 py-3 pl-[160px] pointer-events-auto shadow-sm cursor-pointer hover:border-[#555555] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-3">
                        {currentProgressStep ? (
                          <>
                            {currentProgressStep.status === 'completed' ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-500 flex-shrink-0">
                                <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            ) : currentProgressStep.status === 'in_progress' ? (
                              <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin flex-shrink-0" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-text-quaternary flex-shrink-0" />
                            )}
                            <span className="text-[13px] text-text-primary flex-1 truncate">
                              {currentProgressStep.content}
                            </span>
                          </>
                        ) : currentToolKind || isBrowserUseTool(currentToolName) ? (
                          /* No task progress - show tool status (valid tool kind or browser-use) */
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-5 h-5 rounded-md bg-[#3a3a3a] flex items-center justify-center flex-shrink-0">
                              {getToolIcon(currentToolKind, currentToolName, 12, "text-text-secondary")}
                            </div>
                            <span className="text-[13px] text-text-tertiary">
                              {isRunning ? (
                                <>Manus is using <span className="text-text-primary font-medium">{getToolDisplayName(currentToolKind, currentToolName)}</span></>
                              ) : (
                                <>Manus used <span className="text-text-primary font-medium">{getToolDisplayName(currentToolKind, currentToolName)}</span></>
                              )}
                            </span>
                          </div>
                        ) : (
                          /* No progress and no tool kind - show generic status */
                          <div className="flex items-center gap-2 flex-1">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-500 flex-shrink-0">
                              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="text-[13px] text-text-primary">Task completed</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {displayProgress.length > 0 && (
                          <span className="text-[12px] text-text-tertiary">{completedSteps} / {totalSteps}</span>
                        )}
                        <button
                          onClick={() => setPreviewCollapsed(false)}
                          className="p-1 text-text-tertiary hover:text-text-secondary transition-colors"
                        >
                          <IconChevronDown size={18} className="rotate-180" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#444444] bg-[#2f2f2f] p-4 pointer-events-auto shadow-sm">
                  <div className="flex items-start gap-4">
                    {/* Priority: Terminal/Editor (based on last tool) > Screenshot > Empty terminal */}
                    <div
                      onClick={() => onOpenPanel?.('browser')}
                      className="relative w-[128px] h-[80px] rounded-xl border border-[#4a4a4a] overflow-hidden cursor-pointer group flex-shrink-0 shadow-sm"
                    >
                      {(currentToolKind === 'execute' || currentToolKind === 'bash' || currentToolKind === 'terminal' || currentToolKind === 'code') && (currentToolCommand || recentTerminalCommands.length > 0) ? (
                        /* Terminal mini preview - shows recent commands like real terminal */
                        <div className="h-full bg-[#1a1a1a] p-1.5 overflow-hidden">
                          <div className="font-mono text-[5px] leading-[7px]">
                            {recentTerminalCommands.slice(-2).map((cmd, i) => (
                              <div key={i} className="truncate">
                                <span className="text-emerald-400/70">ubuntu@sandbox:~</span>
                                <span className="text-[#666]"> $ {cmd.length > 20 ? cmd.slice(0, 20) + '...' : cmd}</span>
                              </div>
                            ))}
                            {currentToolCommand && !recentTerminalCommands.includes(currentToolCommand) && (
                              <div className="truncate">
                                <span className="text-emerald-400">ubuntu@sandbox:~</span>
                                <span className="text-[#888]"> $ {currentToolCommand.length > 20 ? currentToolCommand.slice(0, 20) + '...' : currentToolCommand}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (currentToolKind === 'read' || currentToolKind === 'edit' || currentToolKind === 'write') && (currentToolContent || currentToolFilePath) ? (
                        /* Editor mini preview - highest priority when last tool was editor */
                        <div className="h-full bg-[#1a1a1a] overflow-hidden">
                          <div className="bg-[#252525] px-2 py-1 border-b border-[#333]">
                            <span className="text-[6px] text-[#888] truncate block">{currentToolFilePath?.split('/').pop() || 'file'}</span>
                          </div>
                          <div className="p-2 font-mono text-[6px] leading-tight text-[#888] line-clamp-4">
                            {currentToolContent?.slice(0, 200) || '// Loading...'}
                          </div>
                        </div>
                      ) : displayBrowserScreenshotUrl ? (
                        /* Browser screenshot - fallback when last tool was browser or no tool content */
                        <img
                          src={displayBrowserScreenshotUrl}
                          alt="Browser preview"
                          className="w-full h-full object-cover bg-white"
                        />
                      ) : (
                        /* Default: show empty terminal like right panel */
                        <div className="h-full bg-[#1a1a1a] p-2 overflow-hidden">
                          <div className="font-mono text-[6px] leading-tight flex items-center">
                            <span className="text-emerald-400">ubuntu@sandbox:~</span>
                            <span className="text-white ml-1">$</span>
                            <span className="w-[4px] h-[8px] bg-[#ccc] ml-1" />
                          </div>
                        </div>
                      )}
                      {/* Expand icon overlay */}
                      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-[#3a3a3a]">
                        <IconExpand size={12} className="text-white" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-[18px] font-medium text-text-primary mb-3">
                        Manus's computer
                      </h3>
                      <div className="flex items-center gap-2">
                        {currentToolKind || isBrowserUseTool(currentToolName) ? (
                          <>
                            <div className="w-6 h-6 rounded-md bg-[#3a3a3a] flex items-center justify-center">
                              {getToolIcon(currentToolKind, currentToolName, 14, "text-text-secondary")}
                            </div>
                            <span className="text-[13px] text-text-tertiary">
                              {isRunning ? (
                                <>Manus is using <span className="text-text-primary font-medium">{getToolDisplayName(currentToolKind, currentToolName)}</span></>
                              ) : (
                                <>Manus used <span className="text-text-primary font-medium">{getToolDisplayName(currentToolKind, currentToolName)}</span></>
                              )}
                            </span>
                          </>
                        ) : (
                          <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-500">
                              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="text-[13px] text-text-primary">Task completed</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenPanel?.('browser')}
                        className="p-2 text-text-tertiary hover:text-text-secondary transition-colors"
                      >
                        <IconMonitor size={20} />
                      </button>
                      <button
                        onClick={() => setPreviewCollapsed(true)}
                        className="p-1 text-text-tertiary hover:text-text-secondary transition-colors"
                      >
                        <IconChevronDown size={18} />
                      </button>
                    </div>
                  </div>

                  {displayProgress.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-[#333333] bg-[#252525] p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[15px] font-medium text-text-primary">Task progress</h3>
                        <span className="text-[13px] text-text-tertiary">{completedSteps} / {totalSteps}</span>
                      </div>
                      <div className="space-y-4">
                        {displayProgress.map((item) => (
                          <div key={item.id} className="flex items-start gap-3">
                            {item.status === 'completed' ? (
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-0.5 flex-shrink-0">
                                <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            ) : item.status === 'in_progress' ? (
                              <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin mt-0.5 flex-shrink-0" />
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-text-quaternary mt-0.5 flex-shrink-0" />
                            )}
                            <span className={cn(
                              'text-[13px] leading-relaxed',
                              item.status === 'completed' ? 'text-text-primary' :
                              item.status === 'in_progress' ? 'text-text-primary' :
                              'text-text-tertiary'
                            )}>
                              {item.content}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Input area */}
          {renderInputSection(handleSubmit, handleKeyDown, isRunning, false)}
        </div>
      </div>

      <SelectionModal
        isOpen={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
        selectedIntegrations={selectedIntegrations}
        selectedSkills={selectedSkills}
        onIntegrationsChange={setSelectedIntegrations}
        onSkillsChange={setSelectedSkills}
        initialTab={modalTab}
        readOnly={!!task}
      />
    </div>
  );

  // When renderRightPanel is true, return both panels as flex siblings
  if (renderRightPanel) {
    return (
      <>
        {mainContent}
        {/* Right Panel - shares streaming data directly (same source as preview) */}
        <div className={rightPanelOpen ? "w-1/2 flex flex-col overflow-hidden" : "hidden"}>
          <RightPanelTabs
            project={project}
            task={task}
            onClose={onClosePanel || (() => {})}
            defaultTab={defaultPanelTab}
            isOpen={rightPanelOpen}
            // Pass streaming data directly - same values preview uses
            toolKind={currentToolKind}
            toolName={currentToolName}
            toolContent={currentToolContent}
            toolFilePath={currentToolFilePath}
            toolCommand={currentToolCommand}
            browserLiveUrl={displayBrowserLiveUrl}
            browserScreenshotUrl={displayBrowserScreenshotUrl}
          />
        </div>
      </>
    );
  }

  return mainContent;
}
