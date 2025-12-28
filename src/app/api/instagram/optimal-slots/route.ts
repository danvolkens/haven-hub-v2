import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Day content mapping from scheduler spec
const DAY_CONTENT_MAP: Record<number, { postTypes: string[]; contentPillars: string[]; times: string[]; theme: string }> = {
  0: { postTypes: ['carousel'], contentPillars: ['brand_story'], times: ['10:00'], theme: 'Sunday Reflection' },
  1: { postTypes: ['carousel'], contentPillars: ['educational'], times: ['11:00'], theme: 'Monday Education' },
  2: { postTypes: ['reel'], contentPillars: ['product_showcase'], times: ['09:00'], theme: 'Tuesday Product' },
  3: { postTypes: ['feed'], contentPillars: ['product_showcase'], times: ['13:00'], theme: 'Wednesday Showcase' },
  4: { postTypes: ['reel', 'carousel'], contentPillars: ['brand_story', 'educational'], times: ['12:00', '19:00'], theme: 'Thursday Mixed' },
  5: { postTypes: ['feed'], contentPillars: ['community'], times: ['11:00'], theme: 'Friday Community' },
  6: { postTypes: ['reel', 'feed'], contentPillars: ['product_showcase'], times: ['09:00', '13:00'], theme: 'Saturday Product' },
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postType = searchParams.get('post_type') || 'feed';
    const contentPillar = searchParams.get('content_pillar') || 'product_showcase';

    // Find optimal slots for the next 14 days
    const slots: Array<{
      datetime: string;
      engagement_rate: number;
      day_theme: string;
    }> = [];

    const now = new Date();

    for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() + dayOffset);
      const dayOfWeek = date.getDay();
      const dayConfig = DAY_CONTENT_MAP[dayOfWeek];

      // Check if this day matches the requested post type and content pillar
      const typeMatch = dayConfig.postTypes.includes(postType);
      const pillarMatch = dayConfig.contentPillars.includes(contentPillar);

      if (typeMatch || pillarMatch) {
        // Use the first time slot for this day
        const [hours, minutes] = dayConfig.times[0].split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);

        // Calculate a mock engagement rate based on how well it matches
        let engagementRate = 3.0;
        if (typeMatch) engagementRate += 0.5;
        if (pillarMatch) engagementRate += 0.7;
        // Add some variance
        engagementRate += Math.random() * 0.5;

        slots.push({
          datetime: date.toISOString(),
          engagement_rate: Math.round(engagementRate * 10) / 10,
          day_theme: dayConfig.theme,
        });
      }
    }

    // Sort by engagement rate (best first) and return top 5
    slots.sort((a, b) => b.engagement_rate - a.engagement_rate);

    return NextResponse.json(slots.slice(0, 5));
  } catch (error) {
    console.error('Error fetching optimal slots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
