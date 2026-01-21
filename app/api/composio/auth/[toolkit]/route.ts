import { NextRequest, NextResponse } from 'next/server';
import { composio } from '@/lib/evolve';
import { db, integrations, userIntegrations, DEFAULT_USER_ID } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// POST /api/composio/auth/:toolkit - Get OAuth URL for a toolkit
export async function POST(
  request: NextRequest,
  { params }: { params: { toolkit: string } }
) {
  const { toolkit } = params;

  if (!toolkit) {
    return NextResponse.json({ error: 'Toolkit is required' }, { status: 400 });
  }

  try {
    const { url } = await composio.auth(DEFAULT_USER_ID, toolkit);

    return NextResponse.json({
      success: true,
      url,
      toolkit,
      message: `Redirect user to URL to connect ${toolkit}`,
    });
  } catch (error) {
    console.error('Error getting OAuth URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get OAuth URL' },
      { status: 500 }
    );
  }
}

// GET /api/composio/auth/:toolkit - Check if toolkit is connected
export async function GET(
  request: NextRequest,
  { params }: { params: { toolkit: string } }
) {
  const { toolkit } = params;

  if (!toolkit) {
    return NextResponse.json({ error: 'Toolkit is required' }, { status: 400 });
  }

  try {
    const connected = await composio.status(DEFAULT_USER_ID, toolkit);

    // If connected, update the database
    if (connected) {
      // Find the integration by name
      const integration = db
        .select()
        .from(integrations)
        .where(eq(integrations.name, toolkit))
        .get();

      if (integration) {
        // Check if user integration exists
        const existing = db
          .select()
          .from(userIntegrations)
          .where(
            and(
              eq(userIntegrations.userId, DEFAULT_USER_ID),
              eq(userIntegrations.integrationId, integration.id)
            )
          )
          .get();

        const now = new Date().toISOString();

        if (existing) {
          // Update existing
          db.update(userIntegrations)
            .set({
              connected: true,
              connectedAt: now,
            })
            .where(eq(userIntegrations.id, existing.id))
            .run();
        } else {
          // Create new
          db.insert(userIntegrations)
            .values({
              id: nanoid(),
              userId: DEFAULT_USER_ID,
              integrationId: integration.id,
              connected: true,
              connectedAt: now,
            })
            .run();
        }
      }
    }

    return NextResponse.json({ toolkit, connected });
  } catch (error) {
    console.error('Error checking toolkit status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
}
