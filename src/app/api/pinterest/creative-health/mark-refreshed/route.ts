import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { markRefreshed } from '@/lib/services/creative-health';

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();

    const body = await request.json();
    const { content_type, content_id } = body;

    if (!content_type || !content_id) {
      return NextResponse.json(
        { error: 'content_type and content_id are required' },
        { status: 400 }
      );
    }

    if (!['pin', 'ad_creative', 'asset'].includes(content_type)) {
      return NextResponse.json(
        { error: 'Invalid content_type' },
        { status: 400 }
      );
    }

    const result = await markRefreshed(userId, content_type, content_id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to mark as refreshed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error marking content as refreshed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
