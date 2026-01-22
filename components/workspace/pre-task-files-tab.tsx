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
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-[14px] font-medium border bg-[#383838] text-[#aaa] border-[#4a4a4a] hover:bg-[#454545] hover:text-white hover:border-[#5a5a5a]"
          >
            <IconPlus size={16} />
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
        <div className="h-full flex flex-col items-center justify-center">
          <IconFolder size={40} className="text-[#555]" />
          <span className="text-[14px] text-[#888] mt-3">No files attached</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with upload button */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <span className="text-[14px] font-medium text-[#aaa]">
          {files.length} {files.length === 1 ? 'file' : 'files'}
        </span>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-[14px] font-medium border bg-[#383838] text-[#aaa] border-[#4a4a4a] hover:bg-[#454545] hover:text-white hover:border-[#5a5a5a]"
        >
          <IconPlus size={16} />
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
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="space-y-1">
          {files.map((file) => (
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
