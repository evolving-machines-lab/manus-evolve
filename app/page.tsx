'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/workspace/sidebar';
import { IconAttach, IconPlug, IconMic, IconSkill } from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { generateId, cn } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const { workspaces, setWorkspaces, addTask, setCurrentWorkspace, setCurrentTask } = useStore();
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('swarmkit-workspaces');
    if (stored) {
      try {
        setWorkspaces(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse workspaces:', e);
      }
    }
  }, [setWorkspaces]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    // Create a standalone task (no project)
    const taskId = generateId();
    const now = new Date().toISOString();

    const newTask = {
      id: taskId,
      workspaceId: 'standalone',
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

    setCurrentWorkspace(null);
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
              placeholder="Send message to Async"
              rows={1}
              className="w-full bg-transparent resize-none text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none min-h-[28px] max-h-[200px] mb-3"
            />
            {/* Bottom toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconAttach size={18} />
                </button>
                <button className="w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconPlug size={18} />
                </button>
                <button className="w-10 h-10 rounded-full bg-bg-overlay hover:bg-bg-subtle flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
                  <IconSkill size={18} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors">
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
