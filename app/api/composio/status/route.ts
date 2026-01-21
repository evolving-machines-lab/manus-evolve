import { NextRequest, NextResponse } from 'next/server';
import { composio } from '@/lib/evolve';
import { db, userIntegrations, integrations } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

const DEFAULT_USER_ID = 'default-user';

// GET /api/composio/status - Get all integration connection statuses
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const toolkit = searchParams.get('toolkit');

  try {
    if (toolkit) {
      // Get status for single toolkit
      const connected = await composio.status(DEFAULT_USER_ID, toolkit);
      return NextResponse.json({ toolkit, connected });
    }

    // Get status for all toolkits
    const status = await composio.status(DEFAULT_USER_ID);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting Composio status:', error);

    // Fallback to database if Composio API fails
    try {
      const connections = db
        .select()
        .from(userIntegrations)
        .where(eq(userIntegrations.userId, DEFAULT_USER_ID))
        .all();

      if (toolkit) {
        const connection = connections.find((c) => {
          const integration = db
            .select()
            .from(integrations)
            .where(eq(integrations.id, c.integrationId))
            .get();
          return integration?.name === toolkit;
        });
        return NextResponse.json({
          toolkit,
          connected: connection?.connected ?? false,
        });
      }

      const statusMap: Record<string, boolean> = {};
      for (const connection of connections) {
        const integration = db
          .select()
          .from(integrations)
          .where(eq(integrations.id, connection.integrationId))
          .get();
        if (integration) {
          statusMap[integration.name] = connection.connected;
        }
      }

      return NextResponse.json(statusMap);
    } catch (dbError) {
      console.error('Database fallback failed:', dbError);
      return NextResponse.json(
        { error: 'Failed to get integration status' },
        { status: 500 }
      );
    }
  }
}
