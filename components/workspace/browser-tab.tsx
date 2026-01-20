'use client';

import { IconGlobe } from '@/components/ui/icons';
import type { Task } from '@/lib/types';

interface BrowserTabProps {
  task: Task | null;
}

export function BrowserTab({ task }: BrowserTabProps) {
  return (
    <div className="h-full flex flex-col">
      {task?.browserUrl ? (
        <iframe
          src={task.browserUrl}
          className="w-full h-full border-0"
          title="Agent Browser"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <div className="h-full flex flex-col items-center justify-center">
          <IconGlobe size={32} className="text-text-quaternary" />
        </div>
      )}
    </div>
  );
}
