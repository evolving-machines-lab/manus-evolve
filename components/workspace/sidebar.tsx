'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  IconLogo,
  IconFolder,
  IconFolderPlus,
  IconPlus,
  IconSearch,
  IconPlug,
  IconChevronRight,
  IconSettings,
  IconGrid,
  IconPhone,
  IconDesktop,
  IconPanelRight,
  IconMoreHorizontal,
  IconEdit,
  IconTrash,
} from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Task, Workspace } from '@/lib/types';

// Dropdown menu component
function DropdownMenu({
  isOpen,
  onClose,
  items,
  position = 'right'
}: {
  isOpen: boolean;
  onClose: () => void;
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];
  position?: 'left' | 'right';
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute top-full mt-1 z-50 min-w-[140px] p-1.5 rounded-xl border border-border-subtle bg-bg-surface shadow-lg",
        position === 'right' ? 'right-0' : 'left-0'
      )}
    >
      {items.map((item, i) => (
        <button
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-[14px] rounded-lg hover:bg-bg-overlay transition-colors",
            item.danger ? "text-red-400" : "text-text-primary"
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

// Chat bubble icon for tasks (filled)
function TaskIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-tertiary shrink-0">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    workspaces,
    setWorkspaces,
    currentWorkspace,
    tasks,
    currentTask,
    setCurrentTask,
    setCurrentWorkspace,
    setTasks,
    expandedProjects,
    toggleProjectExpanded,
    setProjectExpanded,
    sidebarCollapsed,
    toggleSidebar,
  } = useStore();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  const [tasksCollapsed, setTasksCollapsed] = useState(false);

  // Delete a workspace and its tasks
  const deleteWorkspace = (workspaceId: string) => {
    const updated = workspaces.filter(w => w.id !== workspaceId);
    setWorkspaces(updated);
    localStorage.setItem('swarmkit-workspaces', JSON.stringify(updated));
    localStorage.removeItem(`swarmkit-tasks-${workspaceId}`);
    if (currentWorkspace?.id === workspaceId) {
      setCurrentWorkspace(null);
      setCurrentTask(null);
      router.push('/');
    }
  };

  // Delete a task
  const deleteTask = (task: Task) => {
    const storageKey = task.workspaceId === 'standalone'
      ? 'swarmkit-tasks-standalone'
      : `swarmkit-tasks-${task.workspaceId}`;

    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const taskList = JSON.parse(stored) as Task[];
      const updated = taskList.filter(t => t.id !== task.id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      if (task.workspaceId === currentWorkspace?.id) {
        setTasks(updated);
      }
      if (currentTask?.id === task.id) {
        setCurrentTask(null);
      }
      setAllTasks(prev => prev.filter(t => t.id !== task.id));
    }
  };

  // Load all tasks from all workspaces + standalone tasks
  useEffect(() => {
    const loadedTasks: Task[] = [];

    // Load standalone tasks (tasks without a project)
    const standaloneTasks = localStorage.getItem('swarmkit-tasks-standalone');
    if (standaloneTasks) {
      const parsed = JSON.parse(standaloneTasks) as Task[];
      loadedTasks.push(...parsed);
    }

    // Load tasks from each workspace
    workspaces.forEach(ws => {
      const stored = localStorage.getItem(`swarmkit-tasks-${ws.id}`);
      if (stored) {
        const wsTasks = JSON.parse(stored) as Task[];
        loadedTasks.push(...wsTasks);
      }
    });
    setAllTasks(loadedTasks);
  }, [workspaces, tasks]);

  // Load tasks for current workspace
  useEffect(() => {
    if (currentWorkspace) {
      const stored = localStorage.getItem(`swarmkit-tasks-${currentWorkspace.id}`);
      if (stored) {
        setTasks(JSON.parse(stored));
      }
    }
  }, [currentWorkspace, setTasks]);

  // Get tasks for a specific project
  const getProjectTasks = (workspaceId: string) => {
    return allTasks.filter(t => t.workspaceId === workspaceId);
  };

  // Open a specific task
  const openTask = (task: Task) => {
    if (task.workspaceId === 'standalone') {
      // Standalone task - no project
      setCurrentWorkspace(null);
      setCurrentTask(task);
      router.push(`/task/${task.id}`);
    } else {
      // Task belongs to a project
      const workspace = workspaces.find(w => w.id === task.workspaceId);
      if (workspace) {
        setCurrentWorkspace(workspace);
      }
      setCurrentTask(task);
      router.push(`/${task.workspaceId}`);
    }
  };

  // Handle clicking on a project row
  const handleProjectClick = (workspace: Workspace) => {
    const isCurrentProject = currentWorkspace?.id === workspace.id;

    if (isCurrentProject && currentTask) {
      // Inside a task of this project - start new chat (clear task)
      setCurrentTask(null);
      router.push(`/${workspace.id}`);
    } else if (isCurrentProject) {
      // Already in this project with no task - toggle expand/collapse
      toggleProjectExpanded(workspace.id);
    } else {
      // Different project - navigate to it (new chat)
      setCurrentWorkspace(workspace);
      setCurrentTask(null);
      setProjectExpanded(workspace.id, true);
      router.push(`/${workspace.id}`);
    }
  };

  // Start new standalone task (no project)
  const newStandaloneTask = () => {
    setCurrentWorkspace(null);
    setCurrentTask(null);
    router.push('/');
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-bg-base border-r border-border-subtle transition-all duration-200",
        sidebarCollapsed ? "w-[68px]" : "w-[300px]"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center h-14",
        sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <IconLogo size={22} className="text-text-secondary" />
            <span className="font-medium text-[16px] text-text-primary">
              Async
            </span>
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2.5 text-text-primary hover:bg-[#2a2a2a] rounded-xl transition-colors"
        >
          <IconPanelRight size={18} className={cn(sidebarCollapsed && "rotate-180")} />
        </button>
      </div>

      {/* Main Navigation */}
      <div className={cn("py-2 space-y-0.5", sidebarCollapsed ? "px-2" : "px-2")}>
        <button
          onClick={newStandaloneTask}
          className={cn(
            "flex items-center w-full rounded-xl text-text-primary hover:bg-[#2a2a2a] transition-all",
            sidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
          )}
          title={sidebarCollapsed ? "New task" : undefined}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          {!sidebarCollapsed && <span className="text-[15px]">New task</span>}
        </button>
        <button
          className={cn(
            "flex items-center w-full rounded-xl text-text-primary hover:bg-[#2a2a2a] transition-all group",
            sidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
          )}
          title={sidebarCollapsed ? "Search" : undefined}
        >
          <div className={cn("flex items-center", !sidebarCollapsed && "gap-3")}>
            <IconSearch size={18} className="shrink-0" />
            {!sidebarCollapsed && <span className="text-[15px]">Search</span>}
          </div>
          {!sidebarCollapsed && (
            <span className="text-[12px] text-text-quaternary opacity-0 group-hover:opacity-100 transition-opacity">⌘ K</span>
          )}
        </button>
        <Link
          href="/settings"
          className={cn(
            "flex items-center w-full rounded-xl text-text-primary hover:bg-[#2a2a2a] transition-all",
            sidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
            pathname === '/settings' && 'bg-[#2a2a2a]'
          )}
          title={sidebarCollapsed ? "Integrations" : undefined}
        >
          <IconPlug size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="text-[15px]">Integrations</span>}
        </Link>
      </div>

      {/* Projects Section */}
      {!sidebarCollapsed && (
      <div className="px-2 mt-4">
        {/* Section header */}
        <div
          onClick={() => setProjectsCollapsed(!projectsCollapsed)}
          className="group flex items-center px-3 py-2.5 rounded-xl hover:bg-[#2a2a2a] transition-all cursor-pointer"
        >
          <span className="text-[14px] text-text-tertiary leading-none">Projects</span>
          <IconChevronRight
            size={16}
            className={cn(
              "text-text-tertiary transition-transform duration-150 ml-1 shrink-0",
              !projectsCollapsed && "rotate-90"
            )}
          />
          <div className="flex-1" />
          <Link
            href="/new"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 -mr-1 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-[#3a3a3a] transition-all opacity-0 group-hover:opacity-100"
          >
            <IconPlus size={16} />
          </Link>
        </div>

        {/* Projects list */}
        {!projectsCollapsed && (
          <nav className="space-y-0.5 mt-1">
            {workspaces.length === 0 ? (
              <Link
                href="/new"
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-text-secondary hover:bg-[#2a2a2a] hover:text-text-primary transition-all"
              >
                <IconFolderPlus size={18} />
                <span className="text-[15px]">New project</span>
              </Link>
            ) : (
              workspaces.map((workspace) => {
                const isExpanded = expandedProjects.has(workspace.id);
                const projectTasks = getProjectTasks(workspace.id);
                const isCurrentProject = currentWorkspace?.id === workspace.id;

                return (
                  <div key={workspace.id}>
                    {/* Project row */}
                    <div
                      onClick={() => handleProjectClick(workspace)}
                      className={cn(
                        "relative group flex items-center w-full px-3 py-2.5 rounded-xl transition-all cursor-pointer",
                        isCurrentProject && !currentTask ? "bg-[#2a2a2a]" : "hover:bg-[#2a2a2a]"
                      )}
                    >
                      {/* Folder icon (default) / Chevron (on hover) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProjectExpanded(workspace.id);
                        }}
                        className="p-1 -ml-1 mr-1 rounded hover:bg-[#3a3a3a] transition-colors"
                      >
                        {/* Folder icon - visible by default, hidden on hover */}
                        <IconFolder size={18} className="text-text-tertiary block group-hover:hidden shrink-0" />
                        {/* Chevron - hidden by default, visible on hover */}
                        <IconChevronRight
                          size={18}
                          className={cn(
                            "text-text-tertiary transition-transform duration-150 hidden group-hover:block shrink-0",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </button>

                      {/* Project name */}
                      <span className="text-[14px] text-text-primary truncate flex-1">
                        {workspace.name}
                      </span>

                      {/* 3-dot menu */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenu(openMenu === `project-${workspace.id}` ? null : `project-${workspace.id}`);
                        }}
                        className="p-1.5 rounded-lg text-text-primary hover:bg-[#3a3a3a] opacity-0 group-hover:opacity-100 transition-all ml-1"
                      >
                        <IconMoreHorizontal size={14} />
                      </button>

                      <DropdownMenu
                        isOpen={openMenu === `project-${workspace.id}`}
                        onClose={() => setOpenMenu(null)}
                        items={[
                          {
                            label: 'Rename',
                            icon: <IconEdit size={16} />,
                            onClick: () => {/* TODO */}
                          },
                          {
                            label: 'Delete',
                            icon: <IconTrash size={16} />,
                            onClick: () => deleteWorkspace(workspace.id),
                            danger: true
                          }
                        ]}
                      />
                    </div>

                    {/* Tasks under this project */}
                    {isExpanded && projectTasks.length > 0 && (
                      <div className="ml-6 space-y-0.5 mt-0.5">
                        {projectTasks.map((task) => {
                          const isActive = currentTask?.id === task.id;
                          return (
                            <div
                              key={task.id}
                              onClick={() => openTask(task)}
                              className={cn(
                                "relative group flex items-center gap-2 w-full px-3 py-2 rounded-xl transition-all cursor-pointer",
                                isActive
                                  ? 'bg-[#3a3a3a] text-text-primary'
                                  : 'text-text-secondary hover:bg-[#2a2a2a] hover:text-text-primary'
                              )}
                            >
                              <TaskIcon />
                              <span className="text-[13px] truncate flex-1">
                                {task.title || 'Untitled task'}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenu(openMenu === `task-${task.id}` ? null : `task-${task.id}`);
                                }}
                                className="p-1.5 rounded-lg text-text-primary hover:bg-[#3a3a3a] opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <IconMoreHorizontal size={14} />
                              </button>
                              <DropdownMenu
                                isOpen={openMenu === `task-${task.id}`}
                                onClose={() => setOpenMenu(null)}
                                position="right"
                                items={[
                                  {
                                    label: 'Rename',
                                    icon: <IconEdit size={16} />,
                                    onClick: () => {/* TODO */}
                                  },
                                  {
                                    label: 'Delete',
                                    icon: <IconTrash size={16} />,
                                    onClick: () => deleteTask(task),
                                    danger: true
                                  }
                                ]}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </nav>
        )}
      </div>
      )}

      {/* All Tasks Section */}
      {!sidebarCollapsed && (
      <div className="px-2 mt-4 flex-1 overflow-hidden flex flex-col">
        {/* Section header */}
        <div
          onClick={() => setTasksCollapsed(!tasksCollapsed)}
          className="group flex items-center px-3 py-2.5 rounded-xl hover:bg-[#2a2a2a] transition-all cursor-pointer"
        >
          <span className="text-[14px] text-text-tertiary leading-none">All tasks</span>
          <IconChevronRight
            size={16}
            className={cn(
              "text-text-tertiary transition-transform duration-150 ml-1 shrink-0",
              !tasksCollapsed && "rotate-90"
            )}
          />
          <div className="flex-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              newStandaloneTask();
            }}
            className="p-1.5 -mr-1 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-[#3a3a3a] transition-all opacity-0 group-hover:opacity-100"
          >
            <IconPlus size={16} />
          </button>
        </div>

        {/* All tasks list */}
        {!tasksCollapsed && (
          <nav className="flex-1 overflow-y-auto space-y-0.5 mt-1">
            {allTasks.length === 0 ? null : (
              [...allTasks].reverse().map((task) => {
                const isActive = currentTask?.id === task.id;
                return (
                  <div
                    key={task.id}
                    onClick={() => openTask(task)}
                    className={cn(
                      "relative group flex items-center gap-2 w-full px-3 py-2.5 rounded-xl transition-all cursor-pointer",
                      isActive
                        ? 'bg-[#3a3a3a] text-text-primary'
                        : 'text-text-secondary hover:bg-[#2a2a2a] hover:text-text-primary'
                    )}
                  >
                    <TaskIcon />
                    <span className="text-[14px] truncate flex-1">
                      {task.title || 'Untitled task'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(openMenu === `alltask-${task.id}` ? null : `alltask-${task.id}`);
                      }}
                      className="p-1.5 rounded-lg text-text-primary hover:bg-[#3a3a3a] opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <IconMoreHorizontal size={14} />
                    </button>
                    <DropdownMenu
                      isOpen={openMenu === `alltask-${task.id}`}
                      onClose={() => setOpenMenu(null)}
                      items={[
                        {
                          label: 'Rename',
                          icon: <IconEdit size={16} />,
                          onClick: () => {/* TODO */}
                        },
                        {
                          label: 'Delete',
                          icon: <IconTrash size={16} />,
                          onClick: () => deleteTask(task),
                          danger: true
                        }
                      ]}
                    />
                  </div>
                );
              })
            )}
          </nav>
        )}
      </div>
      )}

      {/* Bottom Section */}
      <div className={cn("p-3 space-y-3", sidebarCollapsed && "mt-auto")}>
        {/* Share card - hide when collapsed */}
        {!sidebarCollapsed && (
          <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-bg-surface hover:bg-bg-overlay transition-colors text-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-tertiary">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            <div className="flex-1">
              <p className="text-[14px] text-text-primary">Share Async</p>
              <p className="text-[12px] text-text-tertiary">Invite a friend</p>
            </div>
            <IconChevronRight size={18} className="text-text-quaternary" />
          </button>
        )}

        {/* Bottom icons */}
        <div className={cn(
          "flex items-center",
          sidebarCollapsed ? "flex-col gap-1" : "justify-between px-2"
        )}>
          <button className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-[#2a2a2a] rounded-lg transition-colors">
            <IconSettings size={18} />
          </button>
          <button className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-[#2a2a2a] rounded-lg transition-colors">
            <IconGrid size={18} />
          </button>
          <button className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-[#2a2a2a] rounded-lg transition-colors">
            <IconPhone size={18} />
          </button>
          <button className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-[#2a2a2a] rounded-lg transition-colors">
            <IconDesktop size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
