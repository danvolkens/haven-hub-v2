import { NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getPinterestClient, syncPinAnalytics } from '@/lib/integrations/pinterest/service';

export async function POST() {
  try {
    const userId = await getApiUserId();

    // Check if Pinterest is connected
    const client = await getPinterestClient(userId);
    if (!client) {
      return NextResponse.json(
        { error: 'Pinterest not connected' },
        { status: 400 }
      );
    }

    // Sync analytics for all published pins
    const result = await syncPinAnalytics(userId);

    return NextResponse.json({
      success: true,
      synced: result.synced,
      updated: result.updated,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
