'use client';

import { CodeViewer } from './code-viewer';
import { TerminalViewer } from './terminal-viewer';
import type { Task } from '@/lib/types';

interface BrowserTabProps {
  task: Task | null;
  // Tool state from streaming
  toolKind?: string;
  toolContent?: string;
  toolFilePath?: string;
  toolCommand?: string;
  toolName?: string;
  isRunning?: boolean;
}

export function BrowserTab({
  task,
  toolKind,
  toolContent,
  toolFilePath,
  toolCommand,
  toolName,
  isRunning = false,
}: BrowserTabProps) {
  const hasLiveUrl = !!task?.browserLiveUrl;
  const hasScreenshot = !!task?.browserScreenshotUrl;
  const hasToolContent = !!toolContent;

  // Stable container to prevent layout shift
  const containerClass = "h-full flex flex-col bg-[#2f2f2f]";

  // Determine which view to show based on tool kind
  // SDK sends: read, edit, delete, move, search, execute, think, fetch, switch_mode, other
  const isEditorTool = toolKind === 'read' || toolKind === 'edit' || toolKind === 'delete' || toolKind === 'move';
  const isTerminalTool = toolKind === 'execute' || toolKind === 'bash' || toolKind === 'terminal' || toolKind === 'code';
  const isBrowserTool = toolKind === 'browser' || toolKind === 'fetch';

  // Priority: Live browser (only when running) > Tool content > Browser screenshot > Default terminal
  // Only show live iframe when actually running - sessions expire after run ends
  if (isRunning && hasLiveUrl) {
    return (
      <div className={containerClass}>
        <iframe
          src={task?.browserLiveUrl}
          className="w-full h-full border-0"
          title="Live Browser View"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    );
  }

  // Show editor for file operations (show even without content if we have file path)
  if (isEditorTool && (hasToolContent || toolFilePath)) {
    return (
      <div className={`${containerClass} p-4`}>
        <CodeViewer
          content={toolContent || '// Loading...'}
          filePath={toolFilePath}
        />
      </div>
    );
  }

  // Show terminal for bash/terminal operations (show even without content if we have command)
  if (isTerminalTool && (hasToolContent || toolCommand)) {
    return (
      <div className={`${containerClass} p-4`}>
        <TerminalViewer
          content={toolContent || ''}
          command={toolCommand}
          title={toolName}
          isRunning={isRunning}
        />
      </div>
    );
  }

  // Fallback: Show screenshot if available (with browser-style header)
  if (hasScreenshot) {
    return (
      <div className={`${containerClass} p-4`}>
        <div className="h-full flex flex-col rounded-xl overflow-hidden shadow-lg border border-[#3a3a3a]">
          {/* Browser header - macOS style */}
          <div className="px-4 py-3 bg-[#252525] flex items-center gap-3 border-b border-[#1a1a1a]">
            {/* Traffic lights */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-inner" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-inner" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-inner" />
            </div>
            {/* Title */}
            <div className="flex-1 text-center">
              <span className="text-[13px] font-medium text-[#999]">Browser</span>
            </div>
            {/* Spacer for symmetry */}
            <div className="w-[52px]" />
          </div>
          {/* Screenshot content - aligned to top */}
          <div className="flex-1 overflow-auto bg-[#1a1a1a] p-4">
            <img
              src={task?.browserScreenshotUrl}
              alt="Browser Screenshot"
              className="max-w-full object-contain rounded-lg"
            />
          </div>
        </div>
      </div>
    );
  }

  // Default state: show empty terminal with sandbox prompt
  return (
    <div className={`${containerClass} p-4`}>
      <TerminalViewer
        content=""
        command=""
        isRunning={false}
      />
    </div>
  );
}
