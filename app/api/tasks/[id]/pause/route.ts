import { NextRequest, NextResponse } from 'next/server';
import { db, tasks } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { pauseTask } from '@/lib/evolve';
import type { TaskStatus } from '@/lib/db/schema';

// POST /api/tasks/:id/pause - Pause task session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const taskId = params.id;

  // Verify task exists
  const task = db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .get();

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.status !== 'running') {
    return NextResponse.json(
      { error: 'Task is not running' },
      { status: 400 }
    );
  }

  try {
    await pauseTask(taskId);

    // Update task status
    db.update(tasks)
      .set({
        status: 'paused' as TaskStatus,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tasks.id, taskId))
      .run();

    return NextResponse.json({
      success: true,
      message: 'Task paused',
      status: 'paused',
    });
  } catch (error) {
    console.error('Error pausing task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pause task' },
      { status: 500 }
    );
  }
}
