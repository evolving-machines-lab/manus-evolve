import { NextRequest, NextResponse } from 'next/server';
import { db, userIntegrations } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEFAULT_USER_ID = 'default-user';

// POST /api/integrations/:id - Connect an integration
// In a real app, this would redirect to OAuth or return an auth URL
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const integrationId = params.id;
    const now = new Date().toISOString();

    // Check if connection already exists
    const existing = db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, DEFAULT_USER_ID),
          eq(userIntegrations.integrationId, integrationId)
        )
      )
      .get();

    if (existing) {
      // Update existing connection
      db.update(userIntegrations)
        .set({
          connected: true,
          connectedAt: now,
        })
        .where(eq(userIntegrations.id, existing.id))
        .run();
    } else {
      // Create new connection
      db.insert(userIntegrations).values({
        id: nanoid(),
        userId: DEFAULT_USER_ID,
        integrationId,
        connected: true,
        connectedAt: now,
      }).run();
    }

    // In a real app with Composio, you would:
    // const { url } = await Evolve.composio.auth(DEFAULT_USER_ID, integrationId);
    // return NextResponse.json({ authUrl: url });

    return NextResponse.json({
      success: true,
      message: 'Integration connected',
      // authUrl: url, // For real OAuth flow
    });
  } catch (error) {
    console.error('Error connecting integration:', error);
    return NextResponse.json({ error: 'Failed to connect integration' }, { status: 500 });
  }
}

// DELETE /api/integrations/:id - Disconnect an integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const integrationId = params.id;

    db.update(userIntegrations)
      .set({ connected: false })
      .where(
        and(
          eq(userIntegrations.userId, DEFAULT_USER_ID),
          eq(userIntegrations.integrationId, integrationId)
        )
      )
      .run();

    return NextResponse.json({ success: true, message: 'Integration disconnected' });
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    return NextResponse.json({ error: 'Failed to disconnect integration' }, { status: 500 });
  }
}

// GET /api/integrations/:id - Get single integration status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const integrationId = params.id;

    const connection = db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, DEFAULT_USER_ID),
          eq(userIntegrations.integrationId, integrationId)
        )
      )
      .get();

    return NextResponse.json({
      connected: connection?.connected ?? false,
      accountId: connection?.accountId,
      connectedAt: connection?.connectedAt,
    });
  } catch (error) {
    console.error('Error fetching integration status:', error);
    return NextResponse.json({ error: 'Failed to fetch integration status' }, { status: 500 });
  }
}
