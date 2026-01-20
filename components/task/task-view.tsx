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
} from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { cn, generateId } from '@/lib/utils';
import type { Task, Workspace, Message, ProgressItem } from '@/lib/types';
import ReactMarkdown from 'react-markdown';

interface TaskViewProps {
  task: Task | null;
  workspace: Workspace | null;
  onOpenPanel?: (tab?: 'files' | 'artifacts' | 'browser') => void;
  rightPanelOpen?: boolean;
}

export function TaskView({ task, workspace, onOpenPanel, rightPanelOpen }: TaskViewProps) {
  const [input, setInput] = useState('');
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { updateTask } = useStore();

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
        { id: generateId(), content: 'Analyzing workspace context', status: 'in_progress' },
        { id: generateId(), content: 'Processing request', status: 'pending' },
      ],
    };

    updateTask(task.id, updatedTask);

    // Save to localStorage (handle standalone vs project tasks)
    const storageKey = workspace ? `swarmkit-tasks-${workspace.id}` : 'swarmkit-tasks-standalone';
    const stored = localStorage.getItem(storageKey);
    const tasks = stored ? JSON.parse(stored) : [];
    const idx = tasks.findIndex((t: Task) => t.id === task.id);
    if (idx !== -1) {
      tasks[idx] = { ...tasks[idx], ...updatedTask };
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    }

    setInput('');

    // Simulated response - in real app this would call SwarmKit SDK
    setTimeout(() => {
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: 'I\'ll help you with that. Let me work on this task...',
        timestamp: new Date().toISOString(),
      };

      const progress: ProgressItem[] = [
        { id: generateId(), content: 'Analyzing workspace context', status: 'completed' },
        { id: generateId(), content: 'Processing request', status: 'completed' },
      ];

      updateTask(task.id, {
        messages: [...updatedMessages, assistantMessage],
        progress,
        status: 'completed',
      });
    }, 1500);
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
  const filesCount = workspace?.files.length || 0;
  const artifactsCount = task?.artifacts.length || 0;

  const handleCreateTask = () => {
    if (!input.trim()) return;

    const workspaceId = workspace?.id || 'standalone';

    const newTask: Task = {
      id: generateId(),
      workspaceId,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add task to store
    const { addTask, setCurrentTask } = useStore.getState();
    addTask(newTask);
    setCurrentTask(newTask);

    // Save to localStorage
    const storageKey = workspace ? `swarmkit-tasks-${workspace.id}` : 'swarmkit-tasks-standalone';
    const stored = localStorage.getItem(storageKey);
    const tasks = stored ? JSON.parse(stored) : [];
    tasks.push(newTask);
    localStorage.setItem(storageKey, JSON.stringify(tasks));

    setInput('');

    // Simulated response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: 'I\'ll help you with that. Let me work on this task...',
        timestamp: new Date().toISOString(),
      };

      const progress: ProgressItem[] = [
        { id: generateId(), content: 'Analyzing workspace context', status: 'completed' },
        { id: generateId(), content: 'Processing request', status: 'completed' },
      ];

      updateTask(newTask.id, {
        messages: [...newTask.messages, assistantMessage],
        progress,
        status: 'completed',
      });
    }, 1500);
  };

  const handleEmptyKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateTask();
    }
  };

  if (!task) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-base px-6">
        <div className="w-full max-w-2xl">
          <h1 className="text-2xl font-medium text-text-primary text-center mb-8">
            What can I help you with?
          </h1>

          <div className={cn(
            'rounded-3xl border bg-bg-surface p-4 transition-all duration-150 mb-6',
            'border-border-subtle',
            'focus-within:border-border-default'
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleEmptyKeyDown}
              placeholder="Send message to Async"
              rows={1}
              className="w-full bg-transparent resize-none text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none min-h-[28px] max-h-[200px] mb-3"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenPanel?.('files')}
                  className="w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <IconAttach size={18} />
                </button>
                <button className="w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconPlug size={18} />
                </button>
                <button className="w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconSkill size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconMic size={18} />
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={!input.trim()}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150',
                    input.trim()
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-base">
      {/* Header */}
      <header className="h-12 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={task.status} size={6} pulse={isRunning} />
          <h1 className="text-[14px] text-text-primary truncate max-w-md">
            {task.title || 'Untitled task'}
          </h1>
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
                /* COLLAPSED: Single card with browser + last task item */
                <div className="rounded-2xl border border-border-subtle bg-bg-surface p-3">
                  <div className="flex items-center gap-4">
                    {/* Browser thumbnail */}
                    <div
                      onClick={() => onOpenPanel?.('browser')}
                      className="relative w-[140px] h-[90px] rounded-xl bg-bg-overlay border border-border-subtle overflow-hidden cursor-pointer group flex-shrink-0"
                    >
                      <div className="h-full flex flex-col items-center justify-center p-2">
                        {isRunning ? (
                          <>
                            <div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin mb-1" />
                            <span className="text-[9px] text-text-tertiary">Working...</span>
                          </>
                        ) : (
                          <>
                            <IconTerminal size={20} className="text-text-quaternary mb-1" />
                            <span className="text-[9px] text-text-tertiary">Ready</span>
                          </>
                        )}
                      </div>
                      <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-black/50">
                        <IconExpand size={12} className="text-white" />
                      </div>
                    </div>

                    {/* Last task item + count + expand button */}
                    <div className="flex-1 flex items-center gap-3">
                      {task.progress.length > 0 ? (
                        <>
                          {task.progress[task.progress.length - 1].status === 'completed' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-500 flex-shrink-0">
                              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : task.progress[task.progress.length - 1].status === 'in_progress' ? (
                            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin flex-shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-text-quaternary flex-shrink-0" />
                          )}
                          <span className="text-[15px] text-text-primary flex-1">
                            {task.progress[task.progress.length - 1].content}
                          </span>
                        </>
                      ) : (
                        <span className="text-[15px] text-text-tertiary flex-1">Ready</span>
                      )}
                    </div>

                    {/* Count + expand button */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.progress.length > 0 && (
                        <span className="text-[14px] text-text-tertiary">{completedSteps} / {totalSteps}</span>
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
              ) : (
                /* EXPANDED: Single card with browser + task progress */
                <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4">
                  {/* Top section: Browser + Title */}
                  <div className="flex items-start gap-4">
                    {/* Browser thumbnail */}
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

                    {/* Title + status */}
                    <div className="flex-1 pt-1">
                      <h3 className="text-[20px] font-medium text-text-primary mb-2">
                        Async's computer
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-bg-overlay flex items-center justify-center">
                          <IconTerminal size={16} className="text-text-secondary" />
                        </div>
                        <span className="text-[14px] text-text-secondary">
                          Async is using <span className="text-text-primary">Terminal</span>
                        </span>
                      </div>
                    </div>

                    {/* Monitor icon + dropdown */}
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

                  {/* Task progress section - nested card style like Manus */}
                  {task.progress.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-border-subtle bg-bg-overlay p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[18px] font-medium text-text-primary">Task progress</h3>
                        <span className="text-[14px] text-text-tertiary">{completedSteps} / {totalSteps}</span>
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
                              'text-[16px] leading-relaxed',
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
          <div className={cn(
            'rounded-3xl border bg-bg-surface p-4 transition-all duration-150',
            'border-border-subtle',
            'focus-within:border-border-default'
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send message to Async"
              rows={1}
              className="w-full bg-transparent resize-none text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none min-h-[28px] max-h-[200px] mb-3"
              disabled={isRunning}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenPanel?.('files')}
                  className="w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <IconAttach size={18} />
                </button>
                <button className="w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconPlug size={18} />
                </button>
                <button className="w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconSkill size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconMic size={18} />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isRunning}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150',
                    input.trim() && !isRunning
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
        </div>
      </div>
    </div>
  );
}
