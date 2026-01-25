'use client';

import { useRouter } from 'next/navigation';
import { StatusDot } from '@/components/ui/icons';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Task } from '@/lib/types';

interface TaskCardProps {
  task: Task;
}

// Agent badge with colored initial
function AgentBadge({ agent }: { agent?: Task['agent'] }) {
  const config = {
    claude: { initial: 'C', bg: 'bg-teal-500/20', text: 'text-teal-400' },
    codex: { initial: 'X', bg: 'bg-green-500/20', text: 'text-green-400' },
    gemini: { initial: 'G', bg: 'bg-blue-500/20', text: 'text-blue-400' },
    qwen: { initial: 'Q', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  };

  const { initial, bg, text } = agent && config[agent]
    ? config[agent]
    : { initial: 'C', bg: 'bg-teal-500/20', text: 'text-teal-400' };

  return (
    <span className={cn('w-5 h-5 rounded flex items-center justify-center text-[10px] font-semibold', bg, text)}>
      {initial}
    </span>
  );
}

export function TaskCard({ task }: TaskCardProps) {
  const router = useRouter();

  const handleClick = () => {
    console.log('[TaskCard] Click:', task.id, task.status);
    router.push(`/task/${task.id}`);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group w-full text-left p-3 rounded-lg cursor-pointer transition-all duration-150',
        'bg-bg-surface hover:bg-bg-overlay border border-border-subtle hover:border-border-default',
        'animate-slide-up'
      )}
    >
      {/* Header: Status dot + Agent badge */}
      <div className="flex items-center gap-2 mb-2">
        <StatusDot status={task.status} size={6} pulse={task.status === 'running'} />
        <AgentBadge agent={task.agent} />
        {task.model && (
          <span className="text-2xs text-text-quaternary truncate">
            {task.model}
          </span>
        )}
      </div>

      {/* Title - 2 line truncate */}
      <p className="text-[13px] font-medium text-text-primary line-clamp-2 mb-2">
        {task.title || 'Untitled task'}
      </p>

      {/* Footer: Timestamp */}
      <div className="flex items-center justify-between">
        <span className="text-2xs text-text-quaternary">
          {formatRelativeTime(task.updatedAt)}
        </span>
      </div>
    </button>
  );
}
