import { NextRequest, NextResponse } from 'next/server';
import { db, integrations, userIntegrations } from '@/lib/db';
import { eq } from 'drizzle-orm';

const DEFAULT_USER_ID = 'default-user';

// GET /api/integrations - List all integrations with user connection status
export async function GET() {
  try {
    // Get all integrations
    const allIntegrations = db.select().from(integrations).all();

    // Get user's connections
    const userConnections = db
      .select()
      .from(userIntegrations)
      .where(eq(userIntegrations.userId, DEFAULT_USER_ID))
      .all();

    // Create a map of connected integrations
    const connectionMap = new Map(
      userConnections.map((uc) => [uc.integrationId, uc])
    );

    // Transform to match frontend types
    const transformed = allIntegrations.map((int) => {
      const connection = connectionMap.get(int.id);
      return {
        id: int.id,
        name: int.name,
        displayName: int.displayName,
        description: int.description,
        icon: int.icon,
        category: int.category,
        connected: connection?.connected ?? false,
        accountId: connection?.accountId,
      };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 });
  }
}
