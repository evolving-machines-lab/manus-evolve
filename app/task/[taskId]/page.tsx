'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/workspace/sidebar';
import { TaskView } from '@/components/task/task-view';
import { RightPanelTabs } from '@/components/workspace/right-panel-tabs';
import { IconSpinner } from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import type { Task } from '@/lib/types';

export default function StandaloneTaskPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;

  const {
    currentTask,
    setCurrentTask,
    setCurrentProject,
    updateTask,
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'files' | 'artifacts' | 'browser'>('browser');
  const hasFetchedRef = useRef(false);

  // Fetch task once on mount
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchTask = async () => {
      try {
        const response = await fetch(`/api/tasks`);
        if (response.ok) {
          const tasks: Task[] = await response.json();
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            setCurrentTask(task);
            setCurrentProject(null);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error fetching task:', error);
      }

      // Task not found, redirect home
      router.push('/');
    };

    fetchTask();
  }, [taskId, router, setCurrentTask, setCurrentProject]);

  const handleOpenPanel = (tab: 'files' | 'artifacts' | 'browser' = 'browser') => {
    setDefaultTab(tab);
    setRightPanelOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-base">
        <div className="flex flex-col items-center gap-3">
          <IconSpinner size={24} className="text-accent" />
          <span className="text-[13px] text-text-tertiary">Loading task...</span>
        </div>
      </div>
    );
  }

  if (!currentTask) {
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
            project={null}
            onOpenPanel={handleOpenPanel}
            rightPanelOpen={rightPanelOpen}
          />
        </div>

        {/* Right Panel with tabs - 50% width */}
        {rightPanelOpen && (
          <div className="w-1/2 flex flex-col overflow-hidden">
            <RightPanelTabs
              project={null}
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
