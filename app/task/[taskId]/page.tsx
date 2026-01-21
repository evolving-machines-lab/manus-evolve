'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

  // Check if we already have this task in the store (from navigation)
  const hasTaskInStore = currentTask?.id === taskId;

  const [loading, setLoading] = useState(!hasTaskInStore);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'files' | 'artifacts' | 'browser'>('browser');
  const hasFetchedRef = useRef(false);

  // Fetch task once on mount (only if not already in store)
  useEffect(() => {
    if (hasFetchedRef.current) return;

    // If we already have this task in store, skip fetch
    if (hasTaskInStore) {
      hasFetchedRef.current = true;
      setCurrentProject(null);
      return;
    }

    hasFetchedRef.current = true;

    const fetchTask = async () => {
      try {
        // Fetch single task directly by ID
        const response = await fetch(`/api/tasks/${taskId}`);
        if (response.ok) {
          const task: Task = await response.json();
          setCurrentTask(task);
          setCurrentProject(null);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error fetching task:', error);
      }

      // Task not found, redirect home
      router.push('/');
    };

    fetchTask();
  }, [taskId, router, setCurrentTask, setCurrentProject, hasTaskInStore]);

  const handleOpenPanel = (tab: 'files' | 'artifacts' | 'browser' = 'browser') => {
    setDefaultTab(tab);
    setRightPanelOpen(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
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
  );
}
