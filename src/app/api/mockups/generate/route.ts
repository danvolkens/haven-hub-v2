import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { triggerMockupGeneration } from '@/lib/trigger/client';

const generateSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1).max(20),
  scenes: z.array(z.string()).min(1).max(5),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();

    const { assetIds, scenes } = generateSchema.parse(body);

    // Verify assets belong to user
    const { data: assets, error: assetError } = await (supabase as any)
      .from('assets')
      .select('id')
      .in('id', assetIds)
      .eq('user_id', userId);

    if (assetError || !assets || assets.length !== assetIds.length) {
      return NextResponse.json(
        { error: 'One or more assets not found' },
        { status: 404 }
      );
    }

    // Check credits
    const creditsNeeded = assetIds.length * scenes.length;
    const { data: creditCheck } = await (supabase as any).rpc('reserve_mockup_credits', {
      p_user_id: userId,
      p_credits: creditsNeeded,
    });

    if (!creditCheck?.[0]?.success) {
      return NextResponse.json(
        { error: creditCheck?.[0]?.message || 'Insufficient credits' },
        { status: 400 }
      );
    }

    // Trigger generation
    const handle = await triggerMockupGeneration({
      userId,
      assetIds,
      scenes,
    });

    return NextResponse.json({
      success: true,
      taskId: handle.id,
      mockupsQueued: creditsNeeded,
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
