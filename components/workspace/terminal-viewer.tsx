'use client';

import { useMemo } from 'react';

interface TerminalViewerProps {
  content: string;
  command?: string;
  title?: string;
  isRunning?: boolean;
}

// Parse terminal output and colorize prompt
function parseTerminalContent(content: string, command?: string): React.ReactNode[] {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    // Skip if this line is just the command repeated
    if (command && line.trim() === command.trim()) {
      return;
    }

    // Match common prompt patterns:
    // ubuntu@sandbox:~ $ command
    // user@host:path$ command
    // $ command
    const promptMatch = line.match(/^(\w+@[\w-]+:[~\/\w.-]*\s*\$)\s*(.*)$/);

    if (promptMatch) {
      // Line with prompt
      nodes.push(
        <div key={index} className="whitespace-pre-wrap">
          <span className="text-emerald-400 font-medium">{promptMatch[1]}</span>
          <span className="text-white"> {promptMatch[2]}</span>
        </div>
      );
    } else if (line.startsWith('$ ')) {
      // Simple prompt
      nodes.push(
        <div key={index} className="whitespace-pre-wrap">
          <span className="text-emerald-400 font-medium">$</span>
          <span className="text-white"> {line.slice(2)}</span>
        </div>
      );
    } else {
      // Regular output line
      nodes.push(
        <div key={index} className="whitespace-pre-wrap text-[#e0e0e0]">
          {line || ' '}
        </div>
      );
    }
  });

  return nodes;
}

export function TerminalViewer({ content, command, title, isRunning = false }: TerminalViewerProps) {
  const parsedContent = useMemo(() => parseTerminalContent(content, command), [content, command]);

  return (
    <div className="h-full flex flex-col rounded-xl overflow-hidden shadow-lg border border-[#3a3a3a]">
      {/* Terminal header - macOS style */}
      <div className="px-4 py-3 bg-[#252525] flex items-center gap-3 border-b border-[#1a1a1a]">
        {/* Traffic lights */}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-inner" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-inner" />
          <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-inner" />
        </div>
        {/* Title */}
        <div className="flex-1 text-center">
          <span className="text-[13px] font-medium text-[#999]">Terminal</span>
        </div>
        {/* Spacer for symmetry */}
        <div className="w-[52px]" />
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed bg-[#1a1a1a]">
        {/* Show command with ubuntu@sandbox prompt like Manus */}
        {command ? (
          <div className="whitespace-pre-wrap">
            <span className="text-emerald-400">ubuntu@sandbox:~</span>
            <span className="text-white"> $ </span>
            <span className="text-white">{command}</span>
          </div>
        ) : (
          /* Empty terminal - just show prompt */
          <div className="whitespace-pre-wrap">
            <span className="text-emerald-400">ubuntu@sandbox:~</span>
            <span className="text-white"> $ </span>
            <span className="animate-pulse">▋</span>
          </div>
        )}
        {/* Show content or status */}
        {content ? (
          <div className="mt-1">{parsedContent}</div>
        ) : command && isRunning ? (
          <div className="flex items-center gap-2 text-[#555] mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[12px]">Running...</span>
          </div>
        ) : command ? (
          <div className="flex items-center gap-2 text-emerald-500/70 mt-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[12px]">Done</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
