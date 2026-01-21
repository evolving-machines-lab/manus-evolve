'use client';

import { useRef } from 'react';
import { IconPlus, IconFolder } from '@/components/ui/icons';
import { formatBytes, generateId } from '@/lib/utils';
import { FileIcon } from './file-icon';

interface PreTaskFile {
  id: string;
  name: string;
  size: number;
  type: string;
}

interface PreTaskFilesTabProps {
  files: PreTaskFile[];
  onFilesChange: (files: PreTaskFile[]) => void;
  onFilesAdded?: (files: File[]) => void;
}

export function PreTaskFilesTab({ files, onFilesChange, onFilesAdded }: PreTaskFilesTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);

    const newFiles: PreTaskFile[] = fileArray.map((file) => ({
      id: generateId(),
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
    }));

    onFilesChange([...files, ...newFiles]);

    // Pass actual File objects to parent for content reading
    if (onFilesAdded) {
      onFilesAdded(fileArray);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = (fileId: string) => {
    onFilesChange(files.filter((f) => f.id !== fileId));
  };

  if (files.length === 0) {
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
        <div className="h-full flex flex-col items-center justify-center gap-3">
          <IconFolder size={32} className="text-text-quaternary" />
          <p className="text-[13px] text-text-tertiary">No files attached</p>
          <p className="text-[12px] text-text-quaternary">Upload files to share with the agent</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with upload button */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="text-[13px] text-text-tertiary">
          {files.length} {files.length === 1 ? 'file' : 'files'}
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
          {files.map((file) => (
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
