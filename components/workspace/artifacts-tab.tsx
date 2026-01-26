'use client';

import { cn, formatBytes } from '@/lib/utils';
import type { Task, Artifact } from '@/lib/types';

interface ArtifactsTabProps {
  task: Task | null;
}

// Artifact type icon
function ArtifactIcon({ type, className }: { type: string; className?: string }) {
  if (type.includes('pdf')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={cn("text-red-400", className)}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (type.includes('image') || type.includes('png') || type.includes('jpg')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={cn("text-purple-400", className)}>
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
        <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (type.includes('json')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={cn("text-yellow-400", className)}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (type.includes('html') || type.includes('css')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={cn("text-blue-400", className)}>
        <polyline points="16 18 22 12 16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="8 6 2 12 8 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  // Default
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={cn("text-green-400", className)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function ArtifactsTab({ task }: ArtifactsTabProps) {
  const artifacts = task?.artifacts || [];

  const handleDownload = async (artifact: Artifact) => {
    try {
      // Fetch artifact content from download endpoint
      const response = await fetch(`/api/tasks/${task?.id}/artifacts/${artifact.id}`);

      if (!response.ok) {
        console.error('Failed to download artifact');
        return;
      }

      // Create blob from response
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = artifact.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading artifact:', error);
    }
  };

  if (!task) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#555]">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span className="text-[14px] text-[#888] mt-3">No artifacts yet</span>
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#555]">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span className="text-[14px] text-[#888] mt-3">No artifacts yet</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <span className="text-[14px] font-medium text-[#aaa]">
          {artifacts.length} {artifacts.length === 1 ? 'artifact' : 'artifacts'}
        </span>
      </div>

      {/* Artifacts list */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-1">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="group flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#3a3a3a] transition-colors"
            >
              <ArtifactIcon type={artifact.type} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-white truncate">{artifact.name}</p>
                <p className="text-[12px] text-[#888]">{formatBytes(artifact.size)}</p>
              </div>
              <button
                onClick={() => handleDownload(artifact)}
                className="opacity-0 group-hover:opacity-100 p-2 text-[#888] hover:text-white hover:bg-[#454545] rounded-lg transition-all"
                title="Download"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
