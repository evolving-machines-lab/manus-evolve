import { NextRequest, NextResponse } from 'next/server';
import { db, tasks, artifacts } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getTaskOutput } from '@/lib/evolve';

// GET /api/tasks/:id/output - Get output files/artifacts from task
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
    // Get output from Evolve sandbox
    const output = await getTaskOutput(taskId, true);

    if (output.error) {
      return NextResponse.json({ error: output.error }, { status: 400 });
    }

    // Save artifacts to database
    const savedArtifacts: Array<{
      id: string;
      name: string;
      path: string;
      type: string;
      size: number;
    }> = [];

    for (const [path, content] of Object.entries(output.files)) {
      const name = path.split('/').pop() || path;
      const type = getFileType(name);
      const size = typeof content === 'string'
        ? content.length
        : content instanceof ArrayBuffer
          ? content.byteLength
          : (content as Uint8Array | Buffer).length;

      const artifactId = nanoid();
      db.insert(artifacts).values({
        id: artifactId,
        taskId,
        name,
        path,
        type,
        size,
        createdAt: new Date().toISOString(),
      }).run();

      savedArtifacts.push({ id: artifactId, name, path, type, size });
    }

    return NextResponse.json({
      files: Object.keys(output.files),
      artifacts: savedArtifacts,
      data: output.data,
      rawData: output.rawData,
    });
  } catch (error) {
    console.error('Error getting output files:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get output files' },
      { status: 500 }
    );
  }
}

// Helper to determine file type
function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const typeMap: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    json: 'application/json',
    csv: 'text/csv',
    md: 'text/markdown',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'application/typescript',
    py: 'text/x-python',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    zip: 'application/zip',
  };
  return typeMap[ext] || 'application/octet-stream';
}
