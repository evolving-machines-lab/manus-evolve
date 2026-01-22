'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TaskView } from '@/components/task/task-view';
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
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<'files' | 'artifacts' | 'browser'>('browser');

  // Fetch task data on mount/navigation
  useEffect(() => {
    const fetchTask = async () => {
      try {
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
  }, [taskId, router, setCurrentTask, setCurrentProject]);

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

  // TaskView handles both main content and right panel internally (shares streaming data)
  // Wrap in flex container for 50/50 layout when panel is open
  return (
    <div className="flex-1 flex overflow-hidden">
      <TaskView
        task={currentTask}
        project={null}
        onOpenPanel={handleOpenPanel}
        rightPanelOpen={rightPanelOpen}
        onClosePanel={() => setRightPanelOpen(false)}
        defaultPanelTab={defaultTab}
        renderRightPanel={true}
      />
    </div>
  );
}
