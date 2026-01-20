'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { IconSearch, IconFolder, IconX } from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Task, Project } from '@/lib/types';

// Chat bubble icon for tasks (filled)
function TaskIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-tertiary shrink-0">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  );
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { projects, setCurrentProject, setCurrentTask } = useStore();

  // Load all tasks
  const [allTasks, setAllTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Load all tasks when modal opens
      const loadedTasks: Task[] = [];

      // Standalone tasks
      const standaloneTasks = localStorage.getItem('swarmkit-tasks-standalone');
      if (standaloneTasks) {
        loadedTasks.push(...JSON.parse(standaloneTasks));
      }

      // Project tasks
      projects.forEach(ws => {
        const stored = localStorage.getItem(`swarmkit-tasks-${ws.id}`);
        if (stored) {
          loadedTasks.push(...JSON.parse(stored));
        }
      });

      setAllTasks(loadedTasks);
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, projects]);

  // Filter results based on query
  const filteredProjects = query
    ? projects.filter(w =>
        w.name.toLowerCase().includes(query.toLowerCase())
      )
    : projects.slice(0, 3);

  const filteredTasks = query
    ? allTasks.filter(t =>
        t.title?.toLowerCase().includes(query.toLowerCase()) ||
        t.prompt?.toLowerCase().includes(query.toLowerCase())
      )
    : allTasks.slice(0, 5);

  const results = [
    ...filteredProjects.map(w => ({ type: 'project' as const, data: w })),
    ...filteredTasks.map(t => ({ type: 'task' as const, data: t })),
  ];

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      selectResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [results, selectedIndex, onClose]);

  const selectResult = (result: typeof results[0]) => {
    if (result.type === 'project') {
      const project = result.data as Project;
      setCurrentProject(project);
      setCurrentTask(null);
      router.push(`/${project.id}`);
    } else {
      const task = result.data as Task;
      if (task.projectId === 'standalone') {
        setCurrentProject(null);
        setCurrentTask(task);
        router.push(`/task/${task.id}`);
      } else {
        const project = projects.find(w => w.id === task.projectId);
        if (project) {
          setCurrentProject(project);
        }
        setCurrentTask(task);
        router.push(`/${task.projectId}`);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-[20vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-bg-surface border border-border-subtle rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          <IconSearch size={18} className="text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks and projects..."
            className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-quaternary focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[14px] text-text-tertiary">
                {query ? 'No results found' : 'Start typing to search'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {filteredProjects.length > 0 && (
                <>
                  <div className="px-4 py-1.5">
                    <span className="text-[11px] font-medium text-text-quaternary uppercase tracking-wider">Projects</span>
                  </div>
                  {filteredProjects.map((project, i) => {
                    const index = i;
                    return (
                      <button
                        key={project.id}
                        onClick={() => selectResult({ type: 'project', data: project })}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors",
                          selectedIndex === index ? "bg-bg-overlay" : "hover:bg-bg-overlay/50"
                        )}
                      >
                        <IconFolder size={18} className="text-text-tertiary" />
                        <span className="text-[14px] text-text-primary">{project.name}</span>
                      </button>
                    );
                  })}
                </>
              )}
              {filteredTasks.length > 0 && (
                <>
                  <div className="px-4 py-1.5 mt-1">
                    <span className="text-[11px] font-medium text-text-quaternary uppercase tracking-wider">Tasks</span>
                  </div>
                  {filteredTasks.map((task, i) => {
                    const index = filteredProjects.length + i;
                    return (
                      <button
                        key={task.id}
                        onClick={() => selectResult({ type: 'task', data: task })}
                        className={cn(
                          "flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors",
                          selectedIndex === index ? "bg-bg-overlay" : "hover:bg-bg-overlay/50"
                        )}
                      >
                        <TaskIcon />
                        <div className="flex-1 min-w-0">
                          <span className="text-[14px] text-text-primary block truncate">
                            {task.title || 'Untitled task'}
                          </span>
                          {task.projectId !== 'standalone' && (
                            <span className="text-[12px] text-text-quaternary">
                              {projects.find(w => w.id === task.projectId)?.name || 'Unknown project'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border-subtle bg-bg-base/50 flex items-center gap-4 text-[11px] text-text-quaternary">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
}
