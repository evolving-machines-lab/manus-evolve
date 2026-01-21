'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '@/components/workspace/sidebar';
import { IconPlug, IconCheck, IconSpinner, IconX, IconSearch } from '@/components/ui/icons';
import { useStore } from '@/lib/store';
import { AVAILABLE_INTEGRATIONS, INTEGRATION_CATEGORIES } from '@/lib/integrations';
import { cn } from '@/lib/utils';
import type { Integration } from '@/lib/types';

export default function SettingsPage() {
  const { integrations, setIntegrations } = useStore();
  const [loading, setLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch integrations from API on mount
  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
      // Fallback to default integrations
      const initial: Integration[] = AVAILABLE_INTEGRATIONS.map((i) => ({
        ...i,
        connected: false,
      }));
      setIntegrations(initial);
    }
  }, [setIntegrations]);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Handle OAuth connect - get auth URL and open in new window
  const handleConnect = async (integrationId: string) => {
    setLoading(integrationId);

    try {
      // Get the integration name for Composio
      const integration = integrations.find((i) => i.id === integrationId);
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Call Composio auth endpoint to get OAuth URL
      const response = await fetch(`/api/composio/auth/${integration.name}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }

      const { url } = await response.json();

      if (url) {
        // Open OAuth URL in popup window
        const popup = window.open(
          url,
          `Connect ${integration.displayName}`,
          'width=600,height=700,scrollbars=yes'
        );

        // Poll for popup close and check connection status
        const checkPopup = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(checkPopup);

            // Check if connection was successful
            const statusResponse = await fetch(`/api/composio/auth/${integration.name}`);
            if (statusResponse.ok) {
              const { connected } = await statusResponse.json();
              if (connected) {
                // Refresh integrations list
                await fetchIntegrations();
              }
            }

            setLoading(null);
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkPopup);
          setLoading(null);
        }, 5 * 60 * 1000);
      } else {
        // No URL returned - might be already connected or error
        setLoading(null);
      }
    } catch (error) {
      console.error('Error connecting integration:', error);
      setLoading(null);
    }
  };

  // Handle disconnect
  const handleDisconnect = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Update local state
        const updated = integrations.map((i) =>
          i.id === integrationId ? { ...i, connected: false, accountId: undefined } : i
        );
        setIntegrations(updated);
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
    }
  };

  const filteredIntegrations = searchQuery
    ? integrations.filter(
        (i) =>
          i.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : integrations;

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <div className="flex h-screen bg-bg-base">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconPlug size={18} className="text-text-tertiary" />
            <h1 className="text-[15px] font-semibold text-text-primary">Integrations</h1>
            <span className="text-[13px] text-text-tertiary">
              {connectedCount > 0 && (
                <span className="text-success">{connectedCount} connected</span>
              )}
            </span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-8 px-6">
            {/* Description */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Connect your tools
              </h2>
              <p className="text-[13px] text-text-secondary max-w-2xl">
                Pre-authenticated integrations are available to agents without requiring in-chat authentication.
                Connect your services once, use them across all projects.
              </p>
            </div>

            {/* Search */}
            <div className="mb-8">
              <div className="relative max-w-md">
                <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-quaternary" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search integrations..."
                  className="w-full pl-9 pr-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg
                    text-[13px] text-text-primary placeholder:text-text-quaternary
                    focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20
                    transition-all duration-150"
                />
              </div>
            </div>

            {/* Integration categories */}
            {INTEGRATION_CATEGORIES.map((category, catIndex) => {
              const categoryIntegrations = filteredIntegrations.filter((i) =>
                category.integrations.includes(i.id)
              );

              if (categoryIntegrations.length === 0) return null;

              return (
                <div
                  key={category.id}
                  className="mb-10 animate-slide-up"
                  style={{ animationDelay: `${catIndex * 50}ms` }}
                >
                  <h3 className="text-2xs font-medium text-text-tertiary uppercase tracking-wider mb-4 px-1">
                    {category.name}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryIntegrations.map((integration, index) => (
                      <IntegrationCard
                        key={integration.id}
                        integration={integration}
                        loading={loading === integration.id}
                        onConnect={() => handleConnect(integration.id)}
                        onDisconnect={() => handleDisconnect(integration.id)}
                        delay={index * 30}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Uncategorized integrations */}
            {(() => {
              const categorizedIds = INTEGRATION_CATEGORIES.flatMap((c) => c.integrations);
              const uncategorized = filteredIntegrations.filter(
                (i) => !categorizedIds.includes(i.id)
              );

              if (uncategorized.length === 0) return null;

              return (
                <div className="mb-10">
                  <h3 className="text-2xs font-medium text-text-tertiary uppercase tracking-wider mb-4 px-1">
                    Other
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {uncategorized.map((integration, index) => (
                      <IntegrationCard
                        key={integration.id}
                        integration={integration}
                        loading={loading === integration.id}
                        onConnect={() => handleConnect(integration.id)}
                        onDisconnect={() => handleDisconnect(integration.id)}
                        delay={index * 30}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}

interface IntegrationCardProps {
  integration: Integration;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  delay?: number;
}

function IntegrationCard({
  integration,
  loading,
  onConnect,
  onDisconnect,
  delay = 0,
}: IntegrationCardProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-4 p-4 rounded-xl transition-all duration-150',
        'animate-slide-up',
        integration.connected
          ? 'bg-success-muted'
          : 'bg-bg-surface hover:bg-bg-overlay'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center transition-colors',
          integration.connected ? 'bg-success/10' : 'bg-bg-overlay group-hover:bg-bg-subtle'
        )}
      >
        <IconPlug
          size={20}
          className={integration.connected ? 'text-success' : 'text-text-tertiary'}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[13px] font-medium text-text-primary">
            {integration.displayName}
          </h3>
          {integration.connected && (
            <div className="w-4 h-4 rounded-full bg-success/20 flex items-center justify-center">
              <IconCheck size={10} className="text-success" />
            </div>
          )}
        </div>
        <p className="text-2xs text-text-tertiary truncate mt-0.5">
          {integration.description}
        </p>
      </div>

      {/* Action button */}
      {integration.connected ? (
        <button
          onClick={onDisconnect}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]
            text-text-secondary hover:text-error hover:bg-error-muted transition-all duration-150
            opacity-0 group-hover:opacity-100"
        >
          <IconX size={12} />
          Disconnect
        </button>
      ) : (
        <button
          onClick={onConnect}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150',
            loading
              ? 'bg-bg-overlay text-text-quaternary cursor-not-allowed'
              : 'bg-accent hover:bg-accent-hover text-bg-base shadow-sm hover:shadow'
          )}
        >
          {loading ? (
            <>
              <IconSpinner size={12} />
              Connecting
            </>
          ) : (
            'Connect'
          )}
        </button>
      )}
    </div>
  );
}
