'use client';

import { useState, useEffect, useRef } from 'react';
import { IconSearch, IconX, IconCheck, IconPlug, IconSkill } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { AVAILABLE_INTEGRATIONS } from '@/lib/integrations';
import { AVAILABLE_SKILLS, SKILL_CATEGORIES } from '@/lib/skills';
import { useStore } from '@/lib/store';

type Tab = 'integrations' | 'skills';

interface SelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIntegrations: string[];
  selectedSkills: string[];
  onIntegrationsChange: (ids: string[]) => void;
  onSkillsChange: (ids: string[]) => void;
  initialTab?: Tab;
}

export function SelectionModal({
  isOpen,
  onClose,
  selectedIntegrations,
  selectedSkills,
  onIntegrationsChange,
  onSkillsChange,
  initialTab = 'integrations',
}: SelectionModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { integrations } = useStore();

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveTab(initialTab);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen, initialTab]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleIntegration = (id: string) => {
    if (selectedIntegrations.includes(id)) {
      onIntegrationsChange(selectedIntegrations.filter(i => i !== id));
    } else {
      onIntegrationsChange([...selectedIntegrations, id]);
    }
  };

  const toggleSkill = (id: string) => {
    if (selectedSkills.includes(id)) {
      onSkillsChange(selectedSkills.filter(s => s !== id));
    } else {
      onSkillsChange([...selectedSkills, id]);
    }
  };

  const filteredIntegrations = AVAILABLE_INTEGRATIONS.filter(i =>
    i.displayName.toLowerCase().includes(search.toLowerCase()) ||
    i.description.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSkillsByCategory = SKILL_CATEGORIES.map(category => ({
    ...category,
    skills: AVAILABLE_SKILLS.filter(s =>
      s.category === category.id &&
      (s.displayName.toLowerCase().includes(search.toLowerCase()) ||
       s.description.toLowerCase().includes(search.toLowerCase()))
    ),
  })).filter(c => c.skills.length > 0);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pb-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-[#202020] border border-border-subtle rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with tabs and search */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('integrations')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[14px] transition-all",
                  activeTab === 'integrations'
                    ? "bg-[#3a3a3a] text-text-primary font-medium"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-[#2a2a2a]"
                )}
              >
                <IconPlug size={16} />
                Integrations
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 text-[11px] rounded-full bg-accent text-bg-base min-w-[20px] text-center",
                  selectedIntegrations.length === 0 && "invisible"
                )}>
                  {selectedIntegrations.length || 0}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('skills')}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[14px] transition-all",
                  activeTab === 'skills'
                    ? "bg-[#3a3a3a] text-text-primary font-medium"
                    : "text-text-tertiary hover:text-text-secondary hover:bg-[#2a2a2a]"
                )}
              >
                <IconSkill size={16} />
                Skills
                <span className={cn(
                  "ml-1 px-1.5 py-0.5 text-[11px] rounded-full bg-accent text-bg-base min-w-[20px] text-center",
                  selectedSkills.length === 0 && "invisible"
                )}>
                  {selectedSkills.length || 0}
                </span>
              </button>
            </div>

            {/* Search */}
            <div className="w-[240px]">
              <div className="relative">
                <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-quaternary" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Search ${activeTab}...`}
                  className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-border-subtle rounded-lg text-[13px]
                    text-text-primary placeholder:text-text-quaternary
                    focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20
                    transition-all duration-150"
                />
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-secondary transition-colors rounded-lg hover:bg-[#2a2a2a]"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="h-[50vh] overflow-y-auto p-5">
          {activeTab === 'integrations' ? (
            <div className="grid grid-cols-3 gap-3">
              {filteredIntegrations.map((integration) => {
                const isSelected = selectedIntegrations.includes(integration.id);
                const isConnected = integrations.find(i => i.id === integration.id)?.connected;

                return (
                  <button
                    key={integration.id}
                    onClick={() => toggleIntegration(integration.id)}
                    className={cn(
                      'group flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-150',
                      isSelected
                        ? 'bg-accent-subtle border-accent/50'
                        : 'bg-bg-surface border-border-subtle hover:border-border-default hover:bg-[#2a2a2a]'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                        isSelected ? 'bg-accent-muted' : 'bg-bg-overlay group-hover:bg-bg-subtle'
                      )}
                    >
                      <IconPlug
                        size={18}
                        className={isSelected ? 'text-accent' : 'text-text-tertiary'}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          'text-[13px] font-medium',
                          isSelected ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
                        )}>
                          {integration.displayName}
                        </p>
                        {isConnected && (
                          <span className="text-2xs px-1.5 py-0.5 rounded bg-success-muted text-success font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-2xs text-text-tertiary truncate mt-0.5">
                        {integration.description}
                      </p>
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded-md border flex items-center justify-center transition-all',
                      isSelected
                        ? 'bg-accent border-accent'
                        : 'border-border-default group-hover:border-border-emphasis'
                    )}>
                      {isSelected && <IconCheck size={12} className="text-bg-base" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredSkillsByCategory.map((category) => (
                <div key={category.id}>
                  <h3 className="text-2xs font-medium text-text-tertiary uppercase tracking-wider mb-3 px-1">
                    {category.name}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {category.skills.map((skill) => {
                      const isSelected = selectedSkills.includes(skill.id);

                      return (
                        <button
                          key={skill.id}
                          onClick={() => toggleSkill(skill.id)}
                          className={cn(
                            'group flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-150',
                            isSelected
                              ? 'bg-accent-subtle border-accent/50'
                              : 'bg-bg-surface border-border-subtle hover:border-border-default hover:bg-[#2a2a2a]'
                          )}
                        >
                          <div
                            className={cn(
                              'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                              isSelected ? 'bg-accent-muted' : 'bg-bg-overlay group-hover:bg-bg-subtle'
                            )}
                          >
                            <IconSkill
                              size={18}
                              className={isSelected ? 'text-accent' : 'text-text-tertiary'}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              'text-[13px] font-medium',
                              isSelected ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
                            )}>
                              {skill.displayName}
                            </p>
                            <p className="text-2xs text-text-tertiary truncate mt-0.5">
                              {skill.description}
                            </p>
                          </div>
                          <div className={cn(
                            'w-5 h-5 rounded-md border flex items-center justify-center transition-all',
                            isSelected
                              ? 'bg-accent border-accent'
                              : 'border-border-default group-hover:border-border-emphasis'
                          )}>
                            {isSelected && <IconCheck size={12} className="text-bg-base" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {activeTab === 'integrations' && filteredIntegrations.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-[14px] text-text-tertiary">No integrations found</p>
            </div>
          )}
          {activeTab === 'skills' && filteredSkillsByCategory.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-[14px] text-text-tertiary">No skills found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border-subtle flex items-center justify-between">
          <p className="text-[13px] text-text-tertiary">
            <span className="text-text-secondary">{selectedIntegrations.length}</span> integrations
            <span className="text-text-quaternary mx-2">·</span>
            <span className="text-text-secondary">{selectedSkills.length}</span> skills selected
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium bg-accent hover:bg-accent-hover text-bg-base transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
