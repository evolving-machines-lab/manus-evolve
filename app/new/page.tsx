'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  IconUpload,
  IconFile,
  IconX,
  IconCheck,
  IconChevronRight,
  IconPlug,
  IconSkill,
  IconFolder,
  IconSearch,
} from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { AVAILABLE_SKILLS, SKILL_CATEGORIES } from '@/lib/skills';
import { AVAILABLE_INTEGRATIONS } from '@/lib/integrations';
import { cn, generateId, formatBytes } from '@/lib/utils';
import type { ProjectFile, Integration } from '@/lib/types';

type Step = 'files' | 'integrations' | 'skills';

const STEPS: { id: Step; label: string; icon: typeof IconFolder }[] = [
  { id: 'files', label: 'Files', icon: IconFolder },
  { id: 'integrations', label: 'Integrations', icon: IconPlug },
  { id: 'skills', label: 'Skills', icon: IconSkill },
];

export default function NewProjectPage() {
  const router = useRouter();
  const { addProject, integrations, setIntegrations, setCurrentProject, setCurrentTask } = useStore();

  const [step, setStep] = useState<Step>('files');
  const [projectName, setProjectName] = useState('');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [integrationSearch, setIntegrationSearch] = useState('');
  const [skillSearch, setSkillSearch] = useState('');

  // Load integrations status on mount
  useEffect(() => {
    const stored = localStorage.getItem('swarmkit-integrations');
    if (stored) {
      try {
        setIntegrations(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse integrations:', e);
      }
    } else {
      const initial: Integration[] = AVAILABLE_INTEGRATIONS.map((i) => ({
        ...i,
        connected: false,
      }));
      setIntegrations(initial);
    }
  }, [setIntegrations]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: ProjectFile[] = acceptedFiles.map((file) => ({
      id: generateId(),
      name: file.name,
      path: file.name,
      size: file.size,
      type: file.type,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: false,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const toggleIntegration = (id: string) => {
    setSelectedIntegrations((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    const name = projectName.trim() || `Project ${Date.now()}`;

    try {
      // Create project via API
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          integrations: selectedIntegrations,
          skills: selectedSkills,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const createdProject = await response.json();

      // Add files property for frontend compatibility
      const project = {
        ...createdProject,
        files: files,
      };

      // Update store
      addProject(project);
      setCurrentTask(null);
      setCurrentProject(project);

      router.push(`/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const canProceed = () => {
    return true;
  };

  const nextStep = () => {
    if (step === 'files') setStep('integrations');
    else if (step === 'integrations') setStep('skills');
    else handleCreate();
  };

  const prevStep = () => {
    if (step === 'integrations') setStep('files');
    else if (step === 'skills') setStep('integrations');
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4">
          <div className="flex items-start justify-between">
            {/* Left side - Steps */}
            <div className="flex flex-col gap-3">
              {/* Step indicators */}
              <div className="flex items-center gap-1">
                {STEPS.map((s, i) => {
                  const StepIcon = s.icon;
                  const isActive = step === s.id;
                  const isPast = i < currentStepIndex;

                  return (
                    <div key={s.id} className="flex items-center">
                      <button
                        onClick={() => setStep(s.id)}
                        className={cn(
                          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-all duration-150',
                          isActive
                            ? 'bg-accent text-bg-base font-medium'
                            : isPast
                            ? 'text-accent hover:bg-accent-subtle'
                            : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-surface'
                        )}
                      >
                        <StepIcon size={14} />
                        <span>{s.label}</span>
                      </button>
                      {i < STEPS.length - 1 && (
                        <IconChevronRight size={16} className="text-text-quaternary mx-1 shrink-0 mt-[2px]" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex items-center gap-2">
              {step !== 'files' && (
                <button
                  onClick={prevStep}
                  className="px-4 py-1.5 text-[13px] rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-surface transition-all duration-150"
                >
                  Back
                </button>
              )}
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150',
                  canProceed()
                    ? 'bg-accent hover:bg-accent-hover text-bg-base'
                    : 'bg-bg-surface text-text-quaternary cursor-not-allowed'
                )}
              >
                {step === 'skills' ? 'Create Project' : 'Continue'}
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-scroll">
          <div className="max-w-4xl mx-auto py-8 px-6">
            {/* Project name input */}
            <div className="mb-10 max-w-md">
              <label className="block text-lg font-semibold text-text-primary mb-2">
                New Project Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Project"
                className="w-full px-4 py-3 bg-bg-surface border border-border-subtle rounded-lg
                  text-text-primary placeholder:text-text-quaternary
                  focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20
                  transition-all duration-150"
              />
            </div>

            {/* Step: Files */}
            {step === 'files' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-1">Upload context files</h2>
                  <p className="text-[13px] text-text-secondary">
                    Documents uploaded here become available to agents as context
                  </p>
                </div>

                <div
                  {...getRootProps()}
                  className={cn(
                    'relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer',
                    isDragActive
                      ? 'border-accent bg-accent-subtle'
                      : 'border-border-default hover:border-border-emphasis hover:bg-bg-surface'
                  )}
                >
                  <input {...getInputProps()} />
                  <div className={cn(
                    'w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center transition-colors',
                    isDragActive ? 'bg-accent-muted' : 'bg-bg-overlay'
                  )}>
                    <IconUpload
                      size={24}
                      className={isDragActive ? 'text-accent' : 'text-text-tertiary'}
                    />
                  </div>
                  <p className="text-[14px] text-text-primary mb-1">
                    {isDragActive ? 'Drop files here' : 'Drag files here or click to browse'}
                  </p>
                  <p className="text-[13px] text-text-tertiary">
                    PDF, DOCX, images, code files, and more
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="mt-6 space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-3 bg-bg-surface rounded-lg border border-border-subtle"
                      >
                        <div className="w-9 h-9 rounded-lg bg-bg-overlay flex items-center justify-center">
                          <IconFile size={18} className="text-text-tertiary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-text-primary truncate">{file.name}</p>
                          <p className="text-2xs text-text-quaternary">{formatBytes(file.size)}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                          }}
                          className="p-1.5 text-text-quaternary hover:text-text-secondary hover:bg-bg-overlay rounded-md transition-colors"
                        >
                          <IconX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step: Integrations */}
            {step === 'integrations' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-1">Select integrations</h2>
                  <p className="text-[13px] text-text-secondary">
                    Connect tools the agent can use during execution
                  </p>
                </div>

                {/* Search */}
                <div className="mb-6 max-w-md">
                  <div className="relative">
                    <IconSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-quaternary" />
                    <input
                      type="text"
                      value={integrationSearch}
                      onChange={(e) => setIntegrationSearch(e.target.value)}
                      placeholder="Search integrations..."
                      className="w-full pl-11 pr-4 py-3 bg-bg-surface border border-border-subtle rounded-lg
                        text-text-primary placeholder:text-text-quaternary
                        focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20
                        transition-all duration-150"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {AVAILABLE_INTEGRATIONS
                    .filter((i) =>
                      i.displayName.toLowerCase().includes(integrationSearch.toLowerCase()) ||
                      i.description.toLowerCase().includes(integrationSearch.toLowerCase())
                    )
                    .map((integration, index) => {
                    const isSelected = selectedIntegrations.includes(integration.id);
                    const isConnected = integrations.find((i) => i.id === integration.id)?.connected;

                    return (
                      <button
                        key={integration.id}
                        onClick={() => toggleIntegration(integration.id)}
                        className={cn(
                          'group flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-150',
                          isSelected
                            ? 'bg-accent-subtle border border-accent/50'
                            : 'bg-bg-surface hover:bg-bg-overlay'
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
              </div>
            )}

            {/* Step: Skills */}
            {step === 'skills' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-1">Select agent skills</h2>
                  <p className="text-[13px] text-text-secondary">
                    Choose capabilities the agent should have
                  </p>
                </div>

                {/* Search */}
                <div className="mb-6 max-w-md">
                  <div className="relative">
                    <IconSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-quaternary" />
                    <input
                      type="text"
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      placeholder="Search skills..."
                      className="w-full pl-11 pr-4 py-3 bg-bg-surface border border-border-subtle rounded-lg
                        text-text-primary placeholder:text-text-quaternary
                        focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20
                        transition-all duration-150"
                    />
                  </div>
                </div>

                {SKILL_CATEGORIES.map((category, catIndex) => {
                  const categorySkills = AVAILABLE_SKILLS.filter((s) =>
                    s.category === category.id &&
                    (s.displayName.toLowerCase().includes(skillSearch.toLowerCase()) ||
                     s.description.toLowerCase().includes(skillSearch.toLowerCase()))
                  );
                  if (categorySkills.length === 0) return null;

                  return (
                    <div
                      key={category.id}
                      className="mb-8"
                    >
                      <h3 className="text-2xs font-medium text-text-tertiary uppercase tracking-wider mb-3 px-1">
                        {category.name}
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {categorySkills.map((skill, skillIndex) => {
                          const isSelected = selectedSkills.includes(skill.id);

                          return (
                            <button
                              key={skill.id}
                              onClick={() => toggleSkill(skill.id)}
                              className={cn(
                                'group flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-150',
                                isSelected
                                  ? 'bg-accent-subtle border border-accent/50'
                                  : 'bg-bg-surface hover:bg-bg-overlay'
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
                  );
                })}
              </div>
            )}
          </div>
        </div>
    </main>
  );
}
