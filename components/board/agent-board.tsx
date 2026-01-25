'use client';

import { useEffect, useState, useCallback } from 'react';
import { BoardColumn } from './board-column';
import { IconSpinner } from '@/components/ui/icons';
import type { Task } from '@/lib/types';

export function AgentBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      console.log('[AgentBoard] Fetch start');
      const response = await fetch('/api/tasks?showAll=true');
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const data = await response.json();
      console.log('[AgentBoard] Fetch complete:', data.length);
      setTasks(data);
      setError(null);
    } catch (err) {
      console.error('[AgentBoard] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();

    // Poll every 5 seconds
    const interval = setInterval(() => {
      console.log('[AgentBoard] Poll tick');
      fetchTasks();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchTasks]);

  // Group tasks by status
  // Note: 'paused' tasks go into the Pending column
  const columns = {
    pending: tasks.filter((t) => t.status === 'pending' || t.status === 'paused'),
    running: tasks.filter((t) => t.status === 'running'),
    completed: tasks.filter((t) => t.status === 'completed'),
    failed: tasks.filter((t) => t.status === 'failed'),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <IconSpinner size={24} className="text-text-tertiary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-[14px] text-error">{error}</p>
        <button
          onClick={fetchTasks}
          className="px-4 py-2 text-[13px] rounded-lg bg-bg-surface hover:bg-bg-overlay border border-border-subtle text-text-primary transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4 overflow-x-auto p-4">
      <BoardColumn
        title="Pending"
        tasks={columns.pending}
        statusColor="bg-text-quaternary"
      />
      <BoardColumn
        title="Running"
        tasks={columns.running}
        statusColor="bg-accent"
      />
      <BoardColumn
        title="Completed"
        tasks={columns.completed}
        statusColor="bg-success"
      />
      <BoardColumn
        title="Failed"
        tasks={columns.failed}
        statusColor="bg-error"
      />
    </div>
  );
}
