import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Default optimal posting times based on general Instagram best practices
const DEFAULT_OPTIMAL_TIMES = [
  { day: 0, hour: 10, label: 'Sunday 10 AM', score: 75 },
  { day: 0, hour: 19, label: 'Sunday 7 PM', score: 80 },
  { day: 1, hour: 11, label: 'Monday 11 AM', score: 85 },
  { day: 1, hour: 20, label: 'Monday 8 PM', score: 90 },
  { day: 2, hour: 9, label: 'Tuesday 9 AM', score: 82 },
  { day: 2, hour: 21, label: 'Tuesday 9 PM', score: 88 },
  { day: 3, hour: 11, label: 'Wednesday 11 AM', score: 86 },
  { day: 3, hour: 20, label: 'Wednesday 8 PM', score: 92 },
  { day: 4, hour: 10, label: 'Thursday 10 AM', score: 84 },
  { day: 4, hour: 21, label: 'Thursday 9 PM', score: 91 },
  { day: 5, hour: 11, label: 'Friday 11 AM', score: 80 },
  { day: 5, hour: 19, label: 'Friday 7 PM', score: 85 },
  { day: 6, hour: 10, label: 'Saturday 10 AM', score: 78 },
  { day: 6, hour: 20, label: 'Saturday 8 PM', score: 83 },
];

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get calculated optimal times from the database
    const { data: optimalTimes, error } = await (supabase as any)
      .from('instagram_optimal_times')
      .select('day_of_week, hour, engagement_score')
      .eq('user_id', user.id)
      .order('engagement_score', { ascending: false });

    if (error || !optimalTimes || optimalTimes.length === 0) {
      // Return default optimal times if no data
      return NextResponse.json({
        optimal_times: DEFAULT_OPTIMAL_TIMES,
        is_default: true,
      });
    }

    // Format the optimal times
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formattedTimes = optimalTimes.map((time: any) => ({
      day: time.day_of_week,
      hour: time.hour,
      label: `${dayNames[time.day_of_week]} ${time.hour > 12 ? time.hour - 12 : time.hour} ${time.hour >= 12 ? 'PM' : 'AM'}`,
      score: Math.round(time.engagement_score),
    }));

    return NextResponse.json({
      optimal_times: formattedTimes,
      is_default: false,
    });
  } catch (error) {
    console.error('Error fetching optimal times:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
