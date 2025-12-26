import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { getAlerts, getUnreadAlertCount, markAllAlertsAsRead } from '@/lib/alerts/alert-service';

export async function GET(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const status = statusParam ? statusParam.split(',') : undefined;

    const [alerts, unreadCount] = await Promise.all([
      getAlerts(userId, { status, limit, offset }),
      getUnreadAlertCount(userId),
    ]);

    return NextResponse.json({
      alerts,
      unreadCount,
      pagination: {
        limit,
        offset,
        hasMore: alerts.length === limit,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const body = await request.json();

    if (body.action === 'mark_all_read') {
      await markAllAlertsAsRead(userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error processing alert action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process action' },
      { status: 500 }
    );
  }
}
