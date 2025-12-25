import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { disconnectPinterest } from '@/lib/integrations/pinterest/service';

export async function POST() {
  try {
    const userId = await getApiUserId();

    await disconnectPinterest(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pinterest disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Pinterest' },
      { status: 500 }
    );
  }
}
