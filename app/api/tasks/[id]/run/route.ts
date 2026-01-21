import { NextRequest } from 'next/server';
import { db, tasks, messages, progressItems, toolCalls } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  runTask,
  prepareContextFiles,
  DEFAULT_SYSTEM_PROMPT,
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

const DEFAULT_USER_ID = 'default-user';

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

  // Get project files if task belongs to a project
  let contextFiles: FileMap = {};
  if (task.projectId) {
    const project = await db.query.projects.findFirst({
      where: eq(tasks.projectId!, task.projectId),
      with: {
        files: true,
      },
    });
    if (project?.files) {
      contextFiles = prepareContextFiles(
        project.files.map((f) => ({
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

      // Setup callbacks for streaming
      const callbacks: EvolveCallbacks = {
        onMessageChunk: (content, isThought) => {
          if (isThought) {
            currentThoughtContent += content;
            send('thought_chunk', { content });
          } else {
            // Start new message if needed
            ensureMessageExists();
            currentMessageContent += content;
            send('message_chunk', {
              messageId: currentMessageId,
              content,
            });
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
          // Ensure message exists before inserting tool call
          ensureMessageExists();

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
          if (updates.locations) updateData.locations = JSON.stringify(updates.locations);

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

        // Update accumulated message content in database
        if (currentMessageId && currentMessageContent) {
          db.update(messages)
            .set({ content: currentMessageContent })
            .where(eq(messages.id, currentMessageId))
            .run();
        }

        // Update task with session ID and completed status
        db.update(tasks)
          .set({
            status: 'completed' as TaskStatus,
            sessionId: result.sessionId,
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

        // Update partial message content if any
        if (currentMessageId && currentMessageContent) {
          db.update(messages)
            .set({ content: currentMessageContent })
            .where(eq(messages.id, currentMessageId))
            .run();
        }

        // Update task status to failed
        db.update(tasks)
          .set({
            status: 'failed' as TaskStatus,
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
