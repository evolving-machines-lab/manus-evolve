'use client';

import { useState } from 'react';
import { IconChevronDown } from '@/components/ui/icons';
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
    <div className="flex items-start gap-3 group">
      {/* Status indicator - matching right panel style */}
      <div className="flex-shrink-0 mt-0.5">
        {isCompleted ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-500">
            <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : isRunning ? (
          <div className="w-[18px] h-[18px] rounded-full bg-blue-500" />
        ) : isFailed ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-red-500">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-text-quaternary">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )}
      </div>

      {/* Content */}
      <div
        onClick={onClick}
        className={cn(
          "flex-1 cursor-pointer group-hover:opacity-80 transition-opacity",
          !isLast && "pb-3"
        )}
      >
        {/* Command with nice formatting */}
        {toolCall.command ? (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#252525] max-w-full">
            <span className="text-[11px] text-text-tertiary">$</span>
            <code className="text-[12px] text-text-secondary font-mono truncate">
              {formatCommand(toolCall.command, 50)}
            </code>
          </div>
        ) : (
          /* Title or name if no command */
          <span className={cn(
            "text-[13px] leading-relaxed",
            isCompleted ? "text-text-primary" :
            isRunning ? "text-text-primary" :
            "text-text-tertiary"
          )}>
            {displayText}
          </span>
        )}
      </div>
    </div>
  );
}

// Interleaved text item (smaller styling)
function TextItem({ content, isLast }: { content: string; isLast?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      {/* Small dot for text items - matching the 18px width */}
      <div className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 mt-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#555]" />
      </div>
      {/* Text content - smaller but readable */}
      <div className={cn("flex-1 text-[13px] text-text-secondary leading-relaxed", !isLast && "pb-3")}>
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
