import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getUserId } from '@/lib/auth/session';
import { getOrSet, cacheKey, CACHE_PREFIX, TTL } from '@/lib/cache/cache-utils';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const userId = await getUserId();

    const counts = await getOrSet(
      cacheKey(CACHE_PREFIX.APPROVAL_COUNTS, userId),
      async () => {
        const { data, error } = await (supabase as any).rpc('get_approval_counts', {
          p_user_id: userId,
        });

        if (error) throw error;

        // Transform array to object
        const result: Record<string, number> = {};
        for (const row of data || []) {
          result[row.type] = row.count;
        }
        return result;
      },
      TTL.APPROVAL_COUNTS
    );

    return NextResponse.json(counts);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
