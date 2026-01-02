import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { addDays, parseISO, format, isValid } from 'date-fns';

// Date format validation (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/tiktok/queue - Get queue items for a week
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get('weekStart');

    if (!weekStart) {
      return NextResponse.json({ error: 'weekStart required' }, { status: 400 });
    }

    // Validate date format
    if (!DATE_REGEX.test(weekStart)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }

    const startDate = parseISO(weekStart);

    // Validate the date is valid (e.g., not 2024-02-30)
    if (!isValid(startDate)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    const endDate = addDays(startDate, 7);

    const { data: queueItems, error } = await (supabase as any)
      .from('tiktok_queue')
      .select(`
        *,
        quotes:quote_id (
          text,
          attribution,
          collection
        )
      `)
      .eq('user_id', user.id)
      .gte('target_date', format(startDate, 'yyyy-MM-dd'))
      .lt('target_date', format(endDate, 'yyyy-MM-dd'))
      .order('target_date', { ascending: true })
      .order('slot_type', { ascending: true });

    if (error) {
      // Table might not exist yet - return empty array
      console.error('Error fetching TikTok queue:', error);
      return NextResponse.json([]);
    }

    return NextResponse.json(queueItems || []);
  } catch (error) {
    console.error('Error in TikTok queue API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
