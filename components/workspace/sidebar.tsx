'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import { SearchModal } from '@/components/search-modal';
import type { Task, Project } from '@/lib/types';

// Dropdown menu component using portal for proper positioning
function DropdownMenu({
  isOpen,
  onClose,
  items,
  anchorEl
}: {
  isOpen: boolean;
  onClose: () => void;
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];
  anchorEl: HTMLElement | null;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.right - 140 // menu width is ~140px, align to right edge
      });
    }
  }, [isOpen, anchorEl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          anchorEl && !anchorEl.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorEl]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: position.top, left: position.left }}
      className="fixed z-[100] min-w-[140px] p-1.5 rounded-xl border border-border-subtle bg-bg-surface shadow-lg"
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
    </div>,
    document.body
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
    projects,
    setProjects,
    currentProject,
    tasks,
    currentTask,
    setCurrentTask,
    setCurrentProject,
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);

  // Global keyboard shortcut for search (⌘K) - toggles
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Delete a project and its tasks
  const deleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state
        const updated = projects.filter(w => w.id !== projectId);
        setProjects(updated);
        setAllTasks(prev => prev.filter(t => t.projectId !== projectId));

        if (currentProject?.id === projectId) {
          setCurrentProject(null);
          setCurrentTask(null);
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  // Delete a task
  const deleteTask = async (task: Task) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state
        setAllTasks(prev => prev.filter(t => t.id !== task.id));

        const wasCurrentTask = currentTask?.id === task.id;
        if (wasCurrentTask) {
          setCurrentTask(null);
          const taskProjectId = task.projectId || 'standalone';
          if (taskProjectId === 'standalone') {
            router.push('/');
          } else {
            router.push(`/${taskProjectId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // Start editing a project name
  const startEditProject = (project: Project) => {
    setEditingId(`project-${project.id}`);
    setEditValue(project.name);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  // Start editing a task title
  const startEditTask = (task: Task) => {
    setEditingId(`task-${task.id}`);
    setEditValue(task.title || 'Untitled task');
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  // Save project rename
  const saveProjectRename = async (projectId: string) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }

    const newName = editValue.trim();

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });

      if (response.ok) {
        // Update local state
        const updated = projects.map(w =>
          w.id === projectId ? { ...w, name: newName } : w
        );
        setProjects(updated);

        // Update current project if it's the one being renamed
        if (currentProject?.id === projectId) {
          setCurrentProject({ ...currentProject, name: newName });
        }
      }
    } catch (error) {
      console.error('Error renaming project:', error);
    }

    setEditingId(null);
  };

  // Save task rename
  const saveTaskRename = async (task: Task) => {
    if (!editValue.trim()) {
      setEditingId(null);
      return;
    }

    const newTitle = editValue.trim();

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        // Update allTasks state
        setAllTasks(prev => prev.map(t =>
          t.id === task.id ? { ...t, title: newTitle } : t
        ));

        // Update current task if it's the one being renamed
        if (currentTask?.id === task.id) {
          setCurrentTask({ ...currentTask, title: newTitle });
        }
      }
    } catch (error) {
      console.error('Error renaming task:', error);
    }

    setEditingId(null);
  };

  // Handle edit input keydown
  const handleEditKeyDown = (e: React.KeyboardEvent, type: 'project' | 'task', item: Project | Task) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (type === 'project') {
        saveProjectRename((item as Project).id);
      } else {
        saveTaskRename(item as Task);
      }
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  // Load projects from API on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const apiProjects = await response.json();
          setProjects(apiProjects);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, [setProjects]);

  // Load all tasks from API on mount and when currentTask changes (e.g., after task creation)
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        // Fetch ALL tasks (both standalone and project tasks)
        const response = await fetch('/api/tasks?showAll=true');
        if (response.ok) {
          const apiTasks = await response.json();
          setAllTasks(apiTasks);
        }
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };

    fetchTasks();
  }, [currentTask?.id]); // Re-fetch when current task changes (after creation/selection)

  // Get tasks for a specific project
  const getProjectTasks = (projectId: string) => {
    return allTasks.filter(t => t.projectId === projectId);
  };

  // Open a specific task
  const openTask = (task: Task) => {
    if (task.projectId === 'standalone') {
      // Standalone task - no project
      setCurrentProject(null);
      setCurrentTask(task);
      router.push(`/task/${task.id}`);
    } else {
      // Task belongs to a project
      const project = projects.find(w => w.id === task.projectId);
      if (project) {
        setCurrentProject(project);
      }
      setCurrentTask(task);
      router.push(`/${task.projectId}`);
    }
  };

  // Handle clicking on a project row
  const handleProjectClick = (project: Project) => {
    const isCurrentProject = currentProject?.id === project.id;

    if (isCurrentProject && currentTask) {
      // Inside a task of this project - start new chat (clear task)
      setCurrentTask(null);
      router.push(`/${project.id}`);
    } else if (isCurrentProject) {
      // Already in this project with no task - toggle expand/collapse
      toggleProjectExpanded(project.id);
    } else {
      // Different project - navigate to it (new chat)
      setCurrentProject(project);
      setCurrentTask(null);
      setProjectExpanded(project.id, true);
      router.push(`/${project.id}`);
    }
  };

  // Start new standalone task (no project)
  const newStandaloneTask = () => {
    setCurrentProject(null);
    setCurrentTask(null);
    router.push('/');
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-bg-base border-r border-border-subtle transition-[width] duration-300 ease-out",
        sidebarCollapsed ? "w-[68px]" : "w-[300px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center h-14 px-4 overflow-hidden">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 transition-all duration-300 ease-out",
            sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}
        >
          <IconLogo size={22} className="text-text-secondary shrink-0" />
          <span className="font-medium text-[16px] text-text-primary whitespace-nowrap">
            Manus Evolve
          </span>
        </Link>
        <div className="flex-1" />
        <button
          onClick={toggleSidebar}
          className="p-2.5 text-text-primary hover:bg-[#2a2a2a] rounded-xl transition-colors shrink-0"
        >
          <IconPanelRight size={18} className={cn("transition-transform duration-300", sidebarCollapsed && "rotate-180")} />
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
          onClick={() => setSearchOpen(true)}
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
          href="/board"
          className={cn(
            "flex items-center w-full rounded-xl text-text-primary hover:bg-[#2a2a2a] transition-all",
            sidebarCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
            pathname === '/board' && 'bg-[#2a2a2a]'
          )}
          title={sidebarCollapsed ? "Board" : undefined}
        >
          <IconGrid size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="text-[15px]">Board</span>}
        </Link>
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
          <span className="text-[14px] font-medium text-text-tertiary">Projects</span>
          <IconChevronRight
            size={16}
            className={cn(
              "text-text-tertiary transition-transform duration-150 ml-0.5 shrink-0 mt-[2px]",
              !projectsCollapsed && "rotate-90"
            )}
          />
          <div className="flex-1" />
          <Link
            href="/new"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 -mr-1 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-[#3a3a3a] transition-all"
          >
            <IconPlus size={16} />
          </Link>
        </div>

        {/* Projects list */}
        <div className={cn(
          "grid transition-all duration-200 ease-out",
          projectsCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        )}>
          <nav className="space-y-0.5 mt-1 overflow-hidden">
            {projects.length === 0 ? (
              <Link
                href="/new"
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-text-secondary hover:bg-[#2a2a2a] hover:text-text-primary transition-all"
              >
                <IconFolderPlus size={18} />
                <span className="text-[15px]">New project</span>
              </Link>
            ) : (
              projects.map((project) => {
                const isExpanded = expandedProjects.has(project.id);
                const projectTasks = getProjectTasks(project.id);
                const isCurrentProject = currentProject?.id === project.id;

                return (
                  <div key={project.id}>
                    {/* Project row */}
                    <div
                      onClick={() => handleProjectClick(project)}
                      className={cn(
                        "relative group flex items-center w-full px-3 py-2.5 rounded-xl transition-all cursor-pointer",
                        isCurrentProject && !currentTask ? "bg-[#2a2a2a]" : "hover:bg-[#2a2a2a]"
                      )}
                    >
                      {/* Folder icon (default) / Chevron (on hover) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProjectExpanded(project.id);
                        }}
                        className="p-1 -ml-1 mr-1 rounded hover:bg-[#3a3a3a] transition-colors"
                      >
                        {/* Folder icon - visible by default, hidden on hover */}
                        <IconFolder size={16} className="text-text-tertiary block group-hover:hidden shrink-0" />
                        {/* Chevron - hidden by default, visible on hover */}
                        <IconChevronRight
                          size={16}
                          className={cn(
                            "text-text-tertiary transition-transform duration-150 hidden group-hover:block shrink-0",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </button>

                      {/* Project name */}
                      {editingId === `project-${project.id}` ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, 'project', project)}
                          onBlur={() => saveProjectRename(project.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 text-[14px] text-text-primary bg-transparent border-b border-accent focus:outline-none"
                        />
                      ) : (
                        <span className="text-[14px] text-text-primary truncate flex-1">
                          {project.name}
                        </span>
                      )}

                      {/* 3-dot menu */}
                      {editingId !== `project-${project.id}` && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenu === `project-${project.id}`) {
                              setOpenMenu(null);
                              setMenuAnchorEl(null);
                            } else {
                              setOpenMenu(`project-${project.id}`);
                              setMenuAnchorEl(e.currentTarget);
                            }
                          }}
                          className={cn(
                            "p-1.5 rounded-lg text-text-primary hover:bg-[#3a3a3a] transition-all ml-1",
                            openMenu === `project-${project.id}` ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )}
                        >
                          <IconMoreHorizontal size={14} />
                        </button>
                      )}

                      <DropdownMenu
                        isOpen={openMenu === `project-${project.id}`}
                        onClose={() => { setOpenMenu(null); setMenuAnchorEl(null); }}
                        anchorEl={menuAnchorEl}
                        items={[
                          {
                            label: 'Rename',
                            icon: <IconEdit size={16} />,
                            onClick: () => startEditProject(project)
                          },
                          {
                            label: 'Delete',
                            icon: <IconTrash size={16} />,
                            onClick: () => deleteProject(project.id),
                            danger: true
                          }
                        ]}
                      />
                    </div>

                    {/* Tasks under this project */}
                    {projectTasks.length > 0 && (
                      <div className={cn(
                        "grid transition-all duration-200 ease-out ml-6",
                        !isExpanded ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
                      )}>
                        <div className="space-y-0.5 mt-0.5 overflow-hidden">
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
                                {editingId === `task-${task.id}` ? (
                                  <input
                                    ref={editInputRef}
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => handleEditKeyDown(e, 'task', task)}
                                    onBlur={() => saveTaskRename(task)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex-1 text-[13px] text-text-primary bg-transparent border-b border-accent focus:outline-none"
                                  />
                                ) : (
                                  <span className="text-[13px] truncate flex-1">
                                    {task.title || 'Untitled task'}
                                  </span>
                                )}
                                {editingId !== `task-${task.id}` && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (openMenu === `task-${task.id}`) {
                                        setOpenMenu(null);
                                        setMenuAnchorEl(null);
                                      } else {
                                        setOpenMenu(`task-${task.id}`);
                                        setMenuAnchorEl(e.currentTarget);
                                      }
                                    }}
                                    className={cn(
                                      "p-1.5 rounded-lg text-text-primary transition-all",
                                      isActive ? "hover:bg-[#4a4a4a]" : "hover:bg-[#3a3a3a]",
                                      openMenu === `task-${task.id}` ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                    )}
                                  >
                                    <IconMoreHorizontal size={14} />
                                  </button>
                                )}
                                <DropdownMenu
                                  isOpen={openMenu === `task-${task.id}`}
                                  onClose={() => { setOpenMenu(null); setMenuAnchorEl(null); }}
                                  anchorEl={menuAnchorEl}
                                  items={[
                                    {
                                      label: 'Rename',
                                      icon: <IconEdit size={16} />,
                                      onClick: () => startEditTask(task)
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
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </nav>
        </div>
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
          <span className="text-[14px] font-medium text-text-tertiary">All tasks</span>
          <IconChevronRight
            size={16}
            className={cn(
              "text-text-tertiary transition-transform duration-150 ml-0.5 shrink-0 mt-[2px]",
              !tasksCollapsed && "rotate-90"
            )}
          />
          <div className="flex-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              newStandaloneTask();
            }}
            className="p-1.5 -mr-1 rounded-lg text-text-tertiary hover:text-text-secondary hover:bg-[#3a3a3a] transition-all"
          >
            <IconPlus size={16} />
          </button>
        </div>

        {/* All tasks list */}
        <div className={cn(
          "grid transition-all duration-200 ease-out flex-1",
          tasksCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
        )}>
          <nav className="overflow-y-auto space-y-0.5 mt-1 overflow-hidden">
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
                    {editingId === `task-${task.id}` ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleEditKeyDown(e, 'task', task)}
                        onBlur={() => saveTaskRename(task)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-[14px] text-text-primary bg-transparent border-b border-accent focus:outline-none"
                      />
                    ) : (
                      <span className="text-[14px] truncate flex-1">
                        {task.title || 'Untitled task'}
                      </span>
                    )}
                    {editingId !== `task-${task.id}` && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openMenu === `alltask-${task.id}`) {
                            setOpenMenu(null);
                            setMenuAnchorEl(null);
                          } else {
                            setOpenMenu(`alltask-${task.id}`);
                            setMenuAnchorEl(e.currentTarget);
                          }
                        }}
                        className={cn(
                          "p-1.5 rounded-lg text-text-primary transition-all",
                          isActive ? "hover:bg-[#4a4a4a]" : "hover:bg-[#3a3a3a]",
                          openMenu === `alltask-${task.id}` ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <IconMoreHorizontal size={14} />
                      </button>
                    )}
                    <DropdownMenu
                      isOpen={openMenu === `alltask-${task.id}`}
                      onClose={() => { setOpenMenu(null); setMenuAnchorEl(null); }}
                      anchorEl={menuAnchorEl}
                      items={[
                        {
                          label: 'Rename',
                          icon: <IconEdit size={16} />,
                          onClick: () => startEditTask(task)
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
        </div>
      </div>
      )}

      {/* Bottom Section */}
      <div className={cn("p-3 space-y-3", sidebarCollapsed && "mt-auto")}>
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

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </aside>
  );
}
