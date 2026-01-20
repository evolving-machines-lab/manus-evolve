'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/workspace/sidebar';
import { IconAttach, IconPlug, IconMic, IconSkill, IconX, IconCheck } from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { generateId, cn } from '@/lib/utils';
import { AVAILABLE_SKILLS } from '@/lib/skills';

export default function HomePage() {
  const router = useRouter();
  const { projects, setProjects, addTask, setCurrentProject, setCurrentTask, integrations } = useStore();
  const [input, setInput] = useState('');
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const integrationsRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const connectedIntegrations = integrations.filter(i => i.connected);

  useEffect(() => {
    const stored = localStorage.getItem('swarmkit-projects');
    if (stored) {
      try {
        setProjects(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse projects:', e);
      }
    }
  }, [setProjects]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Close popups on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (integrationsRef.current && !integrationsRef.current.contains(e.target as Node)) {
        setShowIntegrations(false);
      }
      if (skillsRef.current && !skillsRef.current.contains(e.target as Node)) {
        setShowSkills(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = () => {
    if (!input.trim()) return;

    // Create a standalone task (no project)
    const taskId = generateId();
    const now = new Date().toISOString();

    const newTask = {
      id: taskId,
      projectId: 'standalone',
      title: input.trim().slice(0, 50),
      status: 'running' as const,
      prompt: input.trim(),
      messages: [{ id: generateId(), role: 'user' as const, content: input.trim(), timestamp: now }],
      progress: [],
      artifacts: [],
      createdAt: now,
      updatedAt: now,
    };

    // Save standalone task
    const existingTasks = JSON.parse(localStorage.getItem('swarmkit-tasks-standalone') || '[]');
    existingTasks.push(newTask);
    localStorage.setItem('swarmkit-tasks-standalone', JSON.stringify(existingTasks));

    setCurrentProject(null);
    addTask(newTask);
    setCurrentTask(newTask);

    router.push(`/task/${taskId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-screen bg-bg-base">
      <Sidebar />

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          {/* Greeting */}
          <h1 className="text-2xl font-medium text-text-primary text-center mb-8">
            What can I help you with?
          </h1>

          {/* Input box */}
          <div className={cn(
            'rounded-3xl border bg-bg-surface p-4 transition-all duration-150',
            'border-border-subtle',
            'focus-within:border-border-default'
          )}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send message to Manus"
              rows={1}
              className="w-full bg-transparent resize-none text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none min-h-[28px] max-h-[200px] mb-3"
            />
            {/* Bottom toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors" title="Attach files (select project first)">
                  <IconAttach size={18} />
                </button>
                <div className="relative" ref={integrationsRef}>
                  <button
                    onClick={() => setShowIntegrations(!showIntegrations)}
                    className={cn(
                      "w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center transition-colors",
                      showIntegrations ? "text-text-primary bg-bg-subtle" : "text-text-tertiary hover:text-text-secondary"
                    )}
                  >
                    <IconPlug size={18} />
                  </button>
                  {showIntegrations && (
                    <div className="absolute bottom-12 left-0 w-64 p-3 rounded-xl border border-border-subtle bg-bg-surface shadow-lg z-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-medium text-text-primary">Integrations</span>
                        <button onClick={() => setShowIntegrations(false)} className="p-1 text-text-tertiary hover:text-text-secondary">
                          <IconX size={14} />
                        </button>
                      </div>
                      {connectedIntegrations.length === 0 ? (
                        <p className="text-[12px] text-text-tertiary py-2">No integrations connected. Connect in Settings.</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {connectedIntegrations.map(i => (
                            <div key={i.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-overlay">
                              <IconCheck size={14} className="text-green-500" />
                              <span className="text-[13px] text-text-primary">{i.displayName}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative" ref={skillsRef}>
                  <button
                    onClick={() => setShowSkills(!showSkills)}
                    className={cn(
                      "w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center transition-colors",
                      showSkills ? "text-text-primary bg-bg-subtle" : "text-text-tertiary hover:text-text-secondary"
                    )}
                  >
                    <IconSkill size={18} />
                  </button>
                  {showSkills && (
                    <div className="absolute bottom-12 left-0 w-72 p-3 rounded-xl border border-border-subtle bg-bg-surface shadow-lg z-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-medium text-text-primary">Skills</span>
                        <button onClick={() => setShowSkills(false)} className="p-1 text-text-tertiary hover:text-text-secondary">
                          <IconX size={14} />
                        </button>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {AVAILABLE_SKILLS.slice(0, 8).map(s => (
                          <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg-overlay cursor-pointer">
                            <IconSkill size={14} className="text-text-tertiary" />
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] text-text-primary block">{s.displayName}</span>
                              <span className="text-[11px] text-text-tertiary truncate block">{s.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors" title="Voice input (coming soon)">
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
        </div>
      </main>
    </div>
  );
}
