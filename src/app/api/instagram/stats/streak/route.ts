import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get last 14 days of posting history
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: postingLog } = await (supabase as any)
      .from('instagram_posting_log')
      .select('posted_date')
      .eq('user_id', user.id)
      .gte('posted_date', fourteenDaysAgo.toISOString().split('T')[0])
      .order('posted_date', { ascending: false });

    // Build set of dates with posts
    const postedDates = new Set(postingLog?.map((p: any) => p.posted_date) || []);

    // Generate last 14 days array
    const last14Days: { date: string; posted: boolean }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last14Days.push({
        date: dateStr,
        posted: postedDates.has(dateStr),
      });
    }

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Start from today or yesterday
    let checkDate = postedDates.has(today) ? new Date() : yesterday;

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (postedDates.has(dateStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
      // Safety limit
      if (currentStreak > 365) break;
    }

    // Get best streak from user settings or calculate
    const { data: settings } = await (supabase as any)
      .from('user_settings')
      .select('instagram_best_streak')
      .eq('user_id', user.id)
      .single();

    const bestStreak = Math.max(settings?.instagram_best_streak || 0, currentStreak);

    // Update best streak if current is higher
    if (currentStreak > (settings?.instagram_best_streak || 0)) {
      await (supabase as any)
        .from('user_settings')
        .update({ instagram_best_streak: currentStreak })
        .eq('user_id', user.id);
    }

    return NextResponse.json({
      current_streak: currentStreak,
      best_streak: bestStreak,
      last_14_days: last14Days,
    });
  } catch (error) {
    console.error('Error fetching streak:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
