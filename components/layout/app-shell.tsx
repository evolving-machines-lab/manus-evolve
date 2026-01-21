'use client';

import { Sidebar } from '@/components/workspace/sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen bg-bg-base">
      <Sidebar />
      {children}
    </div>
  );
}
