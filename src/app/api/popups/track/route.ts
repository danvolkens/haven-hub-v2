import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { popup_id, event, metadata } = body;

    if (!popup_id || !event) {
      return NextResponse.json(
        { error: 'popup_id and event are required' },
        { status: 400 }
      );
    }

    // Validate event type
    const validEvents = ['impression', 'conversion', 'close', 'click'];
    if (!validEvents.includes(event)) {
      return NextResponse.json(
        { error: `Invalid event type. Must be one of: ${validEvents.join(', ')}` },
        { status: 400 }
      );
    }

    // Get popup to verify it exists and get owner
    const { data: popup, error: popupError } = await (supabase as any)
      .from('popups')
      .select('id, user_id, impressions, conversions')
      .eq('id', popup_id)
      .single();

    if (popupError || !popup) {
      return NextResponse.json({ error: 'Popup not found' }, { status: 404 });
    }

    // Update popup stats based on event type
    const updates: Record<string, number> = {};
    if (event === 'impression') {
      updates.impressions = (popup.impressions || 0) + 1;
    } else if (event === 'conversion') {
      updates.conversions = (popup.conversions || 0) + 1;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await (supabase as any)
        .from('popups')
        .update(updates)
        .eq('id', popup_id);

      if (updateError) {
        console.error('Error updating popup stats:', updateError);
      }
    }

    // Log the event for detailed analytics (optional)
    try {
      await (supabase as any)
        .from('popup_events')
        .insert({
          popup_id,
          event_type: event,
          metadata: metadata || {},
          created_at: new Date().toISOString(),
        });
    } catch (e) {
      // popup_events table might not exist, ignore error
      console.log('popup_events table not available');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error tracking popup event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
