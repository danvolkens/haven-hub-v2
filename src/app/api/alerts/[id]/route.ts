import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { markAlertAsRead, dismissAlert } from '@/lib/alerts/alert-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getApiUserId();
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'read') {
      await markAlertAsRead(userId, id);
      return NextResponse.json({ success: true });
    }

    if (body.action === 'dismiss') {
      await dismissAlert(userId, id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update alert' },
      { status: 500 }
    );
  }
}
