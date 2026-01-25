'use client';

import { TaskCard } from './task-card';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';

interface BoardColumnProps {
  title: string;
  tasks: Task[];
  statusColor: string;
}

export function BoardColumn({ title, tasks, statusColor }: BoardColumnProps) {
  console.log('[BoardColumn]', title, tasks.length, 'tasks');

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] h-full">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-border-subtle">
        <span className={cn('w-2 h-2 rounded-full', statusColor)} />
        <h3 className="text-[14px] font-medium text-text-primary">{title}</h3>
        <span className="text-[13px] text-text-quaternary">
          {tasks.length}
        </span>
      </div>

      {/* Task list - scrollable */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-[13px] text-text-quaternary">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
}
