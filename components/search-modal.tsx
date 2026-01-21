'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { IconSearch, IconFolder, IconX, IconPlus } from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { cn, generateId } from '@/lib/utils';
import type { Task, Project } from '@/lib/types';

// Chat bubble icon for tasks (in circle)
function TaskIcon() {
  return (
    <div className="w-10 h-10 rounded-full bg-[#3a3a3a] flex items-center justify-center shrink-0">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    </div>
  );
}

// Folder icon in circle
function ProjectIcon() {
  return (
    <div className="w-10 h-10 rounded-full bg-[#3a3a3a] flex items-center justify-center shrink-0">
      <IconFolder size={20} className="text-text-secondary" />
    </div>
  );
}

// Format date for display
function formatTaskDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (taskDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } else if (taskDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
}

// Group tasks by date
function groupTasksByDate(tasks: Task[]): { label: string; tasks: Task[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayTasks: Task[] = [];
  const yesterdayTasks: Task[] = [];
  const olderTasks: Task[] = [];

  tasks.forEach(task => {
    const taskDate = new Date(task.createdAt);
    const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());

    if (taskDay.getTime() === today.getTime()) {
      todayTasks.push(task);
    } else if (taskDay.getTime() === yesterday.getTime()) {
      yesterdayTasks.push(task);
    } else {
      olderTasks.push(task);
    }
  });

  const groups: { label: string; tasks: Task[] }[] = [];
  if (todayTasks.length > 0) groups.push({ label: 'Today', tasks: todayTasks });
  if (yesterdayTasks.length > 0) groups.push({ label: 'Yesterday', tasks: yesterdayTasks });
  if (olderTasks.length > 0) groups.push({ label: 'Older', tasks: olderTasks });

  return groups;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { projects, setCurrentProject, setCurrentTask, addTask } = useStore();

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
      projects.forEach(p => {
        const stored = localStorage.getItem(`swarmkit-tasks-${p.id}`);
        if (stored) {
          loadedTasks.push(...JSON.parse(stored));
        }
      });

      // Sort by date descending
      loadedTasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setAllTasks(loadedTasks);
      setQuery('');
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, projects]);

  // Filter results based on query
  const filteredProjects = query
    ? projects.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  const filteredTasks = query
    ? allTasks.filter(t =>
        t.title?.toLowerCase().includes(query.toLowerCase()) ||
        t.prompt?.toLowerCase().includes(query.toLowerCase())
      )
    : allTasks.slice(0, 8);

  // Build flat results list for keyboard navigation
  // Index 0 is always "New task"
  const taskGroups = groupTasksByDate(filteredTasks);
  let flatResults: { type: 'new' | 'project' | 'task'; data?: Project | Task }[] = [{ type: 'new' }];

  filteredProjects.forEach(p => flatResults.push({ type: 'project', data: p }));
  taskGroups.forEach(group => {
    group.tasks.forEach(t => flatResults.push({ type: 'task', data: t }));
  });

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        selectResult(flatResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [flatResults, selectedIndex, onClose]);

  const createNewTask = () => {
    setCurrentProject(null);
    setCurrentTask(null);
    router.push('/');
    onClose();
  };

  const selectResult = (result: typeof flatResults[0]) => {
    if (result.type === 'new') {
      createNewTask();
    } else if (result.type === 'project') {
      const project = result.data as Project;
      setCurrentProject(project);
      setCurrentTask(null);
      router.push(`/${project.id}`);
      onClose();
    } else {
      const task = result.data as Task;
      const taskProjectId = task.projectId || (task as unknown as { workspaceId?: string }).workspaceId || 'standalone';
      if (taskProjectId === 'standalone') {
        setCurrentProject(null);
        setCurrentTask(task);
        router.push(`/task/${task.id}`);
      } else {
        const project = projects.find(p => p.id === taskProjectId);
        if (project) {
          setCurrentProject(project);
        }
        setCurrentTask(task);
        router.push(`/${taskProjectId}`);
      }
      onClose();
    }
  };

  // Get the last assistant message as preview
  const getTaskPreview = (task: Task): string => {
    const assistantMessages = task.messages?.filter(m => m.role === 'assistant') || [];
    if (assistantMessages.length > 0) {
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      return lastMessage.content.slice(0, 100) + (lastMessage.content.length > 100 ? '...' : '');
    }
    return task.prompt?.slice(0, 100) || '';
  };

  if (!isOpen) return null;

  // Calculate current index for each item
  let currentFlatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pb-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#2f2f2f] border border-[#4a4a4a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-border-subtle">
          <IconSearch size={22} className="text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks..."
            className="flex-1 bg-transparent text-[17px] text-text-primary placeholder:text-text-quaternary focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {/* New task option */}
          <button
            onClick={createNewTask}
            className={cn(
              "flex items-center gap-4 w-full px-4 py-3 text-left transition-colors rounded-xl",
              selectedIndex === 0 ? "bg-[#2a2a2a]" : "hover:bg-[#2a2a2a]"
            )}
          >
            <div className="w-10 h-10 rounded-full bg-[#3a3a3a] flex items-center justify-center shrink-0">
              <IconPlus size={20} className="text-text-secondary" />
            </div>
            <span className="text-[15px] font-medium text-text-primary">New task</span>
          </button>

          {/* Projects section */}
          {filteredProjects.length > 0 && (
            <>
              <div className="px-4 py-2">
                <span className="text-[13px] text-text-quaternary">Projects</span>
              </div>
              {filteredProjects.map((project) => {
                currentFlatIndex++;
                const index = currentFlatIndex;
                return (
                  <button
                    key={project.id}
                    onClick={() => selectResult({ type: 'project', data: project })}
                    className={cn(
                      "flex items-center gap-4 w-full px-4 py-3 text-left transition-colors rounded-xl",
                      selectedIndex === index ? "bg-[#2a2a2a]" : "hover:bg-[#2a2a2a]"
                    )}
                  >
                    <ProjectIcon />
                    <span className="text-[15px] font-medium text-text-primary">{project.name}</span>
                  </button>
                );
              })}
            </>
          )}

          {/* Tasks grouped by date */}
          {taskGroups.map((group) => (
            <div key={group.label}>
              <div className="px-4 py-2">
                <span className="text-[13px] text-text-quaternary">{group.label}</span>
              </div>
              {group.tasks.map((task) => {
                currentFlatIndex++;
                const index = currentFlatIndex;
                const taskProjectId = task.projectId || (task as unknown as { workspaceId?: string }).workspaceId || 'standalone';
                return (
                  <button
                    key={task.id}
                    onClick={() => selectResult({ type: 'task', data: task })}
                    className={cn(
                      "flex items-center gap-4 w-full px-4 py-3 text-left transition-colors rounded-xl",
                      selectedIndex === index ? "bg-[#2a2a2a]" : "hover:bg-[#2a2a2a]"
                    )}
                  >
                    <TaskIcon />
                    <div className="flex-1 min-w-0">
                      <span className="text-[15px] font-medium text-text-primary block truncate">
                        {task.title || 'Untitled task'}
                      </span>
                      <span className="text-[13px] text-text-tertiary block truncate mt-0.5">
                        {getTaskPreview(task)}
                      </span>
                    </div>
                    <span className="text-[13px] text-text-quaternary shrink-0">
                      {formatTaskDate(task.createdAt)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}

          {/* Empty state */}
          {query && filteredProjects.length === 0 && filteredTasks.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-[14px] text-text-tertiary">No results found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
