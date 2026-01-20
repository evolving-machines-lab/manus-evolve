'use client';

import { useRef } from 'react';
import { IconPlus, IconFolder } from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { cn, formatBytes, generateId } from '@/lib/utils';
import type { Project, ProjectFile } from '@/lib/types';

interface FilesTabProps {
  project: Project;
}

// File type icon
function FileIcon({ type, className }: { type: string; className?: string }) {
  // Determine icon based on file type
  if (type.includes('pdf')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={cn("text-red-400", className)}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }
  if (type.includes('image')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={cn("text-purple-400", className)}>
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
        <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
        <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  if (type.includes('json') || type.includes('javascript') || type.includes('typescript')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={cn("text-yellow-400", className)}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 13h2l1 3 1-3h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  // Default document icon
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={cn("text-text-tertiary", className)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function FilesTab({ project }: FilesTabProps) {
  const { updateProject } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: ProjectFile[] = Array.from(files).map((file) => ({
      id: generateId(),
      name: file.name,
      path: `/${file.name}`,
      size: file.size,
      type: file.type || 'application/octet-stream',
    }));

    updateProject(project.id, {
      files: [...project.files, ...newFiles],
    });

    // Save to localStorage
    const stored = localStorage.getItem('swarmkit-projects');
    if (stored) {
      const projects = JSON.parse(stored);
      const idx = projects.findIndex((p: Project) => p.id === project.id);
      if (idx !== -1) {
        projects[idx].files = [...project.files, ...newFiles];
        localStorage.setItem('swarmkit-projects', JSON.stringify(projects));
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = (fileId: string) => {
    const updatedFiles = project.files.filter((f) => f.id !== fileId);
    updateProject(project.id, { files: updatedFiles });

    // Save to localStorage
    const stored = localStorage.getItem('swarmkit-projects');
    if (stored) {
      const projects = JSON.parse(stored);
      const idx = projects.findIndex((p: Project) => p.id === project.id);
      if (idx !== -1) {
        projects[idx].files = updatedFiles;
        localStorage.setItem('swarmkit-projects', JSON.stringify(projects));
      }
    }
  };

  if (project.files.length === 0) {
    return (
      <div className="h-full relative">
        <div className="absolute top-4 right-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-overlay hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-colors text-[13px]"
          >
            <IconPlus size={14} />
            <span>Add files</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
        <div className="h-full flex items-center justify-center">
          <IconFolder size={32} className="text-text-quaternary" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with upload button */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="text-[13px] text-text-tertiary">
          {project.files.length} {project.files.length === 1 ? 'file' : 'files'}
        </span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-overlay hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-colors text-[13px]"
        >
          <IconPlus size={14} />
          <span>Add files</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Files list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <div className="space-y-1">
          {project.files.map((file) => (
            <div
              key={file.id}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-overlay transition-colors"
            >
              <FileIcon type={file.type} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] text-text-primary truncate">{file.name}</p>
                <p className="text-[12px] text-text-quaternary">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={() => handleDeleteFile(file.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-text-tertiary hover:text-error transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
