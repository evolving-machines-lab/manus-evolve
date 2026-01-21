import { NextRequest, NextResponse } from 'next/server';
import { db, tasks, taskContextFiles } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET /api/tasks/:id/files - Get task context files
export async function GET(
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

  try {
    // Get task context files (without content for listing)
    const files = db
      .select({
        id: taskContextFiles.id,
        name: taskContextFiles.name,
        path: taskContextFiles.path,
        size: taskContextFiles.size,
        type: taskContextFiles.type,
      })
      .from(taskContextFiles)
      .where(eq(taskContextFiles.taskId, taskId))
      .all();

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Error fetching task files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task files' },
      { status: 500 }
    );
  }
}
