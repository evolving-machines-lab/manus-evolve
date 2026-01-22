'use client';

import { useMemo } from 'react';
import { CodeViewer } from './code-viewer';
import { TerminalViewer } from './terminal-viewer';
import type { Task, ToolCall } from '@/lib/types';

interface BrowserTabProps {
  task: Task | null;
  // Tool state from streaming OR from last tool call in task.messages
  toolKind?: string;
  toolContent?: string;
  toolFilePath?: string;
  toolCommand?: string;
  toolName?: string;
  isRunning?: boolean;
  // Browser state from streaming (takes priority over task)
  browserLiveUrl?: string;
  browserScreenshotUrl?: string;
}

// Extract all terminal commands from task messages for accumulated terminal view
function extractTerminalCommands(task: Task | null): { command: string; output?: string; status?: ToolCall['status'] }[] {
  if (!task?.messages) return [];

  const terminalKinds = ['execute', 'bash', 'terminal', 'code'];
  const commands: { command: string; output?: string; status?: ToolCall['status'] }[] = [];

  task.messages.forEach(message => {
    (message.toolCalls || []).forEach(tc => {
      if (terminalKinds.includes(tc.kind || '') && tc.command) {
        commands.push({
          command: tc.command,
          output: tc.outputContent,
          status: tc.status,
        });
      }
    });
  });

  return commands;
}

export function BrowserTab({
  task,
  toolKind,
  toolContent,
  toolFilePath,
  toolCommand,
  toolName,
  isRunning = false,
  browserLiveUrl,
  browserScreenshotUrl,
}: BrowserTabProps) {
  // Use streaming URLs if available, fall back to task
  const effectiveLiveUrl = browserLiveUrl || task?.browserLiveUrl;
  const effectiveScreenshotUrl = browserScreenshotUrl || task?.browserScreenshotUrl;
  const hasLiveUrl = !!effectiveLiveUrl;
  const hasScreenshot = !!effectiveScreenshotUrl;
  const hasToolContent = !!toolContent;

  // Extract accumulated terminal commands from task
  const terminalCommands = useMemo(() => extractTerminalCommands(task), [task?.messages]);

  // Stable container to prevent layout shift
  const containerClass = "h-full flex flex-col bg-[#2f2f2f]";

  // Determine tool type based on kind AND tool name (pattern matching fallback)
  // ACP kinds: read, edit, write, delete, move, search, execute, think, fetch, browser, switch_mode, other
  // MCP tools have kind: "other" so we must also check toolName patterns
  const nameLower = toolName?.toLowerCase() || '';

  // Editor: file operations
  const isEditorByKind = ['read', 'edit', 'write', 'delete', 'move'].includes(toolKind || '');
  const isEditorByName = nameLower.includes('read') || nameLower.includes('edit') ||
                         nameLower.includes('write') || nameLower.includes('file');
  const isEditorTool = isEditorByKind || (!toolKind && isEditorByName);

  // Terminal: command execution
  const isTerminalByKind = ['execute', 'bash', 'terminal', 'code', 'shell'].includes(toolKind || '');
  const isTerminalByName = nameLower.includes('bash') || nameLower.includes('terminal') ||
                           nameLower.includes('execute') || nameLower.includes('shell') ||
                           nameLower.includes('command');
  const isTerminalTool = isTerminalByKind || (!toolKind && isTerminalByName);

  // Browser: web operations
  const isBrowserByKind = ['browser', 'fetch'].includes(toolKind || '');
  const isBrowserByName = nameLower.includes('browser-use') || nameLower.includes('browser_task') ||
                          nameLower.includes('monitor_task') || nameLower.includes('web_');
  const isBrowserTool = isBrowserByKind || isBrowserByName; // Always check name for browser (MCP tools)

  // ============================================================================
  // PRIORITY ORDER:
  // 1. Editor (if current tool is editor with content) - user needs to see file
  // 2. Terminal (if current tool is terminal) - user needs to see commands
  // 3. Live browser (if running + hasLiveUrl) - persists during other operations
  // 4. Browser screenshot (if hasScreenshot)
  // 5. Terminal with history (if we have terminal commands)
  // 6. Empty terminal (default)
  // ============================================================================

  // 1. Editor - if current tool is an editor tool with content to show
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

  // 2. Terminal - if current tool is a terminal tool (show accumulated commands)
  if (isTerminalTool) {
    const allCommands = [...terminalCommands];

    // Add streaming command if not already in list
    if (toolCommand) {
      const lastCmd = allCommands[allCommands.length - 1];
      if (!lastCmd || lastCmd.command !== toolCommand) {
        allCommands.push({
          command: toolCommand,
          output: toolContent,
          status: isRunning ? 'in_progress' : 'completed',
        });
      } else if (lastCmd && lastCmd.command === toolCommand) {
        lastCmd.output = toolContent || lastCmd.output;
        lastCmd.status = isRunning ? 'in_progress' : 'completed';
      }
    }

    if (allCommands.length > 0) {
      return (
        <div className={`${containerClass} p-4`}>
          <TerminalViewer commands={allCommands} taskRunning={isRunning} />
        </div>
      );
    }
  }

  // 3. Live browser - show when running and we have a live URL
  // This persists even when agent is using other tools (Composio, thinking, etc.)
  if (isRunning && hasLiveUrl) {
    return (
      <div className={`${containerClass} p-4`}>
        <div className="h-full flex flex-col rounded-xl overflow-hidden shadow-lg border border-[#3a3a3a]">
          <div className="px-4 py-2 bg-[#252525] flex items-center gap-3 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-inner" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-inner" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-inner" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-[13px] font-medium text-[#999]">Browser</span>
            </div>
            <div className="w-[52px]" />
          </div>
          <iframe
            src={effectiveLiveUrl}
            className="flex-1 w-full border-0 bg-white"
            title="Live Browser View"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    );
  }

  // 4. Browser screenshot - show when we have a screenshot (task finished or no live URL)
  if (hasScreenshot) {
    return (
      <div className={`${containerClass} p-4`}>
        <div className="h-full flex flex-col rounded-xl overflow-hidden shadow-lg border border-[#3a3a3a]">
          <div className="px-4 py-2 bg-[#252525] flex items-center gap-3 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-inner" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-inner" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-inner" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-[13px] font-medium text-[#999]">Browser</span>
            </div>
            <div className="w-[52px]" />
          </div>
          <div className="flex-1 overflow-auto bg-[#1a1a1a]">
            <img
              src={effectiveScreenshotUrl}
              alt="Browser Screenshot"
              className="w-full object-contain"
            />
          </div>
        </div>
      </div>
    );
  }

  // 5. Terminal with history - if no specific tool but we have terminal commands
  if (terminalCommands.length > 0) {
    return (
      <div className={`${containerClass} p-4`}>
        <TerminalViewer commands={terminalCommands} taskRunning={isRunning} />
      </div>
    );
  }

  // 6. Default: empty terminal
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
