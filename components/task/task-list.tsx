'use client';

import { IconPlus, StatusDot, IconChevronRight } from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { cn, generateId, formatDate } from '@/lib/utils';
import type { Task } from '@/lib/types';

interface TaskListProps {
  tasks: Task[];
  currentTask: Task | null;
  onSelectTask: (task: Task) => void;
  workspaceId: string;
}

export function TaskList({ tasks, currentTask, onSelectTask, workspaceId }: TaskListProps) {
  const { addTask, setCurrentTask } = useStore();

  const createNewTask = () => {
    const task: Task = {
      id: generateId(),
      workspaceId,
      title: 'New Task',
      status: 'pending',
      prompt: '',
      messages: [],
      progress: [],
      artifacts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addTask(task);
    setCurrentTask(task);

    const stored = localStorage.getItem(`swarmkit-tasks-${workspaceId}`);
    const existingTasks = stored ? JSON.parse(stored) : [];
    existingTasks.push(task);
    localStorage.setItem(`swarmkit-tasks-${workspaceId}`, JSON.stringify(existingTasks));
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'running': return 'Running';
      case 'completed': return 'Done';
      case 'failed': return 'Failed';
      case 'paused': return 'Paused';
      default: return 'Pending';
    }
  };

  return (
    <aside className="w-[260px] flex flex-col bg-bg-elevated border-r border-border-subtle">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border-subtle">
        <h2 className="text-[13px] font-medium text-text-secondary">Tasks</h2>
        <button
          onClick={createNewTask}
          className="p-1.5 rounded-md hover:bg-bg-surface text-text-tertiary hover:text-text-primary transition-colors"
        >
          <IconPlus size={16} />
        </button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-2">
        {tasks.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-bg-surface mx-auto mb-4 flex items-center justify-center">
              <IconPlus size={20} className="text-text-quaternary" />
            </div>
            <p className="text-[13px] text-text-tertiary mb-4">No tasks yet</p>
            <button
              onClick={createNewTask}
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] rounded-lg
                bg-bg-surface hover:bg-bg-overlay border border-border-subtle hover:border-border-default
                text-text-secondary hover:text-text-primary transition-all duration-150"
            >
              <IconPlus size={14} />
              New task
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {[...tasks].reverse().map((task, index) => {
              const isActive = currentTask?.id === task.id;
              const completedSteps = task.progress.filter((p) => p.status === 'completed').length;
              const totalSteps = task.progress.length;

              return (
                <button
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className={cn(
                    'group w-full text-left p-3 rounded-lg transition-all duration-150',
                    'animate-slide-up',
                    isActive
                      ? 'bg-accent-subtle'
                      : 'hover:bg-bg-surface'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-1.5">
                      <StatusDot status={task.status} size={6} pulse={task.status === 'running'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-[13px] font-medium truncate',
                          isActive ? 'text-accent' : 'text-text-primary'
                        )}
                      >
                        {task.title || 'Untitled task'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          'text-2xs',
                          task.status === 'running' ? 'text-accent' :
                          task.status === 'completed' ? 'text-success' :
                          task.status === 'failed' ? 'text-error' :
                          'text-text-quaternary'
                        )}>
                          {getStatusLabel(task.status)}
                        </span>
                        <span className="text-text-quaternary text-2xs">·</span>
                        <span className="text-2xs text-text-quaternary">
                          {formatDate(task.createdAt)}
                        </span>
                      </div>

                      {/* Progress bar */}
                      {totalSteps > 0 && (
                        <div className="mt-2">
                          <div className="h-1 bg-bg-overlay rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-300',
                                task.status === 'completed' ? 'bg-success' :
                                task.status === 'failed' ? 'bg-error' :
                                'bg-accent'
                              )}
                              style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                            />
                          </div>
                          <p className="text-2xs text-text-quaternary mt-1">
                            {completedSteps}/{totalSteps} steps
                          </p>
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <IconChevronRight size={14} className="text-accent/60 mt-0.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
