'use client';

import { useState } from 'react';
import {
  IconX,
  IconTerminal,
  IconMonitor,
  IconChevronDown,
  IconChevronUp,
  IconExpand,
} from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';

interface ComputerPanelProps {
  task: Task | null;
  onClose: () => void;
}

export function ComputerPanel({ task, onClose }: ComputerPanelProps) {
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(false);

  const completedSteps = task?.progress.filter(p => p.status === 'completed').length || 0;
  const totalSteps = task?.progress.length || 0;
  const currentCommand = task?.status === 'running' ? 'uptime && pwd && ls -F' : '';

  return (
    <div className="w-[500px] h-full flex flex-col bg-bg-base">
      {/* Panel with rounded corners - Manus style */}
      <div className="flex-1 m-3 ml-0 rounded-2xl border border-border-subtle bg-bg-surface overflow-hidden flex flex-col">
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-border-subtle">
          <span className="text-[15px] font-medium text-text-primary">Async's Computer</span>
          <div className="flex items-center gap-1">
            <button className="p-2 text-text-tertiary hover:text-text-secondary transition-colors">
              <IconMonitor size={16} />
            </button>
            <button className="p-2 text-text-tertiary hover:text-text-secondary transition-colors">
              <IconExpand size={14} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <IconX size={16} />
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="h-9 px-4 flex items-center gap-3 border-b border-border-subtle bg-bg-base/50">
          <div className="flex items-center gap-2">
            <IconTerminal size={14} className="text-text-tertiary" />
            <span className="text-[12px] text-text-secondary">Async is using Terminal</span>
          </div>
          {currentCommand && (
            <>
              <span className="text-text-quaternary text-[12px]">|</span>
              <span className="text-[12px] text-text-tertiary">
                Executing command <span className="text-text-secondary font-mono">{currentCommand}</span>
              </span>
            </>
          )}
        </div>

        {/* Tab bar */}
        <div className="h-8 bg-[#0d0d0d] border-b border-border-subtle flex items-center px-2">
          <div className="px-3 py-1 bg-bg-surface rounded-t-lg border-t border-l border-r border-border-subtle text-[11px] text-text-secondary">
            test_session
          </div>
        </div>

        {/* Terminal content */}
        <div className="flex-1 p-4 font-mono text-[12px] overflow-auto bg-[#0d0d0d]">
          <div className="space-y-1">
            <div>
              <span className="text-green-500">ubuntu@sandbox:~</span>
              <span className="text-text-primary"> $ </span>
              <span className="text-text-secondary">uptime && pwd && ls -F</span>
            </div>
            <div className="text-text-secondary">
              23:09:45 up 14:24,  1 user,  load average: 0.00, 0.00, 0.00
            </div>
            <div className="text-text-secondary">/home/ubuntu</div>
            <div>
              <span className="text-blue-400">Downloads</span>
              <span className="text-text-secondary">/   sandbox.txt</span>
            </div>
            <div className="mt-2">
              <span className="text-green-500">ubuntu@sandbox:~</span>
              <span className="text-text-primary"> $ </span>
              <span className="animate-pulse text-text-primary">▋</span>
            </div>
          </div>
        </div>

        {/* Task progress footer - collapsible */}
        {task && task.progress.length > 0 && (
          <div className="border-t border-border-subtle bg-bg-surface">
            <button
              onClick={() => setIsProgressCollapsed(!isProgressCollapsed)}
              className="w-full h-10 px-4 flex items-center justify-between hover:bg-bg-overlay transition-colors"
            >
              <span className="text-[13px] font-medium text-text-primary">Task progress</span>
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-text-tertiary">{completedSteps} / {totalSteps}</span>
                {isProgressCollapsed ? (
                  <IconChevronUp size={14} className="text-text-tertiary" />
                ) : (
                  <IconChevronDown size={14} className="text-text-tertiary" />
                )}
              </div>
            </button>
            {!isProgressCollapsed && (
              <div className="px-4 pb-4 space-y-2.5">
                {task.progress.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.status === 'completed' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-green-500 flex-shrink-0">
                        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : item.status === 'in_progress' ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-accent border-t-transparent animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-text-quaternary flex-shrink-0" />
                    )}
                    <span className={cn(
                      'text-[12px]',
                      item.status === 'completed' ? 'text-text-primary' : 'text-text-tertiary'
                    )}>
                      {item.content}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
