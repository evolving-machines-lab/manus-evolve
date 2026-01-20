'use client';

import { useState } from 'react';
import {
  IconX,
  IconTerminal,
  IconMonitor,
  IconChevronDown,
  IconChevronUp,
  IconExpand,
  IconCheck,
} from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { Workspace, Task } from '@/lib/types';

interface RightPanelProps {
  workspace: Workspace;
  task: Task | null;
}

export function RightPanel({ workspace, task }: RightPanelProps) {
  const { setRightPanelOpen } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(false);

  // Get current activity based on task status
  const currentCommand = task?.status === 'running'
    ? 'uptime && pwd && ls -F'
    : '';
  const completedSteps = task?.progress.filter(p => p.status === 'completed').length || 0;
  const totalSteps = task?.progress.length || 0;

  return (
    <>
      {/* Floating cards container - positioned in main area */}
      <div className="w-[420px] flex flex-col bg-bg-base border-l border-border-subtle">
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-border-subtle">
          <span className="text-[14px] text-text-primary">Async Computer</span>
          <button
            onClick={() => setRightPanelOpen(false)}
            className="p-1.5 text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Computer Card - Manus style */}
          <div className="rounded-2xl border border-border-subtle bg-bg-surface p-4">
            <div className="flex items-start gap-4">
              {/* Terminal thumbnail on LEFT */}
              <div
                onClick={() => setIsExpanded(true)}
                className="relative w-[160px] h-[110px] rounded-xl bg-[#0d0d0d] border border-border-subtle overflow-hidden cursor-pointer group flex-shrink-0"
              >
                {/* Session header */}
                <div className="px-2 py-1.5 border-b border-border-subtle">
                  <span className="text-[9px] text-text-quaternary">test_session</span>
                </div>
                {/* Terminal content */}
                <div className="p-2 font-mono text-[8px] leading-relaxed">
                  <div><span className="text-green-500">ubuntu@sandbox:~</span> <span className="text-text-tertiary">$ uptime && pwd && ls</span></div>
                  <div className="text-text-tertiary text-[7px]">23:09:45 up 14:24, 1 user</div>
                  <div className="text-text-tertiary text-[7px]">/home/ubuntu</div>
                  <div><span className="text-blue-400">Downloads</span><span className="text-text-tertiary">/  sandbox.txt</span></div>
                  <div><span className="text-green-500">ubuntu@sandbox:~</span> <span className="text-text-tertiary">$</span></div>
                </div>
                {/* Expand icon on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <IconExpand size={20} className="text-white" />
                </div>
              </div>

              {/* Computer info on RIGHT */}
              <div className="flex-1 pt-1">
                <h3 className="text-[18px] font-medium text-text-primary mb-2">
                  Async's computer
                </h3>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-bg-overlay flex items-center justify-center">
                    <IconTerminal size={15} className="text-text-secondary" />
                  </div>
                  <span className="text-[14px] text-text-secondary">
                    Async is using <span className="text-text-primary">Terminal</span>
                  </span>
                </div>
              </div>

              {/* Monitor dropdown on FAR RIGHT */}
              <div className="flex items-center gap-0.5 pt-1">
                <button className="p-2 text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconMonitor size={20} />
                </button>
                <button className="p-1 text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconChevronDown size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Task Progress Card - Manus style */}
          {task && task.progress.length > 0 && (
            <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[17px] font-medium text-text-primary">Task progress</h3>
                <span className="text-[14px] text-text-tertiary">{completedSteps} / {totalSteps}</span>
              </div>

              <div className="space-y-5">
                {task.progress.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    {/* Simple green checkmark - Manus style */}
                    {item.status === 'completed' ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-0.5 flex-shrink-0">
                        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : item.status === 'in_progress' ? (
                      <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin mt-0.5 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-text-quaternary mt-0.5 flex-shrink-0" />
                    )}
                    <span className={cn(
                      'text-[15px] leading-relaxed',
                      item.status === 'completed' ? 'text-text-primary' :
                      item.status === 'in_progress' ? 'text-text-primary' :
                      'text-text-tertiary'
                    )}>
                      {item.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No task selected */}
          {!task && (
            <div className="rounded-2xl border border-border-subtle bg-bg-surface p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-bg-overlay mx-auto mb-4 flex items-center justify-center">
                <IconMonitor size={24} className="text-text-quaternary" />
              </div>
              <p className="text-[14px] text-text-secondary mb-1">No active task</p>
              <p className="text-[13px] text-text-tertiary">
                Start a task to see the computer view
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Expanded terminal modal - Manus style */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="w-full max-w-4xl h-[700px] rounded-2xl bg-[#1a1a1a] border border-border-subtle overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header - Manus style */}
            <div className="h-12 bg-bg-surface border-b border-border-subtle flex items-center justify-between px-4">
              <span className="text-[15px] font-medium text-text-primary">SwarmKit's Computer</span>
              <div className="flex items-center gap-2">
                <button className="p-2 text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconMonitor size={18} />
                </button>
                <button className="p-2 text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconExpand size={16} />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <IconX size={16} />
                </button>
              </div>
            </div>

            {/* Status bar - Manus style */}
            <div className="h-10 bg-bg-base border-b border-border-subtle flex items-center px-4 gap-3">
              <div className="flex items-center gap-2">
                <IconTerminal size={14} className="text-text-tertiary" />
                <span className="text-[13px] text-text-secondary">Async is using Terminal</span>
              </div>
              {currentCommand && (
                <>
                  <span className="text-text-quaternary">|</span>
                  <span className="text-[13px] text-text-tertiary">Executing command <span className="text-text-secondary font-mono">{currentCommand}</span></span>
                </>
              )}
            </div>

            {/* Tab bar */}
            <div className="h-9 bg-[#0d0d0d] border-b border-border-subtle flex items-center px-2">
              <div className="px-3 py-1.5 bg-[#1a1a1a] rounded-t-lg border-t border-l border-r border-border-subtle text-[12px] text-text-secondary">
                test_session
              </div>
            </div>

            {/* Terminal content */}
            <div className="flex-1 p-4 font-mono text-[13px] overflow-auto bg-[#0d0d0d]">
              <div className="space-y-1">
                <div>
                  <span className="text-green-500">ubuntu@sandbox:~</span>
                  <span className="text-text-primary"> $ </span>
                  <span className="text-text-secondary">uptime && pwd && ls -F</span>
                </div>
                <div className="text-text-secondary pl-0">
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
                  className="w-full h-11 px-4 flex items-center justify-between hover:bg-bg-overlay transition-colors"
                >
                  <span className="text-[14px] font-medium text-text-primary">Task progress</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-text-tertiary">{completedSteps} / {totalSteps}</span>
                    {isProgressCollapsed ? (
                      <IconChevronUp size={16} className="text-text-tertiary" />
                    ) : (
                      <IconChevronDown size={16} className="text-text-tertiary" />
                    )}
                  </div>
                </button>
                {!isProgressCollapsed && (
                  <div className="px-4 pb-4 space-y-3">
                    {task.progress.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        {item.status === 'completed' ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-500 flex-shrink-0">
                            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : item.status === 'in_progress' ? (
                          <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-text-quaternary flex-shrink-0" />
                        )}
                        <span className={cn(
                          'text-[13px]',
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
      )}
    </>
  );
}
