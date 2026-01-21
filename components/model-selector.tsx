'use client';

import { useState, useRef, useEffect } from 'react';
import { IconCheck, IconChevronDown } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export interface Agent {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

export const AVAILABLE_AGENTS: Agent[] = [
  {
    id: 'claude',
    name: 'Claude',
    description: 'Advanced reasoning and analysis',
    badge: 'Pro',
  },
  {
    id: 'codex',
    name: 'Codex',
    description: 'Specialized for code generation',
    badge: 'Pro',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Multimodal understanding',
  },
  {
    id: 'qwen',
    name: 'Qwen',
    description: 'Fast and efficient for everyday tasks',
  },
];

interface ModelSelectorProps {
  selectedAgent: string;
  onAgentChange: (agentId: string) => void;
}

export function ModelSelector({ selectedAgent, onAgentChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentAgent = AVAILABLE_AGENTS.find(a => a.id === selectedAgent) || AVAILABLE_AGENTS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-[14px] font-medium transition-colors",
          "bg-bg-surface hover:bg-bg-overlay border border-border-subtle",
          isOpen && "bg-bg-overlay"
        )}
      >
        <span className="text-text-primary">{currentAgent.name}</span>
        <IconChevronDown
          size={16}
          className={cn(
            "text-text-tertiary transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-[280px] p-2 rounded-xl border border-border-subtle bg-bg-surface shadow-xl z-50">
          {AVAILABLE_AGENTS.map((agent) => {
            const isSelected = agent.id === selectedAgent;
            return (
              <button
                key={agent.id}
                onClick={() => {
                  onAgentChange(agent.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-start gap-3 w-full p-3 rounded-lg text-left transition-colors",
                  isSelected ? "bg-bg-overlay" : "hover:bg-bg-overlay"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[14px] font-medium",
                      isSelected ? "text-text-primary" : "text-text-secondary"
                    )}>
                      {agent.name}
                    </span>
                    {agent.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-accent text-bg-base">
                        {agent.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-text-tertiary mt-0.5">
                    {agent.description}
                  </p>
                </div>
                {isSelected && (
                  <IconCheck size={18} className="text-text-primary mt-0.5 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
