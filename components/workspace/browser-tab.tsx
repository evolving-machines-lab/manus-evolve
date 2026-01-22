'use client';

import { IconGlobe, IconTerminal, IconEdit } from '@/components/ui/icons';
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
}

export function BrowserTab({
  task,
  toolKind,
  toolContent,
  toolFilePath,
  toolCommand,
  toolName,
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

  // Priority: Browser live > Tool content > Browser screenshot > Empty
  // If browser tool with live URL, show browser
  // If file/terminal tool with content, show code/terminal viewer
  // Otherwise show screenshot or empty state

  // Show browser for browser tool or when we have live URL
  if (isBrowserTool || hasLiveUrl) {
    if (hasLiveUrl) {
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
    if (hasScreenshot) {
      return (
        <div className={`${containerClass} p-4`}>
          <div className="flex-1 flex items-center justify-center bg-[#1e1e1e] rounded-xl border border-[#3a3a3a]">
            <img
              src={task?.browserScreenshotUrl}
              alt="Browser Screenshot"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      );
    }
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
        />
      </div>
    );
  }

  // Fallback: Show screenshot if available
  if (hasScreenshot) {
    return (
      <div className={`${containerClass} p-4`}>
        <div className="flex-1 flex items-center justify-center bg-[#1e1e1e] rounded-xl border border-[#3a3a3a]">
          <img
            src={task?.browserScreenshotUrl}
            alt="Browser Screenshot"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      </div>
    );
  }

  // Empty state with appropriate icon
  return (
    <div className={`${containerClass} items-center justify-center`}>
      {isEditorTool ? (
        <IconEdit size={32} className="text-text-quaternary" />
      ) : isTerminalTool ? (
        <IconTerminal size={32} className="text-text-quaternary" />
      ) : (
        <IconGlobe size={32} className="text-text-quaternary" />
      )}
      <span className="text-[13px] text-text-quaternary mt-3">
        {isEditorTool
          ? 'No file content'
          : isTerminalTool
          ? 'No terminal output'
          : 'No browser view'}
      </span>
    </div>
  );
}
