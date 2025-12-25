import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { triggerDesignEngine } from '@/lib/trigger/client';

const generateSchema = z.object({
  outputFormats: z.array(z.string()).default([]),
  generateMockups: z.boolean().default(false),
  mockupScenes: z.array(z.string()).default([]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getApiUserId();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { outputFormats, generateMockups, mockupScenes } = generateSchema.parse(body);

    // Verify quote exists and belongs to user
    const { data: quote, error } = await (supabase as any)
      .from('quotes')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.status === 'generating') {
      return NextResponse.json(
        { error: 'Quote is already being processed' },
        { status: 409 }
      );
    }

    // Trigger design engine
    const { id: runId } = await triggerDesignEngine({
      quoteId: id,
      userId,
      outputFormats,
      generateMockups,
      mockupScenes,
    });

    return NextResponse.json({
      success: true,
      runId,
      message: 'Asset generation started',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
