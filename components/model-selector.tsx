'use client';

import { useState, useRef, useEffect } from 'react';
import { IconCheck, IconChevronDown, IconChevronRight } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export interface AgentType {
  id: 'claude' | 'codex' | 'gemini' | 'qwen';
  name: string;
  description: string;
  defaultModel: string;
  models: AgentModel[];
}

export interface AgentModel {
  id: string;
  model: string;
  displayName: string;
  description: string;
  isDefault?: boolean;
}

export const AGENT_TYPES: AgentType[] = [
  {
    id: 'claude',
    name: 'Claude',
    description: 'Anthropic',
    defaultModel: 'opus',
    models: [
      { id: 'opus', model: 'opus', displayName: 'Opus', description: 'Most capable, complex reasoning', isDefault: true },
      { id: 'sonnet', model: 'sonnet', displayName: 'Sonnet', description: 'Balanced performance and speed' },
      { id: 'haiku', model: 'haiku', displayName: 'Haiku', description: 'Fast and efficient' },
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    description: 'OpenAI',
    defaultModel: 'gpt-5.2',
    models: [
      { id: 'gpt-5.2', model: 'gpt-5.2', displayName: 'gpt-5.2', description: 'Latest general model', isDefault: true },
      { id: 'gpt-5.2-codex', model: 'gpt-5.2-codex', displayName: 'gpt-5.2-codex', description: 'Optimized for coding' },
      { id: 'gpt-5.1-codex-max', model: 'gpt-5.1-codex-max', displayName: 'gpt-5.1-codex-max', description: 'Maximum capability' },
      { id: 'gpt-5.1-mini', model: 'gpt-5.1-mini', displayName: 'gpt-5.1-mini', description: 'Lightweight and fast' },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google',
    defaultModel: 'gemini-3-flash-preview',
    models: [
      { id: 'gemini-3-pro-preview', model: 'gemini-3-pro-preview', displayName: 'Gemini 3 Pro', description: 'High capability multimodal' },
      { id: 'gemini-3-flash-preview', model: 'gemini-3-flash-preview', displayName: 'Gemini 3 Flash', description: 'Fast multimodal', isDefault: true },
      { id: 'gemini-2.5-pro', model: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', description: 'Stable pro model' },
      { id: 'gemini-2.5-flash', model: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', description: 'Stable fast model' },
      { id: 'gemini-2.5-flash-lite', model: 'gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash Lite', description: 'Lightweight' },
    ],
  },
  {
    id: 'qwen',
    name: 'Qwen',
    description: 'Alibaba',
    defaultModel: 'qwen3-coder-plus',
    models: [
      { id: 'qwen3-coder-plus', model: 'qwen3-coder-plus', displayName: 'Qwen3 Coder Plus', description: 'Code specialist', isDefault: true },
      { id: 'qwen3-vl-plus', model: 'qwen3-vl-plus', displayName: 'Qwen3 VL Plus', description: 'Vision-language model' },
    ],
  },
];

export interface ModelSelection {
  agent: 'claude' | 'codex' | 'gemini' | 'qwen';
  model: string;
}

interface ModelSelectorProps {
  selection: ModelSelection;
  onSelectionChange: (selection: ModelSelection) => void;
}

export function ModelSelector({ selection, onSelectionChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentAgent = AGENT_TYPES.find(a => a.id === selection.agent) || AGENT_TYPES[0];
  const currentModel = currentAgent.models.find(m => m.model === selection.model);
  const isDefaultModel = currentModel?.isDefault;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setExpandedAgent(null);
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
        setExpandedAgent(null);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleAgentSelect = (agent: AgentType) => {
    // Select agent with its default model
    onSelectionChange({ agent: agent.id, model: agent.defaultModel });
    setIsOpen(false);
    setExpandedAgent(null);
  };

  const handleModelSelect = (agent: AgentType, model: AgentModel) => {
    onSelectionChange({ agent: agent.id, model: model.model });
    setIsOpen(false);
    setExpandedAgent(null);
  };

  const displayName = isDefaultModel
    ? currentAgent.name
    : `${currentAgent.name} ${currentModel?.displayName || ''}`;

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
        <span className="text-text-primary">{displayName}</span>
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
        <div className="absolute top-full left-0 mt-2 w-[240px] py-1.5 rounded-xl border border-border-subtle bg-bg-surface shadow-xl z-50">
          {AGENT_TYPES.map((agent) => {
            const isSelected = agent.id === selection.agent;
            const isExpanded = expandedAgent === agent.id;

            return (
              <div key={agent.id}>
                {/* Agent row */}
                <div className="flex items-center">
                  <button
                    onClick={() => handleAgentSelect(agent)}
                    className={cn(
                      "flex-1 flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      isSelected && !isExpanded ? "bg-bg-overlay" : "hover:bg-bg-overlay"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        "text-[13px]",
                        isSelected ? "text-text-primary font-medium" : "text-text-secondary"
                      )}>
                        {agent.name}
                      </span>
                      <p className="text-[11px] text-text-tertiary">
                        {agent.description}
                      </p>
                    </div>
                    {isSelected && !isExpanded && (
                      <IconCheck size={16} className="text-text-primary shrink-0" />
                    )}
                  </button>

                  {/* Expand button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedAgent(isExpanded ? null : agent.id);
                    }}
                    className="p-2 mr-1 text-text-tertiary hover:text-text-secondary hover:bg-bg-overlay rounded-lg transition-colors"
                  >
                    <IconChevronRight
                      size={14}
                      className={cn("transition-transform duration-200", isExpanded && "rotate-90")}
                    />
                  </button>
                </div>

                {/* Model submenu */}
                {isExpanded && (
                  <div className="ml-3 mr-1 mb-1 py-1 border-l border-border-subtle">
                    {agent.models.map((model) => {
                      const isModelSelected = isSelected && selection.model === model.model;
                      return (
                        <button
                          key={model.id}
                          onClick={() => handleModelSelect(agent, model)}
                          className={cn(
                            "flex items-center gap-2 w-full pl-3 pr-2 py-2 text-left transition-colors rounded-r-lg",
                            isModelSelected ? "bg-bg-overlay" : "hover:bg-bg-overlay"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "text-[12px]",
                                isModelSelected ? "text-text-primary font-medium" : "text-text-secondary"
                              )}>
                                {model.displayName}
                              </span>
                              {model.isDefault && (
                                <span className="px-1 py-0.5 text-[8px] font-medium rounded bg-text-quaternary/20 text-text-quaternary">
                                  default
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-text-tertiary truncate">
                              {model.description}
                            </p>
                          </div>
                          {isModelSelected && (
                            <IconCheck size={14} className="text-text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
