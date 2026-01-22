'use client';

import { useState } from 'react';
import { IconChevronDown, IconTerminal, IconEdit, IconGlobe, IconSearch } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { ToolCall, MessagePart } from '@/lib/types';

interface ActivityLogProps {
  /** Full parts array with interleaved text and tool calls */
  parts: MessagePart[];
  isRunning?: boolean;
  onToolCallClick?: (toolCall: ToolCall) => void;
  /** Number of recent items to show when collapsed */
  visibleCount?: number;
}

// Map tool kind to icon
function getToolIcon(kind?: string, name?: string, size = 14, className = "text-text-tertiary") {
  const nameLower = name?.toLowerCase() || '';

  // Browser tools
  if (nameLower.includes('browser-use') || nameLower.includes('browser_task') ||
      nameLower.includes('monitor_task') || kind === 'browser' || kind === 'fetch') {
    return <IconGlobe size={size} className={className} />;
  }

  // Search tools
  if (kind === 'search') {
    return <IconSearch size={size} className={className} />;
  }

  // Editor tools
  if (['read', 'edit', 'write', 'delete', 'move'].includes(kind || '')) {
    return <IconEdit size={size} className={className} />;
  }

  // Default: terminal
  return <IconTerminal size={size} className={className} />;
}

// Map tool kind to display name
function getToolDisplayName(kind?: string, name?: string): string {
  const nameLower = name?.toLowerCase() || '';

  if (nameLower.includes('browser-use') || nameLower.includes('browser_task') ||
      nameLower.includes('monitor_task') || kind === 'browser' || kind === 'fetch') {
    return 'Browser';
  }
  if (kind === 'search') return 'Search';
  if (['read', 'edit', 'write', 'delete', 'move'].includes(kind || '')) return 'Editor';
  return 'Terminal';
}

// Truncate and format command for display
function formatCommand(command: string, maxLength = 40): string {
  // Remove leading/trailing whitespace
  const cleaned = command.trim();
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength) + '...';
}

// Compact tool call item for the activity log
function ActivityItem({
  toolCall,
  onClick,
  isLast
}: {
  toolCall: ToolCall;
  onClick?: () => void;
  isLast?: boolean;
}) {
  const isCompleted = toolCall.status === 'completed';
  const isRunning = toolCall.status === 'in_progress' || toolCall.status === 'pending';
  const isFailed = toolCall.status === 'failed';

  // Get display text - format nicely without backticks, truncate long commands
  const displayText = toolCall.title ||
    (toolCall.filePath ? toolCall.filePath.split('/').pop() : null) ||
    (toolCall.command ? formatCommand(toolCall.command, 40) : null) ||
    toolCall.name;

  return (
    <div className="flex items-stretch gap-3 group">
      {/* Dashed line and status indicator */}
      <div className="relative flex flex-col items-center w-5">
        {/* Continuous dashed line behind the dot */}
        {!isLast && (
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-[#444]" />
        )}
        {/* Status dot - solid bg to cover the dashed line */}
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 z-10 mt-0.5",
          isCompleted ? "bg-[#1a3a1a]" :
          isFailed ? "bg-[#3a1a1a]" :
          "bg-[#2f2f2f]"
        )}>
          {isRunning ? (
            <div className="w-2 h-2 rounded-full border border-accent border-t-transparent animate-spin" />
          ) : isCompleted ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-green-500">
              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : isFailed ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-red-500">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <div className="w-2 h-2 rounded-full bg-text-quaternary" />
          )}
        </div>
      </div>

      {/* Content */}
      <div
        onClick={onClick}
        className={cn(
          "flex-1 pb-4 cursor-pointer group-hover:opacity-80 transition-opacity",
          isLast && "pb-0"
        )}
      >
        <div className="flex items-center gap-2 text-[13px]">
          {getToolIcon(toolCall.kind, toolCall.name, 12, "text-text-secondary")}
          <span className="text-text-secondary">{getToolDisplayName(toolCall.kind, toolCall.name)}</span>
          {toolCall.filePath && (
            <span className="text-text-tertiary truncate max-w-[200px]">
              {toolCall.filePath.split('/').pop()}
            </span>
          )}
        </div>
        {/* Command with nice formatting */}
        {toolCall.command && (
          <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#252525] max-w-full">
            <span className="text-[11px] text-text-tertiary">$</span>
            <code className="text-[11px] text-text-secondary font-mono truncate">
              {formatCommand(toolCall.command, 50)}
            </code>
          </div>
        )}
        {/* Title or name if no command */}
        {!toolCall.command && displayText && (
          <div className="text-[13px] text-text-primary mt-0.5 truncate">
            {displayText}
          </div>
        )}
      </div>
    </div>
  );
}

// Interleaved text item (smaller styling)
function TextItem({ content, isLast }: { content: string; isLast?: boolean }) {
  return (
    <div className="flex items-stretch gap-3">
      {/* Dashed line continuation */}
      <div className="relative flex flex-col items-center w-5">
        {/* Continuous dashed line behind the dot */}
        {!isLast && (
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-[#444]" />
        )}
        {/* Small dot for text items */}
        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 z-10 mt-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#555]" />
        </div>
      </div>
      {/* Text content - smaller but readable */}
      <div className={cn("flex-1 text-[13px] text-text-secondary leading-relaxed pb-4", isLast && "pb-0")}>
        {content}
      </div>
    </div>
  );
}

export function ActivityLog({
  parts,
  isRunning = false,
  onToolCallClick,
  visibleCount = 5
}: ActivityLogProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (parts.length === 0) return null;

  // Count tool calls for the "show more" logic
  const toolCallCount = parts.filter(p => p.type === 'tool_call').length;
  const hasMore = parts.length > visibleCount;
  const hiddenCount = parts.length - visibleCount;

  // When collapsed, show only the last N items
  // When expanded, show all
  const visibleItems = isExpanded
    ? parts
    : parts.slice(-visibleCount);

  // When running, always show expanded to see progress
  const effectiveExpanded = isRunning || isExpanded;
  const effectiveItems = effectiveExpanded ? parts : visibleItems;

  return (
    <div className="my-4">
      {/* Collapse/expand header when there are hidden items */}
      {hasMore && !isRunning && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-[13px] text-text-tertiary hover:text-text-secondary transition-colors mb-3 group"
        >
          <div className="flex items-center gap-1.5">
            <IconChevronDown
              size={14}
              className={cn(
                "transition-transform",
                isExpanded && "rotate-180"
              )}
            />
            <span>
              {isExpanded
                ? `Hide ${hiddenCount} items`
                : `Show ${hiddenCount} more`
              }
            </span>
          </div>
          <div className="flex-1 h-px bg-[#333] group-hover:bg-[#444] transition-colors" />
        </button>
      )}

      {/* Activity items - interleaved text and tool calls */}
      <div className="pl-1">
        {effectiveItems.map((part, idx) => {
          const isLast = idx === effectiveItems.length - 1;

          if (part.type === 'text') {
            return (
              <TextItem
                key={`text-${idx}`}
                content={part.content}
                isLast={isLast}
              />
            );
          } else {
            return (
              <ActivityItem
                key={part.toolCall.id || `tc-${idx}`}
                toolCall={part.toolCall}
                onClick={() => onToolCallClick?.(part.toolCall)}
                isLast={isLast}
              />
            );
          }
        })}
      </div>
    </div>
  );
}
