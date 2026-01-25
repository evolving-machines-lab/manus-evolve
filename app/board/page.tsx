'use client';

import { AgentBoard } from '@/components/board/agent-board';

export default function BoardPage() {
  return (
    <div className="flex flex-col h-screen bg-bg-base">
      {/* Page header */}
      <header className="h-14 flex items-center px-6 border-b border-border-subtle">
        <h1 className="text-[18px] font-semibold text-text-primary">Agent Board</h1>
      </header>

      {/* Board content */}
      <main className="flex-1 overflow-hidden">
        <AgentBoard />
      </main>
    </div>
  );
}
