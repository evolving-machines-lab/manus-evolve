import { NextRequest, NextResponse } from 'next/server';
import { db, tasks } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { uploadTaskContext, type FileMap } from '@/lib/evolve';

// POST /api/tasks/:id/upload - Upload files mid-task
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

  try {
    const formData = await request.formData();
    const files: FileMap = {};

    // Process uploaded files
    const entries = Array.from(formData.entries());
    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];
      if (value instanceof File) {
        const buffer = await value.arrayBuffer();
        files[key] = new Uint8Array(buffer);
      } else if (typeof value === 'string') {
        // Handle JSON-encoded file content
        try {
          const parsed = JSON.parse(value);
          if (parsed.path && parsed.content) {
            files[parsed.path] = parsed.content;
          }
        } catch {
          // Not JSON, treat as file content
          files[key] = value;
        }
      }
    }

    if (Object.keys(files).length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Upload to active session
    await uploadTaskContext(taskId, files);

    return NextResponse.json({
      success: true,
      message: `Uploaded ${Object.keys(files).length} file(s)`,
      files: Object.keys(files),
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload files' },
      { status: 500 }
    );
  }
}
