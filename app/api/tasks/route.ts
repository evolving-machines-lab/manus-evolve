import { NextRequest, NextResponse } from 'next/server';
import { db, tasks, messages, progressItems, taskIntegrations, taskSkills, taskContextFiles, projects, DEFAULT_USER_ID } from '@/lib/db';
import { eq, isNull, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AgentType, TaskStatus } from '@/lib/db/schema';

// GET /api/tasks - List tasks
// Query params:
//   - projectId: filter by specific project
//   - showAll: if true, return ALL tasks (both standalone and project tasks)
//   - (no params): return only standalone tasks
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const showAll = searchParams.get('showAll') === 'true';

    // Determine filter
    let whereClause;
    if (projectId) {
      // Filter by specific project
      whereClause = eq(tasks.projectId, projectId);
    } else if (showAll) {
      // Return ALL tasks for user (both standalone and project)
      whereClause = eq(tasks.userId, DEFAULT_USER_ID);
    } else {
      // Default: only standalone tasks
      whereClause = and(eq(tasks.userId, DEFAULT_USER_ID), isNull(tasks.projectId));
    }

    const result = await db.query.tasks.findMany({
      where: whereClause,
      orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
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
        artifacts: true,
        integrations: true,
        skills: true,
      },
    });

    // Transform to match frontend types
    const transformed = result.map((t) => ({
      id: t.id,
      projectId: t.projectId || 'standalone',
      title: t.title,
      status: t.status,
      prompt: t.prompt,
      messages: t.messages.map((m) => ({
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
      progress: t.progressItems.map((p) => ({
        id: p.id,
        content: p.content,
        status: p.status,
        priority: p.priority,
      })),
      artifacts: t.artifacts.map((a) => ({
        id: a.id,
        name: a.name,
        path: a.path,
        type: a.type,
        size: a.size,
      })),
      integrations: t.integrations.map((ti) => ti.integrationId),
      skills: t.skills.map((ts) => ts.skillId),
      agent: t.agent,
      model: t.model,
      sessionId: t.sessionId,
      browserLiveUrl: t.browserLiveUrl,
      browserScreenshotUrl: t.browserScreenshotUrl,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      title,
      prompt,
      agent,
      model,
      integrations: integrationIds,
      skills: skillIds,
      contextFiles,
    } = body;

    if (!prompt || !agent || !model) {
      return NextResponse.json(
        { error: 'prompt, agent, and model are required' },
        { status: 400 }
      );
    }

    const taskId = nanoid();
    const now = new Date().toISOString();

    // If projectId is provided (not standalone), ensure project exists in database
    const effectiveProjectId = projectId === 'standalone' ? null : projectId || null;

    if (effectiveProjectId) {
      // Check if project exists
      const existingProject = await db.query.projects.findFirst({
        where: eq(projects.id, effectiveProjectId),
      });

      // If project doesn't exist, create it
      if (!existingProject) {
        db.insert(projects).values({
          id: effectiveProjectId,
          userId: DEFAULT_USER_ID,
          name: body.projectName || 'Untitled Project',
          description: null,
          createdAt: now,
          updatedAt: now,
        }).run();
      }
    }

    // Create task
    db.insert(tasks).values({
      id: taskId,
      projectId: effectiveProjectId,
      userId: DEFAULT_USER_ID,
      title: title || prompt.slice(0, 50),
      prompt,
      status: 'pending' as TaskStatus,
      agent: agent as AgentType,
      model,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Add initial user message
    const messageId = nanoid();
    db.insert(messages).values({
      id: messageId,
      taskId,
      role: 'user',
      contentType: 'text',
      content: prompt,
      createdAt: now,
    }).run();

    // Add integrations
    if (integrationIds && integrationIds.length > 0) {
      for (const intId of integrationIds) {
        db.insert(taskIntegrations).values({
          taskId,
          integrationId: intId,
        }).run();
      }
    }

    // Add skills
    if (skillIds && skillIds.length > 0) {
      for (const skillId of skillIds) {
        db.insert(taskSkills).values({
          taskId,
          skillId,
        }).run();
      }
    }

    // Add context files
    if (contextFiles && contextFiles.length > 0) {
      for (const file of contextFiles) {
        let content: Buffer | null = null;
        if (file.content) {
          if (file.isBase64) {
            // Decode base64-encoded binary content
            content = Buffer.from(file.content, 'base64');
          } else if (typeof file.content === 'string') {
            // Text content
            content = Buffer.from(file.content, 'utf-8');
          }
        }

        db.insert(taskContextFiles).values({
          id: nanoid(),
          taskId,
          name: file.name,
          path: file.path || file.name,
          type: file.type || 'application/octet-stream',
          size: content?.length || 0,
          content,
          uploadedAt: now,
        }).run();
      }
    }

    // Return created task
    const created = {
      id: taskId,
      projectId: projectId || 'standalone',
      title: title || prompt.slice(0, 50),
      status: 'pending',
      prompt,
      messages: [{
        id: messageId,
        role: 'user',
        contentType: 'text',
        content: prompt,
        timestamp: now,
        toolCalls: [],
      }],
      progress: [],
      artifacts: [],
      integrations: integrationIds || [],
      skills: skillIds || [],
      agent,
      model,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
