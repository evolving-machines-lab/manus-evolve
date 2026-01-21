import { NextRequest, NextResponse } from 'next/server';
import { db, projects, projectIntegrations, projectSkills } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

// GET /api/projects/:id - Get a single project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, params.id),
      with: {
        files: true,
        integrations: {
          with: {
            integration: true,
          },
        },
        skills: {
          with: {
            skill: true,
          },
        },
        tasks: {
          orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Transform to match frontend types
    const transformed = {
      id: project.id,
      name: project.name,
      description: project.description,
      files: project.files.map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        size: f.size,
        type: f.type,
      })),
      integrations: project.integrations.map((pi) => pi.integrationId),
      skills: project.skills.map((ps) => ps.skillId),
      tasks: project.tasks,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

// PUT /api/projects/:id - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, integrations: integrationIds, skills: skillIds } = body;

    const now = new Date().toISOString();

    // Update project
    db.update(projects)
      .set({
        ...(name && { name }),
        ...(description !== undefined && { description }),
        updatedAt: now,
      })
      .where(eq(projects.id, params.id))
      .run();

    // Update integrations if provided
    if (integrationIds !== undefined) {
      // Remove existing
      db.delete(projectIntegrations)
        .where(eq(projectIntegrations.projectId, params.id))
        .run();

      // Add new
      for (const intId of integrationIds) {
        db.insert(projectIntegrations).values({
          projectId: params.id,
          integrationId: intId,
          enabledAt: now,
        }).run();
      }
    }

    // Update skills if provided
    if (skillIds !== undefined) {
      // Remove existing
      db.delete(projectSkills)
        .where(eq(projectSkills.projectId, params.id))
        .run();

      // Add new
      for (const skillId of skillIds) {
        db.insert(projectSkills).values({
          projectId: params.id,
          skillId,
          enabledAt: now,
        }).run();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE /api/projects/:id - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    db.delete(projects)
      .where(eq(projects.id, params.id))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
