'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/workspace/sidebar';
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

  const [loading, setLoading] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'files' | 'artifacts' | 'browser'>('browser');

  useEffect(() => {
    const loadProject = async () => {
      // Load projects from localStorage
      const storedProjects = localStorage.getItem('swarmkit-projects');
      if (storedProjects) {
        const parsed: Project[] = JSON.parse(storedProjects);
        setProjects(parsed);

        const project = parsed.find((p) => p.id === projectId);
        if (project) {
          setCurrentProject(project);
        } else {
          router.push('/');
          return;
        }
      } else {
        router.push('/');
        return;
      }

      // Fetch project tasks from API
      try {
        const response = await fetch(`/api/tasks?projectId=${projectId}`);
        if (response.ok) {
          const projectTasks: Task[] = await response.json();
          setTasks(projectTasks);
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error('Error fetching project tasks:', error);
        setTasks([]);
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
      <div className="flex h-screen items-center justify-center bg-bg-base">
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
    <div className="flex h-screen bg-bg-base">
      <Sidebar />

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

        {/* Right Panel with tabs - 50% width */}
        {rightPanelOpen && (
          <div className="w-1/2 flex flex-col overflow-hidden">
            <RightPanelTabs
              project={currentProject}
              task={currentTask}
              onClose={() => setRightPanelOpen(false)}
              defaultTab={defaultTab}
            />
          </div>
        )}
      </div>
    </div>
  );
}
