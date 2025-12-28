import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRecentActivity } from '@/lib/instagram/activity-log';

// GET /api/instagram/activity - Get recent activity
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const types = searchParams.get('types')?.split(',');

    const activity = await getRecentActivity(supabase, user.id, {
      limit,
      eventTypes: types as any,
    });

    return NextResponse.json({ activity });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
