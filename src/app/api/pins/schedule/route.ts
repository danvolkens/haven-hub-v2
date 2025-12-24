import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiUserId } from '@/lib/auth/session';
import { schedulePins } from '@/lib/pinterest/pin-service';

const scheduleSchema = z.object({
  pinIds: z.array(z.string().uuid()).min(1).max(50),
  startFrom: z.string().datetime().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const body = await request.json();

    const { pinIds, startFrom } = scheduleSchema.parse(body);
    const result = await schedulePins(userId, pinIds, startFrom);

    return NextResponse.json({
      success: true,
      scheduled: result.scheduled,
      errors: result.errors,
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
