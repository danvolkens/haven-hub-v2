import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserId } from '@/lib/auth/session';
import { updateCampaignStatus } from '@/lib/pinterest/ads-service';

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const { id } = await params;

    const { status } = statusSchema.parse(body);
    const result = await updateCampaignStatus(userId, id, status);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      campaign: result.campaign,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
