'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TaskView } from '@/components/task/task-view';
import { RightPanelTabs } from '@/components/workspace/right-panel-tabs';
import { IconSpinner } from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import type { Project, Task } from '@/lib/types';

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.workspaceId as string;

  const {
    projects,
    setProjects,
    currentProject,
    setCurrentProject,
    tasks,
    setTasks,
    currentTask,
    setCurrentTask,
  } = useStore();

  // Check if we already have this project in the store
  const hasProjectInStore = currentProject?.id === projectId;

  const [loading, setLoading] = useState(!hasProjectInStore);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'files' | 'artifacts' | 'browser'>('browser');

  useEffect(() => {
    const loadProject = async () => {
      try {
        // Load projects from API
        const projectsResponse = await fetch('/api/projects');
        if (!projectsResponse.ok) {
          router.push('/');
          return;
        }

        const apiProjects: Project[] = await projectsResponse.json();
        setProjects(apiProjects);

        const project = apiProjects.find((p) => p.id === projectId);
        if (project) {
          setCurrentProject(project);
        } else {
          router.push('/');
          return;
        }

        // Fetch project tasks from API
        const tasksResponse = await fetch(`/api/tasks?projectId=${projectId}`);
        if (tasksResponse.ok) {
          const projectTasks: Task[] = await tasksResponse.json();
          setTasks(projectTasks);
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error('Error loading project:', error);
        router.push('/');
        return;
      }

      setLoading(false);
    };

    loadProject();
  }, [projectId, router, setProjects, setCurrentProject, setTasks]);

  const handleOpenPanel = (tab: 'files' | 'artifacts' | 'browser' = 'browser') => {
    setDefaultTab(tab);
    setRightPanelOpen(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <IconSpinner size={24} className="text-accent" />
          <span className="text-[13px] text-text-tertiary">Loading project...</span>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return null;
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main content area - 50% when right panel is open, full otherwise */}
      <div className={rightPanelOpen ? "w-1/2 flex flex-col overflow-hidden" : "flex-1 flex flex-col overflow-hidden"}>
        <TaskView
          task={currentTask}
          project={currentProject}
          onOpenPanel={handleOpenPanel}
          rightPanelOpen={rightPanelOpen}
        />
      </div>

      {/* Right Panel with tabs - 50% width, always mounted to avoid flicker */}
      <div className={rightPanelOpen ? "w-1/2 flex flex-col overflow-hidden" : "hidden"}>
        <RightPanelTabs
          project={currentProject}
          task={currentTask}
          onClose={() => setRightPanelOpen(false)}
          defaultTab={defaultTab}
        />
      </div>
    </div>
  );
}
