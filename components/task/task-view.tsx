'use client';

import { useState, useRef, useEffect } from 'react';
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
} from '@/components/ui/icons';
import { SelectionModal } from '@/components/selection-modal';
import { ModelSelector, AGENT_TYPES, type ModelSelection } from '@/components/model-selector';
import { useStore } from '@/lib/store';
import { cn, generateId } from '@/lib/utils';
import type { Task, Project, Message } from '@/lib/types';
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

  // Initialize with project defaults
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>(
    project?.integrations || []
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    project?.skills || []
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { updateTask } = useStore();

  // Update selections when project changes
  useEffect(() => {
    setSelectedIntegrations(project?.integrations || []);
    setSelectedSkills(project?.skills || []);
  }, [project]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim() || !task) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...task.messages, userMessage];
    const updatedTask: Partial<Task> = {
      messages: updatedMessages,
      status: 'running',
      title: task.title === 'New Task' ? input.trim().slice(0, 50) : task.title,
      prompt: task.prompt || input.trim(),
      progress: [
        { id: generateId(), content: 'Analyzing project context', status: 'in_progress' },
        { id: generateId(), content: 'Processing request', status: 'pending' },
      ],
    };

    updateTask(task.id, updatedTask);

    const storageKey = project ? `swarmkit-tasks-${project.id}` : 'swarmkit-tasks-standalone';
    const stored = localStorage.getItem(storageKey);
    const tasks = stored ? JSON.parse(stored) : [];
    const idx = tasks.findIndex((t: Task) => t.id === task.id);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...updatedTask };
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    }

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const completedSteps = task?.progress.filter((p) => p.status === 'completed').length || 0;
  const totalSteps = task?.progress.length || 0;
  const isRunning = task?.status === 'running';

  const handleCreateTask = () => {
    if (!input.trim()) return;

    const projectId = project?.id || 'standalone';

    const newTask: Task = {
      id: generateId(),
      projectId,
      title: input.trim().slice(0, 50),
      prompt: input.trim(),
      status: 'running',
      messages: [{
        id: generateId(),
        role: 'user',
        content: input.trim(),
        timestamp: new Date().toISOString(),
      }],
      progress: [
        { id: generateId(), content: 'Analyzing request', status: 'in_progress' },
        { id: generateId(), content: 'Processing', status: 'pending' },
      ],
      artifacts: [],
      integrations: selectedIntegrations,
      skills: selectedSkills,
      agent: modelSelection.agent,
      model: modelSelection.model,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { addTask, setCurrentTask } = useStore.getState();
    addTask(newTask);
    setCurrentTask(newTask);

    const storageKey = project ? `swarmkit-tasks-${project.id}` : 'swarmkit-tasks-standalone';
    const stored = localStorage.getItem(storageKey);
    const tasks = stored ? JSON.parse(stored) : [];
    tasks.push(newTask);
    localStorage.setItem(storageKey, JSON.stringify(tasks));

    setInput('');
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
        'rounded-3xl border bg-bg-surface p-4 transition-all duration-150',
        'border-border-subtle',
        'focus-within:border-border-default'
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
              className="w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <IconAttach size={18} />
            </button>
            <button
              onClick={openIntegrationsModal}
              className={cn(
                "w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center transition-colors",
                selectedIntegrations.length > 0 ? "text-accent" : "text-text-tertiary hover:text-text-secondary"
              )}
              title="Select integrations"
            >
              <IconPlug size={18} />
            </button>
            <button
              onClick={openSkillsModal}
              className={cn(
                "w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center transition-colors",
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
      <div className="flex-1 flex flex-col bg-bg-base">
        {/* Header with breadcrumb */}
        <header className="h-14 px-4 flex items-center">
          <div className="flex items-center gap-3">
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
        </header>

        <div className="flex-1 flex flex-col items-center justify-start pt-[10vh] px-6">
          <div className="w-full max-w-2xl">
            <h1 className="text-2xl font-medium text-text-primary text-center mb-8">
              What can I help you with?
            </h1>

            {renderInputSection(handleCreateTask, handleEmptyKeyDown)}
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

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-base">
      {/* Header with breadcrumb */}
      <header className="h-14 px-4 flex items-center">
        <div className="flex items-center gap-3">
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
            selection={{
              agent: task.agent || 'claude',
              model: task.model || 'opus'
            }}
            onSelectionChange={(selection) => {
              updateTask(task.id, { agent: selection.agent, model: selection.model });
              // Update localStorage
              const storageKey = project ? `swarmkit-tasks-${project.id}` : 'swarmkit-tasks-standalone';
              const stored = localStorage.getItem(storageKey);
              if (stored) {
                const tasks = JSON.parse(stored);
                const idx = tasks.findIndex((t: Task) => t.id === task.id);
                if (idx !== -1) {
                  tasks[idx] = { ...tasks[idx], agent: selection.agent, model: selection.model };
                  localStorage.setItem(storageKey, JSON.stringify(tasks));
                }
              }
            }}
          />
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {task.messages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-text-tertiary text-[14px]">
                Start by describing what you want to accomplish
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {task.messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    'animate-slide-up',
                    message.role === 'user' ? 'flex justify-end' : ''
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div
                    className={cn(
                      'max-w-[80%]',
                      message.role === 'user' ? 'text-text-secondary' : ''
                    )}
                  >
                    {message.role === 'assistant' ? (
                      <div className="prose prose-invert prose-sm max-w-none text-text-primary leading-relaxed">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-[14px] text-text-primary whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom section - Preview card + Task progress + Input */}
      <div className="p-4 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Preview Cards - Manus style */}
          {!rightPanelOpen && (
            <>
              {previewCollapsed ? (
                <div className="relative pt-[60px]">
                  {/* Mini terminal - overflows above the bar */}
                  <div
                    onClick={() => onOpenPanel?.('browser')}
                    className="absolute left-[17px] bottom-[17px] w-[160px] h-[100px] rounded-xl bg-bg-overlay border border-border-subtle overflow-hidden cursor-pointer z-10"
                  >
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
                  </div>

                  {/* Thin progress bar */}
                  <div className="rounded-2xl border border-border-subtle bg-bg-surface px-4 py-3 pl-[191px]">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-3">
                        {(() => {
                          const currentStep = task.progress.find(p => p.status === 'in_progress') || task.progress[task.progress.length - 1];
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
                        {task.progress.length > 0 && (
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
                <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4">
                  <div className="flex items-start gap-4">
                    <div
                      onClick={() => onOpenPanel?.('browser')}
                      className="relative w-[160px] h-[100px] rounded-xl bg-bg-overlay border border-border-subtle overflow-hidden cursor-pointer group flex-shrink-0"
                    >
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
                          <IconTerminal size={16} className="text-text-secondary" />
                        </div>
                        <span className="text-[14px] text-text-secondary">
                          Manus is using <span className="text-text-primary">Terminal</span>
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

                  {task.progress.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-border-subtle bg-bg-overlay p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[15px] font-medium text-text-primary">Task progress</h3>
                        <span className="text-[13px] text-text-tertiary">{completedSteps} / {totalSteps}</span>
                      </div>
                      <div className="space-y-4">
                        {task.progress.map((item) => (
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
      />
    </div>
  );
}
