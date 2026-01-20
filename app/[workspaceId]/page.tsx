'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/workspace/sidebar';
import { TaskView } from '@/components/task/task-view';
import { RightPanelTabs } from '@/components/workspace/right-panel-tabs';
import { IconSpinner } from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import type { Workspace, Task } from '@/lib/types';

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;

  const {
    workspaces,
    setWorkspaces,
    currentWorkspace,
    setCurrentWorkspace,
    tasks,
    setTasks,
    currentTask,
    setCurrentTask,
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'files' | 'artifacts' | 'browser'>('browser');

  useEffect(() => {
    const storedWorkspaces = localStorage.getItem('swarmkit-workspaces');
    if (storedWorkspaces) {
      const parsed: Workspace[] = JSON.parse(storedWorkspaces);
      setWorkspaces(parsed);

      const workspace = parsed.find((w) => w.id === workspaceId);
      if (workspace) {
        setCurrentWorkspace(workspace);
      } else {
        router.push('/');
        return;
      }
    } else {
      router.push('/');
      return;
    }

    const storedTasks = localStorage.getItem(`swarmkit-tasks-${workspaceId}`);
    if (storedTasks) {
      const parsed: Task[] = JSON.parse(storedTasks);
      setTasks(parsed);
      // Don't auto-select a task - let user click on one or start a new chat
    } else {
      setTasks([]);
    }

    setLoading(false);
  }, [workspaceId, router, setWorkspaces, setCurrentWorkspace, setTasks, setCurrentTask, currentTask]);

  const handleOpenPanel = (tab: 'files' | 'artifacts' | 'browser' = 'browser') => {
    setDefaultTab(tab);
    setRightPanelOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <IconSpinner size={24} className="text-accent" />
          <span className="text-[13px] text-text-tertiary">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
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
            workspace={currentWorkspace}
            onOpenPanel={handleOpenPanel}
            rightPanelOpen={rightPanelOpen}
          />
        </div>

        {/* Right Panel with tabs - 50% width */}
        {rightPanelOpen && (
          <div className="w-1/2 flex flex-col overflow-hidden">
            <RightPanelTabs
              workspace={currentWorkspace}
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
