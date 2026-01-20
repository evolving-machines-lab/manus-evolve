import { create } from 'zustand';
import type { AppState, Workspace, Task, Integration } from './types';

export const useStore = create<AppState>((set) => ({
  // Workspaces
  workspaces: [],
  currentWorkspace: null,
  setWorkspaces: (workspaces: Workspace[]) => set({ workspaces }),
  setCurrentWorkspace: (workspace: Workspace | null) => set({ currentWorkspace: workspace }),
  addWorkspace: (workspace: Workspace) =>
    set((state) => ({ workspaces: [...state.workspaces, workspace] })),
  updateWorkspace: (id: string, updates: Partial<Workspace>) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
      ),
      currentWorkspace:
        state.currentWorkspace?.id === id
          ? { ...state.currentWorkspace, ...updates, updatedAt: new Date().toISOString() }
          : state.currentWorkspace,
    })),
  deleteWorkspace: (id: string) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      currentWorkspace: state.currentWorkspace?.id === id ? null : state.currentWorkspace,
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
