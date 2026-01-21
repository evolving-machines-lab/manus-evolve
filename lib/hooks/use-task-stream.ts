'use client';

import { useState, useCallback, useRef } from 'react';
import type { Message, ToolCall, ProgressItem } from '@/lib/types';
import { nanoid } from 'nanoid';

export interface TaskStreamState {
  isRunning: boolean;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  messages: Message[];
  progress: ProgressItem[];
  currentThought: string;
  browserLiveUrl?: string;
  browserScreenshotUrl?: string;
  error?: string;
}

export interface UseTaskStreamOptions {
  onMessage?: (message: Message) => void;
  onToolCall?: (toolCall: ToolCall) => void;
  onProgress?: (progress: ProgressItem[]) => void;
  onBrowserUrl?: (liveUrl?: string, screenshotUrl?: string) => void;
  onComplete?: (sessionId?: string) => void;
  onError?: (error: string) => void;
}

export function useTaskStream(options: UseTaskStreamOptions = {}) {
  const [state, setState] = useState<TaskStreamState>({
    isRunning: false,
    status: 'idle',
    messages: [],
    progress: [],
    currentThought: '',
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const currentMessageRef = useRef<{
    id: string;
    content: string;
    toolCalls: ToolCall[];
  } | null>(null);

  // Run a task with streaming
  const runTask = useCallback(
    async (taskId: string, prompt?: string) => {
      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      // Clear messages and progress for new run
      currentMessageRef.current = null;
      setState((prev) => ({
        ...prev,
        isRunning: true,
        status: 'running',
        messages: [], // Clear streaming messages for new run
        progress: [], // Clear progress for new run
        error: undefined,
        currentThought: '',
      }));

      try {
        const response = await fetch(`/api/tasks/${taskId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: prompt ? JSON.stringify({ prompt }) : undefined,
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process SSE events
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          let eventType = '';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
              if (eventType && eventData) {
                handleEvent(eventType, eventData);
                eventType = '';
                eventData = '';
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Cancelled, not an error
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setState((prev) => ({
          ...prev,
          isRunning: false,
          status: 'failed',
          error: errorMessage,
        }));
        options.onError?.(errorMessage);
      }
    },
    [options]
  );

  // Handle individual SSE events
  const handleEvent = useCallback(
    (eventType: string, eventData: string) => {
      try {
        const data = JSON.parse(eventData);

        switch (eventType) {
          case 'status':
            setState((prev) => ({
              ...prev,
              status: data.status,
              isRunning: data.status === 'running',
            }));
            break;

          case 'message':
            // Full message (user message)
            setState((prev) => ({
              ...prev,
              messages: [...prev.messages, data as Message],
            }));
            options.onMessage?.(data as Message);
            break;

          case 'message_chunk':
            // Streaming message chunk
            if (!currentMessageRef.current) {
              currentMessageRef.current = {
                id: data.messageId,
                content: '',
                toolCalls: [],
              };
            }
            currentMessageRef.current.content += data.content;

            // Update state with accumulated message
            setState((prev) => {
              const existingIdx = prev.messages.findIndex(
                (m) => m.id === currentMessageRef.current?.id
              );
              const message: Message = {
                id: currentMessageRef.current!.id,
                role: 'assistant',
                contentType: 'text',
                content: currentMessageRef.current!.content,
                timestamp: new Date().toISOString(),
                toolCalls: currentMessageRef.current!.toolCalls,
              };

              if (existingIdx >= 0) {
                const newMessages = [...prev.messages];
                newMessages[existingIdx] = message;
                return { ...prev, messages: newMessages };
              }
              return { ...prev, messages: [...prev.messages, message] };
            });
            break;

          case 'thought_chunk':
            setState((prev) => ({
              ...prev,
              currentThought: prev.currentThought + data.content,
            }));
            break;

          case 'image':
            setState((prev) => ({
              ...prev,
              messages: [...prev.messages, data as Message],
            }));
            options.onMessage?.(data as Message);
            break;

          case 'tool_call':
            // Add tool call to current message
            if (currentMessageRef.current) {
              currentMessageRef.current.toolCalls.push(data as ToolCall);
            }
            options.onToolCall?.(data as ToolCall);

            // Update message in state
            setState((prev) => {
              if (!currentMessageRef.current) return prev;
              const idx = prev.messages.findIndex(
                (m) => m.id === currentMessageRef.current?.id
              );
              if (idx >= 0) {
                const newMessages = [...prev.messages];
                newMessages[idx] = {
                  ...newMessages[idx],
                  toolCalls: currentMessageRef.current.toolCalls,
                };
                return { ...prev, messages: newMessages };
              }
              return prev;
            });
            break;

          case 'tool_call_update':
            // Update tool call status
            if (currentMessageRef.current) {
              const toolCallIdx = currentMessageRef.current.toolCalls.findIndex(
                (tc) => tc.toolCallId === data.toolCallId
              );
              if (toolCallIdx >= 0) {
                currentMessageRef.current.toolCalls[toolCallIdx] = {
                  ...currentMessageRef.current.toolCalls[toolCallIdx],
                  ...data,
                };
              }
            }

            setState((prev) => {
              const msgIdx = prev.messages.findIndex(
                (m) => m.id === currentMessageRef.current?.id
              );
              if (msgIdx >= 0 && prev.messages[msgIdx].toolCalls) {
                const newMessages = [...prev.messages];
                const newToolCalls = [...(newMessages[msgIdx].toolCalls || [])];
                const tcIdx = newToolCalls.findIndex(
                  (tc) => tc.toolCallId === data.toolCallId
                );
                if (tcIdx >= 0) {
                  newToolCalls[tcIdx] = { ...newToolCalls[tcIdx], ...data };
                  newMessages[msgIdx] = {
                    ...newMessages[msgIdx],
                    toolCalls: newToolCalls,
                  };
                  return { ...prev, messages: newMessages };
                }
              }
              return prev;
            });
            break;

          case 'plan':
            setState((prev) => ({
              ...prev,
              progress: data.entries as ProgressItem[],
            }));
            options.onProgress?.(data.entries as ProgressItem[]);
            break;

          case 'browser_url':
            setState((prev) => ({
              ...prev,
              browserLiveUrl: data.liveUrl || prev.browserLiveUrl,
              browserScreenshotUrl: data.screenshotUrl || prev.browserScreenshotUrl,
            }));
            options.onBrowserUrl?.(data.liveUrl, data.screenshotUrl);
            break;

          case 'error':
            setState((prev) => ({
              ...prev,
              error: data.message,
              status: 'failed',
              isRunning: false,
            }));
            options.onError?.(data.message);
            break;

          case 'done':
            // Finalize current message
            if (currentMessageRef.current && currentMessageRef.current.content) {
              options.onMessage?.({
                id: currentMessageRef.current.id,
                role: 'assistant',
                contentType: 'text',
                content: currentMessageRef.current.content,
                timestamp: new Date().toISOString(),
                toolCalls: currentMessageRef.current.toolCalls,
              });
            }
            currentMessageRef.current = null;

            setState((prev) => ({
              ...prev,
              isRunning: false,
              status: 'completed',
              currentThought: '',
            }));
            // Pass sessionId to callback so task can be updated
            options.onComplete?.(data.sessionId);
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    },
    [options]
  );

  // Cancel running task
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isRunning: false,
      status: 'idle',
    }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    cancel();
    currentMessageRef.current = null;
    setState({
      isRunning: false,
      status: 'idle',
      messages: [],
      progress: [],
      currentThought: '',
    });
  }, [cancel]);

  // Add message to state (for user messages)
  const addMessage = useCallback((message: Message) => {
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  }, []);

  return {
    ...state,
    runTask,
    cancel,
    reset,
    addMessage,
  };
}
