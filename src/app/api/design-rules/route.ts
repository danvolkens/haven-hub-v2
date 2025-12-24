import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';

const designRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  is_default: z.boolean().default(false),
  applies_to_collections: z.array(z.string()).default([]),
  applies_to_moods: z.array(z.string()).default([]),
  typography: z.object({}).passthrough().default({}),
  colors: z.object({}).passthrough().default({}),
  layout: z.object({}).passthrough().default({}),
  decorations: z.object({}).passthrough().default({}),
  output_formats: z.array(z.string()).default(['pinterest']),
  print_sizes: z.array(z.string()).default([]),
  quality_thresholds: z.object({}).passthrough().default({}),
  priority: z.number().default(0),
  enabled: z.boolean().default(true),
});

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    const { data: rules, error } = await (supabase as any)
      .from('design_rules')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rules: rules || [] });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();
    const body = await request.json();

    const validated = designRuleSchema.parse(body);

    const { data, error } = await (supabase as any)
      .from('design_rules')
      .insert({
        user_id: userId,
        ...validated,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
