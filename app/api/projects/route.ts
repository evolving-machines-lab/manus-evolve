import { NextRequest, NextResponse } from 'next/server';
import { db, projects, projectIntegrations, projectSkills, projectFiles } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEFAULT_USER_ID = 'default-user';

// GET /api/projects - List all projects
export async function GET() {
  try {
    const result = await db.query.projects.findMany({
      where: eq(projects.userId, DEFAULT_USER_ID),
      orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
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
      },
    });

    // Transform to match frontend types
    const transformed = result.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      files: p.files.map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        size: f.size,
        type: f.type,
      })),
      integrations: p.integrations.map((pi) => pi.integrationId),
      skills: p.skills.map((ps) => ps.skillId),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, integrations: integrationIds, skills: skillIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const projectId = nanoid();
    const now = new Date().toISOString();

    // Create project
    db.insert(projects).values({
      id: projectId,
      userId: DEFAULT_USER_ID,
      name,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    }).run();

    // Add integrations
    if (integrationIds && integrationIds.length > 0) {
      for (const intId of integrationIds) {
        db.insert(projectIntegrations).values({
          projectId,
          integrationId: intId,
          enabledAt: now,
        }).run();
      }
    }

    // Add skills
    if (skillIds && skillIds.length > 0) {
      for (const skillId of skillIds) {
        db.insert(projectSkills).values({
          projectId,
          skillId,
          enabledAt: now,
        }).run();
      }
    }

    // Return created project
    const created = {
      id: projectId,
      name,
      description: description || undefined,
      files: [],
      integrations: integrationIds || [],
      skills: skillIds || [],
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
