import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiUserId } from '@/lib/auth/session';
import { publishPin } from '@/lib/integrations/pinterest/service';

const publishSchema = z.object({
  pinId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    await getApiUserId();

    const body = await request.json();
    const { pinId } = publishSchema.parse(body);

    const { pinterestPinId } = await publishPin(pinId);

    return NextResponse.json({
      success: true,
      pinterestPinId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publish failed' },
      { status: 500 }
    );
  }
}
