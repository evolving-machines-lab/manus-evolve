'use client';

import { useState, useRef, useEffect } from 'react';
import { IconCheck, IconChevronDown } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export interface AgentModel {
  id: string;
  agent: 'claude' | 'codex' | 'gemini' | 'qwen';
  model: string;
  displayName: string;
  description: string;
}

export const AVAILABLE_MODELS: AgentModel[] = [
  // Claude models
  {
    id: 'claude-opus',
    agent: 'claude',
    model: 'opus',
    displayName: 'Claude Opus',
    description: 'Most capable, complex reasoning',
  },
  {
    id: 'claude-sonnet',
    agent: 'claude',
    model: 'sonnet',
    displayName: 'Claude Sonnet',
    description: 'Balanced performance and speed',
  },
  {
    id: 'claude-haiku',
    agent: 'claude',
    model: 'haiku',
    displayName: 'Claude Haiku',
    description: 'Fast and efficient',
  },
  // Codex models
  {
    id: 'codex-gpt52',
    agent: 'codex',
    model: 'gpt-5.2',
    displayName: 'Codex GPT-5.2',
    description: 'Advanced code generation',
  },
  {
    id: 'codex-gpt52-codex',
    agent: 'codex',
    model: 'gpt-5.2-codex',
    displayName: 'Codex Specialized',
    description: 'Optimized for coding tasks',
  },
  // Gemini models
  {
    id: 'gemini-pro',
    agent: 'gemini',
    model: 'gemini-3-pro-preview',
    displayName: 'Gemini Pro',
    description: 'High capability multimodal',
  },
  {
    id: 'gemini-flash',
    agent: 'gemini',
    model: 'gemini-3-flash-preview',
    displayName: 'Gemini Flash',
    description: 'Fast multimodal processing',
  },
  // Qwen models
  {
    id: 'qwen-coder',
    agent: 'qwen',
    model: 'qwen3-coder-plus',
    displayName: 'Qwen Coder',
    description: 'Open-source code specialist',
  },
];

// Group models by agent
const AGENT_GROUPS = [
  { agent: 'claude', label: 'Claude' },
  { agent: 'codex', label: 'Codex' },
  { agent: 'gemini', label: 'Gemini' },
  { agent: 'qwen', label: 'Qwen' },
] as const;

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

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
        <span className="text-text-primary">{currentModel.displayName}</span>
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
        <div className="absolute top-full left-0 mt-2 w-[260px] py-2 rounded-xl border border-border-subtle bg-bg-surface shadow-xl z-50">
          {AGENT_GROUPS.map((group) => {
            const models = AVAILABLE_MODELS.filter(m => m.agent === group.agent);
            return (
              <div key={group.agent}>
                <div className="px-3 py-1.5">
                  <span className="text-[11px] font-medium text-text-quaternary uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                {models.map((model) => {
                  const isSelected = model.id === selectedModel;
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        onModelChange(model.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors",
                        isSelected ? "bg-bg-overlay" : "hover:bg-bg-overlay"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "text-[13px]",
                          isSelected ? "text-text-primary font-medium" : "text-text-secondary"
                        )}>
                          {model.displayName}
                        </span>
                        <p className="text-[11px] text-text-tertiary">
                          {model.description}
                        </p>
                      </div>
                      {isSelected && (
                        <IconCheck size={16} className="text-text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
