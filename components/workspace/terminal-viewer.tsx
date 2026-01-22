'use client';

import { useMemo } from 'react';

interface TerminalViewerProps {
  content: string;
  command?: string;
  title?: string;
}

// Parse terminal output and colorize prompt
function parseTerminalContent(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, index) => {
    // Match common prompt patterns:
    // ubuntu@sandbox:~ $ command
    // user@host:path$ command
    // $ command
    const promptMatch = line.match(/^(\w+@[\w-]+:[~\/\w.-]*\s*\$)\s*(.*)$/);

    if (promptMatch) {
      // Line with prompt
      nodes.push(
        <div key={index} className="whitespace-pre-wrap">
          <span className="text-green-500">{promptMatch[1]}</span>
          <span className="text-white"> {promptMatch[2]}</span>
        </div>
      );
    } else if (line.startsWith('$ ')) {
      // Simple prompt
      nodes.push(
        <div key={index} className="whitespace-pre-wrap">
          <span className="text-green-500">$</span>
          <span className="text-white"> {line.slice(2)}</span>
        </div>
      );
    } else {
      // Regular output line
      nodes.push(
        <div key={index} className="whitespace-pre-wrap text-text-primary">
          {line || ' '}
        </div>
      );
    }
  });

  return nodes;
}

export function TerminalViewer({ content, command, title }: TerminalViewerProps) {
  const parsedContent = useMemo(() => parseTerminalContent(content), [content]);

  // Generate title from command if not provided
  const displayTitle = title || (command ? command.split(' ')[0] : 'terminal');

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] rounded-xl border border-[#3a3a3a] overflow-hidden">
      {/* Terminal header */}
      <div className="px-4 py-2.5 border-b border-[#3a3a3a] bg-[#252525] flex items-center justify-center">
        <span className="text-[13px] text-text-tertiary">{displayTitle}</span>
      </div>

      {/* Terminal content */}
      <div className="flex-1 overflow-auto p-4 font-mono text-[13px] leading-relaxed bg-[#1e1e1e]">
        {/* Show command if provided and not in content */}
        {command && !content.includes(command) && (
          <div className="whitespace-pre-wrap mb-2">
            <span className="text-green-500">ubuntu@sandbox:~ $</span>
            <span className="text-white"> {command}</span>
          </div>
        )}
        {parsedContent}
      </div>
    </div>
  );
}
