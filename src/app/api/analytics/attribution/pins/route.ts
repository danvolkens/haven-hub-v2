import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/analytics/attribution/pins - Get pin-level attribution data
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get published pins with their collections
    const { data: pins, error: pinsError } = await (supabase as any)
      .from('pins')
      .select(`
        id,
        title,
        collection,
        copy_variant,
        tracked_link,
        published_at,
        pinterest_pin_id,
        quotes:quote_id (text, collection)
      `)
      .eq('user_id', user.id)
      .eq('status', 'published')
      .gte('published_at', startDate.toISOString())
      .order('published_at', { ascending: false });

    if (pinsError) {
      console.error('Error fetching pins:', pinsError);
      return NextResponse.json([]);
    }

    // Get orders attributed to Pinterest
    const { data: orders } = await (supabase as any)
      .from('shopify_orders')
      .select('id, total_price, utm_source, utm_medium, utm_campaign, utm_content, landing_page, shopify_created_at')
      .eq('user_id', user.id)
      .eq('utm_source', 'pinterest')
      .gte('shopify_created_at', startDate.toISOString());

    // Match orders to pins based on utm_content (contains pin ID prefix)
    const pinStats: Record<string, {
      pin: any;
      orders: number;
      revenue: number;
      clicks: number;
    }> = {};

    for (const pin of pins || []) {
      const pinIdPrefix = `pin-${pin.id.slice(0, 8)}`;
      pinStats[pin.id] = {
        pin,
        orders: 0,
        revenue: 0,
        clicks: 0, // Would need click tracking to populate
      };

      // Find orders that match this pin
      for (const order of orders || []) {
        if (order.utm_content === pinIdPrefix) {
          pinStats[pin.id].orders += 1;
          pinStats[pin.id].revenue += order.total_price || 0;
        }
      }
    }

    // Also match by campaign (collection name)
    for (const pin of pins || []) {
      const collection = pin.collection || pin.quotes?.collection;
      if (!collection) continue;

      const campaignName = collection.toLowerCase().replace(/\s+/g, '-');

      for (const order of orders || []) {
        // Only count if not already counted by pin ID
        const pinIdPrefix = `pin-${pin.id.slice(0, 8)}`;
        if (order.utm_content !== pinIdPrefix && order.utm_campaign === campaignName) {
          // Distribute revenue across pins in this collection (simplified)
          const pinsInCollection = (pins || []).filter((p: any) =>
            (p.collection || p.quotes?.collection)?.toLowerCase().replace(/\s+/g, '-') === campaignName
          );
          if (pinsInCollection.length > 0) {
            pinStats[pin.id].revenue += (order.total_price || 0) / pinsInCollection.length;
            pinStats[pin.id].orders += 1 / pinsInCollection.length;
          }
        }
      }
    }

    // Format and sort by revenue
    const topPins = Object.values(pinStats)
      .map(({ pin, orders, revenue }) => ({
        id: pin.id,
        title: pin.title,
        collection: pin.collection || pin.quotes?.collection,
        copyVariant: pin.copy_variant,
        publishedAt: pin.published_at,
        pinterestPinId: pin.pinterest_pin_id,
        orders: Math.round(orders * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        avgOrderValue: orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0,
      }))
      .filter(p => p.revenue > 0 || p.orders > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    // Collection summary
    const collectionStats: Record<string, { orders: number; revenue: number; pins: number }> = {};
    for (const stat of Object.values(pinStats)) {
      const collection = stat.pin.collection || stat.pin.quotes?.collection || 'uncategorized';
      if (!collectionStats[collection]) {
        collectionStats[collection] = { orders: 0, revenue: 0, pins: 0 };
      }
      collectionStats[collection].orders += stat.orders;
      collectionStats[collection].revenue += stat.revenue;
      collectionStats[collection].pins += 1;
    }

    const topCollections = Object.entries(collectionStats)
      .map(([collection, data]) => ({
        collection,
        ...data,
        avgRevenuePerPin: data.pins > 0 ? data.revenue / data.pins : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return NextResponse.json({
      topPins,
      topCollections,
      totalPins: (pins || []).length,
      period: { days, startDate: startDate.toISOString() },
    });
  } catch (error) {
    console.error('Error in pin attribution API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
