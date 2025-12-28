import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Default optimal posting times based on general Instagram best practices
// Format matches frontend OptimalTime interface: { time: string, day: string, engagement_rate: number }
const DEFAULT_OPTIMAL_TIMES = [
  { time: '11:00 AM', day: 'Monday', engagement_rate: 4.5 },
  { time: '8:00 PM', day: 'Monday', engagement_rate: 4.8 },
  { time: '9:00 AM', day: 'Tuesday', engagement_rate: 4.2 },
  { time: '9:00 PM', day: 'Tuesday', engagement_rate: 4.6 },
  { time: '11:00 AM', day: 'Wednesday', engagement_rate: 4.4 },
  { time: '8:00 PM', day: 'Wednesday', engagement_rate: 5.1 },
  { time: '10:00 AM', day: 'Thursday', engagement_rate: 4.3 },
  { time: '9:00 PM', day: 'Thursday', engagement_rate: 4.9 },
  { time: '11:00 AM', day: 'Friday', engagement_rate: 4.0 },
  { time: '7:00 PM', day: 'Friday', engagement_rate: 4.5 },
  { time: '10:00 AM', day: 'Saturday', engagement_rate: 3.8 },
  { time: '8:00 PM', day: 'Saturday', engagement_rate: 4.3 },
  { time: '10:00 AM', day: 'Sunday', engagement_rate: 3.9 },
  { time: '7:00 PM', day: 'Sunday', engagement_rate: 4.2 },
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
      return NextResponse.json(DEFAULT_OPTIMAL_TIMES);
    }

    // Format the optimal times to match frontend OptimalTime interface
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formattedTimes = optimalTimes.map((time: any) => {
      const hour = time.hour;
      const hour12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      return {
        time: `${hour12}:00 ${ampm}`,
        day: dayNames[time.day_of_week],
        engagement_rate: Math.round(time.engagement_score * 10) / 10,
      };
    });

    return NextResponse.json(formattedTimes);
  } catch (error) {
    console.error('Error fetching optimal times:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
