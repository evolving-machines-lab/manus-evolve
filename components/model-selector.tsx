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
  isDefault?: boolean;
}

export const AVAILABLE_MODELS: AgentModel[] = [
  // Claude models (default: opus)
  {
    id: 'claude-opus',
    agent: 'claude',
    model: 'opus',
    displayName: 'Claude Opus',
    description: 'Most capable, complex reasoning',
    isDefault: true,
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
  // Codex models (default: gpt-5.2)
  {
    id: 'codex-gpt-5.2',
    agent: 'codex',
    model: 'gpt-5.2',
    displayName: 'Codex gpt-5.2',
    description: 'Latest general model',
    isDefault: true,
  },
  {
    id: 'codex-gpt-5.2-codex',
    agent: 'codex',
    model: 'gpt-5.2-codex',
    displayName: 'Codex gpt-5.2-codex',
    description: 'Optimized for coding tasks',
  },
  {
    id: 'codex-gpt-5.1-codex-max',
    agent: 'codex',
    model: 'gpt-5.1-codex-max',
    displayName: 'Codex gpt-5.1-codex-max',
    description: 'Maximum code capability',
  },
  {
    id: 'codex-gpt-5.1-mini',
    agent: 'codex',
    model: 'gpt-5.1-mini',
    displayName: 'Codex gpt-5.1-mini',
    description: 'Lightweight and fast',
  },
  // Gemini models (default: gemini-3-flash-preview)
  {
    id: 'gemini-3-pro-preview',
    agent: 'gemini',
    model: 'gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro',
    description: 'High capability multimodal',
  },
  {
    id: 'gemini-3-flash-preview',
    agent: 'gemini',
    model: 'gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash',
    description: 'Fast multimodal processing',
    isDefault: true,
  },
  {
    id: 'gemini-2.5-pro',
    agent: 'gemini',
    model: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    description: 'Stable pro model',
  },
  {
    id: 'gemini-2.5-flash',
    agent: 'gemini',
    model: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Stable fast model',
  },
  {
    id: 'gemini-2.5-flash-lite',
    agent: 'gemini',
    model: 'gemini-2.5-flash-lite',
    displayName: 'Gemini 2.5 Flash Lite',
    description: 'Lightweight multimodal',
  },
  // Qwen models (default: qwen3-coder-plus)
  {
    id: 'qwen-qwen3-coder-plus',
    agent: 'qwen',
    model: 'qwen3-coder-plus',
    displayName: 'Qwen3 Coder Plus',
    description: 'Code specialist',
    isDefault: true,
  },
  {
    id: 'qwen-qwen3-vl-plus',
    agent: 'qwen',
    model: 'qwen3-vl-plus',
    displayName: 'Qwen3 VL Plus',
    description: 'Vision-language model',
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
        <div className="absolute top-full left-0 mt-2 w-[280px] py-2 rounded-xl border border-border-subtle bg-bg-surface shadow-xl z-50 max-h-[400px] overflow-y-auto">
          {AGENT_GROUPS.map((group) => {
            const models = AVAILABLE_MODELS.filter(m => m.agent === group.agent);
            return (
              <div key={group.agent}>
                <div className="px-3 py-1.5 sticky top-0 bg-bg-surface">
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
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[13px]",
                            isSelected ? "text-text-primary font-medium" : "text-text-secondary"
                          )}>
                            {model.displayName}
                          </span>
                          {model.isDefault && (
                            <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-text-quaternary/20 text-text-tertiary">
                              default
                            </span>
                          )}
                        </div>
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
