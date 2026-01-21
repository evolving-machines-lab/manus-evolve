'use client';

import { useState, useRef, useEffect } from 'react';
import { IconCheck, IconChevronDown } from '@/components/ui/icons';
import { cn } from '@/lib/utils';

export interface AgentType {
  id: 'claude' | 'codex' | 'gemini' | 'qwen';
  name: string;
  provider: string;
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
    provider: 'Anthropic',
    defaultModel: 'opus',
    models: [
      { id: 'opus', model: 'opus', displayName: 'Opus', description: 'Most capable', isDefault: true },
      { id: 'sonnet', model: 'sonnet', displayName: 'Sonnet', description: 'Balanced' },
      { id: 'haiku', model: 'haiku', displayName: 'Haiku', description: 'Fast' },
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    provider: 'OpenAI',
    defaultModel: 'gpt-5.2',
    models: [
      { id: 'gpt-5.2', model: 'gpt-5.2', displayName: 'GPT-5.2', description: 'Latest', isDefault: true },
      { id: 'gpt-5.2-codex', model: 'gpt-5.2-codex', displayName: 'GPT-5.2 Codex', description: 'Code optimized' },
      { id: 'gpt-5.1-codex-max', model: 'gpt-5.1-codex-max', displayName: 'GPT-5.1 Max', description: 'Maximum capability' },
      { id: 'gpt-5.1-mini', model: 'gpt-5.1-mini', displayName: 'GPT-5.1 Mini', description: 'Lightweight' },
    ],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    provider: 'Google',
    defaultModel: 'gemini-3-flash-preview',
    models: [
      { id: 'gemini-3-pro-preview', model: 'gemini-3-pro-preview', displayName: 'Gemini 3 Pro', description: 'Most capable' },
      { id: 'gemini-3-flash-preview', model: 'gemini-3-flash-preview', displayName: 'Gemini 3 Flash', description: 'Fast', isDefault: true },
      { id: 'gemini-2.5-pro', model: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', description: 'Stable' },
      { id: 'gemini-2.5-flash', model: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', description: 'Stable fast' },
      { id: 'gemini-2.5-flash-lite', model: 'gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Lite', description: 'Lightweight' },
    ],
  },
  {
    id: 'qwen',
    name: 'Qwen',
    provider: 'Alibaba',
    defaultModel: 'qwen3-coder-plus',
    models: [
      { id: 'qwen3-coder-plus', model: 'qwen3-coder-plus', displayName: 'Qwen3 Coder', description: 'Code specialist', isDefault: true },
      { id: 'qwen3-vl-plus', model: 'qwen3-vl-plus', displayName: 'Qwen3 VL', description: 'Vision-language' },
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
        if (expandedAgent) {
          setExpandedAgent(null);
        } else {
          setIsOpen(false);
        }
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, expandedAgent]);

  const handleAgentSelect = (agent: AgentType) => {
    // Select agent with default model, keep popup open
    onSelectionChange({ agent: agent.id, model: agent.defaultModel });
    setExpandedAgent(null);
  };

  const handleToggleExpand = (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    setExpandedAgent(expandedAgent === agentId ? null : agentId);
  };

  const handleModelSelect = (agent: AgentType, model: AgentModel) => {
    onSelectionChange({ agent: agent.id, model: model.model });
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setExpandedAgent(null);
        }}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-surface/80 backdrop-blur-sm hover:bg-[#2a2a2a] transition-colors",
          isOpen && "bg-[#2a2a2a]"
        )}
      >
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-medium text-text-primary">{currentAgent.name}</span>
          <span className="text-[11px] text-text-tertiary">{currentModel?.displayName}</span>
        </div>
        <IconChevronDown
          size={14}
          className={cn(
            "text-text-tertiary transition-transform duration-200 shrink-0",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Invisible backdrop to catch outside clicks */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setExpandedAgent(null);
          }}
        />
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-[240px] rounded-2xl border border-white/[0.08] bg-[#1a1a1a] shadow-2xl z-50 overflow-hidden"
        >
          <div className="p-2">
            {AGENT_TYPES.map((agent) => {
              const isSelected = agent.id === selection.agent;
              const isExpanded = expandedAgent === agent.id;

              return (
                <div key={agent.id} className="mb-0.5 last:mb-0">
                  {/* Agent row */}
                  <div
                    className={cn(
                      "flex items-center rounded-xl transition-all duration-150",
                      isExpanded
                        ? "bg-white/[0.08]"
                        : isSelected
                          ? "bg-white/[0.05]"
                          : "hover:bg-white/[0.05]"
                    )}
                  >
                    <button
                      onClick={() => handleAgentSelect(agent)}
                      className="flex-1 flex items-center px-3 py-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[14px] font-medium",
                            isSelected ? "text-white" : "text-text-secondary"
                          )}>
                            {agent.name}
                          </span>
                          <span className="text-[11px] text-text-quaternary">
                            {agent.provider}
                          </span>
                        </div>
                      </div>

                      {isSelected && !isExpanded && (
                        <IconCheck size={16} className="text-accent shrink-0" />
                      )}
                    </button>

                    <button
                      onClick={(e) => handleToggleExpand(e, agent.id)}
                      className="p-2 mr-1 rounded-lg hover:bg-white/[0.08] transition-colors"
                    >
                      <IconChevronDown
                        size={14}
                        className={cn(
                          "text-text-tertiary transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>
                  </div>

                  {/* Models dropdown */}
                  <div className={cn(
                    "grid transition-all duration-200 ease-out",
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}>
                    <div className="overflow-hidden">
                      <div className="pt-1 pb-1 pl-3">
                        {agent.models.map((model) => {
                          const isModelSelected = isSelected && selection.model === model.model;
                          return (
                            <button
                              key={model.id}
                              onClick={() => handleModelSelect(agent, model)}
                              className={cn(
                                "flex items-center w-full px-3 py-2.5 rounded-lg text-left transition-all duration-150",
                                isModelSelected
                                  ? "bg-accent/10"
                                  : "hover:bg-white/[0.04]"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-[13px]",
                                    isModelSelected ? "text-white font-medium" : "text-text-secondary"
                                  )}>
                                    {model.displayName}
                                  </span>
                                  {model.isDefault && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-md bg-white/[0.08] text-text-tertiary">
                                      default
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-text-quaternary mt-0.5">
                                  {model.description}
                                </p>
                              </div>
                              {isModelSelected && (
                                <IconCheck size={14} className="text-accent shrink-0 ml-2" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
