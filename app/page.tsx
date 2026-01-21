'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/workspace/sidebar';
import { SelectionModal } from '@/components/selection-modal';
import { ModelSelector, type ModelSelection } from '@/components/model-selector';
import { IconAttach, IconPlug, IconMic, IconSkill, IconX } from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { generateId, cn } from '@/lib/utils';
import { AVAILABLE_INTEGRATIONS } from '@/lib/integrations';
import { AVAILABLE_SKILLS } from '@/lib/skills';

export default function HomePage() {
  const router = useRouter();
  const { projects, setProjects, addTask, setCurrentProject, setCurrentTask } = useStore();
  const [input, setInput] = useState('');
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [modalTab, setModalTab] = useState<'integrations' | 'skills'>('integrations');
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [modelSelection, setModelSelection] = useState<ModelSelection>({ agent: 'claude', model: 'opus' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const getIntegrationName = (id: string) => {
    return AVAILABLE_INTEGRATIONS.find(i => i.id === id)?.displayName || id;
  };

  const getSkillName = (id: string) => {
    return AVAILABLE_SKILLS.find(s => s.id === id)?.displayName || id;
  };

  return (
    <div className="flex h-screen bg-bg-content">
      <Sidebar />

      <main className="flex-1 flex flex-col px-6 relative">
        {/* Model selector - top left */}
        <div className="absolute top-4 left-6">
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
                <button
                  className="w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle btn-bordered flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors"
                  title="Attach files (select project first)"
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
      </main>

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
    </div>
  );
}
