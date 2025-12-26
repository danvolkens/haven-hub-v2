import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { activateCampaign } from '@/lib/services/pinterest-campaigns';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/pinterest/campaigns/[id]/activate
 * Activate a campaign (set status to ACTIVE)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getApiUserId();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const result = await activateCampaign(userId, id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to activate campaign:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'Campaign not found') {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        );
      }
      if (error.message.includes('Add at least one pin')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      if (error.message.includes('Pinterest not connected')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to activate campaign' },
      { status: 500 }
    );
  }
}
