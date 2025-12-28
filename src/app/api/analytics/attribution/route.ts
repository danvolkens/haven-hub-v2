import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/analytics/attribution - Get attribution overview and breakdown
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get orders with attribution data
    const { data: orders, error: ordersError } = await (supabase as any)
      .from('shopify_orders')
      .select('id, total_price, utm_source, utm_medium, utm_campaign, shopify_created_at')
      .eq('user_id', user.id)
      .gte('shopify_created_at', startDate.toISOString())
      .order('shopify_created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Calculate overview stats
    const totalRevenue = (orders || []).reduce((sum: number, o: any) => sum + (o.total_price || 0), 0);
    const totalOrders = (orders || []).length;

    // Revenue by source
    const bySource: Record<string, { revenue: number; orders: number }> = {};
    for (const order of orders || []) {
      const source = order.utm_source || 'direct';
      if (!bySource[source]) {
        bySource[source] = { revenue: 0, orders: 0 };
      }
      bySource[source].revenue += order.total_price || 0;
      bySource[source].orders += 1;
    }

    // Revenue by medium
    const byMedium: Record<string, { revenue: number; orders: number }> = {};
    for (const order of orders || []) {
      const medium = order.utm_medium || 'none';
      if (!byMedium[medium]) {
        byMedium[medium] = { revenue: 0, orders: 0 };
      }
      byMedium[medium].revenue += order.total_price || 0;
      byMedium[medium].orders += 1;
    }

    // Revenue by campaign
    const byCampaign: Record<string, { revenue: number; orders: number }> = {};
    for (const order of orders || []) {
      if (order.utm_campaign) {
        if (!byCampaign[order.utm_campaign]) {
          byCampaign[order.utm_campaign] = { revenue: 0, orders: 0 };
        }
        byCampaign[order.utm_campaign].revenue += order.total_price || 0;
        byCampaign[order.utm_campaign].orders += 1;
      }
    }

    // Calculate Pinterest-specific stats
    const pinterestOrders = (orders || []).filter((o: any) => o.utm_source === 'pinterest');
    const pinterestRevenue = pinterestOrders.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0);
    const pinterestOrganic = pinterestOrders.filter((o: any) => o.utm_medium === 'organic');
    const pinterestPaid = pinterestOrders.filter((o: any) => o.utm_medium === 'paid_social');

    // Format source data for chart
    const sourceData = Object.entries(bySource)
      .map(([source, data]) => ({
        source,
        revenue: data.revenue,
        orders: data.orders,
        percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Format campaign data
    const campaignData = Object.entries(byCampaign)
      .map(([campaign, data]) => ({
        campaign,
        revenue: data.revenue,
        orders: data.orders,
        avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return NextResponse.json({
      overview: {
        totalRevenue,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        pinterestRevenue,
        pinterestOrders: pinterestOrders.length,
        pinterestOrganic: {
          revenue: pinterestOrganic.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0),
          orders: pinterestOrganic.length,
        },
        pinterestPaid: {
          revenue: pinterestPaid.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0),
          orders: pinterestPaid.length,
        },
      },
      bySource: sourceData,
      byCampaign: campaignData,
      period: { days, startDate: startDate.toISOString() },
    });
  } catch (error) {
    console.error('Error in attribution API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
