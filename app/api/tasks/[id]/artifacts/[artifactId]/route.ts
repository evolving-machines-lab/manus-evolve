import { NextRequest, NextResponse } from 'next/server';
import { db, artifacts } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

// GET /api/tasks/:id/artifacts/:artifactId - Download artifact
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; artifactId: string } }
) {
  // Query artifact with content
  const artifact = db
    .select()
    .from(artifacts)
    .where(and(
      eq(artifacts.id, params.artifactId),
      eq(artifacts.taskId, params.id)
    ))
    .get();

  if (!artifact) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
  }

  if (!artifact.content) {
    return NextResponse.json({ error: 'Artifact content not available' }, { status: 404 });
  }

  // Return binary content with proper headers
  return new NextResponse(artifact.content, {
    headers: {
      'Content-Type': artifact.type,
      'Content-Disposition': `attachment; filename="${artifact.name}"`,
      'Content-Length': artifact.size.toString(),
    },
  });
}
