import { NextRequest, NextResponse } from 'next/server';
import { composio } from '@/lib/evolve';
import { db, userIntegrations, integrations, DEFAULT_USER_ID } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET /api/composio/connections - Get detailed connection info
export async function GET() {
  try {
    const connections = await composio.connections(DEFAULT_USER_ID);
    return NextResponse.json(connections);
  } catch (error) {
    console.error('Error getting Composio connections:', error);

    // Fallback to database
    try {
      const dbConnections = db
        .select()
        .from(userIntegrations)
        .where(eq(userIntegrations.userId, DEFAULT_USER_ID))
        .all();

      const connections = [];
      for (const conn of dbConnections) {
        const integration = db
          .select()
          .from(integrations)
          .where(eq(integrations.id, conn.integrationId))
          .get();

        if (integration) {
          connections.push({
            toolkit: integration.name,
            connected: conn.connected,
            accountId: conn.accountId,
          });
        }
      }

      return NextResponse.json(connections);
    } catch (dbError) {
      console.error('Database fallback failed:', dbError);
      return NextResponse.json(
        { error: 'Failed to get connections' },
        { status: 500 }
      );
    }
  }
}
