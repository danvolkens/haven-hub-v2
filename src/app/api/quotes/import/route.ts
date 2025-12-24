import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { nanoid } from 'nanoid';

const importRowSchema = z.object({
  text: z.string().min(1).max(500),
  attribution: z.string().max(100).optional(),
  collection: z.enum(['grounding', 'wholeness', 'growth']),
  mood: z.enum(['calm', 'warm', 'hopeful', 'reflective', 'empowering']),
  temporal_tags: z.array(z.string()).or(z.string()).optional(),
});

const importSchema = z.object({
  quotes: z.array(importRowSchema).min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();
    const body = await request.json();

    const { quotes } = importSchema.parse(body);
    const batchId = nanoid();

    // Prepare quotes for insertion
    const quotesToInsert = quotes.map((q) => ({
      user_id: userId,
      text: q.text,
      attribution: q.attribution || null,
      collection: q.collection,
      mood: q.mood,
      temporal_tags: Array.isArray(q.temporal_tags)
        ? q.temporal_tags
        : q.temporal_tags?.split(',').map((t) => t.trim()) || [],
      imported_from: 'csv' as const,
      import_batch_id: batchId,
    }));

    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < quotesToInsert.length; i += batchSize) {
      const batch = quotesToInsert.slice(i, i + batchSize);

      const { data, error } = await (supabase as any)
        .from('quotes')
        .insert(batch)
        .select('id');

      if (error) {
        errors.push({ index: i, error: error.message });
      } else {
        inserted += data?.length || 0;
      }
    }

    // Log activity
    await (supabase as any).rpc('log_activity', {
      p_user_id: userId,
      p_action_type: 'quotes_imported',
      p_details: {
        total: quotes.length,
        inserted,
        errors: errors.length,
        batchId,
      },
      p_executed: true,
      p_module: 'design_engine',
    });

    return NextResponse.json({
      success: true,
      batchId,
      total: quotes.length,
      inserted,
      errors,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid import data' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
