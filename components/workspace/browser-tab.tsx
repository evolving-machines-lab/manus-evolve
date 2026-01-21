'use client';

import { IconGlobe } from '@/components/ui/icons';
import type { Task } from '@/lib/types';

interface BrowserTabProps {
  task: Task | null;
}

export function BrowserTab({ task }: BrowserTabProps) {
  const hasLiveUrl = !!task?.browserLiveUrl;
  const hasScreenshot = !!task?.browserScreenshotUrl;

  return (
    <div className="h-full flex flex-col">
      {hasLiveUrl ? (
        // Live VNC view
        <iframe
          src={task.browserLiveUrl}
          className="w-full h-full border-0"
          title="Live Browser View"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : hasScreenshot ? (
        // Screenshot fallback
        <div className="w-full h-full flex items-center justify-center bg-bg-subtle p-4">
          <img
            src={task.browserScreenshotUrl}
            alt="Browser Screenshot"
            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
          />
        </div>
      ) : (
        // Empty state
        <div className="h-full flex flex-col items-center justify-center">
          <IconGlobe size={32} className="text-text-quaternary" />
        </div>
      )}
    </div>
  );
}
