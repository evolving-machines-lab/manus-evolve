import { create } from 'zustand';
import type { AppState, Project, Task, Integration } from './types';

export const useStore = create<AppState>((set) => ({
  // Projects
  projects: [],
  currentProject: null,
  setProjects: (projects: Project[]) => set({ projects }),
  setCurrentProject: (project: Project | null) => set({ currentProject: project }),
  addProject: (project: Project) =>
    set((state) => ({ projects: [...state.projects, project] })),
  updateProject: (id: string, updates: Partial<Project>) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
      currentProject:
        state.currentProject?.id === id
          ? { ...state.currentProject, ...updates, updatedAt: new Date().toISOString() }
          : state.currentProject,
    })),
  deleteProject: (id: string) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    })),

  // Tasks
  tasks: [],
  currentTask: null,
  setTasks: (tasks: Task[]) => set({ tasks }),
  setCurrentTask: (task: Task | null) => set({ currentTask: task }),
  addTask: (task: Task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id: string, updates: Partial<Task>) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      ),
      currentTask:
        state.currentTask?.id === id
          ? { ...state.currentTask, ...updates, updatedAt: new Date().toISOString() }
          : state.currentTask,
    })),

  // Integrations
  integrations: [],
  setIntegrations: (integrations: Integration[]) => set({ integrations }),

  // UI state
  rightPanelView: 'files',
  setRightPanelView: (view: 'files' | 'artifacts' | 'browser') => set({ rightPanelView: view }),
  rightPanelOpen: false,
  setRightPanelOpen: (open: boolean) => set({ rightPanelOpen: open }),
  expandedProjects: new Set<string>(),
  toggleProjectExpanded: (projectId: string) =>
    set((state) => {
      const next = new Set(state.expandedProjects);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return { expandedProjects: next };
    }),
  setProjectExpanded: (projectId: string, expanded: boolean) =>
    set((state) => {
      const next = new Set(state.expandedProjects);
      if (expanded) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }
      return { expandedProjects: next };
    }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
