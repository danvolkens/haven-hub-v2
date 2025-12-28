import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { format, subDays, differenceInDays } from 'date-fns';

// GET /api/tiktok/streak - Get posting streak data
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get posting log entries ordered by date
    const { data: postingLog, error } = await (supabase as any)
      .from('tiktok_posting_log')
      .select('date, total_posted')
      .eq('user_id', user.id)
      .gt('total_posted', 0)  // Only count days where we actually posted
      .order('date', { ascending: false });

    if (error) {
      // Table might not exist yet - return empty streak
      console.error('Error fetching posting log:', error);
      return NextResponse.json({
        current: 0,
        longest: 0,
        lastPostedAt: null,
      });
    }

    if (!postingLog || postingLog.length === 0) {
      return NextResponse.json({
        current: 0,
        longest: 0,
        lastPostedAt: null,
      });
    }

    // Calculate current streak
    const today = new Date();
    const postDates = new Set<string>(
      postingLog.map((p: { date: string }) => format(new Date(p.date), 'yyyy-MM-dd'))
    );

    let currentStreak = 0;
    let checkDate = today;

    // Check if posted today or yesterday to start counting
    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

    if (postDates.has(todayStr) || postDates.has(yesterdayStr)) {
      // Start from today and count backwards
      for (let i = 0; i < 365; i++) {
        const dateStr = format(subDays(today, i), 'yyyy-MM-dd');
        if (postDates.has(dateStr)) {
          currentStreak++;
        } else if (i > 0) {
          // Allow skipping today if we didn't post yet
          break;
        }
      }
    }

    // Calculate longest streak (simplified - would need more complex logic for accuracy)
    let longestStreak = currentStreak;
    let tempStreak = 0;
    const sortedDates: string[] = Array.from(postDates).sort();

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diff = differenceInDays(currDate, prevDate);

        if (diff === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    return NextResponse.json({
      current: currentStreak,
      longest: longestStreak,
      lastPostedAt: postingLog[0]?.date || null,
    });
  } catch (error) {
    console.error('Error in streak API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
