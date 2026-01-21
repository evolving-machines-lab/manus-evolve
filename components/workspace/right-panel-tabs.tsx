'use client';

import { useState } from 'react';
import {
  IconX,
  IconFolder,
  IconMonitor,
} from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { FilesTab } from './files-tab';
import { ArtifactsTab } from './artifacts-tab';
import { BrowserTab } from './browser-tab';
import type { Task, Project } from '@/lib/types';

interface RightPanelTabsProps {
  project: Project | null;
  task: Task | null;
  onClose: () => void;
  defaultTab?: 'files' | 'artifacts' | 'browser';
}

// Icon for artifacts/output
function IconOutput({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function RightPanelTabs({ project, task, onClose, defaultTab = 'browser' }: RightPanelTabsProps) {
  const { rightPanelView, setRightPanelView } = useStore();
  const [activeTab, setActiveTab] = useState<'files' | 'artifacts' | 'browser'>(defaultTab);

  const handleTabChange = (tab: 'files' | 'artifacts' | 'browser') => {
    setActiveTab(tab);
    setRightPanelView(tab);
  };

  const tabs = [
    { id: 'files' as const, label: 'Files', icon: IconFolder },
    { id: 'artifacts' as const, label: 'Artifacts', icon: IconOutput },
    { id: 'browser' as const, label: 'Browser', icon: IconMonitor },
  ];

  return (
    <div className="flex-1 h-full flex flex-col bg-bg-content">
      {/* Panel container with rounded corners */}
      <div className="flex-1 m-3 ml-0 rounded-2xl border border-[#3a3a3a] bg-bg-content-surface overflow-hidden flex flex-col">
        {/* Header with tabs */}
        <div className="border-b border-border-subtle">
          {/* Title row */}
          <div className="h-12 px-4 flex items-center justify-between">
            <span className="text-[15px] font-medium text-text-primary">
              {project?.name || task?.title || 'Task'}
            </span>
            <button
              onClick={onClose}
              className="p-2 text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <IconX size={16} />
            </button>
          </div>

          {/* Tab bar */}
          <div className="px-4 flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-all rounded-t-lg',
                    isActive
                      ? 'bg-bg-overlay text-text-primary border-b-2 border-accent'
                      : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-overlay/50'
                  )}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'files' && project && (
            <FilesTab project={project} />
          )}
          {activeTab === 'files' && !project && (
            <div className="h-full flex items-center justify-center">
              <IconFolder size={32} className="text-text-quaternary" />
            </div>
          )}
          {activeTab === 'artifacts' && (
            <ArtifactsTab task={task} />
          )}
          {activeTab === 'browser' && (
            <BrowserTab task={task} />
          )}
        </div>

        {/* Task progress section at bottom */}
        {task && task.progress.length > 0 && (
          <div className="p-4 pt-0">
            <div className="rounded-2xl border border-border-subtle bg-bg-overlay p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[16px] font-medium text-text-primary">Task progress</h3>
                <span className="text-[13px] text-text-tertiary">
                  {task.progress.filter(p => p.status === 'completed').length} / {task.progress.length}
                </span>
              </div>
              <div className="space-y-3">
                {task.progress.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    {item.status === 'completed' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-0.5 flex-shrink-0">
                        <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : item.status === 'in_progress' ? (
                      <div className="w-[18px] h-[18px] rounded-full border-2 border-accent border-t-transparent animate-spin mt-0.5 flex-shrink-0" />
                    ) : (
                      <div className="w-[18px] h-[18px] rounded-full border border-text-quaternary mt-0.5 flex-shrink-0" />
                    )}
                    <span className={cn(
                      'text-[14px] leading-relaxed',
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
          </div>
        )}
      </div>
    </div>
  );
}
