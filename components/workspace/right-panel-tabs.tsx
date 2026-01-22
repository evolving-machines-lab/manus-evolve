'use client';

import { useState, useEffect, useRef } from 'react';
import {
  IconX,
  IconFolder,
  IconMonitor,
  IconChevronDown,
  IconTerminal,
  IconEdit,
  IconSearch,
  IconGlobe,
} from '@/components/ui/icons';

// Map tool kind to icon
// SDK sends: read, edit, delete, move, search, execute, think, fetch, switch_mode, other
function getToolIcon(kind?: string, size = 16, className = "text-text-tertiary") {
  switch (kind) {
    case 'browser':
    case 'fetch':
      return <IconGlobe size={size} className={className} />;
    case 'search':
      return <IconSearch size={size} className={className} />;
    case 'read':
    case 'edit':
    case 'delete':
    case 'move':
      return <IconEdit size={size} className={className} />;
    case 'execute':
    case 'bash':
    case 'terminal':
    case 'code':
    default:
      return <IconTerminal size={size} className={className} />;
  }
}

// Map tool kind to display name
function getToolDisplayName(kind?: string): string {
  switch (kind) {
    case 'browser':
    case 'fetch':
      return 'Browser';
    case 'search':
      return 'Search';
    case 'read':
    case 'edit':
    case 'delete':
    case 'move':
      return 'Editor';
    case 'execute':
    case 'bash':
    case 'terminal':
    case 'code':
    default:
      return 'Terminal';
  }
}
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { FilesTab } from './files-tab';
import { StandaloneFilesTab } from './standalone-files-tab';
import { PreTaskFilesTab } from './pre-task-files-tab';
import { ArtifactsTab } from './artifacts-tab';
import { BrowserTab } from './browser-tab';
import type { Task, Project } from '@/lib/types';

interface PreTaskFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface RightPanelTabsProps {
  project: Project | null;
  task: Task | null;
  onClose: () => void;
  defaultTab?: 'files' | 'artifacts' | 'browser';
  // For home page (pre-task) file management
  preTaskFiles?: PreTaskFile[];
  onPreTaskFilesChange?: (files: PreTaskFile[]) => void;
  onPreTaskFilesAdded?: (files: File[]) => void;
  // Tool state for code/terminal viewers
  toolKind?: string;
  toolContent?: string;
  toolFilePath?: string;
  toolCommand?: string;
  toolName?: string;
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

export function RightPanelTabs({
  project,
  task,
  onClose,
  defaultTab = 'browser',
  preTaskFiles,
  onPreTaskFilesChange,
  onPreTaskFilesAdded,
  toolKind,
  toolContent,
  toolFilePath,
  toolCommand,
  toolName,
}: RightPanelTabsProps) {
  const { rightPanelView, setRightPanelView, toolState } = useStore();
  const [activeTab, setActiveTab] = useState<'files' | 'artifacts' | 'browser'>(defaultTab);
  const [progressCollapsed, setProgressCollapsed] = useState(false);
  const isFirstRender = useRef(true);

  // Use props if provided, otherwise fall back to store
  const effectiveToolKind = toolKind ?? toolState.kind;
  const effectiveToolContent = toolContent ?? toolState.content;
  const effectiveToolFilePath = toolFilePath ?? toolState.filePath;
  const effectiveToolCommand = toolCommand ?? toolState.command;
  const effectiveToolName = toolName ?? toolState.name;

  // Sync activeTab when defaultTab prop changes (e.g., clicking attachment icon)
  // Skip first render to avoid flicker
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const handleTabChange = (tab: 'files' | 'artifacts' | 'browser') => {
    setActiveTab(tab);
    setRightPanelView(tab);
  };

  const tabs = [
    { id: 'files' as const, label: 'Files', icon: IconFolder },
    { id: 'artifacts' as const, label: 'Artifacts', icon: IconOutput },
    { id: 'browser' as const, label: 'Manus Computer', icon: IconMonitor },
  ];

  return (
    <div className="flex-1 h-full flex flex-col bg-bg-content">
      {/* Panel container with rounded corners */}
      <div className="flex-1 m-3 ml-0 rounded-2xl border border-[#4a4a4a] bg-[#2f2f2f] overflow-hidden flex flex-col shadow-sm">
        {/* Tab bar at top with close button */}
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium transition-all rounded-lg',
                    isActive
                      ? 'bg-[#454545] text-white'
                      : 'text-[#888] hover:text-white hover:bg-[#3a3a3a]'
                  )}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#888] hover:text-white hover:bg-[#3a3a3a] rounded-lg transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'files' && project && (
            <FilesTab project={project} task={task} />
          )}
          {activeTab === 'files' && !project && task && (
            <StandaloneFilesTab task={task} />
          )}
          {activeTab === 'files' && !project && !task && preTaskFiles && onPreTaskFilesChange && (
            <PreTaskFilesTab files={preTaskFiles} onFilesChange={onPreTaskFilesChange} onFilesAdded={onPreTaskFilesAdded} />
          )}
          {activeTab === 'files' && !project && !task && !preTaskFiles && (
            <div className="h-full flex items-center justify-center">
              <IconFolder size={32} className="text-text-quaternary" />
            </div>
          )}
          {activeTab === 'artifacts' && (
            <ArtifactsTab task={task} />
          )}
          {activeTab === 'browser' && (
            <BrowserTab
              task={task}
              toolKind={effectiveToolKind}
              toolContent={effectiveToolContent}
              toolFilePath={effectiveToolFilePath}
              toolCommand={effectiveToolCommand}
              toolName={effectiveToolName}
              isRunning={task?.status === 'running'}
            />
          )}

          {/* Task progress overlay at bottom */}
          {task && task.progress.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="rounded-xl border border-[#4a4a4a] bg-[#2f2f2f]">
                <div className="flex items-center justify-between p-4">
                  <h3 className="text-[15px] font-medium text-text-primary">Task progress</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-text-tertiary">
                      {task.progress.filter(p => p.status === 'completed').length} / {task.progress.length}
                    </span>
                    <button
                      onClick={() => setProgressCollapsed(!progressCollapsed)}
                      className="p-1 rounded hover:bg-[#3a3a3a] transition-colors"
                    >
                      <IconChevronDown
                        size={18}
                        className={cn(
                          "text-text-tertiary transition-transform",
                          progressCollapsed && "rotate-180"
                        )}
                      />
                    </button>
                  </div>
                </div>
                {!progressCollapsed && (
                  <div className="space-y-4 px-5 pb-5">
                    {task.progress.map((item) => (
                      <div key={item.id} className="flex items-start gap-3">
                        {item.status === 'completed' ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-green-500 mt-0.5 flex-shrink-0">
                            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : item.status === 'in_progress' ? (
                          <div className="w-5 h-5 rounded-full bg-blue-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-text-quaternary mt-0.5 flex-shrink-0">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
                            <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                        <div className="flex-1">
                          <span className={cn(
                            'text-[13px] leading-relaxed block',
                            item.status === 'completed' ? 'text-text-primary' :
                            item.status === 'in_progress' ? 'text-text-primary' :
                            'text-text-tertiary'
                          )}>
                            {item.content}
                          </span>
                          {item.status === 'in_progress' && (
                            <span className="text-[12px] text-text-quaternary mt-0.5 block">Using browser</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
