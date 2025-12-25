import { NextRequest, NextResponse } from 'next/server';
import { getApiUserId } from '@/lib/auth/session';
import { addPinsToCampaign, getAvailablePins } from '@/lib/services/pinterest-campaigns';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/pinterest/campaigns/[id]/pins
 * Get available pins that can be added to the campaign
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getApiUserId();

    const pins = await getAvailablePins(userId);

    return NextResponse.json({ pins });
  } catch (error) {
    console.error('Failed to fetch available pins:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch available pins' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pinterest/campaigns/[id]/pins
 * Add pins to a campaign
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const userId = await getApiUserId();
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    const { pinIds } = body;

    if (!pinIds || !Array.isArray(pinIds) || pinIds.length === 0) {
      return NextResponse.json(
        { error: 'pinIds array is required' },
        { status: 400 }
      );
    }

    const result = await addPinsToCampaign(userId, id, pinIds);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to add pins to campaign:', error);

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
      if (error.message.includes('Pinterest not connected')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to add pins to campaign' },
      { status: 500 }
    );
  }
}
