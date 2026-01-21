import { NextRequest, NextResponse } from 'next/server';
import { db, tasks, messages, progressItems } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { TaskStatus } from '@/lib/db/schema';

// GET /api/tasks/:id - Get a single task with all details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, params.id),
      with: {
        messages: {
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
          with: {
            toolCalls: true,
          },
        },
        progressItems: {
          orderBy: (progressItems, { asc }) => [asc(progressItems.createdAt)],
        },
        artifacts: {
          columns: {
            id: true,
            name: true,
            path: true,
            type: true,
            size: true,
            createdAt: true,
          },
        },
        integrations: true,
        skills: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Transform to match frontend types
    const transformed = {
      id: task.id,
      projectId: task.projectId || 'standalone',
      title: task.title,
      status: task.status,
      prompt: task.prompt,
      messages: task.messages.map((m) => ({
        id: m.id,
        role: m.role,
        contentType: m.contentType,
        content: m.content,
        mimeType: m.mimeType,
        timestamp: m.createdAt,
        toolCalls: m.toolCalls.map((tc) => ({
          id: tc.id,
          toolCallId: tc.toolCallId,
          name: tc.name,
          title: tc.title,
          kind: tc.kind,
          status: tc.status,
          input: tc.input ? JSON.parse(tc.input) : undefined,
          output: tc.output ? JSON.parse(tc.output) : undefined,
          locations: tc.locations ? JSON.parse(tc.locations) : undefined,
        })),
      })),
      progress: task.progressItems.map((p) => ({
        id: p.id,
        content: p.content,
        status: p.status,
        priority: p.priority,
      })),
      artifacts: task.artifacts.map((a) => ({
        id: a.id,
        name: a.name,
        path: a.path,
        type: a.type,
        size: a.size,
      })),
      integrations: task.integrations.map((ti) => ti.integrationId),
      skills: task.skills.map((ts) => ts.skillId),
      agent: task.agent,
      model: task.model,
      sessionId: task.sessionId,
      browserLiveUrl: task.browserLiveUrl,
      browserScreenshotUrl: task.browserScreenshotUrl,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

// PUT /api/tasks/:id - Update a task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      title,
      status,
      sessionId,
      browserLiveUrl,
      browserScreenshotUrl,
    } = body;

    const now = new Date().toISOString();

    db.update(tasks)
      .set({
        ...(title && { title }),
        ...(status && { status: status as TaskStatus }),
        ...(sessionId !== undefined && { sessionId }),
        ...(browserLiveUrl !== undefined && { browserLiveUrl }),
        ...(browserScreenshotUrl !== undefined && { browserScreenshotUrl }),
        updatedAt: now,
      })
      .where(eq(tasks.id, params.id))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE /api/tasks/:id - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    db.delete(tasks)
      .where(eq(tasks.id, params.id))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
