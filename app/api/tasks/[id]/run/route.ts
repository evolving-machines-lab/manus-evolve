import { NextRequest } from 'next/server';
import { db, tasks, messages, progressItems, toolCalls, artifacts, projects, projectFiles, taskContextFiles, DEFAULT_USER_ID } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  runTask,
  prepareContextFiles,
  DEFAULT_SYSTEM_PROMPT,
  getEvolveInstance,
  getTaskOutput,
  type FileMap,
  type EvolveCallbacks,
} from '@/lib/evolve';
import type {
  TaskStatus,
  AgentType,
  ToolCallStatus,
  ToolKind,
  ProgressStatus,
  ProgressPriority,
} from '@/lib/db/schema';

// Helper to determine file MIME type from extension
function getFileType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'json': 'application/json',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'ts': 'application/typescript',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'csv': 'text/csv',
    'xml': 'application/xml',
    'zip': 'application/zip',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// POST /api/tasks/:id/run - Run task with SSE streaming
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  // Get task from database
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      integrations: {
        with: { integration: true },
      },
      skills: {
        with: { skill: true },
      },
    },
  });

  if (!task) {
    return new Response(JSON.stringify({ error: 'Task not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get request body for optional parameters
  let body: { prompt?: string; timeoutMs?: number } = {};
  try {
    body = await request.json();
  } catch {
    // No body provided, use task prompt
  }

  const prompt = body.prompt || task.prompt;
  const timeoutMs = body.timeoutMs || 60 * 60 * 1000; // Default 1 hour

  // Get context files - either from project or from task
  // Use select query instead of relational query to handle BLOB content properly
  let contextFiles: FileMap = {};
  if (task.projectId) {
    // Project-based task: get project files
    const files = db.select().from(projectFiles).where(eq(projectFiles.projectId, task.projectId!)).all();
    if (files.length > 0) {
      contextFiles = prepareContextFiles(
        files.map((f) => ({
          name: f.name,
          path: f.path,
          content: f.content
            ? (typeof f.content === 'string' ? f.content : Buffer.from(f.content as Buffer).toString())
            : undefined,
        }))
      );
    }
  } else {
    // Standalone task: get task context files
    const files = db.select().from(taskContextFiles).where(eq(taskContextFiles.taskId, taskId)).all();
    if (files.length > 0) {
      contextFiles = prepareContextFiles(
        files.map((f) => ({
          name: f.name,
          path: f.path,
          content: f.content
            ? (typeof f.content === 'string' ? f.content : Buffer.from(f.content as Buffer).toString())
            : undefined,
        }))
      );
    }
  }

  // Get integrations and skills
  const integrations = task.integrations.map((ti) => ti.integration.name);
  const skills = task.skills.map((ts) => ts.skill.name);

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let streamClosed = false;

      const send = (event: string, data: unknown) => {
        if (streamClosed) return; // Prevent sending after close
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Controller may be closed, ignore
          streamClosed = true;
        }
      };

      // Track current message for appending chunks
      let currentMessageId: string | null = null;
      let currentMessageContent = '';
      let currentThoughtContent = '';
      let sessionIdSaved = false;

      // Track parts for interleaved display (text and tool calls in order)
      type StoredPart = { type: 'text'; content: string } | { type: 'tool_call'; toolCallId: string };
      let currentParts: StoredPart[] = [];
      let pendingText = ''; // Text accumulated since last tool call

      // Helper to save sessionId to database as soon as sandbox is active
      const saveSessionIdIfNeeded = () => {
        if (sessionIdSaved) return;
        const evolve = getEvolveInstance(taskId);
        if (evolve) {
          const sessionId = evolve.getSession();
          if (sessionId) {
            db.update(tasks)
              .set({ sessionId })
              .where(eq(tasks.id, taskId))
              .run();
            sessionIdSaved = true;
            console.log(`[Run] Saved sessionId ${sessionId} for task ${taskId}`);
          }
        }
      };

      // Update task status to running
      db.update(tasks)
        .set({ status: 'running' as TaskStatus, updatedAt: new Date().toISOString() })
        .where(eq(tasks.id, taskId))
        .run();

      send('status', { status: 'running' });

      // Add user message to database if this is a new prompt
      // Note: We don't send via SSE since the client already added it optimistically
      if (body.prompt) {
        const userMsgId = nanoid();
        db.insert(messages).values({
          id: userMsgId,
          taskId,
          role: 'user',
          contentType: 'text',
          content: body.prompt,
          createdAt: new Date().toISOString(),
        }).run();
      }

      // Helper to ensure message exists in DB before inserting tool calls
      const ensureMessageExists = () => {
        if (!currentMessageId) {
          currentMessageId = nanoid();
          currentMessageContent = '';
          currentParts = [];
          pendingText = '';
          // Insert placeholder message immediately so tool calls can reference it
          db.insert(messages).values({
            id: currentMessageId,
            taskId,
            role: 'assistant',
            contentType: 'text',
            content: '', // Will be updated at the end
            createdAt: new Date().toISOString(),
          }).run();
        }
      };

      // Helper to flush message content to database (for persistence during navigation)
      let lastFlushLength = 0;
      const flushMessageContent = (includeParts = false) => {
        if (currentMessageId && currentMessageContent && currentMessageContent.length > lastFlushLength) {
          const updateData: Record<string, unknown> = { content: currentMessageContent };

          // Include parts if requested (on tool call or completion)
          if (includeParts) {
            // Build current parts: existing parts + pending text
            const partsToSave = [...currentParts];
            if (pendingText) {
              partsToSave.push({ type: 'text', content: pendingText });
            }
            updateData.parts = JSON.stringify(partsToSave);
          }

          db.update(messages)
            .set(updateData)
            .where(eq(messages.id, currentMessageId))
            .run();
          lastFlushLength = currentMessageContent.length;
        }
      };

      // Setup callbacks for streaming
      const callbacks: EvolveCallbacks = {
        onMessageChunk: (content, isThought) => {
          // Save sessionId as soon as we get first output (sandbox is active)
          saveSessionIdIfNeeded();

          if (isThought) {
            currentThoughtContent += content;
            send('thought_chunk', { content });
          } else {
            // Start new message if needed
            ensureMessageExists();
            currentMessageContent += content;
            pendingText += content; // Track for parts
            send('message_chunk', {
              messageId: currentMessageId,
              content,
            });
            // Flush to DB periodically (every ~500 chars) so content persists if user navigates away
            if (currentMessageContent.length - lastFlushLength > 500) {
              flushMessageContent();
            }
          }
        },

        onImageChunk: (data, mimeType) => {
          const imageId = nanoid();
          db.insert(messages).values({
            id: imageId,
            taskId,
            role: 'assistant',
            contentType: 'image',
            content: data,
            mimeType,
            createdAt: new Date().toISOString(),
          }).run();

          send('image', {
            id: imageId,
            role: 'assistant',
            contentType: 'image',
            content: data,
            mimeType,
            timestamp: new Date().toISOString(),
          });
        },

        onToolCall: (toolCall) => {
          // Save sessionId as soon as we get first output (sandbox is active)
          saveSessionIdIfNeeded();

          // Ensure message exists before inserting tool call
          ensureMessageExists();

          // Finalize pending text as a part, then add tool call part
          if (pendingText) {
            currentParts.push({ type: 'text', content: pendingText });
            pendingText = '';
          }
          currentParts.push({ type: 'tool_call', toolCallId: toolCall.toolCallId });

          // Flush message content with parts (natural breakpoint)
          flushMessageContent(true);

          // Extract filePath from locations or input
          let filePath: string | null = null;
          if (toolCall.locations && toolCall.locations.length > 0) {
            filePath = toolCall.locations[0].path;
          } else if (toolCall.input && typeof toolCall.input === 'object') {
            const input = toolCall.input as Record<string, unknown>;
            if (typeof input.file_path === 'string') filePath = input.file_path;
            else if (typeof input.path === 'string') filePath = input.path;
          }

          // Extract command for bash tools
          let command: string | null = null;
          if (toolCall.kind === 'execute' && toolCall.input && typeof toolCall.input === 'object') {
            const input = toolCall.input as Record<string, unknown>;
            if (typeof input.command === 'string') command = input.command;
          }

          // Extract outputContent for edit tools (content comes in initial tool_call, not update)
          let outputContent: string | null = null;
          if (toolCall.outputContent) {
            const maxOutputLength = 50000;
            outputContent = toolCall.outputContent;
            if (outputContent.length > maxOutputLength) {
              outputContent = outputContent.substring(0, maxOutputLength) + '\n[... output truncated ...]';
            }
            outputContent = outputContent.trim();
          }

          db.insert(toolCalls).values({
            id: nanoid(),
            messageId: currentMessageId!, // Non-null: ensureMessageExists() guarantees this
            toolCallId: toolCall.toolCallId,
            name: toolCall.name,
            title: toolCall.title,
            kind: toolCall.kind as ToolKind,
            status: toolCall.status as ToolCallStatus,
            input: toolCall.input ? JSON.stringify(toolCall.input) : null,
            locations: toolCall.locations ? JSON.stringify(toolCall.locations) : null,
            filePath,
            command,
            outputContent,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }).run();

          send('tool_call', toolCall);
        },

        onToolCallUpdate: (toolCallId, updates) => {
          // Update tool call in database
          const updateData: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
          };
          if (updates.status) updateData.status = updates.status;
          if (updates.title) updateData.title = updates.title;
          if (updates.locations) {
            updateData.locations = JSON.stringify(updates.locations);
            // Also update filePath if not already set
            if (updates.locations.length > 0) {
              updateData.filePath = updates.locations[0].path;
            }
          }

          // Use outputContent already extracted by evolve.ts
          if (updates.outputContent) {
            // Truncate to avoid database issues
            const maxOutputLength = 50000;
            let outputContent = updates.outputContent;
            if (outputContent.length > maxOutputLength) {
              outputContent = outputContent.substring(0, maxOutputLength) + '\n[... output truncated ...]';
            }
            updateData.outputContent = outputContent.trim();
          }

          db.update(toolCalls)
            .set(updateData)
            .where(eq(toolCalls.toolCallId, toolCallId))
            .run();

          send('tool_call_update', { toolCallId, ...updates });
        },

        onPlan: (entries) => {
          // Replace all progress items for this task
          db.delete(progressItems).where(eq(progressItems.taskId, taskId)).run();

          for (const entry of entries) {
            db.insert(progressItems).values({
              id: nanoid(),
              taskId,
              content: entry.content,
              status: entry.status as ProgressStatus,
              priority: entry.priority as ProgressPriority,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }).run();
          }

          send('plan', { entries });
        },

        onBrowserUrl: (liveUrl, screenshotUrl) => {
          const updateData: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
          };
          if (liveUrl) updateData.browserLiveUrl = liveUrl;
          if (screenshotUrl) updateData.browserScreenshotUrl = screenshotUrl;

          db.update(tasks)
            .set(updateData)
            .where(eq(tasks.id, taskId))
            .run();

          send('browser_url', { liveUrl, screenshotUrl });
        },

        onEvent: (event) => {
          // Forward raw event for debugging/advanced use cases
          send('raw_event', event);
        },
      };

      try {
        // Run the task
        const result = await runTask(
          taskId,
          {
            agent: task.agent as AgentType,
            model: task.model,
            skills,
            integrations,
            userId: DEFAULT_USER_ID,
            systemPrompt: DEFAULT_SYSTEM_PROMPT,
            sessionId: task.sessionId || undefined,
          },
          contextFiles,
          {
            prompt,
            timeoutMs,
          },
          callbacks
        );

        // Update accumulated message content in database with final parts
        if (currentMessageId && currentMessageContent) {
          // Finalize parts: add any remaining pending text
          const finalParts = [...currentParts];
          if (pendingText) {
            finalParts.push({ type: 'text', content: pendingText });
          }

          db.update(messages)
            .set({
              content: currentMessageContent,
              parts: JSON.stringify(finalParts),
            })
            .where(eq(messages.id, currentMessageId))
            .run();
        }

        // Fetch output files (artifacts) from sandbox
        const outputResult = await getTaskOutput(taskId, true);
        const artifactsList: Array<{
          id: string;
          name: string;
          path: string;
          type: string;
          size: number;
          content?: string;
        }> = [];

        if (outputResult.files && Object.keys(outputResult.files).length > 0) {
          // Clear previous artifacts for this task
          db.delete(artifacts).where(eq(artifacts.taskId, taskId)).run();

          for (const [filePath, content] of Object.entries(outputResult.files)) {
            const artifactId = nanoid();
            const fileName = filePath.split('/').pop() || filePath;
            const fileType = getFileType(fileName);
            const contentBuffer = typeof content === 'string'
              ? Buffer.from(content, 'utf-8')
              : Buffer.from(content as Uint8Array);
            const fileSize = contentBuffer.length;

            // Save to database
            db.insert(artifacts).values({
              id: artifactId,
              taskId,
              name: fileName,
              path: filePath,
              type: fileType,
              size: fileSize,
              content: contentBuffer,
              createdAt: new Date().toISOString(),
            }).run();

            // Build artifact for SSE (send base64 for binary content)
            artifactsList.push({
              id: artifactId,
              name: fileName,
              path: filePath,
              type: fileType,
              size: fileSize,
              content: typeof content === 'string' ? content : Buffer.from(content as Uint8Array).toString('base64'),
            });
          }

          // Send artifacts to frontend
          if (artifactsList.length > 0) {
            send('artifacts', { artifacts: artifactsList });
          }
        }

        // Update task with session ID and completed status
        // Clear browserLiveUrl since VNC session is now dead (keep screenshot)
        db.update(tasks)
          .set({
            status: 'completed' as TaskStatus,
            sessionId: result.sessionId,
            browserLiveUrl: null,  // VNC session expired, clear stale URL
            updatedAt: new Date().toISOString(),
          })
          .where(eq(tasks.id, taskId))
          .run();

        send('status', { status: 'completed' });
        send('done', {
          sessionId: result.sessionId,
          exitCode: result.exitCode,
        });
      } catch (error) {
        console.error('Task execution error:', error);

        // Update partial message content and parts if any
        if (currentMessageId && currentMessageContent) {
          const finalParts = [...currentParts];
          if (pendingText) {
            finalParts.push({ type: 'text', content: pendingText });
          }
          db.update(messages)
            .set({
              content: currentMessageContent,
              parts: JSON.stringify(finalParts),
            })
            .where(eq(messages.id, currentMessageId))
            .run();
        }

        // Update task status to failed
        // Clear browserLiveUrl since VNC session is now dead (keep screenshot)
        db.update(tasks)
          .set({
            status: 'failed' as TaskStatus,
            browserLiveUrl: null,  // VNC session expired, clear stale URL
            updatedAt: new Date().toISOString(),
          })
          .where(eq(tasks.id, taskId))
          .run();

        send('error', {
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        send('status', { status: 'failed' });
      }

      streamClosed = true;
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
