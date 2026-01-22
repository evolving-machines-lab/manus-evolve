'use client';

import { useRef, useState } from 'react';
import { IconPlus, IconFolder } from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { cn, formatBytes, generateId } from '@/lib/utils';
import { FileIcon } from './file-icon';
import type { Project, ProjectFile, Task } from '@/lib/types';

interface FilesTabProps {
  project: Project;
  task?: Task | null;
}

export function FilesTab({ project, task }: FilesTabProps) {
  const { updateProject } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);

    const newFiles: ProjectFile[] = fileArray.map((file) => ({
      id: generateId(),
      name: file.name,
      path: `/${file.name}`,
      size: file.size,
      type: file.type || 'application/octet-stream',
    }));

    // Update frontend state
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

    // If there's an active task with a session, upload files to the sandbox
    // Check sessionId instead of status because status becomes 'completed' after each run
    if (task && task.sessionId) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        for (const file of fileArray) {
          // Use the file name as the key (will be placed in context/ folder)
          formData.append(file.name, file);
        }

        const response = await fetch(`/api/tasks/${task.id}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Failed to upload files to sandbox:', error);
        } else {
          console.log('Files uploaded to sandbox context/ folder');
        }
      } catch (error) {
        console.error('Error uploading files to sandbox:', error);
      } finally {
        setIsUploading(false);
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
            disabled={isUploading}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-[14px] font-medium border",
              isUploading
                ? "bg-[#353535] text-[#777] border-[#444] cursor-wait"
                : "bg-[#383838] text-[#aaa] border-[#4a4a4a] hover:bg-[#454545] hover:text-white hover:border-[#5a5a5a]"
            )}
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-[#888] border-t-transparent animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <IconPlus size={16} />
                <span>Add files</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
        <div className="h-full flex flex-col items-center justify-center">
          <IconFolder size={40} className="text-[#555]" />
          <span className="text-[14px] text-[#888] mt-3">No files yet</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with upload button */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <span className="text-[14px] font-medium text-[#aaa]">
          {project.files.length} {project.files.length === 1 ? 'file' : 'files'}
        </span>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-[14px] font-medium",
            isUploading
              ? "bg-[#3a3a3a] text-[#888] cursor-wait"
              : "bg-[#454545] text-white hover:bg-[#505050]"
          )}
        >
          {isUploading ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-[#888] border-t-transparent animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <IconPlus size={16} />
              <span>Add files</span>
            </>
          )}
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
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-1">
          {project.files.map((file) => (
            <div
              key={file.id}
              className="group flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#3a3a3a] transition-colors"
            >
              <FileIcon type={file.type} />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-white truncate">{file.name}</p>
                <p className="text-[12px] text-[#888]">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={() => handleDeleteFile(file.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-[#888] hover:text-red-400 hover:bg-[#454545] rounded-lg transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
