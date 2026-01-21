'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
} from '@/components/ui/icons';
import { SelectionModal } from '@/components/selection-modal';
import { ModelSelector, AGENT_TYPES, type ModelSelection } from '@/components/model-selector';
import { useStore } from '@/lib/store';
import { cn, generateId } from '@/lib/utils';
import { useTaskStream } from '@/lib/hooks/use-task-stream';
import type { Task, Project, Message, ToolCall, ProgressItem, Artifact } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import { AVAILABLE_INTEGRATIONS } from '@/lib/integrations';
import { AVAILABLE_SKILLS } from '@/lib/skills';

interface TaskViewProps {
  task: Task | null;
  project: Project | null;
  onOpenPanel?: (tab?: 'files' | 'artifacts' | 'browser') => void;
  rightPanelOpen?: boolean;
}

export function TaskView({ task, project, onOpenPanel, rightPanelOpen }: TaskViewProps) {
  const [input, setInput] = useState('');
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
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

  const { updateTask, addTask, setCurrentTask } = useStore();

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
      updateTask(task.id, { status: 'running' });
      taskStream.runTask(task.id);
    }
  }, [task?.id, task?.status, task?.messages, taskStream, updateTask]);

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

  // Braille spinner animation when streaming
  useEffect(() => {
    if (!taskStream.isRunning) return;
    const interval = setInterval(() => {
      setSpinnerIndex((prev) => (prev + 1) % spinnerChars.length);
    }, 50);
    return () => clearInterval(interval);
  }, [taskStream.isRunning, spinnerChars.length]);

  // Rotate fun words every 4 seconds when streaming
  useEffect(() => {
    if (!taskStream.isRunning) return;
    const interval = setInterval(() => {
      setFunWordIndex((prev) => (prev + 1) % funWords.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [taskStream.isRunning, funWords.length]);

  const handleSubmit = async () => {
    if (!input.trim() || !task) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      contentType: 'text',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    // Optimistic update
    updateTask(task.id, {
      messages: [...task.messages, userMessage],
      status: 'running',
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

  // Use streaming state when running, combined with existing task messages
  const displayProgress = taskStream.isRunning && taskStream.progress.length > 0
    ? taskStream.progress
    : (task?.progress || []);

  // Combine task messages with streaming messages (avoid duplicates by ID)
  const baseMessages = task?.messages || [];
  const streamingMessages = taskStream.messages || [];
  const displayMessages = taskStream.isRunning
    ? [
        ...baseMessages,
        ...streamingMessages.filter(sm => !baseMessages.some(bm => bm.id === sm.id))
      ]
    : baseMessages;

  const displayBrowserLiveUrl = taskStream.browserLiveUrl || task?.browserLiveUrl;
  const displayBrowserScreenshotUrl = taskStream.browserScreenshotUrl || task?.browserScreenshotUrl;

  const completedSteps = displayProgress.filter((p) => p.status === 'completed').length || 0;
  const totalSteps = displayProgress.length || 0;
  const isRunning = isCreatingTask || taskStream.isRunning || task?.status === 'running';

  // Track whether to show preview (Manus-style: only show when agent is using tools)
  // Show preview if: agent has made tool calls OR task has messages with tool calls (from previous runs)
  const hasToolCalls = taskStream.hasToolCalls ||
    (task?.messages?.some(m => m.toolCalls && m.toolCalls.length > 0) ?? false);
  const currentToolName = taskStream.currentToolName;

  // Determine if browser is being used (for display purposes)
  const isBrowserActive = displayBrowserLiveUrl || displayBrowserScreenshotUrl;

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
  // When right panel is open, only input shows. When closed, preview + progress + input
  const bottomPadding = rightPanelOpen ? 'pb-[220px]' : 'pb-[420px]';

  return (
    <div className="flex-1 h-full bg-bg-content relative overflow-hidden">
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
              {displayMessages.map((message, index) => (
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
                      {/* Message content */}
                      <div className="prose prose-invert prose-sm max-w-none text-[15px] text-text-primary leading-relaxed">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {/* Loading indicator - below content, only on last message while streaming */}
                      {taskStream.isRunning && index === displayMessages.length - 1 && (
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
              {taskStream.isRunning && displayMessages[displayMessages.length - 1]?.role === 'user' && (
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
                <div className="relative pt-[60px]">
                  {/* Mini preview - shows browser screenshot if available, otherwise terminal placeholder */}
                  <div
                    onClick={() => onOpenPanel?.('browser')}
                    className="absolute left-[17px] bottom-[17px] w-[160px] h-[100px] rounded-xl bg-[#363636] border border-[#4a4a4a] overflow-hidden cursor-pointer z-10 pointer-events-auto shadow-sm"
                  >
                    {displayBrowserScreenshotUrl ? (
                      <img
                        src={displayBrowserScreenshotUrl}
                        alt="Browser preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-2">
                        {isRunning ? (
                          <>
                            <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-2" />
                            <span className="text-[9px] text-text-tertiary">Working...</span>
                          </>
                        ) : (
                          <>
                            <IconTerminal size={24} className="text-text-quaternary mb-2" />
                            <span className="text-[9px] text-text-tertiary">Ready</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Thin progress bar */}
                  <div className="rounded-2xl border border-[#444444] bg-[#2f2f2f] px-4 py-3 pl-[191px] pointer-events-auto shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-3">
                        {(() => {
                          const currentStep = displayProgress.find(p => p.status === 'in_progress') || displayProgress[displayProgress.length - 1];
                          if (!currentStep) return <span className="text-[13px] text-text-tertiary flex-1">Ready</span>;
                          return (
                            <>
                              {currentStep.status === 'completed' ? (
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-500 flex-shrink-0">
                                  <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : currentStep.status === 'in_progress' ? (
                                <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin flex-shrink-0" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-text-quaternary flex-shrink-0" />
                              )}
                              <span className="text-[13px] text-text-primary flex-1">
                                {currentStep.content}
                              </span>
                            </>
                          );
                        })()}
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
                    <div
                      onClick={() => onOpenPanel?.('browser')}
                      className="relative w-[160px] h-[100px] rounded-xl bg-[#363636] border border-[#4a4a4a] overflow-hidden cursor-pointer group flex-shrink-0 shadow-sm"
                    >
                      {displayBrowserScreenshotUrl ? (
                        <img
                          src={displayBrowserScreenshotUrl}
                          alt="Browser preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-2">
                          {isRunning ? (
                            <>
                              <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-2" />
                              <span className="text-[9px] text-text-tertiary">Working...</span>
                            </>
                          ) : (
                            <>
                              <IconTerminal size={24} className="text-text-quaternary mb-2" />
                              <span className="text-[9px] text-text-tertiary">Ready</span>
                            </>
                          )}
                        </div>
                      )}
                      <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-black/50">
                        <IconExpand size={14} className="text-white" />
                      </div>
                    </div>

                    <div className="flex-1 pt-1">
                      <h3 className="text-[20px] font-medium text-text-primary mb-2">
                        Manus's computer
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-bg-overlay flex items-center justify-center">
                          {isBrowserActive ? (
                            <IconMonitor size={16} className="text-text-secondary" />
                          ) : (
                            <IconTerminal size={16} className="text-text-secondary" />
                          )}
                        </div>
                        <span className="text-[14px] text-text-secondary">
                          {isRunning ? (
                            <>Manus is using <span className="text-text-primary">{currentToolName || (isBrowserActive ? 'Browser' : 'Terminal')}</span></>
                          ) : (
                            <>Manus used <span className="text-text-primary">{isBrowserActive ? 'Browser' : 'Terminal'}</span></>
                          )}
                        </span>
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
                    <div className="mt-4 rounded-2xl border border-[#444444] bg-[#363636] p-5">
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
}
