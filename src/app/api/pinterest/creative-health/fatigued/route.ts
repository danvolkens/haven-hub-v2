import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getApiUserId } from '@/lib/auth/session';
import { getFatiguedContent } from '@/lib/services/creative-health';

export async function GET() {
  try {
    const userId = await getApiUserId();
    const supabase = await createServerSupabaseClient();

    // Get fatigued content
    const fatigued = await getFatiguedContent(userId, 50);

    // Enrich with content details
    const enrichedItems = await Promise.all(
      fatigued.map(async (item) => {
        let content = null;

        if (item.content_type === 'pin') {
          const { data: pin } = await (supabase as any)
            .from('pins')
            .select('id, title, image_url, pinterest_pin_id')
            .eq('id', item.content_id)
            .single();
          content = pin;
        } else if (item.content_type === 'ad_creative') {
          const { data: ad } = await (supabase as any)
            .from('pinterest_ads')
            .select('id, name, creative_url')
            .eq('id', item.content_id)
            .single();
          if (ad) {
            content = {
              id: ad.id,
              title: ad.name,
              image_url: ad.creative_url,
            };
          }
        }

        return {
          ...item,
          content,
        };
      })
    );

    return NextResponse.json({
      items: enrichedItems,
      total: enrichedItems.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching fatigued content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
