'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SelectionModal } from '@/components/selection-modal';
import { ModelSelector, type ModelSelection } from '@/components/model-selector';
import { IconAttach, IconPlug, IconMic, IconSkill, IconX } from '@/components/ui/icons';
import { RightPanelTabs } from '@/components/workspace/right-panel-tabs';
import { useStore } from '@/lib/store';
import { generateId, cn } from '@/lib/utils';
import { AVAILABLE_INTEGRATIONS } from '@/lib/integrations';
import { AVAILABLE_SKILLS } from '@/lib/skills';

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string | ArrayBuffer;
}

export default function HomePage() {
  const router = useRouter();
  const { projects, setProjects, addTask, setCurrentProject, setCurrentTask } = useStore();
  const [input, setInput] = useState('');
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [modalTab, setModalTab] = useState<'integrations' | 'skills'>('integrations');
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [modelSelection, setModelSelection] = useState<ModelSelection>({ agent: 'claude', model: 'opus' });
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const apiProjects = await response.json();
          setProjects(apiProjects);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };
    fetchProjects();
  }, [setProjects]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    const prompt = input.trim();
    setInput(''); // Clear input immediately

    // Prepare context files from attachments (encode binary as base64)
    const contextFiles = attachedFiles.map(f => ({
      name: f.name,
      path: f.name,
      type: f.type,
      content: typeof f.content === 'string'
        ? f.content
        : arrayBufferToBase64(f.content as ArrayBuffer),
      isBase64: typeof f.content !== 'string',
    }));

    try {
      // Create task via API
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'standalone',
          title: prompt.slice(0, 50),
          prompt,
          agent: modelSelection.agent,
          model: modelSelection.model,
          integrations: selectedIntegrations,
          skills: selectedSkills,
          contextFiles,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create task');
      }

      const createdTask = await response.json();

      // Build task object for store
      const newTask = {
        id: createdTask.id,
        projectId: 'standalone',
        title: createdTask.title,
        prompt: createdTask.prompt,
        status: 'pending' as const,
        messages: createdTask.messages || [],
        progress: [],
        artifacts: [],
        integrations: selectedIntegrations,
        skills: selectedSkills,
        agent: modelSelection.agent,
        model: modelSelection.model,
        createdAt: createdTask.createdAt,
        updatedAt: createdTask.updatedAt,
      };

      // Update store
      setCurrentProject(null);
      addTask(newTask);
      setCurrentTask(newTask);

      // Clear attached files
      setAttachedFiles([]);

      // Navigate to task page (which will start the agent)
      router.push(`/task/${createdTask.id}`);
    } catch (error) {
      console.error('Error creating task:', error);
      setInput(prompt); // Restore input on error
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const openIntegrationsModal = () => {
    setModalTab('integrations');
    setShowSelectionModal(true);
  };

  const openSkillsModal = () => {
    setModalTab('skills');
    setShowSelectionModal(true);
  };

  const removeIntegration = (id: string) => {
    setSelectedIntegrations(prev => prev.filter(i => i !== id));
  };

  const removeSkill = (id: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== id));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: AttachedFile[] = [];
    for (const file of Array.from(files)) {
      const content = await readFileContent(file);
      newFiles.push({
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        content,
      });
    }
    setAttachedFiles(prev => [...prev, ...newFiles]);

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileContent = (file: File): Promise<string | ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(reader.error);

      // Read text files as text, binary files as ArrayBuffer
      const textTypes = ['text/', 'application/json', 'application/javascript', 'application/xml'];
      const isText = textTypes.some(t => file.type.startsWith(t)) || file.name.match(/\.(txt|md|csv|json|js|ts|tsx|jsx|py|html|css|yaml|yml|xml|env|gitignore|sh|bash)$/i);

      if (isText) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const getIntegrationName = (id: string) => {
    return AVAILABLE_INTEGRATIONS.find(i => i.id === id)?.displayName || id;
  };

  const getSkillName = (id: string) => {
    return AVAILABLE_SKILLS.find(s => s.id === id)?.displayName || id;
  };

  // Handle metadata changes from PreTaskFilesTab (for deletions)
  const handlePreTaskFilesChange = (newFiles: { id: string; name: string; size: number; type: string }[]) => {
    // Filter attachedFiles to only keep files that exist in newFiles
    const newIds = new Set(newFiles.map(f => f.id));
    setAttachedFiles(prev => prev.filter(f => newIds.has(f.id)));
  };

  // Handle new files added from PreTaskFilesTab
  const handlePreTaskFilesAdded = async (files: File[]) => {
    const newFiles: AttachedFile[] = [];
    for (const file of files) {
      const content = await readFileContent(file);
      newFiles.push({
        id: generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        content,
      });
    }
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  // Convert attachedFiles to PreTaskFile format (metadata only) for RightPanelTabs
  const preTaskFiles = attachedFiles.map(f => ({
    id: f.id,
    name: f.name,
    size: f.size,
    type: f.type,
  }));

  return (
    <div className="flex-1 flex">
    <main className={cn(
      "flex flex-col px-6 relative bg-bg-content transition-all duration-300",
      showRightPanel ? "w-1/2" : "flex-1"
    )}>
        {/* Model selector - top left */}
        <div className="absolute top-0 left-0 right-0 h-14 flex items-center px-4 gap-3">
          <ModelSelector
            selection={modelSelection}
            onSelectionChange={setModelSelection}
          />
        </div>

        {/* Center content */}
        <div className="flex-1 flex flex-col items-center justify-start pt-[20vh]">
          <div className="w-full max-w-2xl">
            {/* Greeting */}
            <h1 className="text-2xl font-medium text-text-primary text-center mb-8">
              What can I help you with?
            </h1>

          {/* Input box */}
          <div className={cn(
            'rounded-3xl border bg-[#2f2f2f] p-4 transition-all duration-150 shadow-sm',
            'border-[#444444]',
            'focus-within:border-[#555555]'
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send message to Manus"
              rows={1}
              className="w-full bg-transparent resize-none text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none min-h-[28px] max-h-[200px] overflow-y-auto mb-3"
            />

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => setShowRightPanel(true)}
                  className={cn(
                    "w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle btn-bordered flex items-center justify-center transition-colors",
                    attachedFiles.length > 0 ? "text-accent" : "text-text-tertiary hover:text-text-secondary"
                  )}
                  title="Attach files"
                >
                  <IconAttach size={18} />
                </button>
                <button
                  onClick={openIntegrationsModal}
                  className={cn(
                    "w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle btn-bordered flex items-center justify-center transition-colors",
                    selectedIntegrations.length > 0 ? "text-accent" : "text-text-tertiary hover:text-text-secondary"
                  )}
                  title="Select integrations"
                >
                  <IconPlug size={18} />
                </button>
                <button
                  onClick={openSkillsModal}
                  className={cn(
                    "w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle btn-bordered flex items-center justify-center transition-colors",
                    selectedSkills.length > 0 ? "text-accent" : "text-text-tertiary hover:text-text-secondary"
                  )}
                  title="Select skills"
                >
                  <IconSkill size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors"
                  title="Voice input (coming soon)"
                >
                  <IconMic size={18} />
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150',
                    input.trim()
                      ? 'bg-text-secondary text-bg-base hover:bg-text-primary'
                      : 'bg-bg-overlay text-text-quaternary cursor-not-allowed'
                  )}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Integrations and Skills side by side */}
          <div className="mt-12 flex gap-8">
            {/* Selected Integrations section */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <IconPlug size={18} className="text-text-primary" />
                <span className="text-[15px] font-medium text-text-primary">Integrations</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {selectedIntegrations.map(id => (
                  <div
                    key={id}
                    className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl bg-accent-muted text-[13px] text-text-primary"
                  >
                    <span>{getIntegrationName(id)}</span>
                    <button
                      onClick={() => removeIntegration(id)}
                      className="p-1 rounded-full hover:bg-accent-muted text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={openIntegrationsModal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-border-subtle text-[13px] text-text-tertiary hover:text-text-secondary hover:border-border-default transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Selected Skills section */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <IconSkill size={18} className="text-text-primary" />
                <span className="text-[15px] font-medium text-text-primary">Skills</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {selectedSkills.map(id => (
                  <div
                    key={id}
                    className="flex items-center gap-2 pl-3 pr-2 py-2 rounded-xl bg-accent-muted text-[13px] text-text-primary"
                  >
                    <span>{getSkillName(id)}</span>
                    <button
                      onClick={() => removeSkill(id)}
                      className="p-1 rounded-full hover:bg-accent-muted text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      <IconX size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={openSkillsModal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-dashed border-border-subtle text-[13px] text-text-tertiary hover:text-text-secondary hover:border-border-default transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>

      {/* Selection Modal */}
      <SelectionModal
        isOpen={showSelectionModal}
        onClose={() => setShowSelectionModal(false)}
        selectedIntegrations={selectedIntegrations}
        selectedSkills={selectedSkills}
        onIntegrationsChange={setSelectedIntegrations}
        onSkillsChange={setSelectedSkills}
        initialTab={modalTab}
      />
    </main>

    {/* Right Panel - Reuses RightPanelTabs component, always mounted to avoid flicker */}
    <div className={showRightPanel ? "w-1/2 flex flex-col overflow-hidden" : "hidden"}>
      <RightPanelTabs
        project={null}
        task={null}
        onClose={() => setShowRightPanel(false)}
        defaultTab="files"
        isOpen={showRightPanel}
        preTaskFiles={preTaskFiles}
        onPreTaskFilesChange={handlePreTaskFilesChange}
        onPreTaskFilesAdded={handlePreTaskFilesAdded}
      />
    </div>
    </div>
  );
}
